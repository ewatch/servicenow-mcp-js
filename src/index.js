#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { ServiceNowClient } from './servicenow-client.js';

import { handleIncidentTools, registerIncidentTools } from './tools/incidents.js';
import { handleScriptIncludeTools, registerScriptIncludeTools } from './tools/script-includes.js';
import { handleTableTools, registerTableTools } from './tools/table-api.js';
import { handleProcessDefinitionTools, registerProcessDefinitionTools } from './tools/process-definitions.js';
import { handleProcessLaneTools, registerProcessLaneTools } from './tools/process-lanes.js';
import { handleProcessActivityTools, registerProcessActivityTools } from './tools/process-activities.js';
import { handleAttachmentTools, registerAttachmentTools } from './tools/attachments.js';

dotenv.config();

class ServiceNowMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'servicenow-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.serviceNowClient = null;
    this.toolDefinitions = [];
    this.toolRouter = [];
    this.setupTools();
    this.setupResources();
    this.setupPrompts();
    this.setupErrorHandling();
  }

  validateEnv() {
    const required = [
      'SERVICENOW_INSTANCE_URL',
      'SERVICENOW_CLIENT_ID',
      'SERVICENOW_CLIENT_SECRET',
      'SERVICENOW_USERNAME',
      'SERVICENOW_PASSWORD',
    ];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
  }

  normalizeInstanceUrl(url) {
    return url.replace(/\/+$/, '');
  }

  async initialize() {
    try {
      this.validateEnv();
      const instanceUrl = this.normalizeInstanceUrl(process.env.SERVICENOW_INSTANCE_URL);
      this.serviceNowClient = new ServiceNowClient({
        instanceUrl,
        clientId: process.env.SERVICENOW_CLIENT_ID,
        clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
        scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount',
        timeout: parseInt(process.env.SERVICENOW_TIMEOUT, 10) || 30000,
        debug: /^true$/i.test(process.env.DEBUG || ''),
      });
      await this.serviceNowClient.authenticate();
      console.error('[Init] ServiceNow MCP Server initialized');
    } catch (error) {
      console.error('[Init Error]', error);
      throw error;
    }
  }

  // -------- Tool Definition Builders (use imported tool registrations) --------
  async getIncidentTools() {
    return registerIncidentTools();
  }

  async getScriptIncludeTools() {
    return registerScriptIncludeTools();
  }

  async getTableApiTools() {
    return registerTableTools();
  }

  async getProcessDefinitionTools() {
    return registerProcessDefinitionTools();
  }

  async getProcessLaneTools() {
    return registerProcessLaneTools();
  }

  async getProcessActivityTools() {
    return registerProcessActivityTools();
  }

  async getAttachmentTools() {
    return registerAttachmentTools();
  }

  // -------- Setup Tools & Routing --------
  setupTools() {
    this.toolRouter = [
      {
        match: (n) =>
          n.includes('_incident'),
        handler: handleIncidentTools,
      },
      {
        match: (n) => n.includes('script_include'),
        handler: handleScriptIncludeTools,
      },
      {
        // Accept names containing 'table' rather than 'table_api'
        match: (n) => n.includes('query_table') || n.includes('_record'),
        handler: handleTableTools,
      },
      {
        match: (n) => n.includes('process_definition'),
        handler: handleProcessDefinitionTools,
      },
      {
        match: (n) => n.includes('process_lane'),
        handler: handleProcessLaneTools,
      },
      {
        match: (n) => n.includes('process_activity') || n.includes('activity_definition'),
        handler: handleProcessActivityTools,
      },
      {
        match: (n) => n.includes('_attachment'),
        handler: handleAttachmentTools,
      },
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.toolDefinitions.length) {
        const groups = await Promise.allSettled([
          this.getIncidentTools(),
          this.getScriptIncludeTools(),
          this.getTableApiTools(),
          this.getProcessDefinitionTools(),
          this.getProcessLaneTools(),
          this.getProcessActivityTools(),
          this.getAttachmentTools(),
        ]);

        const collected = [];
        groups.forEach((g, idx) => {
          if (g.status === 'fulfilled' && Array.isArray(g.value)) {
            collected.push(...g.value);
          } else {
            console.error(
              '[Tools] Skipping group index %d (%s)',
              idx,
              g.status === 'rejected' ? g.reason : 'non-array'
            );
          }
        });

        this.toolDefinitions = collected;
      }
      return { tools: this.toolDefinitions };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;
      const route = this.toolRouter.find((r) => r.match(name));
      if (!route) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
      try {
        const result = await route.handler(this.serviceNowClient, name, args);
        return {
          content: [
            {
              type: 'text',
              text:
                typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error('[Tool Error]', name, err);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${name}: ${(err && err.message) || err}`
        );
      }
    });
  }

  setupResources() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'servicenow://attachments',
            name: 'ServiceNow Attachments',
            description: 'Access to ServiceNow attachment files',
            mimeType: 'application/json'
          },
          {
            uri: 'servicenow://examples',
            name: 'Example Prompts',
            description: 'Example prompts for using ServiceNow MCP tools',
            mimeType: 'text/markdown'
          }
        ]
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'servicenow://examples') {
        // Return example prompts
        const exampleContent = this.getExamplePrompts();
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: exampleContent
            }
          ]
        };
      }

      if (uri.startsWith('servicenow://attachments/')) {
        // Handle specific attachment requests
        const attachmentId = uri.replace('servicenow://attachments/', '');
        try {
          const attachment = await this.getAttachment(attachmentId);
          return {
            contents: [
              {
                uri,
                mimeType: attachment.content_type || 'application/octet-stream',
                blob: attachment.data
              }
            ]
          };
        } catch (error) {
          throw new McpError(ErrorCode.InternalError, `Failed to retrieve attachment: ${error.message}`);
        }
      }

      if (uri === 'servicenow://attachments') {
        // Return attachment listing functionality
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                message: 'Use servicenow://attachments/{sys_id} to access specific attachments',
                description: 'ServiceNow Attachment API access',
                methods: [
                  'GET: servicenow://attachments/{attachment_sys_id} - Download attachment',
                  'Tool: Use servicenow_get_record with table="sys_attachment" to list attachments'
                ]
              }, null, 2)
            }
          ]
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    });
  }

  getExamplePrompts() {
    return `# ServiceNow MCP Server - Example Prompts

This document provides example prompts that you can use with MCP clients to interact with the ServiceNow MCP Server.

## Quick Examples

### Create an Incident
"Create a critical incident for email server outage with description 'Email server completely down' and priority 1"

### List Recent Incidents  
"Show me all high priority incidents created in the last 24 hours"

### Search Script Includes
"Find all Script Includes that contain 'StringUtil' in their name or code"

### Query Any Table
"Query the sys_user table to find all active users in the IT department"

### Get Table Schema
"Show me the schema and field definitions for the incident table"

For more detailed examples, see the full documentation at: docs/EXAMPLE_PROMPTS.md
`;
  }

  async getAttachment(attachmentId) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      // First get attachment metadata
      const attachmentRecord = await this.serviceNowClient.request('GET', `/table/sys_attachment/${attachmentId}`);
      
      if (!attachmentRecord.result) {
        throw new Error('Attachment not found');
      }

      // Then get the actual file content
      const fileResponse = await this.serviceNowClient.request('GET', `/attachment/${attachmentId}/file`, null, {
        responseType: 'arraybuffer'
      });

      return {
        ...attachmentRecord.result,
        data: Buffer.from(fileResponse).toString('base64')
      };
    } catch (error) {
      throw new Error(`Failed to retrieve attachment: ${error.message}`);
    }
  }

  setupPrompts() {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'create_critical_incident',
            description: 'Create a critical incident with all required fields',
            arguments: [
              {
                name: 'description',
                description: 'Brief description of the critical incident',
                required: true
              },
              {
                name: 'details',
                description: 'Detailed description of the incident',
                required: false
              },
              {
                name: 'affected_users',
                description: 'Number of users affected',
                required: false
              }
            ]
          },
          {
            name: 'list_active_incidents',
            description: 'List active incidents with filtering options',
            arguments: [
              {
                name: 'priority',
                description: 'Priority level to filter by (1-5)',
                required: false
              },
              {
                name: 'assignment_group',
                description: 'Assignment group name to filter by',
                required: false
              },
              {
                name: 'limit',
                description: 'Maximum number of incidents to return',
                required: false
              }
            ]
          },
          {
            name: 'resolve_incident',
            description: 'Resolve an incident with work notes and close code',
            arguments: [
              {
                name: 'incident_number',
                description: 'Incident number (e.g., INC0010001)',
                required: true
              },
              {
                name: 'resolution',
                description: 'Description of how the incident was resolved',
                required: true
              },
              {
                name: 'close_code',
                description: 'Close code for the incident',
                required: false
              }
            ]
          },
          {
            name: 'search_script_includes',
            description: 'Search for Script Includes by functionality',
            arguments: [
              {
                name: 'functionality',
                description: 'Type of functionality to search for (e.g., "string utils", "date handling")',
                required: true
              },
              {
                name: 'search_in_code',
                description: 'Whether to search in the script code content',
                required: false
              }
            ]
          },
          {
            name: 'create_utility_script',
            description: 'Create a new utility Script Include',
            arguments: [
              {
                name: 'utility_type',
                description: 'Type of utility (e.g., "StringUtil", "DateUtil", "ValidationUtil")',
                required: true
              },
              {
                name: 'description',
                description: 'Description of what the utility does',
                required: true
              },
              {
                name: 'client_callable',
                description: 'Whether the script should be callable from client-side',
                required: false
              }
            ]
          },
          {
            name: 'query_user_data',
            description: 'Query user information with various filters',
            arguments: [
              {
                name: 'department',
                description: 'Department to filter by',
                required: false
              },
              {
                name: 'role',
                description: 'Role to filter by',
                required: false
              },
              {
                name: 'active_only',
                description: 'Whether to only show active users',
                required: false
              }
            ]
          },
          {
            name: 'analyze_incident_trends',
            description: 'Analyze incident trends over a time period',
            arguments: [
              {
                name: 'time_period',
                description: 'Time period for analysis (e.g., "last 30 days", "this month")',
                required: true
              },
              {
                name: 'group_by',
                description: 'How to group the analysis (category, priority, assignment_group)',
                required: false
              }
            ]
          },
          {
            name: 'upload_incident_attachment',
            description: 'Upload a file attachment to an incident',
            arguments: [
              {
                name: 'incident_number',
                description: 'Incident number to attach file to',
                required: true
              },
              {
                name: 'file_description',
                description: 'Description of the file being uploaded',
                required: true
              },
              {
                name: 'file_type',
                description: 'Type of file (screenshot, log, document, etc.)',
                required: false
              }
            ]
          },
          {
            name: 'process_definition_workflow',
            description: 'Work with process definitions and workflows',
            arguments: [
              {
                name: 'workflow_type',
                description: 'Type of workflow (approval, automation, notification)',
                required: true
              },
              {
                name: 'action',
                description: 'Action to perform (create, search, execute, update)',
                required: true
              },
              {
                name: 'target_table',
                description: 'Table the workflow applies to',
                required: false
              }
            ]
          },
          {
            name: 'bulk_update_records',
            description: 'Perform bulk updates on ServiceNow records',
            arguments: [
              {
                name: 'table_name',
                description: 'Name of the table to update',
                required: true
              },
              {
                name: 'filter_criteria',
                description: 'Criteria to filter records for update',
                required: true
              },
              {
                name: 'update_fields',
                description: 'Description of fields and values to update',
                required: true
              }
            ]
          }
        ]
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      switch (name) {
        case 'create_critical_incident':
          return this.getCriticalIncidentPrompt(args);
        case 'list_active_incidents':
          return this.getActiveIncidentsPrompt(args);
        case 'resolve_incident':
          return this.getResolveIncidentPrompt(args);
        case 'search_script_includes':
          return this.getSearchScriptIncludesPrompt(args);
        case 'create_utility_script':
          return this.getCreateUtilityScriptPrompt(args);
        case 'query_user_data':
          return this.getQueryUserDataPrompt(args);
        case 'analyze_incident_trends':
          return this.getAnalyzeIncidentTrendsPrompt(args);
        case 'upload_incident_attachment':
          return this.getUploadIncidentAttachmentPrompt(args);
        case 'process_definition_workflow':
          return this.getProcessDefinitionWorkflowPrompt(args);
        case 'bulk_update_records':
          return this.getBulkUpdateRecordsPrompt(args);
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
      }
    });
  }

  getCriticalIncidentPrompt(args) {
    const { description, details, affected_users } = args;
    
    return {
      description: 'Create a critical priority incident in ServiceNow',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a critical incident in ServiceNow with the following details:

Short Description: ${description || '[Please provide incident description]'}
Priority: 1 (Critical)
Urgency: 1 (High) 
Impact: 1 (High)
Category: software

${details ? `Detailed Description: ${details}` : 'Detailed Description: [Please provide detailed description of the issue]'}

${affected_users ? `Additional Context: Approximately ${affected_users} users are affected by this issue.` : 'Additional Context: [Please specify impact and affected users]'}

Please use the servicenow_incident_create tool to create this incident and provide the incident number once created.`
          }
        }
      ]
    };
  }

  getActiveIncidentsPrompt(args) {
    const { priority, assignment_group, limit } = args;
    
    let query = 'state=1^state=2'; // New or In Progress
    if (priority) {
      query += `^priority=${priority}`;
    }
    if (assignment_group) {
      query += `^assignment_group.name=${assignment_group}`;
    }

    return {
      description: 'List active incidents with optional filtering',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please list active incidents in ServiceNow with the following criteria:

Query: ${query}
${limit ? `Limit: ${limit} incidents` : 'Limit: 20 incidents (default)'}
Fields to show: number,short_description,priority,state,assignment_group,sys_created_on

Use the servicenow_incident_list tool with these parameters and format the results in a readable table showing the incident number, description, priority, current state, and assignment group.`
          }
        }
      ]
    };
  }

  getResolveIncidentPrompt(args) {
    const { incident_number, resolution, close_code } = args;

    return {
      description: 'Resolve an incident with proper work notes and closure',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please resolve incident ${incident_number || '[INCIDENT_NUMBER]'} in ServiceNow:

1. First, get the current incident details using servicenow_incident_get with the incident number
2. Then update the incident to resolved status using servicenow_incident_update with:
   - State: 6 (Resolved)
   - Work notes: "${resolution || '[Please provide resolution details]'}"
   ${close_code ? `- Close code: "${close_code}"` : '- Close code: "Solution provided"'}
   - Close notes: "${resolution || '[Please provide resolution details]'}"

3. Confirm the incident has been successfully resolved and provide a summary of the changes made.`
          }
        }
      ]
    };
  }

  getSearchScriptIncludesPrompt(args) {
    const { functionality, search_in_code } = args;

    return {
      description: 'Search for Script Includes by functionality',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for Script Includes related to "${functionality || '[functionality type]'}" in ServiceNow:

Use the servicenow_script_include_search tool with:
- Search term: "${functionality || '[functionality type]'}"
${search_in_code !== false ? '- Search in script content: true' : '- Search in script content: false'}
- Active only: true

Please show the results including the script names, descriptions, and whether they are client-callable. If you find relevant scripts, also get the full details of the most promising ones using servicenow_script_include_get.`
          }
        }
      ]
    };
  }

  getCreateUtilityScriptPrompt(args) {
    const { utility_type, description, client_callable } = args;

    return {
      description: 'Create a new utility Script Include',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new ${utility_type || '[UtilityType]'} Script Include in ServiceNow:

Script Include Details:
- Name: "${utility_type || '[UtilityType]'}"
- Description: "${description || '[Please provide description of what this utility does]'}"
- Client callable: ${client_callable !== false ? 'true' : 'false'}
- Active: true

Please create a basic template for this utility script that includes:
1. Proper Script Include structure
2. Common utility functions for ${utility_type || 'the specified functionality'}
3. JSDoc comments for documentation
4. Error handling best practices

Use the servicenow_script_include_create tool to create this script include.`
          }
        }
      ]
    };
  }

  getQueryUserDataPrompt(args) {
    const { department, role, active_only } = args;

    let query = '';
    const conditions = [];
    
    if (active_only !== false) {
      conditions.push('active=true');
    }
    if (department) {
      conditions.push(`department.name=${department}`);
    }
    if (role) {
      conditions.push(`sys_user_role.name=${role}`);
    }
    
    query = conditions.join('^');

    return {
      description: 'Query user information with filtering',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Query user information from ServiceNow with the following criteria:

Table: sys_user
${query ? `Query: ${query}` : 'Query: [no specific filters applied]'}
Fields: name,email,department,title,phone,active,sys_created_on

Use the servicenow_query_table tool to retrieve this user data and format it in a readable table showing:
- Full Name
- Email Address  
- Department
- Job Title
- Phone Number
- Active Status
- Created Date

Limit the results to 50 users and sort by name.`
          }
        }
      ]
    };
  }

  getAnalyzeIncidentTrendsPrompt(args) {
    const { time_period, group_by } = args;

    return {
      description: 'Analyze incident trends over time',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze incident trends in ServiceNow for ${time_period || '[time period]'}:

1. First, query incidents created in ${time_period || 'the specified time period'} using servicenow_incident_list:
   - Query: sys_created_on>javascript:gs.daysAgo(30) (adjust timeframe as needed)
   - Fields: number,priority,category,state,assignment_group,sys_created_on,sys_resolved_on

2. Analyze the data and provide insights on:
   - Total number of incidents
   - Distribution by priority level
   - Distribution by category
   ${group_by ? `- Grouping by ${group_by}` : '- Top assignment groups by incident count'}
   - Average resolution time
   - Incidents still open vs resolved

3. Create a summary report with trends and recommendations for improvement.`
          }
        }
      ]
    };
  }

  getUploadIncidentAttachmentPrompt(args) {
    const { incident_number, file_description, file_type } = args;

    return {
      description: 'Upload a file attachment to an incident',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Upload a ${file_type || 'file'} attachment to incident ${incident_number || '[INCIDENT_NUMBER]'}:

1. First, get the incident details to obtain the sys_id:
   - Use servicenow_incident_get with incident number: ${incident_number || '[INCIDENT_NUMBER]'}

2. Then upload the attachment:
   - Use servicenow_attachment_upload tool
   - Table name: "incident"
   - Table sys_id: [sys_id from step 1]
   - File name: [provide the file name]
   - Content type: [appropriate MIME type for ${file_type || 'the file'}]
   - File content: [base64 encoded file content]

File Description: ${file_description || '[Please describe what this file contains]'}

Note: You'll need to provide the actual file content in base64 format when using this prompt.`
          }
        }
      ]
    };
  }

  getProcessDefinitionWorkflowPrompt(args) {
    const { workflow_type, action, target_table } = args;

    return {
      description: 'Work with process definitions and workflows',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Work with ${workflow_type || '[workflow type]'} process definitions in ServiceNow:

Action: ${action || '[action to perform]'}
${target_table ? `Target Table: ${target_table}` : 'Target Table: [specify which table this workflow applies to]'}

Based on the action requested:

${action === 'search' || !action ? `
**Search Process Definitions:**
- Use servicenow_process_definition_search to find existing ${workflow_type || '[workflow type]'} processes
- Search term: "${workflow_type || '[workflow type]'}"
- Show active and published processes only
` : ''}

${action === 'create' || !action ? `
**Create Process Definition:**
- Use servicenow_process_definition_create with:
  - Name: "${workflow_type || '[WorkflowType]'}${target_table ? `_${target_table}` : ''}_Process"
  - Label: "${workflow_type || '[Workflow Type]'} Process${target_table ? ` for ${target_table}` : ''}"
  - Description: "Automated ${workflow_type || '[workflow type]'} process${target_table ? ` for ${target_table} records` : ''}"
  - Access: "public"
  - Active: true
` : ''}

${action === 'execute' || !action ? `
**Execute Process Definition:**
- First search for the appropriate process definition
- Use servicenow_process_definition_execute with the sys_id and required input data
` : ''}

Provide detailed results and next steps for working with this workflow.`
          }
        }
      ]
    };
  }

  getBulkUpdateRecordsPrompt(args) {
    const { table_name, filter_criteria, update_fields } = args;

    return {
      description: 'Perform bulk updates on ServiceNow records',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Perform bulk updates on ${table_name || '[table_name]'} records in ServiceNow:

**Step 1: Query Records to Update**
- Table: ${table_name || '[table_name]'}
- Filter: ${filter_criteria || '[specify filter criteria]'}
- Use servicenow_query_table to first identify all records that match the criteria
- Limit to 100 records for safety

**Step 2: Review Records**
- Display the records that will be updated
- Confirm the count and show key identifying fields

**Step 3: Bulk Update**
- For each record found, use servicenow_update_record to apply:
  ${update_fields || '[specify which fields to update and their new values]'}

**Step 4: Verification**
- After updates, query the records again to verify changes were applied
- Provide a summary of successful updates and any errors

**Safety Notes:**
- Always query first to verify the correct records will be updated
- Consider testing on a small subset first
- Backup or document the previous values before updating`
          }
        }
      ]
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Unhandled Error]', error);
    };
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
    process.on('unhandledRejection', (r) =>
      console.error('[UnhandledRejection]', r)
    );
    process.on('uncaughtException', (e) =>
      console.error('[UncaughtException]', e)
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Run] ServiceNow MCP server listening (stdio)');
  }
}

async function main() {
  const server = new ServiceNowMCPServer();
  await server.initialize();
  await server.run();
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
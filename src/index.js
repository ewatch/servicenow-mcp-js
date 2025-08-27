#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
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

dotenv.config();

class ServiceNowMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'servicenow-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {}, resourceTemplates: {} } }
    );
    this.serviceNowClient = null;
    this.toolDefinitions = [];
    this.toolRouter = [];
    this.setupTools();
    this.setupResources();
    this.setupResourceTemplates();
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
            uri: 'servicenow://examples',
            name: 'Example Prompts',
            description: 'Example prompts and documentation for using ServiceNow MCP tools',
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

      // Handle table schema resources - support any table name
      if (uri.startsWith('servicenow://table-schema/')) {
        const tableName = uri.replace('servicenow://table-schema/', '');
        if (!tableName) {
          throw new McpError(ErrorCode.InvalidRequest, 'Table name is required in URI. Use format: servicenow://table-schema/{table_name}');
        }

        try {
          const tableSchema = await this.getTableSchema(tableName);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tableSchema, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get table schema for "${tableName}": ${error.message}`
          );
        }
      }

      // Handle table data sample resources - support any table name
      if (uri.startsWith('servicenow://table-data/')) {
        const tableName = uri.replace('servicenow://table-data/', '');
        if (!tableName) {
          throw new McpError(ErrorCode.InvalidRequest, 'Table name is required in URI. Use format: servicenow://table-data/{table_name}');
        }

        try {
          const tableData = await this.getTableDataSample(tableName);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(tableData, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get table data sample for "${tableName}": ${error.message}`
          );
        }
      }

      // Handle specific record resources - support any table and sys_id
      if (uri.startsWith('servicenow://record/')) {
        const pathParts = uri.replace('servicenow://record/', '').split('/');
        if (pathParts.length !== 2 || !pathParts[0] || !pathParts[1]) {
          throw new McpError(ErrorCode.InvalidRequest, 'URI format should be servicenow://record/{table_name}/{sys_id}');
        }
        const [tableName, sysId] = pathParts;

        try {
          const record = await this.getRecord(tableName, sysId);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(record, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get record ${sysId} from table "${tableName}": ${error.message}`
          );
        }
      }

      // Handle incident resources - support any incident number or sys_id
      if (uri.startsWith('servicenow://incident/')) {
        const identifier = uri.replace('servicenow://incident/', '');
        if (!identifier) {
          throw new McpError(ErrorCode.InvalidRequest, 'Incident number or sys_id is required in URI. Use format: servicenow://incident/{number_or_sys_id}');
        }

        try {
          const incident = await this.getIncidentByIdentifier(identifier);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(incident, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get incident "${identifier}": ${error.message}`
          );
        }
      }

      // Handle user profile resources - support any username or sys_id
      if (uri.startsWith('servicenow://user/')) {
        const identifier = uri.replace('servicenow://user/', '');
        if (!identifier) {
          throw new McpError(ErrorCode.InvalidRequest, 'Username or sys_id is required in URI. Use format: servicenow://user/{username_or_sys_id}');
        }

        try {
          const user = await this.getUserByIdentifier(identifier);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(user, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get user "${identifier}": ${error.message}`
          );
        }
      }

      // Handle process definition resources - support any process definition sys_id
      if (uri.startsWith('servicenow://process-definition/')) {
        const sysId = uri.replace('servicenow://process-definition/', '');
        if (!sysId) {
          throw new McpError(ErrorCode.InvalidRequest, 'Process definition sys_id is required in URI. Use format: servicenow://process-definition/{sys_id}');
        }

        try {
          const processDefinition = await this.getProcessDefinitionWithDetails(sysId);
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(processDefinition, null, 2)
              }
            ]
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get process definition "${sysId}": ${error.message}`
          );
        }
      }

      throw new McpError(
        ErrorCode.InvalidRequest, 
        `Unknown resource: ${uri}\n\nAvailable resource templates:\n` +
        `• servicenow://table-schema/{table} - Get table field definitions\n` +
        `• servicenow://table-data/{table} - Get sample table data\n` +
        `• servicenow://record/{table}/{sys_id} - Get specific record\n` +
        `• servicenow://incident/{number_or_sys_id} - Get incident details\n` +
        `• servicenow://user/{username_or_sys_id} - Get user profile\n` +
        `• servicenow://process-definition/{sys_id} - Get process definition with details\n` +
        `• servicenow://examples - Get example prompts and documentation`
      );
    });
  }

  setupResourceTemplates() {
    // List available resource templates
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      return {
        resourceTemplates: [
          {
            uriTemplate: 'servicenow://table-schema/{table}',
            name: 'ServiceNow Table Schema',
            description: 'Get field definitions and metadata for any ServiceNow table. Replace {table} with the table name (e.g., incident, sys_user, problem, change_request).',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'servicenow://table-data/{table}',
            name: 'ServiceNow Table Data Sample',
            description: 'Get sample data (first 10 records) from any ServiceNow table. Replace {table} with the table name (e.g., incident, sys_user, problem).',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'servicenow://record/{table}/{sys_id}',
            name: 'ServiceNow Specific Record',
            description: 'Get a specific record from any ServiceNow table by sys_id. Replace {table} with table name and {sys_id} with the record identifier.',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'servicenow://incident/{number_or_sys_id}',
            name: 'ServiceNow Incident',
            description: 'Get detailed incident information by incident number (e.g., INC0010001) or sys_id. Smart lookup determines identifier type.',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'servicenow://user/{username_or_sys_id}',
            name: 'ServiceNow User Profile',
            description: 'Get user profile information by username, email address, or sys_id. Smart lookup handles different identifier formats.',
            mimeType: 'application/json'
          },
          {
            uriTemplate: 'servicenow://process-definition/{sys_id}',
            name: 'ServiceNow Process Definition',
            description: 'Get complete process definition including associated lanes, activities, and metadata by process definition sys_id.',
            mimeType: 'application/json'
          }
        ]
      };
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

## MCP Resource Templates Available

The ServiceNow MCP server provides dynamic resource templates that allow you to access ServiceNow data using URIs with parameters:

### Table Schema Resource
**URI Pattern:** \`servicenow://table-schema/{table}\`
**Description:** Get field definitions for any ServiceNow table
**Example URIs:**
- \`servicenow://table-schema/incident\` - Get incident table schema
- \`servicenow://table-schema/sys_user\` - Get user table schema  
- \`servicenow://table-schema/cmdb_ci_computer\` - Get computer CI table schema

### Table Data Sample Resource
**URI Pattern:** \`servicenow://table-data/{table}\`
**Description:** Get sample data (first 10 records) from any ServiceNow table
**Example URIs:**
- \`servicenow://table-data/incident\` - Get sample incidents
- \`servicenow://table-data/sys_user\` - Get sample user records
- \`servicenow://table-data/change_request\` - Get sample change requests

### Specific Record Resource
**URI Pattern:** \`servicenow://record/{table}/{sys_id}\`
**Description:** Get a specific record from any ServiceNow table by sys_id
**Example URIs:**
- \`servicenow://record/incident/a1b2c3d4e5f6789012345678901234567890\`
- \`servicenow://record/sys_user/12345678901234567890123456789012\`

### Incident Resource
**URI Pattern:** \`servicenow://incident/{number_or_sys_id}\`
**Description:** Get detailed incident information by number or sys_id
**Example URIs:**
- \`servicenow://incident/INC0010001\` - Get incident by number
- \`servicenow://incident/a1b2c3d4e5f6789012345678901234567890\` - Get incident by sys_id

### User Profile Resource
**URI Pattern:** \`servicenow://user/{username_or_sys_id}\`
**Description:** Get user profile information by username, email, or sys_id
**Example URIs:**
- \`servicenow://user/john.doe\` - Get user by username
- \`servicenow://user/john.doe@company.com\` - Get user by email
- \`servicenow://user/12345678901234567890123456789012\` - Get user by sys_id

### Process Definition Resource
**URI Pattern:** \`servicenow://process-definition/{sys_id}\`
**Description:** Get detailed process definition with lanes and activities
**Example URIs:**
- \`servicenow://process-definition/abcd1234567890123456789012345678\`

## Resource Data Formats

### Table Schema
Returns JSON with field definitions including:
- column_name: Field name
- column_label: Display label
- internal_type: Field data type
- mandatory: Whether field is required
- reference: Referenced table (for reference fields)
- is_choice_field: Whether field has choice list

### Table Data Sample
Returns JSON with:
- table: Table name
- sample_count: Number of records returned
- records: Array of sample records

### Record Data
Returns JSON with:
- table: Table name
- sys_id: Record identifier
- record: Full record data

### Incident Data
Returns JSON with:
- type: "incident"
- identifier: The identifier used for lookup
- lookup_method: "number" or "sys_id"
- record: Full incident record

### User Profile Data
Returns JSON with:
- type: "user"
- identifier: The identifier used for lookup
- lookup_method: "username_or_email" or "sys_id"
- record: Full user record

### Process Definition Data
Returns JSON with:
- type: "process_definition"
- process_definition: Process definition record
- lanes: Array of associated lanes
- activities: Array of activities with lane information
- summary: Statistics and status information

## Usage Examples

### Using Resource Templates
"Get the table schema for the incident table using the servicenow://table-schema/incident resource"

"Show me sample data from the change_request table using servicenow://table-data/change_request"

"Retrieve the user profile for john.doe using servicenow://user/john.doe"

"Get incident INC0010001 details using servicenow://incident/INC0010001"

For more detailed examples, see the full documentation at: docs/EXAMPLE_PROMPTS.md
`;
  }

  async getTableSchema(tableName) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    // Query the sys_dictionary table to get field definitions
    const query = `name=${tableName}^active=true`;
    const fields = 'element,column_label,internal_type,max_length,mandatory,reference,choice_field,default_value,comments';
    const result = await this.serviceNowClient.queryTable('sys_dictionary', query, fields, 1000, 0, 'element');
    
    const fieldDefinitions = result.result;
    
    // Structure the response to match the format you specified
    const tableSchema = {
      table: tableName,
      fields: fieldDefinitions.map(field => ({
        column_name: field.element,
        column_label: field.column_label,
        internal_type: field.internal_type,
        max_length: field.max_length,
        mandatory: field.mandatory === 'true',
        reference: field.reference,
        is_choice_field: field.choice_field === 'true',
        default_value: field.default_value,
        comments: field.comments
      })).filter(field => field.column_name && field.column_name !== '')
    };

    return tableSchema;
  }

  async getTableDataSample(tableName) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      const result = await this.serviceNowClient.queryTable(tableName, '', '', 10, 0, '^sys_created_on');
      const records = result.result;
      
      return {
        table: tableName,
        sample_count: records.length,
        records: records
      };
    } catch (error) {
      throw new Error(`Failed to get sample data for table "${tableName}": ${error.message}`);
    }
  }

  async getRecord(tableName, sysId) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      const result = await this.serviceNowClient.getRecord(tableName, sysId);
      return {
        table: tableName,
        sys_id: sysId,
        record: result.result
      };
    } catch (error) {
      throw new Error(`Failed to get record ${sysId} from table "${tableName}": ${error.message}`);
    }
  }

  async getIncidentByIdentifier(identifier) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      let result;
      
      // Check if identifier looks like a sys_id (32 characters, alphanumeric)
      if (identifier.length === 32 && /^[a-f0-9]{32}$/i.test(identifier)) {
        result = await this.serviceNowClient.getRecord('incident', identifier);
        return {
          type: 'incident',
          identifier: identifier,
          lookup_method: 'sys_id',
          record: result.result
        };
      } else {
        // Assume it's an incident number
        const query = `number=${identifier}`;
        result = await this.serviceNowClient.queryTable('incident', query, '', 1, 0);
        if (result.result.length === 0) {
          throw new Error(`No incident found with number "${identifier}"`);
        }
        return {
          type: 'incident',
          identifier: identifier,
          lookup_method: 'number',
          record: result.result[0]
        };
      }
    } catch (error) {
      throw new Error(`Failed to get incident "${identifier}": ${error.message}`);
    }
  }

  async getUserByIdentifier(identifier) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      let result;
      
      // Check if identifier looks like a sys_id (32 characters, alphanumeric)
      if (identifier.length === 32 && /^[a-f0-9]{32}$/i.test(identifier)) {
        result = await this.serviceNowClient.getRecord('sys_user', identifier);
        return {
          type: 'user',
          identifier: identifier,
          lookup_method: 'sys_id',
          record: result.result
        };
      } else {
        // Assume it's a username or email
        const query = `user_name=${identifier}^ORemail=${identifier}`;
        result = await this.serviceNowClient.queryTable('sys_user', query, '', 1, 0);
        if (result.result.length === 0) {
          throw new Error(`No user found with username or email "${identifier}"`);
        }
        return {
          type: 'user',
          identifier: identifier,
          lookup_method: 'username_or_email',
          record: result.result[0]
        };
      }
    } catch (error) {
      throw new Error(`Failed to get user "${identifier}": ${error.message}`);
    }
  }

  async getProcessDefinitionWithDetails(sysId) {
    if (!this.serviceNowClient) {
      throw new Error('ServiceNow client not initialized');
    }

    try {
      // Get the process definition
      const pdResult = await this.serviceNowClient.getRecord('sys_pd_process_definition', sysId);
      const processDefinition = pdResult.result;

      // Get associated lanes - try different possible table names
      let lanes = [];
      let activities = [];
      
      try {
        const lanesQuery = `process_definition=${sysId}^active=true`;
        const lanesResult = await this.serviceNowClient.queryTable('sys_pd_lane_definition', lanesQuery, '', 100, 0, 'order');
        lanes = lanesResult.result;
      } catch (laneError) {
        // Try alternative table name
        try {
          const lanesQuery = `process_definition=${sysId}^active=true`;
          const lanesResult = await this.serviceNowClient.queryTable('sys_pd_lane', lanesQuery, '', 100, 0, 'order');
          lanes = lanesResult.result;
        } catch (altError) {
          console.error('Could not fetch lanes:', altError.message);
        }
      }

      // Get activities for each lane
      if (lanes.length > 0) {
        for (const lane of lanes) {
          try {
            const activitiesQuery = `lane=${lane.sys_id}^active=true`;
            const activitiesResult = await this.serviceNowClient.queryTable('sys_pd_activity_definition', activitiesQuery, '', 100, 0, 'order');
            activities.push(...activitiesResult.result.map(activity => ({
              ...activity,
              lane_name: lane.name,
              lane_sys_id: lane.sys_id
            })));
          } catch (activityError) {
            // Try alternative table name
            try {
              const activitiesQuery = `lane=${lane.sys_id}^active=true`;
              const activitiesResult = await this.serviceNowClient.queryTable('sys_pd_activity', activitiesQuery, '', 100, 0, 'order');
              activities.push(...activitiesResult.result.map(activity => ({
                ...activity,
                lane_name: lane.name,
                lane_sys_id: lane.sys_id
              })));
            } catch (altActivityError) {
              console.error(`Could not fetch activities for lane ${lane.sys_id}:`, altActivityError.message);
            }
          }
        }
      }

      return {
        type: 'process_definition',
        sys_id: sysId,
        process_definition: processDefinition,
        lanes: lanes,
        activities: activities,
        summary: {
          total_lanes: lanes.length,
          total_activities: activities.length,
          status: processDefinition.status,
          active: processDefinition.active === 'true'
        }
      };
    } catch (error) {
      throw new Error(`Failed to get process definition "${sysId}": ${error.message}`);
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

// Export the class for testing
export { ServiceNowMCPServer };

async function main() {
  const server = new ServiceNowMCPServer();
  await server.initialize();
  await server.run();
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
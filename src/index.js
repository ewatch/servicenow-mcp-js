#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { ServiceNowClient } from './servicenow-client.js';
import { registerIncidentTools, handleIncidentTools } from './tools/incidents.js';
import { registerScriptIncludeTools, handleScriptIncludeTools } from './tools/script-includes.js';
import { registerTableTools, handleTableTools } from './tools/table-api.js';
import { registerProcessDefinitionTools, handleProcessDefinitionTools } from './tools/process-definitions.js';
import { registerProcessLaneTools, handleProcessLaneTools } from './tools/process-lanes.js';
import { registerProcessActivityTools, handleProcessActivityTools } from './tools/process-activities.js';

// Load environment variables
dotenv.config();

class ServiceNowMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'servicenow-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.serviceNowClient = null;
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  async initialize() {
    try {
      // Initialize ServiceNow client
      this.serviceNowClient = new ServiceNowClient({
        instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
        clientId: process.env.SERVICENOW_CLIENT_ID,
        clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
        scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount',
        timeout: parseInt(process.env.SERVICENOW_TIMEOUT) || 30000,
      });

      await this.serviceNowClient.authenticate();
      console.error('ServiceNow MCP Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ServiceNow client:', error.message);
      throw error;
    }
  }

  setupTools() {
    // Set up tools list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [];
      
      // Collect tools from all categories
      tools.push(
        ...(await this.getIncidentTools()),
        ...(await this.getScriptIncludeTools()),
        ...(await this.getTableApiTools()),
        ...(await this.getProcessDefinitionTools()),
        ...(await this.getProcessLaneTools()),
        ...(await this.getProcessActivityTools())
      );
      
      return { tools };
    });

    // Set up tool call handler for all categories
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;
      
      // Route to appropriate tool handler based on tool name
      if (name.includes('incident')) {
        return await handleIncidentTools(request);
      } else if (name.includes('script_include')) {
        return await handleScriptIncludeTools(request);
      } else if (name.includes('table_api')) {
        return await handleTableTools(request);
      } else if (name.includes('process_definition')) {
        return await handleProcessDefinitionTools(request);
      } else if (name.includes('process_lane')) {
        return await handleProcessLaneTools(request);
      } else if (name.includes('process_activit')) {
        return await handleProcessActivityTools(request);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async getIncidentTools() {
    return [
      {
        name: 'servicenow_list_incidents',
        description: 'List ServiceNow incidents with filtering and sorting options',
        inputSchema: {
          type: 'object',
          properties: {
            state: { type: 'string', description: 'Filter by incident state' },
            priority: { type: 'string', description: 'Filter by priority' },
            assigned_to: { type: 'string', description: 'Filter by assigned user' },
            limit: { type: 'number', description: 'Maximum number of incidents to return', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of incidents to skip for pagination', minimum: 0 }
          }
        }
      },
      {
        name: 'servicenow_search_incidents',
        description: 'Search ServiceNow incidents using advanced query filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ServiceNow encoded query string for filtering incidents' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' },
            limit: { type: 'number', description: 'Maximum number of results', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of results to skip', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction' }
          },
          required: ['query']
        }
      },
      {
        name: 'servicenow_get_incident',
        description: 'Get a specific ServiceNow incident by number or sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Incident number (e.g., INC0000123) or sys_id' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' }
          },
          required: ['identifier']
        }
      },
      {
        name: 'servicenow_create_incident',
        description: 'Create a new ServiceNow incident',
        inputSchema: {
          type: 'object',
          properties: {
            short_description: { type: 'string', description: 'Brief description of the incident' },
            description: { type: 'string', description: 'Detailed description of the incident' },
            caller_id: { type: 'string', description: 'User ID of the person reporting the incident' },
            category: { type: 'string', description: 'Incident category' },
            subcategory: { type: 'string', description: 'Incident subcategory' },
            priority: { type: 'string', description: 'Priority level' },
            urgency: { type: 'string', description: 'Urgency level' },
            impact: { type: 'string', description: 'Impact level' },
            assignment_group: { type: 'string', description: 'Assignment group sys_id' },
            assigned_to: { type: 'string', description: 'Assigned user sys_id' }
          },
          required: ['short_description']
        }
      },
      {
        name: 'servicenow_update_incident',
        description: 'Update an existing ServiceNow incident',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Incident number or sys_id' },
            short_description: { type: 'string', description: 'Brief description of the incident' },
            description: { type: 'string', description: 'Detailed description of the incident' },
            state: { type: 'string', description: 'Incident state' },
            priority: { type: 'string', description: 'Priority level' },
            urgency: { type: 'string', description: 'Urgency level' },
            impact: { type: 'string', description: 'Impact level' },
            assignment_group: { type: 'string', description: 'Assignment group sys_id' },
            assigned_to: { type: 'string', description: 'Assigned user sys_id' },
            work_notes: { type: 'string', description: 'Work notes to add to the incident' },
            close_code: { type: 'string', description: 'Close code when resolving/closing' },
            close_notes: { type: 'string', description: 'Close notes when resolving/closing' }
          },
          required: ['identifier']
        }
      }
    ];
  }

  async getScriptIncludeTools() {
    return [
      {
        name: 'servicenow_list_script_includes',
        description: 'List ServiceNow script includes with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
            client_callable: { type: 'boolean', description: 'Filter by client callable status' },
            limit: { type: 'number', description: 'Maximum number of script includes to return', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of script includes to skip for pagination', minimum: 0 }
          }
        }
      },
      {
        name: 'servicenow_search_script_includes',
        description: 'Search ServiceNow script includes using advanced query filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ServiceNow encoded query string for filtering script includes' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' },
            limit: { type: 'number', description: 'Maximum number of results', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of results to skip', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction' }
          },
          required: ['query']
        }
      },
      {
        name: 'servicenow_get_script_include',
        description: 'Get a specific ServiceNow script include by name or sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Script include name or sys_id' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' }
          },
          required: ['identifier']
        }
      },
      {
        name: 'servicenow_create_script_include',
        description: 'Create a new ServiceNow script include',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the script include' },
            script: { type: 'string', description: 'JavaScript code for the script include' },
            description: { type: 'string', description: 'Description of the script include' },
            client_callable: { type: 'boolean', description: 'Whether the script can be called from client side' },
            active: { type: 'boolean', description: 'Whether the script include is active' },
            access: { type: 'string', description: 'Access level (public, package_private)' }
          },
          required: ['name', 'script']
        }
      },
      {
        name: 'servicenow_update_script_include',
        description: 'Update an existing ServiceNow script include',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Script include name or sys_id' },
            name: { type: 'string', description: 'Name of the script include' },
            script: { type: 'string', description: 'JavaScript code for the script include' },
            description: { type: 'string', description: 'Description of the script include' },
            client_callable: { type: 'boolean', description: 'Whether the script can be called from client side' },
            active: { type: 'boolean', description: 'Whether the script include is active' },
            access: { type: 'string', description: 'Access level (public, package_private)' }
          },
          required: ['identifier']
        }
      }
    ];
  }

  async getTableApiTools() {
    return [
      {
        name: 'servicenow_table_api_query',
        description: 'Query any ServiceNow table using the Table API',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name to query' },
            query: { type: 'string', description: 'ServiceNow encoded query string' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' },
            limit: { type: 'number', description: 'Maximum number of records to return', minimum: 1, maximum: 10000 },
            offset: { type: 'number', description: 'Number of records to skip for pagination', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction' }
          },
          required: ['table']
        }
      },
      {
        name: 'servicenow_table_api_get_record',
        description: 'Get a specific record from any ServiceNow table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            sysId: { type: 'string', description: 'sys_id of the record to retrieve' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return' }
          },
          required: ['table', 'sysId']
        }
      },
      {
        name: 'servicenow_table_api_create_record',
        description: 'Create a new record in any ServiceNow table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name where the record will be created' },
            data: { type: 'object', description: 'Field values for the new record as key-value pairs' }
          },
          required: ['table', 'data']
        }
      },
      {
        name: 'servicenow_table_api_update_record',
        description: 'Update an existing record in any ServiceNow table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            sysId: { type: 'string', description: 'sys_id of the record to update' },
            data: { type: 'object', description: 'Field values to update as key-value pairs' }
          },
          required: ['table', 'sysId', 'data']
        }
      },
      {
        name: 'servicenow_table_api_delete_record',
        description: 'Delete a record from any ServiceNow table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            sysId: { type: 'string', description: 'sys_id of the record to delete' }
          },
          required: ['table', 'sysId']
        }
      }
    ];
  }

  async getProcessDefinitionTools() {
    return [
      {
        name: 'servicenow_list_process_definitions',
        description: 'List process definitions with filtering and sorting options',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status (default: true)' },
            category: { type: 'string', description: 'Filter by category' },
            limit: { type: 'number', description: 'Maximum number of process definitions to return (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of process definitions to skip for pagination (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by (default: name)', enum: ['name', 'sys_created_on', 'sys_updated_on'] }
          }
        }
      },
      {
        name: 'servicenow_search_process_definitions',
        description: 'Search process definitions using advanced query filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ServiceNow encoded query string for filtering process definitions' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all important fields)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of results to skip (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction (e.g., ^name for ascending, name for descending)' }
          },
          required: ['query']
        }
      },
      {
        name: 'servicenow_get_process_definition',
        description: 'Get a specific process definition by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'The sys_id of the process definition to retrieve' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all fields)' }
          },
          required: ['processId']
        }
      },
      {
        name: 'servicenow_create_process_definition',
        description: 'Create a new process definition',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The name of the process definition' },
            description: { type: 'string', description: 'Description of the process definition' },
            category: { type: 'string', description: 'Category for organizing the process' },
            active: { type: 'boolean', description: 'Whether the process definition is active (default: true)' },
            table: { type: 'string', description: 'Table this process definition applies to' },
            condition: { type: 'string', description: 'Condition for when this process should run' }
          },
          required: ['name']
        }
      },
      {
        name: 'servicenow_update_process_definition',
        description: 'Update an existing process definition',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'The sys_id of the process definition to update' },
            name: { type: 'string', description: 'The name of the process definition' },
            description: { type: 'string', description: 'Description of the process definition' },
            category: { type: 'string', description: 'Category for organizing the process' },
            active: { type: 'boolean', description: 'Whether the process definition is active' },
            table: { type: 'string', description: 'Table this process definition applies to' },
            condition: { type: 'string', description: 'Condition for when this process should run' }
          },
          required: ['processId']
        }
      },
      {
        name: 'servicenow_execute_process_validation',
        description: 'Execute validation on a process definition to check for errors',
        inputSchema: {
          type: 'object',
          properties: {
            processId: { type: 'string', description: 'The sys_id of the process definition to validate' }
          },
          required: ['processId']
        }
      },
      {
        name: 'servicenow_get_process_definition_schema',
        description: 'Get the schema/field definitions for the sys_pd_process_definition table',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async getProcessLaneTools() {
    return [
      {
        name: 'servicenow_list_process_lanes',
        description: 'List process definition lanes with filtering and sorting options',
        inputSchema: {
          type: 'object',
          properties: {
            processDefinitionId: { type: 'string', description: 'Filter lanes by process definition sys_id' },
            active: { type: 'boolean', description: 'Filter by active status (default: true)' },
            limit: { type: 'number', description: 'Maximum number of lanes to return (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of lanes to skip for pagination (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by (default: order)', enum: ['order', 'name', 'sys_created_on', 'sys_updated_on'] }
          }
        }
      },
      {
        name: 'servicenow_search_process_lanes',
        description: 'Search process lanes using advanced query filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ServiceNow encoded query string for filtering lanes' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all important fields)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of results to skip (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction (e.g., ^name for ascending, name for descending)' }
          },
          required: ['query']
        }
      },
      {
        name: 'servicenow_get_process_lane',
        description: 'Get a specific process lane by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            laneId: { type: 'string', description: 'The sys_id of the lane to retrieve' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all fields)' }
          },
          required: ['laneId']
        }
      },
      {
        name: 'servicenow_create_process_lane',
        description: 'Create a new process lane',
        inputSchema: {
          type: 'object',
          properties: {
            processDefinitionId: { type: 'string', description: 'The sys_id of the process definition this lane belongs to' },
            name: { type: 'string', description: 'The name of the lane' },
            label: { type: 'string', description: 'The display label for the lane' },
            description: { type: 'string', description: 'Description of the lane' },
            order: { type: 'number', description: 'The order/position of this lane in the process' },
            active: { type: 'boolean', description: 'Whether the lane is active (default: true)' },
            laneCondition: { type: 'string', description: 'Condition that determines when this lane should be executed' },
            conditionToRun: { type: 'string', description: 'Additional condition for lane execution' }
          },
          required: ['processDefinitionId', 'name', 'order']
        }
      },
      {
        name: 'servicenow_update_process_lane',
        description: 'Update an existing process lane',
        inputSchema: {
          type: 'object',
          properties: {
            laneId: { type: 'string', description: 'The sys_id of the lane to update' },
            name: { type: 'string', description: 'The name of the lane' },
            label: { type: 'string', description: 'The display label for the lane' },
            description: { type: 'string', description: 'Description of the lane' },
            order: { type: 'number', description: 'The order/position of this lane in the process' },
            active: { type: 'boolean', description: 'Whether the lane is active' },
            laneCondition: { type: 'string', description: 'Condition that determines when this lane should be executed' },
            conditionToRun: { type: 'string', description: 'Additional condition for lane execution' }
          },
          required: ['laneId']
        }
      },
      {
        name: 'servicenow_delete_process_lane',
        description: 'Delete a process lane (sets active to false)',
        inputSchema: {
          type: 'object',
          properties: {
            laneId: { type: 'string', description: 'The sys_id of the lane to delete' },
            hardDelete: { type: 'boolean', description: 'Whether to permanently delete the record (default: false, just deactivates)' }
          },
          required: ['laneId']
        }
      },
      {
        name: 'servicenow_get_process_lane_schema',
        description: 'Get the schema/field definitions for the sys_pd_lane table',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async getProcessActivityTools() {
    return [
      {
        name: 'servicenow_list_process_activities',
        description: 'List process activities with filtering and sorting options',
        inputSchema: {
          type: 'object',
          properties: {
            laneId: { type: 'string', description: 'Filter activities by lane sys_id' },
            processDefinitionId: { type: 'string', description: 'Filter activities by process definition sys_id (via lane relationship)' },
            active: { type: 'boolean', description: 'Filter by active status (default: true)' },
            activityType: { type: 'string', description: 'Filter by activity type' },
            limit: { type: 'number', description: 'Maximum number of activities to return (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of activities to skip for pagination (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by (default: order)', enum: ['order', 'name', 'sys_created_on', 'sys_updated_on'] }
          }
        }
      },
      {
        name: 'servicenow_search_process_activities',
        description: 'Search process activities using advanced query filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'ServiceNow encoded query string for filtering activities' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all important fields)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 50)', minimum: 1, maximum: 1000 },
            offset: { type: 'number', description: 'Number of results to skip (default: 0)', minimum: 0 },
            orderBy: { type: 'string', description: 'Field to sort by with direction (e.g., ^name for ascending, name for descending)' }
          },
          required: ['query']
        }
      },
      {
        name: 'servicenow_get_process_activity',
        description: 'Get a specific process activity by its sys_id',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: { type: 'string', description: 'The sys_id of the activity to retrieve' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return (default: all fields)' }
          },
          required: ['activityId']
        }
      },
      {
        name: 'servicenow_create_process_activity',
        description: 'Create a new process activity',
        inputSchema: {
          type: 'object',
          properties: {
            laneId: { type: 'string', description: 'The sys_id of the lane this activity belongs to' },
            name: { type: 'string', description: 'The name of the activity' },
            label: { type: 'string', description: 'The display label for the activity' },
            description: { type: 'string', description: 'Description of the activity' },
            order: { type: 'number', description: 'The order/position of this activity in the lane' },
            active: { type: 'boolean', description: 'Whether the activity is active (default: true)' },
            activityDefinition: { type: 'string', description: 'The sys_id of the activity definition that defines this activity type' },
            inputs: { type: 'string', description: 'Input parameters for the activity (JSON format)' },
            outputs: { type: 'string', description: 'Output parameters for the activity (JSON format)' },
            conditionToRun: { type: 'string', description: 'Condition that determines when this activity should run' },
            restartRule: { type: 'string', description: 'Rule for restarting the activity (e.g., RUN_ONLY_ONCE, ALWAYS_RUN)' }
          },
          required: ['laneId', 'name', 'order']
        }
      },
      {
        name: 'servicenow_update_process_activity',
        description: 'Update an existing process activity',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: { type: 'string', description: 'The sys_id of the activity to update' },
            name: { type: 'string', description: 'The name of the activity' },
            label: { type: 'string', description: 'The display label for the activity' },
            description: { type: 'string', description: 'Description of the activity' },
            order: { type: 'number', description: 'The order/position of this activity in the lane' },
            active: { type: 'boolean', description: 'Whether the activity is active' },
            activityDefinition: { type: 'string', description: 'The sys_id of the activity definition' },
            inputs: { type: 'string', description: 'Input parameters for the activity (JSON format)' },
            outputs: { type: 'string', description: 'Output parameters for the activity (JSON format)' },
            conditionToRun: { type: 'string', description: 'Condition that determines when this activity should run' },
            restartRule: { type: 'string', description: 'Rule for restarting the activity' }
          },
          required: ['activityId']
        }
      },
      {
        name: 'servicenow_delete_process_activity',
        description: 'Delete a process activity (sets active to false)',
        inputSchema: {
          type: 'object',
          properties: {
            activityId: { type: 'string', description: 'The sys_id of the activity to delete' },
            hardDelete: { type: 'boolean', description: 'Whether to permanently delete the record (default: false, just deactivates)' }
          },
          required: ['activityId']
        }
      },
      {
        name: 'servicenow_get_process_activity_schema',
        description: 'Get the schema/field definitions for the sys_pd_activity table',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'servicenow_list_activity_definitions',
        description: 'List available activity definitions that can be used when creating activities',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status (default: true)' },
            limit: { type: 'number', description: 'Maximum number to return (default: 50)', minimum: 1, maximum: 1000 }
          }
        }
      }
    ];
  }

  // Remove the old tool handler methods
  async handleIncidentTool(toolName, args) {
    const { handleIncidentTools } = await import('./tools/incidents.js');
    return await handleIncidentTools(this.serviceNowClient, toolName, args);
  }

  async handleScriptIncludeTool(toolName, args) {
    const { handleScriptIncludeTools } = await import('./tools/script-includes.js');
    return await handleScriptIncludeTools(this.serviceNowClient, toolName, args);
  }

  async handleTableTool(toolName, args) {
    const { handleTableTools } = await import('./tools/table-api.js');
    return await handleTableTools(this.serviceNowClient, toolName, args);
  }

  async handleProcessDefinitionTool(toolName, args) {
    const { handleProcessDefinitionTools } = await import('./tools/process-definitions.js');
    return await handleProcessDefinitionTools(this.serviceNowClient, toolName, args);
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ServiceNow MCP server running on stdio');
  }
}

// Start the server
async function main() {
  const server = new ServiceNowMCPServer();
  await server.initialize();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

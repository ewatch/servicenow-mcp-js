import { ServiceNowClient } from '../servicenow-client.js';

/**
 * Register all process activity tools with the MCP server
 * @param {Object} server - MCP server instance
 */
export function registerProcessActivityTools(server) {
  // List activities
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'servicenow_list_process_activities') {
      return await handleProcessActivityTools(request);
    }
  });

  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'servicenow_list_process_activities',
          description: 'List process activities with filtering and sorting options',
          inputSchema: {
            type: 'object',
            properties: {
              laneId: {
                type: 'string',
                description: 'Filter activities by lane sys_id'
              },
              processDefinitionId: {
                type: 'string',
                description: 'Filter activities by process definition sys_id (via lane relationship)'
              },
              active: {
                type: 'boolean',
                description: 'Filter by active status (default: true)'
              },
              activityType: {
                type: 'string',
                description: 'Filter by activity type'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of activities to return (default: 50)',
                minimum: 1,
                maximum: 1000
              },
              offset: {
                type: 'number',
                description: 'Number of activities to skip for pagination (default: 0)',
                minimum: 0
              },
              orderBy: {
                type: 'string',
                description: 'Field to sort by (default: order)',
                enum: ['order', 'name', 'sys_created_on', 'sys_updated_on']
              }
            }
          }
        },
        {
          name: 'servicenow_search_process_activities',
          description: 'Search process activities using advanced query filters',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'ServiceNow encoded query string for filtering activities'
              },
              fields: {
                type: 'string',
                description: 'Comma-separated list of fields to return (default: all important fields)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 50)',
                minimum: 1,
                maximum: 1000
              },
              offset: {
                type: 'number',
                description: 'Number of results to skip (default: 0)',
                minimum: 0
              },
              orderBy: {
                type: 'string',
                description: 'Field to sort by with direction (e.g., ^name for ascending, name for descending)'
              }
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
              activityId: {
                type: 'string',
                description: 'The sys_id of the activity to retrieve'
              },
              fields: {
                type: 'string',
                description: 'Comma-separated list of fields to return (default: all fields)'
              }
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
              laneId: {
                type: 'string',
                description: 'The sys_id of the lane this activity belongs to'
              },
              name: {
                type: 'string',
                description: 'The name of the activity'
              },
              label: {
                type: 'string',
                description: 'The display label for the activity'
              },
              description: {
                type: 'string',
                description: 'Description of the activity'
              },
              order: {
                type: 'number',
                description: 'The order/position of this activity in the lane'
              },
              active: {
                type: 'boolean',
                description: 'Whether the activity is active (default: true)'
              },
              activityDefinition: {
                type: 'string',
                description: 'The sys_id of the activity definition that defines this activity type'
              },
              inputs: {
                type: 'string',
                description: 'Input parameters for the activity (JSON format)'
              },
              outputs: {
                type: 'string',
                description: 'Output parameters for the activity (JSON format)'
              },
              conditionToRun: {
                type: 'string',
                description: 'Condition that determines when this activity should run'
              },
              restartRule: {
                type: 'string',
                description: 'Rule for restarting the activity (e.g., RUN_ONLY_ONCE, ALWAYS_RUN)'
              }
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
              activityId: {
                type: 'string',
                description: 'The sys_id of the activity to update'
              },
              name: {
                type: 'string',
                description: 'The name of the activity'
              },
              label: {
                type: 'string',
                description: 'The display label for the activity'
              },
              description: {
                type: 'string',
                description: 'Description of the activity'
              },
              order: {
                type: 'number',
                description: 'The order/position of this activity in the lane'
              },
              active: {
                type: 'boolean',
                description: 'Whether the activity is active'
              },
              activityDefinition: {
                type: 'string',
                description: 'The sys_id of the activity definition'
              },
              inputs: {
                type: 'string',
                description: 'Input parameters for the activity (JSON format)'
              },
              outputs: {
                type: 'string',
                description: 'Output parameters for the activity (JSON format)'
              },
              conditionToRun: {
                type: 'string',
                description: 'Condition that determines when this activity should run'
              },
              restartRule: {
                type: 'string',
                description: 'Rule for restarting the activity'
              }
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
              activityId: {
                type: 'string',
                description: 'The sys_id of the activity to delete'
              },
              hardDelete: {
                type: 'boolean',
                description: 'Whether to permanently delete the record (default: false, just deactivates)'
              }
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
              active: {
                type: 'boolean',
                description: 'Filter by active status (default: true)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number to return (default: 50)',
                minimum: 1,
                maximum: 1000
              }
            }
          }
        }
      ]
    };
  });
}

/**
 * Handle process activity tool requests
 * @param {Object} request - MCP request object
 * @returns {Promise<Object>} Response object
 */
export async function handleProcessActivityTools(request) {
  const client = new ServiceNowClient({
    instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
    clientId: process.env.SERVICENOW_CLIENT_ID,
    clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
    username: process.env.SERVICENOW_USERNAME,
    password: process.env.SERVICENOW_PASSWORD,
    scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount',
    timeout: parseInt(process.env.SERVICENOW_TIMEOUT) || 30000,
  });

  await client.authenticate();

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'servicenow_list_process_activities':
        return await listProcessActivities(client, args);
      case 'servicenow_search_process_activities':
        return await searchProcessActivities(client, args);
      case 'servicenow_get_process_activity':
        return await getProcessActivity(client, args);
      case 'servicenow_create_process_activity':
        return await createProcessActivity(client, args);
      case 'servicenow_update_process_activity':
        return await updateProcessActivity(client, args);
      case 'servicenow_delete_process_activity':
        return await deleteProcessActivity(client, args);
      case 'servicenow_get_process_activity_schema':
        return await getProcessActivitySchema(client, args);
      case 'servicenow_list_activity_definitions':
        return await listActivityDefinitions(client, args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
}

async function listProcessActivities(client, args) {
  const {
    laneId,
    processDefinitionId,
    active = true,
    activityType,
    limit = 50,
    offset = 0,
    orderBy = 'order'
  } = args;

  let query = '';
  if (laneId) {
    query += `lane=${laneId}`;
  }
  if (processDefinitionId) {
    // We need to join with lanes to filter by process definition
    query += query ? `^lane.process_definition=${processDefinitionId}` : `lane.process_definition=${processDefinitionId}`;
  }
  if (active !== undefined) {
    query += query ? `^active=${active}` : `active=${active}`;
  }
  if (activityType) {
    query += query ? `^activity_definition.name=${activityType}` : `activity_definition.name=${activityType}`;
  }

  const fields = 'sys_id,name,label,description,lane,activity_definition,order,active,inputs,outputs,condition_to_run,restart_rule,sys_created_on,sys_updated_on';
  const result = await client.queryTable('sys_pd_activity', query, fields, limit, offset, `^${orderBy}`);

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.result.length} process activities:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function searchProcessActivities(client, args) {
  const { query, fields, limit = 50, offset = 0, orderBy } = args;

  const defaultFields = 'sys_id,name,label,description,lane,activity_definition,order,active,inputs,outputs,condition_to_run,restart_rule,sys_created_on,sys_updated_on';
  const result = await client.queryTable('sys_pd_activity', query, fields || defaultFields, limit, offset, orderBy);

  return {
    content: [
      {
        type: 'text',
        text: `Search found ${result.result.length} process activities:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function getProcessActivity(client, args) {
  const { activityId, fields } = args;

  const result = await client.getRecord('sys_pd_activity', activityId, fields);

  return {
    content: [
      {
        type: 'text',
        text: `Process activity details:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function createProcessActivity(client, args) {
  const {
    laneId,
    name,
    label,
    description,
    order,
    active = true,
    activityDefinition,
    inputs,
    outputs,
    conditionToRun,
    restartRule
  } = args;

  const data = {
    lane: laneId,
    name,
    order: order.toString(),
    active: active.toString()
  };

  if (label) data.label = label;
  if (description) data.description = description;
  if (activityDefinition) data.activity_definition = activityDefinition;
  if (inputs) data.inputs = inputs;
  if (outputs) data.outputs = outputs;
  if (conditionToRun) data.condition_to_run = conditionToRun;
  if (restartRule) data.restart_rule = restartRule;

  const result = await client.createRecord('sys_pd_activity', data);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully created process activity:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function updateProcessActivity(client, args) {
  const {
    activityId,
    name,
    label,
    description,
    order,
    active,
    activityDefinition,
    inputs,
    outputs,
    conditionToRun,
    restartRule
  } = args;

  const data = {};
  if (name !== undefined) data.name = name;
  if (label !== undefined) data.label = label;
  if (description !== undefined) data.description = description;
  if (order !== undefined) data.order = order.toString();
  if (active !== undefined) data.active = active.toString();
  if (activityDefinition !== undefined) data.activity_definition = activityDefinition;
  if (inputs !== undefined) data.inputs = inputs;
  if (outputs !== undefined) data.outputs = outputs;
  if (conditionToRun !== undefined) data.condition_to_run = conditionToRun;
  if (restartRule !== undefined) data.restart_rule = restartRule;

  const result = await client.updateRecord('sys_pd_activity', activityId, data);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully updated process activity:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function deleteProcessActivity(client, args) {
  const { activityId, hardDelete = false } = args;

  if (hardDelete) {
    await client.deleteRecord('sys_pd_activity', activityId);
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted process activity ${activityId}`,
        },
      ],
    };
  } else {
    const result = await client.updateRecord('sys_pd_activity', activityId, { active: 'false' });
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deactivated process activity:\n\n${JSON.stringify(result.result, null, 2)}`,
        },
      ],
    };
  }
}

async function getProcessActivitySchema(client, args) {
  const result = await client.queryTable(
    'sys_dictionary',
    'name=sys_pd_activity^active=true',
    'element,column_label,internal_type,max_length,mandatory,reference,dependent,default_value',
    100,
    0,
    '^element'
  );

  return {
    content: [
      {
        type: 'text',
        text: `Process activity table schema (${result.result.length} fields):\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function listActivityDefinitions(client, args) {
  const { active = true, limit = 50 } = args;

  let query = '';
  if (active !== undefined) {
    query = `active=${active}`;
  }

  const fields = 'sys_id,name,label,description,category,plugin,sys_created_on';
  const result = await client.queryTable('sys_pd_activity_definition', query, fields, limit, 0, '^name');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.result.length} activity definitions:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

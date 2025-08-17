import { ServiceNowClient } from '../servicenow-client.js';

/**
 * Register all process lane tools with the MCP server
 * @param {Object} server - MCP server instance
 */
export function registerProcessLaneTools(server) {
  // List lanes
  server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name === 'servicenow_list_process_lanes') {
      return await handleProcessLaneTools(request);
    }
  });

  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'servicenow_list_process_lanes',
          description: 'List process definition lanes with filtering and sorting options',
          inputSchema: {
            type: 'object',
            properties: {
              processDefinitionId: {
                type: 'string',
                description: 'Filter lanes by process definition sys_id'
              },
              active: {
                type: 'boolean',
                description: 'Filter by active status (default: true)'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of lanes to return (default: 50)',
                minimum: 1,
                maximum: 1000
              },
              offset: {
                type: 'number',
                description: 'Number of lanes to skip for pagination (default: 0)',
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
          name: 'servicenow_search_process_lanes',
          description: 'Search process lanes using advanced query filters',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'ServiceNow encoded query string for filtering lanes'
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
          name: 'servicenow_get_process_lane',
          description: 'Get a specific process lane by its sys_id',
          inputSchema: {
            type: 'object',
            properties: {
              laneId: {
                type: 'string',
                description: 'The sys_id of the lane to retrieve'
              },
              fields: {
                type: 'string',
                description: 'Comma-separated list of fields to return (default: all fields)'
              }
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
              processDefinitionId: {
                type: 'string',
                description: 'The sys_id of the process definition this lane belongs to'
              },
              name: {
                type: 'string',
                description: 'The name of the lane'
              },
              label: {
                type: 'string',
                description: 'The display label for the lane'
              },
              description: {
                type: 'string',
                description: 'Description of the lane'
              },
              order: {
                type: 'number',
                description: 'The order/position of this lane in the process'
              },
              active: {
                type: 'boolean',
                description: 'Whether the lane is active (default: true)'
              },
              laneCondition: {
                type: 'string',
                description: 'Condition that determines when this lane should be executed'
              },
              conditionToRun: {
                type: 'string',
                description: 'Additional condition for lane execution'
              }
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
              laneId: {
                type: 'string',
                description: 'The sys_id of the lane to update'
              },
              name: {
                type: 'string',
                description: 'The name of the lane'
              },
              label: {
                type: 'string',
                description: 'The display label for the lane'
              },
              description: {
                type: 'string',
                description: 'Description of the lane'
              },
              order: {
                type: 'number',
                description: 'The order/position of this lane in the process'
              },
              active: {
                type: 'boolean',
                description: 'Whether the lane is active'
              },
              laneCondition: {
                type: 'string',
                description: 'Condition that determines when this lane should be executed'
              },
              conditionToRun: {
                type: 'string',
                description: 'Additional condition for lane execution'
              }
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
              laneId: {
                type: 'string',
                description: 'The sys_id of the lane to delete'
              },
              hardDelete: {
                type: 'boolean',
                description: 'Whether to permanently delete the record (default: false, just deactivates)'
              }
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
      ]
    };
  });
}

/**
 * Handle process lane tool requests
 * @param {Object} request - MCP request object
 * @returns {Promise<Object>} Response object
 */
export async function handleProcessLaneTools(request) {
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
      case 'servicenow_list_process_lanes':
        return await listProcessLanes(client, args);
      case 'servicenow_search_process_lanes':
        return await searchProcessLanes(client, args);
      case 'servicenow_get_process_lane':
        return await getProcessLane(client, args);
      case 'servicenow_create_process_lane':
        return await createProcessLane(client, args);
      case 'servicenow_update_process_lane':
        return await updateProcessLane(client, args);
      case 'servicenow_delete_process_lane':
        return await deleteProcessLane(client, args);
      case 'servicenow_get_process_lane_schema':
        return await getProcessLaneSchema(client, args);
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

async function listProcessLanes(client, args) {
  const {
    processDefinitionId,
    active = true,
    limit = 50,
    offset = 0,
    orderBy = 'order'
  } = args;

  let query = '';
  if (processDefinitionId) {
    query += `process_definition=${processDefinitionId}`;
  }
  if (active !== undefined) {
    query += query ? `^active=${active}` : `active=${active}`;
  }

  const fields = 'sys_id,name,label,description,process_definition,order,active,lane_condition,condition_to_run,sys_created_on,sys_updated_on';
  const result = await client.queryTable('sys_pd_lane', query, fields, limit, offset, `^${orderBy}`);

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.result.length} process lanes:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function searchProcessLanes(client, args) {
  const { query, fields, limit = 50, offset = 0, orderBy } = args;

  const defaultFields = 'sys_id,name,label,description,process_definition,order,active,lane_condition,condition_to_run,sys_created_on,sys_updated_on';
  const result = await client.queryTable('sys_pd_lane', query, fields || defaultFields, limit, offset, orderBy);

  return {
    content: [
      {
        type: 'text',
        text: `Search found ${result.result.length} process lanes:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function getProcessLane(client, args) {
  const { laneId, fields } = args;

  const result = await client.getRecord('sys_pd_lane', laneId, fields);

  return {
    content: [
      {
        type: 'text',
        text: `Process lane details:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function createProcessLane(client, args) {
  const {
    processDefinitionId,
    name,
    label,
    description,
    order,
    active = true,
    laneCondition,
    conditionToRun
  } = args;

  const data = {
    process_definition: processDefinitionId,
    name,
    order: order.toString(),
    active: active.toString()
  };

  if (label) data.label = label;
  if (description) data.description = description;
  if (laneCondition) data.lane_condition = laneCondition;
  if (conditionToRun) data.condition_to_run = conditionToRun;

  const result = await client.createRecord('sys_pd_lane', data);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully created process lane:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function updateProcessLane(client, args) {
  const {
    laneId,
    name,
    label,
    description,
    order,
    active,
    laneCondition,
    conditionToRun
  } = args;

  const data = {};
  if (name !== undefined) data.name = name;
  if (label !== undefined) data.label = label;
  if (description !== undefined) data.description = description;
  if (order !== undefined) data.order = order.toString();
  if (active !== undefined) data.active = active.toString();
  if (laneCondition !== undefined) data.lane_condition = laneCondition;
  if (conditionToRun !== undefined) data.condition_to_run = conditionToRun;

  const result = await client.updateRecord('sys_pd_lane', laneId, data);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully updated process lane:\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

async function deleteProcessLane(client, args) {
  const { laneId, hardDelete = false } = args;

  if (hardDelete) {
    await client.deleteRecord('sys_pd_lane', laneId);
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted process lane ${laneId}`,
        },
      ],
    };
  } else {
    const result = await client.updateRecord('sys_pd_lane', laneId, { active: 'false' });
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deactivated process lane:\n\n${JSON.stringify(result.result, null, 2)}`,
        },
      ],
    };
  }
}

async function getProcessLaneSchema(client, args) {
  const result = await client.queryTable(
    'sys_dictionary',
    'name=sys_pd_lane^active=true',
    'element,column_label,internal_type,max_length,mandatory,reference,dependent,default_value',
    100,
    0,
    '^element'
  );

  return {
    content: [
      {
        type: 'text',
        text: `Process lane table schema (${result.result.length} fields):\n\n${JSON.stringify(result.result, null, 2)}`,
      },
    ],
  };
}

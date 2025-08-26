// Process Lanes tool handler - handles all process lane related tools

export function registerProcessLaneTools() {
  return [
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
    }
  ];
}

/**
 * Handle process lane tool requests
 * @param {ServiceNowClient} serviceNowClient - The authenticated ServiceNow client
 * @param {string} toolName - The name of the tool to execute
 * @param {Object} args - The arguments for the tool
 * @returns {Promise<Object>} Response object
 */
export async function handleProcessLaneTools(serviceNowClient, toolName, args) {
  try {
    switch (toolName) {
      case 'servicenow_list_process_lanes':
        return await listProcessLanes(serviceNowClient, args);
      case 'servicenow_search_process_lanes':
        return await searchProcessLanes(serviceNowClient, args);
      case 'servicenow_get_process_lane':
        return await getProcessLane(serviceNowClient, args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
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
  const fieldsToUse = fields || defaultFields;
  
  const result = await client.queryTable('sys_pd_lane', query, fieldsToUse, limit, offset, orderBy);

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.result.length} process lanes matching query:\n\n${JSON.stringify(result.result, null, 2)}`,
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

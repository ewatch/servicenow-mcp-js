// Process Activities tool handler - handles all process activity related tools

export function registerProcessActivityTools() {
  return [
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
    }
  ];
}

/**
 * Handle process activity tool requests
 * @param {ServiceNowClient} serviceNowClient - The authenticated ServiceNow client
 * @param {string} toolName - The name of the tool to execute
 * @param {Object} args - The arguments for the tool
 * @returns {Promise<Object>} Response object
 */
export async function handleProcessActivityTools(serviceNowClient, toolName, args) {
  try {
    switch (toolName) {
      case 'servicenow_list_process_activities':
        return await listProcessActivities(serviceNowClient, args);
      case 'servicenow_search_process_activities':
        return await searchProcessActivities(serviceNowClient, args);
      case 'servicenow_get_process_activity':
        return await getProcessActivity(serviceNowClient, args);
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
    // Need to query via lane relationship
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
  const fieldsToUse = fields || defaultFields;
  
  const result = await client.queryTable('sys_pd_activity', query, fieldsToUse, limit, offset, orderBy);

  return {
    content: [
      {
        type: 'text',
        text: `Found ${result.result.length} process activities matching query:\n\n${JSON.stringify(result.result, null, 2)}`,
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

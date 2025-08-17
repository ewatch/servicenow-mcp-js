export function registerIncidentTools() {
  return [
    {
      name: 'servicenow_incident_get',
      description: 'Retrieve a specific incident by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the incident to retrieve'
          },
          fields: {
            type: 'string',
            description: 'Comma-separated list of fields to retrieve (optional)'
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_incident_create',
      description: 'Create a new incident in ServiceNow',
      inputSchema: {
        type: 'object',
        properties: {
          short_description: {
            type: 'string',
            description: 'Brief description of the incident'
          },
          description: {
            type: 'string',
            description: 'Detailed description of the incident'
          },
          caller_id: {
            type: 'string',
            description: 'Sys_id of the caller (user who reported the incident)'
          },
          category: {
            type: 'string',
            description: 'Category of the incident (e.g., "software", "hardware")'
          },
          subcategory: {
            type: 'string',
            description: 'Subcategory of the incident'
          },
          priority: {
            type: 'string',
            description: 'Priority level (1-Critical, 2-High, 3-Moderate, 4-Low, 5-Planning)',
            enum: ['1', '2', '3', '4', '5']
          },
          urgency: {
            type: 'string',
            description: 'Urgency level (1-High, 2-Medium, 3-Low)',
            enum: ['1', '2', '3']
          },
          impact: {
            type: 'string',
            description: 'Impact level (1-High, 2-Medium, 3-Low)',
            enum: ['1', '2', '3']
          },
          assignment_group: {
            type: 'string',
            description: 'Sys_id of the assignment group'
          },
          assigned_to: {
            type: 'string',
            description: 'Sys_id of the assigned user'
          }
        },
        required: ['short_description']
      }
    },
    {
      name: 'servicenow_incident_update',
      description: 'Update an existing incident',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the incident to update'
          },
          short_description: {
            type: 'string',
            description: 'Brief description of the incident'
          },
          description: {
            type: 'string',
            description: 'Detailed description of the incident'
          },
          state: {
            type: 'string',
            description: 'Incident state (1-New, 2-In Progress, 3-On Hold, 6-Resolved, 7-Closed)',
            enum: ['1', '2', '3', '6', '7']
          },
          priority: {
            type: 'string',
            description: 'Priority level (1-Critical, 2-High, 3-Moderate, 4-Low, 5-Planning)',
            enum: ['1', '2', '3', '4', '5']
          },
          urgency: {
            type: 'string',
            description: 'Urgency level (1-High, 2-Medium, 3-Low)',
            enum: ['1', '2', '3']
          },
          impact: {
            type: 'string',
            description: 'Impact level (1-High, 2-Medium, 3-Low)',
            enum: ['1', '2', '3']
          },
          assignment_group: {
            type: 'string',
            description: 'Sys_id of the assignment group'
          },
          assigned_to: {
            type: 'string',
            description: 'Sys_id of the assigned user'
          },
          work_notes: {
            type: 'string',
            description: 'Work notes to add to the incident'
          },
          close_code: {
            type: 'string',
            description: 'Close code when resolving/closing the incident'
          },
          close_notes: {
            type: 'string',
            description: 'Close notes when resolving/closing the incident'
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_incident_list',
      description: 'List incidents with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'ServiceNow query string to filter incidents (e.g., "state=1^priority=1")'
          },
          fields: {
            type: 'string',
            description: 'Comma-separated list of fields to retrieve'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records to return (default: 100)',
            minimum: 1,
            maximum: 1000
          },
          offset: {
            type: 'number',
            description: 'Number of records to skip (for pagination)',
            minimum: 0
          },
          order_by: {
            type: 'string',
            description: 'Field to order by (prefix with ^ for descending, e.g., "^sys_created_on")'
          }
        }
      }
    }
  ];
}

export async function handleIncidentTools(serviceNowClient, toolName, args) {
  switch (toolName) {
    case 'servicenow_incident_get':
      return await handleGetIncident(serviceNowClient, args);
    case 'servicenow_incident_create':
      return await handleCreateIncident(serviceNowClient, args);
    case 'servicenow_incident_update':
      return await handleUpdateIncident(serviceNowClient, args);
    case 'servicenow_incident_list':
      return await handleListIncidents(serviceNowClient, args);
    default:
      throw new Error(`Unknown incident tool: ${toolName}`);
  }
}

async function handleGetIncident(serviceNowClient, args) {
  try {
    const { sys_id, fields } = args;
    const result = await serviceNowClient.getIncident(sys_id, fields);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully retrieved incident ${sys_id}:\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving incident: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleCreateIncident(serviceNowClient, args) {
  try {
    const result = await serviceNowClient.createIncident(args);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created incident ${result.result.number} (sys_id: ${result.result.sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating incident: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleUpdateIncident(serviceNowClient, args) {
  try {
    const { sys_id, ...updateData } = args;
    const result = await serviceNowClient.updateIncident(sys_id, updateData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated incident ${result.result.number} (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating incident: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleListIncidents(serviceNowClient, args) {
  try {
    const { query, fields, limit = 100, offset = 0, order_by } = args;
    const result = await serviceNowClient.queryIncidents(query, fields, limit, offset, order_by);
    
    const incidents = result.result;
    const count = incidents.length;
    
    let text = `Found ${count} incident(s)`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No incidents found matching the criteria.';
    } else {
      incidents.forEach((incident, index) => {
        text += `${index + 1}. ${incident.number} - ${incident.short_description}\n`;
        text += `   State: ${getStateLabel(incident.state)} | Priority: ${incident.priority} | Created: ${incident.sys_created_on}\n`;
        if (incident.assigned_to) {
          text += `   Assigned to: ${incident.assigned_to.display_value || incident.assigned_to}\n`;
        }
        text += '\n';
      });
    }
    
    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing incidents: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

function getStateLabel(state) {
  const stateLabels = {
    '1': 'New',
    '2': 'In Progress',
    '3': 'On Hold',
    '6': 'Resolved',
    '7': 'Closed'
  };
  return stateLabels[state] || `Unknown (${state})`;
}

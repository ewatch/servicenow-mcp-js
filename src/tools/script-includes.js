export function registerScriptIncludeTools() {
  return [
    {
      name: 'servicenow_script_include_get',
      description: 'Retrieve a specific script include by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the script include to retrieve'
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
      name: 'servicenow_script_include_create',
      description: 'Create a new script include in ServiceNow',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the script include'
          },
          script: {
            type: 'string',
            description: 'The JavaScript code for the script include'
          },
          description: {
            type: 'string',
            description: 'Description of what the script include does'
          },
          api_name: {
            type: 'string',
            description: 'API name for the script include (if different from name)'
          },
          client_callable: {
            type: 'boolean',
            description: 'Whether the script include can be called from client-side scripts'
          },
          active: {
            type: 'boolean',
            description: 'Whether the script include is active (default: true)'
          },
          access: {
            type: 'string',
            description: 'Access level for the script include',
            enum: ['public', 'package_private']
          }
        },
        required: ['name', 'script']
      }
    },
    {
      name: 'servicenow_script_include_update',
      description: 'Update an existing script include',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the script include to update'
          },
          name: {
            type: 'string',
            description: 'Name of the script include'
          },
          script: {
            type: 'string',
            description: 'The JavaScript code for the script include'
          },
          description: {
            type: 'string',
            description: 'Description of what the script include does'
          },
          api_name: {
            type: 'string',
            description: 'API name for the script include'
          },
          client_callable: {
            type: 'boolean',
            description: 'Whether the script include can be called from client-side scripts'
          },
          active: {
            type: 'boolean',
            description: 'Whether the script include is active'
          },
          access: {
            type: 'string',
            description: 'Access level for the script include',
            enum: ['public', 'package_private']
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_script_include_list',
      description: 'List script includes with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'ServiceNow query string to filter script includes (e.g., "active=true^nameSTARTSWITHUtil")'
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
    },
    {
      name: 'servicenow_script_include_search',
      description: 'Search script includes by name or content',
      inputSchema: {
        type: 'object',
        properties: {
          search_term: {
            type: 'string',
            description: 'Term to search for in script include names or content'
          },
          search_in_script: {
            type: 'boolean',
            description: 'Whether to search in the script content as well (default: false)'
          },
          active_only: {
            type: 'boolean',
            description: 'Whether to search only active script includes (default: true)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of records to return (default: 50)',
            minimum: 1,
            maximum: 200
          }
        },
        required: ['search_term']
      }
    }
  ];
}

export async function handleScriptIncludeTools(serviceNowClient, toolName, args) {
  switch (toolName) {
    case 'servicenow_script_include_get':
      return await handleGetScriptInclude(serviceNowClient, args);
    case 'servicenow_script_include_create':
      return await handleCreateScriptInclude(serviceNowClient, args);
    case 'servicenow_script_include_update':
      return await handleUpdateScriptInclude(serviceNowClient, args);
    case 'servicenow_script_include_list':
      return await handleListScriptIncludes(serviceNowClient, args);
    case 'servicenow_script_include_search':
      return await handleSearchScriptIncludes(serviceNowClient, args);
    default:
      throw new Error(`Unknown script include tool: ${toolName}`);
  }
}

async function handleGetScriptInclude(serviceNowClient, args) {
  try {
    const { sys_id, fields } = args;
    const result = await serviceNowClient.getScriptInclude(sys_id, fields);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully retrieved script include "${result.result.name}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving script include: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleCreateScriptInclude(serviceNowClient, args) {
  try {
    // Set defaults for optional fields
    const scriptData = {
      active: true,
      client_callable: false,
      access: 'public',
      ...args
    };
    
    const result = await serviceNowClient.createScriptInclude(scriptData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created script include "${result.result.name}" (sys_id: ${result.result.sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating script include: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleUpdateScriptInclude(serviceNowClient, args) {
  try {
    const { sys_id, ...updateData } = args;
    const result = await serviceNowClient.updateScriptInclude(sys_id, updateData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated script include "${result.result.name}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating script include: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleListScriptIncludes(serviceNowClient, args) {
  try {
    const { query, fields, limit = 100, offset = 0, order_by } = args;
    const result = await serviceNowClient.queryScriptIncludes(query, fields, limit, offset, order_by);
    
    const scriptIncludes = result.result;
    const count = scriptIncludes.length;
    
    let text = `Found ${count} script include(s)`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No script includes found matching the criteria.';
    } else {
      scriptIncludes.forEach((script, index) => {
        text += `${index + 1}. ${script.name}`;
        if (script.api_name && script.api_name !== script.name) {
          text += ` (API: ${script.api_name})`;
        }
        text += '\n';
        
        if (script.description) {
          text += `   Description: ${script.description}\n`;
        }
        
        text += `   Active: ${script.active === 'true' ? 'Yes' : 'No'}`;
        if (script.client_callable === 'true') {
          text += ' | Client Callable: Yes';
        }
        text += `\n   Created: ${script.sys_created_on}\n\n`;
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
          text: `Error listing script includes: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleSearchScriptIncludes(serviceNowClient, args) {
  try {
    const { search_term, search_in_script = false, active_only = true, limit = 50 } = args;
    
    let query = '';
    
    // Build query based on search parameters
    if (active_only) {
      query = 'active=true^';
    }
    
    // Search in name
    query += `nameLIKE${search_term}`;
    
    // Also search in API name
    query += `^ORapi_nameLIKE${search_term}`;
    
    // Search in script content if requested
    if (search_in_script) {
      query += `^ORscriptLIKE${search_term}`;
    }
    
    const result = await serviceNowClient.queryScriptIncludes(query, null, limit, 0);
    
    const scriptIncludes = result.result;
    const count = scriptIncludes.length;
    
    let text = `Found ${count} script include(s) matching "${search_term}"`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No script includes found matching the search term.';
    } else {
      scriptIncludes.forEach((script, index) => {
        text += `${index + 1}. ${script.name}`;
        if (script.api_name && script.api_name !== script.name) {
          text += ` (API: ${script.api_name})`;
        }
        text += '\n';
        
        if (script.description) {
          text += `   Description: ${script.description}\n`;
        }
        
        // Show snippet of script if search was in content and match found
        if (search_in_script && script.script && script.script.toLowerCase().includes(search_term.toLowerCase())) {
          const scriptSnippet = script.script.substring(0, 200);
          text += `   Script snippet: ${scriptSnippet}${script.script.length > 200 ? '...' : ''}\n`;
        }
        
        text += `   Active: ${script.active === 'true' ? 'Yes' : 'No'}\n\n`;
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
          text: `Error searching script includes: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

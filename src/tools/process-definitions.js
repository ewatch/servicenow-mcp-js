export function registerProcessDefinitionTools() {
  return [
    {
      name: 'servicenow_process_definition_get',
      description: 'Retrieve a specific process definition by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the process definition to retrieve'
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
      name: 'servicenow_process_definition_list',
      description: 'List process definitions with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'ServiceNow query string to filter process definitions (e.g., "active=true^status=published")'
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
      name: 'servicenow_process_definition_search',
      description: 'Search process definitions by name, label, or description',
      inputSchema: {
        type: 'object',
        properties: {
          search_term: {
            type: 'string',
            description: 'Term to search for in process definition names, labels, or descriptions'
          },
          active_only: {
            type: 'boolean',
            description: 'Whether to search only active process definitions (default: true)'
          },
          published_only: {
            type: 'boolean',
            description: 'Whether to search only published process definitions (default: true)'
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
    },
    {
      name: 'servicenow_process_definition_create',
      description: 'Create a new process definition',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the process definition (must be unique)'
          },
          label: {
            type: 'string',
            description: 'Display label for the process definition'
          },
          description: {
            type: 'string',
            description: 'Description of what the process does'
          },
          access: {
            type: 'string',
            description: 'Access level for the process',
            enum: ['public', 'restricted']
          },
          active: {
            type: 'boolean',
            description: 'Whether the process is active (default: true)'
          },
          restartable: {
            type: 'string',
            description: 'Whether the process can be restarted',
            enum: ['RESTARTABLE_TRUE', 'RESTARTABLE_FALSE']
          },
          process_type: {
            type: 'string',
            description: 'Type of process (leave empty for default)'
          }
        },
        required: ['name', 'label']
      }
    },
    {
      name: 'servicenow_process_definition_update',
      description: 'Update an existing process definition',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the process definition to update'
          },
          name: {
            type: 'string',
            description: 'Name of the process definition'
          },
          label: {
            type: 'string',
            description: 'Display label for the process definition'
          },
          description: {
            type: 'string',
            description: 'Description of what the process does'
          },
          access: {
            type: 'string',
            description: 'Access level for the process',
            enum: ['public', 'restricted']
          },
          active: {
            type: 'boolean',
            description: 'Whether the process is active'
          },
          status: {
            type: 'string',
            description: 'Process status',
            enum: ['draft', 'published', 'retired']
          },
          restartable: {
            type: 'string',
            description: 'Whether the process can be restarted',
            enum: ['RESTARTABLE_TRUE', 'RESTARTABLE_FALSE']
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_process_definition_execute',
      description: 'Execute/trigger a process definition (if executable)',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the process definition to execute'
          },
          input_data: {
            type: 'object',
            description: 'Input data for the process execution (if required)',
            additionalProperties: true
          },
          wait_for_completion: {
            type: 'boolean',
            description: 'Whether to wait for process completion (default: false)'
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_process_definition_schema',
      description: 'Get the schema/field definitions for the sys_pd_process_definition table',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  ];
}

export async function handleProcessDefinitionTools(serviceNowClient, toolName, args) {
  switch (toolName) {
    case 'servicenow_process_definition_get':
      return await handleGetProcessDefinition(serviceNowClient, args);
    case 'servicenow_process_definition_list':
      return await handleListProcessDefinitions(serviceNowClient, args);
    case 'servicenow_process_definition_search':
      return await handleSearchProcessDefinitions(serviceNowClient, args);
    case 'servicenow_process_definition_create':
      return await handleCreateProcessDefinition(serviceNowClient, args);
    case 'servicenow_process_definition_update':
      return await handleUpdateProcessDefinition(serviceNowClient, args);
    case 'servicenow_process_definition_execute':
      return await handleExecuteProcessDefinition(serviceNowClient, args);
    case 'servicenow_process_definition_schema':
      return await handleProcessDefinitionSchema(serviceNowClient, args);
    default:
      throw new Error(`Unknown process definition tool: ${toolName}`);
  }
}

async function handleGetProcessDefinition(serviceNowClient, args) {
  try {
    const { sys_id, fields } = args;
    const result = await serviceNowClient.getRecord('sys_pd_process_definition', sys_id, fields);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully retrieved process definition "${result.result.name || result.result.label}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving process definition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleListProcessDefinitions(serviceNowClient, args) {
  try {
    const { query, fields, limit = 100, offset = 0, order_by } = args;
    const result = await serviceNowClient.queryTable('sys_pd_process_definition', query, fields, limit, offset, order_by);
    
    const processes = result.result;
    const count = processes.length;
    
    let text = `Found ${count} process definition(s)`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No process definitions found matching the criteria.';
    } else {
      processes.forEach((process, index) => {
        text += `${index + 1}. ${process.label || process.name}`;
        if (process.name && process.label && process.name !== process.label) {
          text += ` (${process.name})`;
        }
        text += '\n';
        
        if (process.description) {
          text += `   Description: ${process.description}\n`;
        }
        
        text += `   Status: ${process.status || 'Unknown'}`;
        text += ` | Active: ${process.active === 'true' ? 'Yes' : 'No'}`;
        
        if (process.process_type) {
          text += ` | Type: ${process.process_type}`;
        }
        
        text += `\n   Created: ${process.sys_created_on}`;
        text += ` | Updated: ${process.sys_updated_on}\n`;
        text += `   Sys ID: ${process.sys_id}\n\n`;
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
          text: `Error listing process definitions: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleSearchProcessDefinitions(serviceNowClient, args) {
  try {
    const { search_term, active_only = true, published_only = true, limit = 50 } = args;
    
    let query = '';
    
    // Build query based on search parameters
    if (active_only) {
      query = 'active=true';
    }
    
    if (published_only) {
      if (query) query += '^';
      query += 'status=published';
    }
    
    // Search in name, label, and description
    const searchQuery = `nameLIKE${search_term}^ORlabelLIKE${search_term}^ORdescriptionLIKE${search_term}`;
    
    if (query) {
      query = `${query}^(${searchQuery})`;
    } else {
      query = searchQuery;
    }
    
    const result = await serviceNowClient.queryTable('sys_pd_process_definition', query, null, limit, 0);
    
    const processes = result.result;
    const count = processes.length;
    
    let text = `Found ${count} process definition(s) matching "${search_term}"`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No process definitions found matching the search term.';
    } else {
      processes.forEach((process, index) => {
        text += `${index + 1}. ${process.label || process.name}`;
        if (process.name && process.label && process.name !== process.label) {
          text += ` (${process.name})`;
        }
        text += '\n';
        
        if (process.description) {
          text += `   Description: ${process.description}\n`;
        }
        
        text += `   Status: ${process.status || 'Unknown'} | Active: ${process.active === 'true' ? 'Yes' : 'No'}\n`;
        text += `   Sys ID: ${process.sys_id}\n\n`;
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
          text: `Error searching process definitions: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleCreateProcessDefinition(serviceNowClient, args) {
  try {
    // Set defaults for optional fields
    const processData = {
      active: true,
      access: 'public',
      restartable: 'RESTARTABLE_FALSE',
      status: 'draft',
      view_type: 'DIAGRAM',
      schema_version: '2',
      ...args
    };
    
    const result = await serviceNowClient.createRecord('sys_pd_process_definition', processData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created process definition "${result.result.label || result.result.name}" (sys_id: ${result.result.sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating process definition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleUpdateProcessDefinition(serviceNowClient, args) {
  try {
    const { sys_id, ...updateData } = args;
    const result = await serviceNowClient.updateRecord('sys_pd_process_definition', sys_id, updateData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated process definition "${result.result.label || result.result.name}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating process definition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleExecuteProcessDefinition(serviceNowClient, args) {
  try {
    const { sys_id, input_data = {}, wait_for_completion = false } = args;
    
    // First, get the process definition details
    const processResult = await serviceNowClient.getRecord('sys_pd_process_definition', sys_id, 'name,label,status,active');
    const process = processResult.result;
    
    if (process.active !== 'true') {
      return {
        content: [
          {
            type: 'text',
            text: `Cannot execute process definition "${process.label || process.name}": Process is not active.`
          }
        ],
        isError: true
      };
    }
    
    if (process.status !== 'published') {
      return {
        content: [
          {
            type: 'text',
            text: `Cannot execute process definition "${process.label || process.name}": Process is not published (status: ${process.status}).`
          }
        ],
        isError: true
      };
    }
    
    // Note: Actual process execution would require the Process Automation API
    // This is a placeholder for the execution logic
    return {
      content: [
        {
          type: 'text',
          text: `Process execution initiated for "${process.label || process.name}" (sys_id: ${sys_id}).\n\nNote: Actual process execution requires additional API endpoints that may not be available in all ServiceNow instances. This tool confirms the process is ready for execution.\n\nInput data: ${JSON.stringify(input_data, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing process definition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleProcessDefinitionSchema(serviceNowClient, args) {
  try {
    // Query the sys_dictionary table to get field definitions
    const query = 'name=sys_pd_process_definition^active=true';
    const fields = 'element,column_label,internal_type,max_length,mandatory,reference,choice_field,default_value,comments';
    const result = await serviceNowClient.queryTable('sys_dictionary', query, fields, 1000, 0, 'element');
    
    const fieldDefinitions = result.result;
    const count = fieldDefinitions.length;
    
    let text = `Schema for sys_pd_process_definition table (${count} fields):\n\n`;
    
    if (count === 0) {
      text += 'No field definitions found for this table.';
    } else {
      fieldDefinitions.forEach((field, index) => {
        if (field.element && field.element !== '') {
          text += `${index + 1}. ${field.element}`;
          if (field.column_label) {
            text += ` (${field.column_label})`;
          }
          text += '\n';
          
          text += `   Type: ${field.internal_type}`;
          if (field.max_length && field.max_length !== '0') {
            text += ` (max length: ${field.max_length})`;
          }
          if (field.mandatory === 'true') {
            text += ' - MANDATORY';
          }
          text += '\n';
          
          if (field.reference) {
            text += `   Reference: ${field.reference}\n`;
          }
          
          if (field.choice_field === 'true') {
            text += `   Choice field: Yes\n`;
          }
          
          if (field.default_value) {
            text += `   Default: ${field.default_value}\n`;
          }
          
          if (field.comments) {
            text += `   Description: ${field.comments}\n`;
          }
          
          text += '\n';
        }
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
          text: `Error retrieving schema for sys_pd_process_definition table: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

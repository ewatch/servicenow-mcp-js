export function registerTableTools() {
  return [
    {
      name: 'servicenow_query_table',
      description: 'Query any ServiceNow table with filtering and pagination',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the ServiceNow table to query'
          },
          query: {
            type: 'string',
            description: 'ServiceNow query string to filter records (e.g., "active=true^stateIN1,2")'
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
        },
        required: ['table']
      }
    },
    {
      name: 'servicenow_get_record',
      description: 'Get a specific record from any ServiceNow table by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the ServiceNow table'
          },
          sys_id: {
            type: 'string',
            description: 'The sys_id of the record to retrieve'
          },
          fields: {
            type: 'string',
            description: 'Comma-separated list of fields to retrieve (optional)'
          }
        },
        required: ['table', 'sys_id']
      }
    },
    {
      name: 'servicenow_create_record',
      description: 'Create a new record in any ServiceNow table',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the ServiceNow table'
          },
          data: {
            type: 'object',
            description: 'Object containing the field values for the new record',
            additionalProperties: true
          }
        },
        required: ['table', 'data']
      }
    },
    {
      name: 'servicenow_update_record',
      description: 'Update an existing record in any ServiceNow table',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the ServiceNow table'
          },
          sys_id: {
            type: 'string',
            description: 'The sys_id of the record to update'
          },
          data: {
            type: 'object',
            description: 'Object containing the field values to update',
            additionalProperties: true
          }
        },
        required: ['table', 'sys_id', 'data']
      }
    },
    {
      name: 'servicenow_table_schema',
      description: 'Get schema information for a ServiceNow table (field definitions)',
      inputSchema: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            description: 'Name of the ServiceNow table to get schema for'
          }
        },
        required: ['table']
      }
    }
  ];
}

export async function handleTableTools(serviceNowClient, toolName, args) {
  switch (toolName) {
    case 'servicenow_query_table':
      return await handleQueryTable(serviceNowClient, args);
    case 'servicenow_get_record':
      return await handleGetRecord(serviceNowClient, args);
    case 'servicenow_create_record':
      return await handleCreateRecord(serviceNowClient, args);
    case 'servicenow_update_record':
      return await handleUpdateRecord(serviceNowClient, args);
    case 'servicenow_table_schema':
      return await handleTableSchema(serviceNowClient, args);
    default:
      throw new Error(`Unknown table tool: ${toolName}`);
  }
}

async function handleQueryTable(serviceNowClient, args) {
  try {
    const { table, query, fields, limit = 100, offset = 0, order_by } = args;
    const result = await serviceNowClient.queryTable(table, query, fields, limit, offset, order_by);
    
    const records = result.result;
    const count = records.length;
    
    let text = `Found ${count} record(s) in table "${table}"`;
    if (limit && count === limit) {
      text += ` (showing first ${limit})`;
    }
    text += ':\n\n';
    
    if (count === 0) {
      text += 'No records found matching the criteria.';
    } else {
      records.forEach((record, index) => {
        text += `${index + 1}. Record ${record.sys_id}:\n`;
        
        // Show key fields if available
        const keyFields = ['number', 'name', 'title', 'short_description', 'display_value'];
        const shownFields = [];
        
        keyFields.forEach(field => {
          if (record[field] && record[field] !== '') {
            text += `   ${field}: ${record[field]}\n`;
            shownFields.push(field);
          }
        });
        
        // Show other important fields
        Object.keys(record).forEach(field => {
          if (!shownFields.includes(field) && 
              !field.startsWith('sys_') && 
              field !== 'sys_id' && 
              record[field] && 
              record[field] !== '') {
            text += `   ${field}: ${record[field]}\n`;
          }
        });
        
        text += `   sys_created_on: ${record.sys_created_on}\n\n`;
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
          text: `Error querying table "${args.table}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleGetRecord(serviceNowClient, args) {
  try {
    const { table, sys_id, fields } = args;
    const result = await serviceNowClient.getRecord(table, sys_id, fields);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully retrieved record from table "${table}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving record from table "${args.table}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleCreateRecord(serviceNowClient, args) {
  try {
    const { table, data } = args;
    const result = await serviceNowClient.createRecord(table, data);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created record in table "${table}" (sys_id: ${result.result.sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating record in table "${args.table}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleUpdateRecord(serviceNowClient, args) {
  try {
    const { table, sys_id, data } = args;
    const result = await serviceNowClient.updateRecord(table, sys_id, data);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated record in table "${table}" (sys_id: ${sys_id}):\n\n${JSON.stringify(result.result, null, 2)}`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating record in table "${args.table}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

async function handleTableSchema(serviceNowClient, args) {
  try {
    const { table } = args;
    
    // Query the sys_dictionary table to get field definitions
    const query = `name=${table}^active=true`;
    const fields = 'element,column_label,internal_type,max_length,mandatory,reference,choice_field,default_value,comments';
    const result = await serviceNowClient.queryTable('sys_dictionary', query, fields, 1000, 0, 'element');
    
    const fieldDefinitions = result.result;
    const count = fieldDefinitions.length;
    
    let text = `Schema for table "${table}" (${count} fields):\n\n`;
    
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
          text: `Error retrieving schema for table "${args.table}": ${error.message}`
        }
      ],
      isError: true
    };
  }
}

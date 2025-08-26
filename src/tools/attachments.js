export function registerAttachmentTools() {
  return [
    {
      name: 'servicenow_attachment_list',
      description: 'List attachments for a specific record',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Name of the table (e.g., "incident", "change_request")'
          },
          table_sys_id: {
            type: 'string',
            description: 'The sys_id of the record to list attachments for'
          },
          fields: {
            type: 'string',
            description: 'Comma-separated list of fields to retrieve (optional)',
            default: 'sys_id,file_name,content_type,size_bytes,sys_created_on'
          }
        },
        required: ['table_name', 'table_sys_id']
      }
    },
    {
      name: 'servicenow_attachment_get',
      description: 'Get attachment metadata by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the attachment to retrieve'
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
      name: 'servicenow_attachment_download',
      description: 'Download attachment content by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the attachment to download'
          },
          encoding: {
            type: 'string',
            description: 'Encoding format for the response (base64, binary)',
            enum: ['base64', 'binary'],
            default: 'base64'
          }
        },
        required: ['sys_id']
      }
    },
    {
      name: 'servicenow_attachment_upload',
      description: 'Upload a file as an attachment to a record',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Name of the table to attach the file to'
          },
          table_sys_id: {
            type: 'string',
            description: 'The sys_id of the record to attach the file to'
          },
          file_name: {
            type: 'string',
            description: 'Name of the file'
          },
          content_type: {
            type: 'string',
            description: 'MIME type of the file (e.g., "image/png", "text/plain")'
          },
          file_content: {
            type: 'string',
            description: 'Base64 encoded content of the file'
          }
        },
        required: ['table_name', 'table_sys_id', 'file_name', 'content_type', 'file_content']
      }
    },
    {
      name: 'servicenow_attachment_delete',
      description: 'Delete an attachment by sys_id',
      inputSchema: {
        type: 'object',
        properties: {
          sys_id: {
            type: 'string',
            description: 'The sys_id of the attachment to delete'
          }
        },
        required: ['sys_id']
      }
    }
  ];
}

export async function handleAttachmentTools(client, name, args) {
  if (!client) {
    throw new Error('ServiceNow client is not initialized');
  }

  switch (name) {
    case 'servicenow_attachment_list':
      return await listAttachments(client, args);
    case 'servicenow_attachment_get':
      return await getAttachment(client, args);
    case 'servicenow_attachment_download':
      return await downloadAttachment(client, args);
    case 'servicenow_attachment_upload':
      return await uploadAttachment(client, args);
    case 'servicenow_attachment_delete':
      return await deleteAttachment(client, args);
    default:
      throw new Error(`Unknown attachment tool: ${name}`);
  }
}

async function listAttachments(client, args) {
  const { table_name, table_sys_id, fields = 'sys_id,file_name,content_type,size_bytes,sys_created_on' } = args;

  try {
    const query = `table_name=${table_name}^table_sys_id=${table_sys_id}`;
    const response = await client.request('GET', '/table/sys_attachment', {
      sysparm_query: query,
      sysparm_fields: fields,
      sysparm_limit: 100
    });

    return {
      success: true,
      count: response.result.length,
      attachments: response.result
    };
  } catch (error) {
    throw new Error(`Failed to list attachments: ${error.message}`);
  }
}

async function getAttachment(client, args) {
  const { sys_id, fields } = args;

  try {
    const params = fields ? { sysparm_fields: fields } : {};
    const response = await client.request('GET', `/table/sys_attachment/${sys_id}`, params);

    if (!response.result) {
      throw new Error('Attachment not found');
    }

    return {
      success: true,
      attachment: response.result
    };
  } catch (error) {
    throw new Error(`Failed to get attachment: ${error.message}`);
  }
}

async function downloadAttachment(client, args) {
  const { sys_id, encoding = 'base64' } = args;

  try {
    // First get attachment metadata
    const metadataResponse = await client.request('GET', `/table/sys_attachment/${sys_id}`);
    
    if (!metadataResponse.result) {
      throw new Error('Attachment not found');
    }

    // Then get the actual file content
    const fileResponse = await client.request('GET', `/attachment/${sys_id}/file`, null, {
      responseType: encoding === 'binary' ? 'arraybuffer' : 'text'
    });

    let content;
    if (encoding === 'base64') {
      content = Buffer.isBuffer(fileResponse) 
        ? fileResponse.toString('base64')
        : Buffer.from(fileResponse).toString('base64');
    } else {
      content = fileResponse;
    }

    return {
      success: true,
      attachment: {
        ...metadataResponse.result,
        content,
        encoding
      }
    };
  } catch (error) {
    throw new Error(`Failed to download attachment: ${error.message}`);
  }
}

async function uploadAttachment(client, args) {
  const { table_name, table_sys_id, file_name, content_type, file_content } = args;

  try {
    // Create the attachment record
    const attachmentData = {
      table_name,
      table_sys_id,
      file_name,
      content_type
    };

    const createResponse = await client.request('POST', '/table/sys_attachment', attachmentData);

    if (!createResponse.result) {
      throw new Error('Failed to create attachment record');
    }

    const attachmentSysId = createResponse.result.sys_id;

    // Upload the file content
    const uploadResponse = await client.request('PUT', `/attachment/${attachmentSysId}/file`, file_content, {
      headers: {
        'Content-Type': content_type
      }
    });

    return {
      success: true,
      attachment: {
        sys_id: attachmentSysId,
        file_name,
        content_type,
        table_name,
        table_sys_id,
        upload_response: uploadResponse
      }
    };
  } catch (error) {
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
}

async function deleteAttachment(client, args) {
  const { sys_id } = args;

  try {
    // First verify the attachment exists
    const existsResponse = await client.request('GET', `/table/sys_attachment/${sys_id}`);
    
    if (!existsResponse.result) {
      throw new Error('Attachment not found');
    }

    // Delete the attachment
    await client.request('DELETE', `/table/sys_attachment/${sys_id}`);

    return {
      success: true,
      message: `Attachment ${sys_id} deleted successfully`,
      deleted_attachment: existsResponse.result
    };
  } catch (error) {
    throw new Error(`Failed to delete attachment: ${error.message}`);
  }
}

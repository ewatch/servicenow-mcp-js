# ServiceNow MCP Server Usage Guide

This guide covers how to use the ServiceNow MCP server with various MCP-compatible clients.

## Available Tools

The server provides the following tools for interacting with ServiceNow:

### Incident Management Tools

#### `servicenow_incident_get`
Retrieve a specific incident by sys_id.

**Parameters:**
- `sys_id` (required): The sys_id of the incident
- `fields` (optional): Comma-separated list of fields to retrieve

**Example:**
```
Get incident INC0000001 with specific fields: number,short_description,state,priority
```

#### `servicenow_incident_create`
Create a new incident in ServiceNow.

**Parameters:**
- `short_description` (required): Brief description
- `description` (optional): Detailed description
- `caller_id` (optional): Sys_id of the caller
- `category` (optional): Incident category
- `priority` (optional): Priority level (1-5)
- `urgency` (optional): Urgency level (1-3)
- `impact` (optional): Impact level (1-3)

**Example:**
```
Create an incident:
- Short description: "Email server not responding"
- Description: "Users cannot send or receive emails since 2 PM"
- Priority: 2 (High)
- Category: "software"
```

#### `servicenow_incident_update`
Update an existing incident.

**Parameters:**
- `sys_id` (required): The sys_id of the incident to update
- Various fields like `state`, `priority`, `work_notes`, etc.

**Example:**
```
Update incident INC0000001:
- State: 6 (Resolved)
- Work notes: "Email server service restarted, issue resolved"
- Close code: "Solution provided"
```

#### `servicenow_incident_list`
List incidents with optional filtering.

**Parameters:**
- `query` (optional): ServiceNow query string
- `fields` (optional): Fields to retrieve
- `limit` (optional): Maximum records (default: 100)
- `offset` (optional): Records to skip
- `order_by` (optional): Sort field

**Example:**
```
List active high-priority incidents:
- Query: "state=1^priority=2"
- Limit: 20
- Order by: "^sys_created_on"
```

### Script Include Management Tools

#### `servicenow_script_include_get`
Retrieve a specific script include.

#### `servicenow_script_include_create`
Create a new script include.

**Parameters:**
- `name` (required): Script include name
- `script` (required): JavaScript code
- `description` (optional): Description
- `client_callable` (optional): Can be called from client
- `active` (optional): Is active (default: true)

#### `servicenow_script_include_update`
Update an existing script include.

#### `servicenow_script_include_list`
List script includes with filtering.

#### `servicenow_script_include_search`
Search script includes by name or content.

**Parameters:**
- `search_term` (required): Term to search for
- `search_in_script` (optional): Search in code content
- `active_only` (optional): Only active scripts (default: true)

### General Table API Tools

#### `servicenow_query_table`
Query any ServiceNow table.

**Parameters:**
- `table` (required): Table name
- `query` (optional): Query string
- `fields` (optional): Fields to retrieve
- `limit` (optional): Maximum records
- `offset` (optional): Records to skip
- `order_by` (optional): Sort field

#### `servicenow_get_record`
Get a specific record from any table.

#### `servicenow_create_record`
Create a record in any table.

#### `servicenow_update_record`
Update a record in any table.

#### `servicenow_table_schema`
Get schema information for a table.

## Query Syntax

ServiceNow uses a specific query syntax for filtering records:

### Basic Operators
- `=` : Equals
- `!=` : Not equals
- `>` : Greater than
- `<` : Less than
- `>=` : Greater than or equal
- `<=` : Less than or equal

### String Operators
- `LIKE` : Contains
- `STARTSWITH` : Starts with
- `ENDSWITH` : Ends with
- `DOES NOT CONTAIN` : Does not contain

### Logical Operators
- `^` : AND
- `^OR` : OR
- `^NQ` : NOT

### Set Operators
- `IN` : In list (e.g., `stateIN1,2,3`)
- `NOT IN` : Not in list

### Examples
```
# Active incidents with high priority
state=1^priority=2

# Incidents created in the last 24 hours
sys_created_on>javascript:gs.hoursAgo(24)

# Incidents assigned to specific groups
assignment_groupIN123456,789012

# Complex query with OR condition
state=1^priority=2^ORcaller_id=user123
```

## Common Use Cases

### 1. Incident Monitoring
```
List all critical incidents:
- Tool: servicenow_incident_list
- Query: "state!=6^state!=7^priority=1"
- Fields: "number,short_description,caller_id,sys_created_on"
```

### 2. Bulk Incident Updates
```
Update multiple incidents by querying first, then updating each:
1. List incidents with specific criteria
2. Use servicenow_incident_update for each incident
```

### 3. Script Include Development
```
Search for existing utility functions:
- Tool: servicenow_script_include_search
- Search term: "StringUtil"
- Search in script: true
```

### 4. Data Analysis
```
Get incident statistics:
- Tool: servicenow_query_table
- Table: "incident"
- Query: "sys_created_on>javascript:gs.daysAgo(30)"
- Fields: "state,priority,category"
```

### 5. Schema Exploration
```
Understand table structure:
- Tool: servicenow_table_schema
- Table: "incident"
```

## Error Handling

The server provides detailed error messages for common issues:

### Authentication Errors
- **Token expired**: Server automatically re-authenticates
- **Invalid credentials**: Check OAuth configuration
- **Insufficient permissions**: Verify user roles

### API Errors
- **Table not found**: Verify table name spelling
- **Field not found**: Check field names against schema
- **Query syntax error**: Validate query format

### Network Errors
- **Timeout**: Increase timeout in configuration
- **Connection refused**: Verify instance URL

## Best Practices

### 1. Query Optimization
- Use specific queries to limit results
- Request only necessary fields
- Use pagination for large datasets
- Order results consistently

### 2. Error Handling
- Always check tool responses for errors
- Implement retry logic for transient failures
- Log errors for debugging

### 3. Security
- Use least-privilege access
- Regularly rotate OAuth credentials
- Monitor API usage
- Validate input data

### 4. Performance
- Cache frequently accessed data
- Batch operations when possible
- Use appropriate timeouts
- Monitor rate limits

## Integration Examples

### With Claude Desktop
Add to your MCP configuration:
```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": ["/path/to/servicenow-mcp-js/src/index.js"],
      "env": {
        "SERVICENOW_INSTANCE_URL": "https://your-instance.service-now.com",
        "SERVICENOW_CLIENT_ID": "your_client_id",
        "SERVICENOW_CLIENT_SECRET": "your_client_secret",
        "SERVICENOW_USERNAME": "your_username",
        "SERVICENOW_PASSWORD": "your_password"
      }
    }
  }
}
```

### With Cline Extension
Configure the server in VS Code settings and use the MCP protocol to interact with ServiceNow data directly from your development environment.

### Custom Client Integration
Use the MCP SDK to build custom integrations:
```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Connect to server and use tools
const client = new Client({/* configuration */});
await client.connect();

// Call ServiceNow tools
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'servicenow_incident_list',
    arguments: {
      query: 'state=1^priority=1',
      limit: 10
    }
  }
});
```

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check environment variables
   - Verify Node.js version (>=18)
   - Run `npm install` to ensure dependencies

2. **Authentication failures**
   - Verify OAuth configuration
   - Check username/password
   - Ensure user has required roles

3. **Permission errors**
   - Check user roles in ServiceNow
   - Verify table ACLs
   - Test with admin user

4. **Query returning no results**
   - Verify table name
   - Check query syntax
   - Test query in ServiceNow interface

5. **Timeout errors**
   - Increase timeout setting
   - Check network connectivity
   - Simplify complex queries

### Debug Mode

Enable debug mode by setting `DEBUG=true` in your environment variables for detailed logging.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review ServiceNow documentation
3. Check MCP protocol documentation
4. Open an issue in the project repository

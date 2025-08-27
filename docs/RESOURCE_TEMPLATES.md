# ServiceNow MCP Resource Templates

This document explains the dynamic resource templates available in the ServiceNow MCP server. Resource templates allow MCP clients to access ServiceNow data using parameterized URIs that dynamically substitute table names, IDs, and other parameters.

## Overview

MCP Resource Templates provide a way to expose ServiceNow data as resources that can be accessed using URI patterns with dynamic parameters. Instead of having fixed resources, these templates allow clients to specify parameters in the URI to fetch different data.

## Available Resource Templates

### 1. Table Schema Resource
**URI Pattern:** `servicenow://table-schema/{table}`

Gets field definitions and metadata for any ServiceNow table.

**Parameters:**
- `{table}` - The name of the ServiceNow table (e.g., `incident`, `sys_user`, `change_request`)

**Response Format:**
```json
{
  "table": "incident",
  "fields": [
    {
      "column_name": "number",
      "column_label": "Number",
      "internal_type": "string",
      "max_length": "40",
      "mandatory": true,
      "reference": "",
      "is_choice_field": false,
      "default_value": "",
      "comments": "Unique incident identifier"
    }
    // ... more fields
  ]
}
```

**Example Usage:**
- `servicenow://table-schema/incident` - Get incident table schema
- `servicenow://table-schema/sys_user` - Get user table schema
- `servicenow://table-schema/cmdb_ci_computer` - Get computer CI table schema

### 2. Table Data Sample Resource
**URI Pattern:** `servicenow://table-data/{table}`

Gets sample data (first 10 records) from any ServiceNow table.

**Parameters:**
- `{table}` - The name of the ServiceNow table

**Response Format:**
```json
{
  "table": "incident",
  "sample_count": 10,
  "records": [
    {
      "sys_id": "abc123...",
      "number": "INC0010001",
      "short_description": "Email server down",
      // ... more fields
    }
    // ... more records
  ]
}
```

**Example Usage:**
- `servicenow://table-data/incident` - Get sample incidents
- `servicenow://table-data/sys_user` - Get sample user records
- `servicenow://table-data/change_request` - Get sample change requests

### 3. Specific Record Resource
**URI Pattern:** `servicenow://record/{table}/{sys_id}`

Gets a specific record from any ServiceNow table by sys_id.

**Parameters:**
- `{table}` - The name of the ServiceNow table
- `{sys_id}` - The sys_id of the specific record

**Response Format:**
```json
{
  "table": "incident",
  "sys_id": "abc123456789...",
  "record": {
    "sys_id": "abc123456789...",
    "number": "INC0010001",
    "short_description": "Email server down",
    // ... all record fields
  }
}
```

**Example Usage:**
- `servicenow://record/incident/a1b2c3d4e5f6789012345678901234567890`
- `servicenow://record/sys_user/12345678901234567890123456789012`

### 4. Incident Resource
**URI Pattern:** `servicenow://incident/{number_or_sys_id}`

Gets detailed incident information by incident number or sys_id.

**Parameters:**
- `{number_or_sys_id}` - Either an incident number (e.g., `INC0010001`) or a sys_id

**Response Format:**
```json
{
  "type": "incident",
  "identifier": "INC0010001",
  "lookup_method": "number",
  "record": {
    "sys_id": "abc123456789...",
    "number": "INC0010001",
    "short_description": "Email server down",
    "state": "2",
    "priority": "1",
    // ... all incident fields
  }
}
```

**Example Usage:**
- `servicenow://incident/INC0010001` - Get incident by number
- `servicenow://incident/a1b2c3d4e5f6789012345678901234567890` - Get incident by sys_id

### 5. User Profile Resource
**URI Pattern:** `servicenow://user/{username_or_sys_id}`

Gets user profile information by username, email, or sys_id.

**Parameters:**
- `{username_or_sys_id}` - Username, email address, or sys_id

**Response Format:**
```json
{
  "type": "user",
  "identifier": "john.doe",
  "lookup_method": "username_or_email",
  "record": {
    "sys_id": "xyz789456123...",
    "user_name": "john.doe",
    "email": "john.doe@company.com",
    "name": "John Doe",
    "active": "true",
    // ... all user fields
  }
}
```

**Example Usage:**
- `servicenow://user/john.doe` - Get user by username
- `servicenow://user/john.doe@company.com` - Get user by email
- `servicenow://user/12345678901234567890123456789012` - Get user by sys_id

### 6. Process Definition Resource
**URI Pattern:** `servicenow://process-definition/{sys_id}`

Gets detailed process definition information including associated lanes and activities.

**Parameters:**
- `{sys_id}` - The sys_id of the process definition

**Response Format:**
```json
{
  "type": "process_definition",
  "sys_id": "def456789012...",
  "process_definition": {
    "sys_id": "def456789012...",
    "name": "incident_management",
    "label": "Incident Management Process",
    "status": "published",
    "active": "true"
    // ... other process definition fields
  },
  "lanes": [
    {
      "sys_id": "lane123...",
      "name": "Triage",
      "order": "1"
      // ... other lane fields
    }
  ],
  "activities": [
    {
      "sys_id": "activity456...",
      "name": "Initial Assessment",
      "lane_name": "Triage",
      "lane_sys_id": "lane123...",
      "order": "1"
      // ... other activity fields
    }
  ],
  "summary": {
    "total_lanes": 3,
    "total_activities": 8,
    "status": "published",
    "active": true
  }
}
```

**Example Usage:**
- `servicenow://process-definition/abcd1234567890123456789012345678`

## Implementation Details

### Dynamic Parameter Extraction

The MCP server uses URI pattern matching to extract parameters from resource URIs:

```javascript
// Example for table schema
if (uri.startsWith('servicenow://table-schema/')) {
  const tableName = uri.replace('servicenow://table-schema/', '');
  // Use tableName to fetch schema
}

// Example for specific record
if (uri.startsWith('servicenow://record/')) {
  const pathParts = uri.replace('servicenow://record/', '').split('/');
  const [tableName, sysId] = pathParts;
  // Use tableName and sysId to fetch record
}
```

### Error Handling

The resource templates include comprehensive error handling:

- **Missing Parameters:** Returns `InvalidRequest` error if required parameters are missing
- **Invalid Table Names:** Returns `InternalError` with details about invalid table access
- **Record Not Found:** Returns appropriate error messages for missing records
- **ServiceNow API Errors:** Wraps and reports ServiceNow API errors with context

### Security Considerations

- All resource access uses the same authentication as the MCP server
- Table access is subject to ServiceNow ACLs and user permissions
- No additional authorization is performed at the resource template level
- Sensitive fields may be filtered by ServiceNow based on user permissions

## Usage Examples

### With MCP Clients

```javascript
// Example using an MCP client library
const schema = await mcpClient.readResource('servicenow://table-schema/incident');
const sampleData = await mcpClient.readResource('servicenow://table-data/incident');
const incident = await mcpClient.readResource('servicenow://incident/INC0010001');
const user = await mcpClient.readResource('servicenow://user/john.doe');
```

### In Natural Language Prompts

```
"Get the table schema for the incident table using servicenow://table-schema/incident"
"Show me sample data from servicenow://table-data/change_request"
"Retrieve incident INC0010001 using servicenow://incident/INC0010001"
"Get user profile for john.doe from servicenow://user/john.doe"
```

## Testing

A comprehensive test suite is available in `test/test-resource-templates.js` that demonstrates all resource templates and validates their functionality against a live ServiceNow instance.

Run the test with:
```bash
node test/test-resource-templates.js
```

## Benefits of Resource Templates

1. **Dynamic Data Access:** No need to predefine specific resources for every table or record
2. **Consistent Interface:** All resources follow the same URI pattern conventions
3. **Type Safety:** Each resource type returns structured, predictable JSON
4. **Flexible Queries:** Supports various identifier types (numbers, sys_ids, usernames)
5. **Rich Metadata:** Includes context about how records were found and retrieved
6. **Error Transparency:** Clear error messages help with debugging and user feedback

## Future Enhancements

Potential future resource templates could include:

- `servicenow://query/{table}?{query_params}` - Dynamic queries with URL parameters
- `servicenow://attachment/{sys_id}` - File attachments by sys_id
- `servicenow://dashboard/{name}` - Dashboard definitions and data
- `servicenow://report/{sys_id}` - Report definitions and results
- `servicenow://workflow/{name}` - Workflow definitions and instances

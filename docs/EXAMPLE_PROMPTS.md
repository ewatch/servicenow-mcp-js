# ServiceNow MCP Server - Example Prompts

This document provides example prompts that you can use with MCP clients to interact with the ServiceNow MCP Server. These examples demonstrate various use cases and the natural language prompts you can use.

## MCP Resource Templates

The ServiceNow MCP server provides dynamic resource templates that allow you to access ServiceNow data using parameterized URIs:

### Table Schema Resource
**URI Pattern:** `servicenow://table-schema/{table}`
**Description:** Get field definitions for any ServiceNow table

**Example Prompts:**
```
"Get the table schema for the incident table using servicenow://table-schema/incident"
"Show me the field definitions for the change_request table"
"What fields are available in the sys_user table?"
```

### Table Data Sample Resource
**URI Pattern:** `servicenow://table-data/{table}`
**Description:** Get sample data (first 10 records) from any ServiceNow table

**Example Prompts:**
```
"Show me sample data from the incident table using servicenow://table-data/incident"
"Get sample records from the change_request table"
"What does data in the cmdb_ci_computer table look like?"
```

### Specific Record Resource
**URI Pattern:** `servicenow://record/{table}/{sys_id}`
**Description:** Get a specific record from any ServiceNow table by sys_id

**Example Prompts:**
```
"Get the incident record with sys_id a1b2c3d4e5f6789012345678901234567890"
"Show me the user record servicenow://record/sys_user/12345678901234567890123456789012"
```

### Incident Resource
**URI Pattern:** `servicenow://incident/{number_or_sys_id}`
**Description:** Get detailed incident information by number or sys_id

**Example Prompts:**
```
"Get incident INC0010001 using servicenow://incident/INC0010001"
"Show me the details of incident with sys_id a1b2c3d4e5f6789012345678901234567890"
"Retrieve incident INC0005432 information"
```

### User Profile Resource
**URI Pattern:** `servicenow://user/{username_or_sys_id}`
**Description:** Get user profile information by username, email, or sys_id

**Example Prompts:**
```
"Get user profile for john.doe using servicenow://user/john.doe"
"Show me the user information for john.doe@company.com"
"Retrieve user profile with sys_id 12345678901234567890123456789012"
```

### Process Definition Resource
**URI Pattern:** `servicenow://process-definition/{sys_id}`
**Description:** Get detailed process definition with lanes and activities

**Example Prompts:**
```
"Get the process definition with sys_id abcd1234567890123456789012345678 including all lanes and activities"
"Show me the complete process definition structure"
```

## Incident Management Examples

### Creating Incidents

**Example Prompt:**
```
Create a critical incident for email server outage with the following details:
- Short description: "Email server completely down"
- Description: "The main email server crashed at 14:30 and users cannot send or receive emails. This affects approximately 500 users across all departments."
- Priority: 1 (Critical)
- Category: "software"
- Urgency: 1 (High)
- Impact: 1 (High)
```

**Example Prompt:**
```
Log a new incident about laptop hardware problem:
- Description: "User's laptop screen flickering and randomly going black"
- Priority: 3 (Moderate)
- Category: "hardware"
- Subcategory: "computer"
```

### Retrieving Incidents

**Example Prompt:**
```
Get the details of incident INC0010001 including the caller, assignment group, and current state
```

**Example Prompt:**
```
Show me the incident with sys_id a1b2c3d4e5f6789012345678901234567890 with all available fields
```

### Updating Incidents

**Example Prompt:**
```
Update incident INC0010001 to resolved status:
- State: 6 (Resolved)
- Work notes: "Applied latest email server patches and restarted services. All functionality restored."
- Close code: "Solution provided"
- Close notes: "Email server patched and services restarted successfully"
```

**Example Prompt:**
```
Assign incident INC0010002 to the IT Support group and add work notes: "Escalating to hardware team for laptop replacement evaluation"
```

### Listing and Filtering Incidents

**Example Prompt:**
```
Show me all critical incidents that are currently open (not resolved or closed), ordered by creation date newest first
```

**Example Prompt:**
```
List the top 10 incidents created in the last 24 hours with priority 1 or 2, showing only the number, description, and caller information
```

**Example Prompt:**
```
Find all incidents assigned to the Network Support group that are in progress, limit to 20 records
```

## Script Include Management Examples

### Creating Script Includes

**Example Prompt:**
```
Create a new Script Include called "DateTimeUtils" with utility functions for date manipulation:
- Make it client callable
- Add description: "Utility functions for date and time operations"
- Include basic JavaScript code for getting formatted dates
```

**Example Prompt:**
```
Create a Script Include for user validation with the following:
- Name: "UserValidator" 
- Description: "Functions to validate user data and permissions"
- Not client callable (server-side only)
- Active status: true
```

### Searching Script Includes

**Example Prompt:**
```
Search for all Script Includes that contain "StringUtil" in their name or code content
```

**Example Prompt:**
```
Find Script Includes related to "email" functionality, search both names and code content
```

**Example Prompt:**
```
Show me all active Script Includes that have "validation" in their name
```

### Retrieving Script Includes

**Example Prompt:**
```
Get the complete details of the Script Include with sys_id xyz123abc456, including the full script code
```

## Process Definition Management Examples

### Searching Process Definitions

**Example Prompt:**
```
Find all process definitions related to "incident" management that are currently active and published
```

**Example Prompt:**
```
Search for process definitions containing "approval" in their name or description
```

### Retrieving Process Definitions

**Example Prompt:**
```
Show me the complete details of the process definition with sys_id def456ghi789
```

**Example Prompt:**
```
Get the process definition for "Change Request Approval" including all its properties
```

### Creating Process Definitions

**Example Prompt:**
```
Create a new process definition:
- Name: "Laptop Request Process"
- Label: "Employee Laptop Request Workflow" 
- Description: "Process for handling employee laptop requests from submission to delivery"
- Access: public
- Active: true
```

### Executing Process Definitions

**Example Prompt:**
```
Execute the process definition with sys_id abc123def456 with the following input data:
- requestor: "john.doe"
- item_type: "laptop"
- justification: "New hire orientation"
```

## Process Lane Management Examples

### Listing Process Lanes

**Example Prompt:**
```
Show me all process lanes for the "Incident Management" process definition, ordered by their sequence
```

**Example Prompt:**
```
List the first 10 active process lanes, showing their names and order
```

### Retrieving Process Lanes

**Example Prompt:**
```
Get the details of process lane with sys_id lane123xyz789 including all its properties
```

## Process Activity Management Examples

### Listing Process Activities

**Example Prompt:**
```
Show me all activities in the "Incident Resolution" process lane, ordered by their execution sequence
```

**Example Prompt:**
```
List all active process activities for process definition "Change Management", limit to 25 results
```

### Retrieving Process Activities

**Example Prompt:**
```
Get the complete details of process activity with sys_id activity789xyz123
```

### Searching Process Activities

**Example Prompt:**
```
Find all process activities that are of type "approval" and are currently active
```

## General Table API Examples

### Querying Any Table

**Example Prompt:**
```
Query the sys_user table to find all active users in the IT department, showing name, email, and phone
```

**Example Prompt:**
```
Get the first 20 records from the cmdb_ci_computer table where the asset state is "In use"
```

**Example Prompt:**
```
Query the change_request table for all changes scheduled for this week with normal approval status
```

### Getting Record Details

**Example Prompt:**
```
Get the complete details of user record with sys_id user123abc456 from the sys_user table
```

**Example Prompt:**
```
Show me the configuration item with sys_id ci789def012 from the cmdb_ci table
```

### Creating Records

**Example Prompt:**
```
Create a new user record in sys_user table with:
- first_name: "Jane"
- last_name: "Smith" 
- email: "jane.smith@company.com"
- department: "IT"
- active: true
```

**Example Prompt:**
```
Create a new configuration item in cmdb_ci_server table:
- name: "PROD-WEB-01"
- short_description: "Production Web Server 01"
- operational_status: "Operational"
```

### Updating Records

**Example Prompt:**
```
Update the user with sys_id user456def789 in sys_user table:
- phone: "+1-555-0123"
- department: "Engineering"
- title: "Senior Developer"
```

### Getting Table Schema

**Example Prompt:**
```
Show me the schema and field definitions for the incident table
```

**Example Prompt:**
```
Get the complete field structure for the sys_user table including field types and descriptions
```

## Complex Query Examples

### Advanced Filtering

**Example Prompt:**
```
Find all incidents where:
- State is New OR In Progress
- Priority is Critical OR High 
- Created in the last 7 days
- Assigned to either "Network Team" or "Server Team"
Show number, description, priority, and assignment group
```

**Example Prompt:**
```
Query change requests where:
- Risk is High
- State is Scheduled or Implement
- Planned start date is within next 48 hours
Order by planned start date ascending
```

### Cross-Table Analysis

**Example Prompt:**
```
Get user information for all users who have created more than 5 incidents this month. First query incidents, then get user details.
```

**Example Prompt:**
```
Find all configuration items that have had incidents logged against them in the last 30 days. Start with incidents, then get CI details.
```

## Resource Examples

### Using File Resources

**Example Prompt:**
```
I have a CSV file with user data that needs to be imported into ServiceNow. Please analyze the file structure and help me create user records.
```

**Example Prompt:**
```
Use the incident report file I'm sharing to create multiple incidents in ServiceNow based on the issues listed in the document.
```

**Example Prompt:**
```
Review the change management policy document and help me configure the appropriate approval workflow in ServiceNow.
```

## Integration Workflow Examples

### Bulk Operations

**Example Prompt:**
```
I need to close all incidents that have been resolved for more than 7 days. First find these incidents, then update each one to closed status with appropriate close notes.
```

**Example Prompt:**
```
Create a monthly report of all critical incidents by:
1. Querying incidents from last month with priority 1
2. Getting details of assignment groups
3. Summarizing by group and resolution time
```

### Data Migration

**Example Prompt:**
```
Help me migrate user data from our legacy system by:
1. Analyzing the user data structure in my CSV file
2. Mapping fields to ServiceNow sys_user table
3. Creating user records with proper validation
4. Handling duplicates and errors
```

### Monitoring and Alerts

**Example Prompt:**
```
Set up monitoring for:
1. All P1 incidents created in last 2 hours
2. Any change requests in failed state
3. Process definitions that haven't executed successfully today
Provide a summary dashboard view.
```

## Tips for Effective Prompts

1. **Be Specific**: Include exact sys_ids, table names, and field names when known
2. **Use Natural Language**: Describe what you want to accomplish rather than technical syntax
3. **Include Context**: Mention the business reason or use case for better assistance
4. **Specify Outputs**: Indicate what fields or information you want to see in results
5. **Handle Errors**: Ask for validation and error handling in complex operations
6. **Batch Operations**: For multiple similar tasks, describe the pattern once
7. **Security Conscious**: Remember that sensitive data should be handled appropriately

## Common ServiceNow Field References

### Incident Priority Values
- 1 = Critical
- 2 = High  
- 3 = Moderate
- 4 = Low
- 5 = Planning

### Incident State Values
- 1 = New
- 2 = In Progress
- 3 = On Hold
- 6 = Resolved
- 7 = Closed

### Common Tables
- `incident` - Incident records
- `sys_user` - User records  
- `sys_user_group` - Group records
- `change_request` - Change requests
- `cmdb_ci` - Configuration items
- `sys_pd_process_definition` - Process definitions
- `sys_pd_lane` - Process lanes
- `sys_pd_activity` - Process activities
- `sys_script_include` - Script includes

## MCP Resources

### Table Schema Resource

Access table field definitions using the MCP resource URI pattern: `servicenow://table-schema/{tablename}`

**Example Resource URIs:**
- `servicenow://table-schema/incident` - Get incident table fields
- `servicenow://table-schema/sys_user` - Get user table fields  
- `servicenow://table-schema/cmdb_ci_computer` - Get computer CI table fields
- `servicenow://table-schema/change_request` - Get change request table fields

**Resource Output Format:**
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
      "comments": "Incident number"
    },
    {
      "column_name": "priority",
      "column_label": "Priority", 
      "internal_type": "integer",
      "max_length": "40",
      "mandatory": false,
      "reference": "",
      "is_choice_field": true,
      "default_value": "5",
      "comments": "Priority of the incident"
    }
  ]
}
```

**Example Usage in Prompts:**
```
"Get the table schema for the incident table using the servicenow://table-schema/incident resource to understand what fields are available"
```

```
"Access the servicenow://table-schema/sys_user resource to see the user table structure before creating a new user record"
```

The table schema resource provides detailed field information including:
- `column_name`: The actual field name used in API calls
- `column_label`: The human-readable display label
- `internal_type`: The field data type (string, integer, reference, etc.)
- `mandatory`: Whether the field is required
- `reference`: The referenced table name (for reference fields)
- `is_choice_field`: Whether the field has a choice list
- `max_length`: Maximum field length
- `default_value`: Default value for the field
- `comments`: Field description/help text

These examples should help you get started with natural language interactions with the ServiceNow MCP Server.

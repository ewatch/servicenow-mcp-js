# ServiceNow MCP Server - Prompts Guide

This guide covers the MCP prompts available in the ServiceNow MCP Server. Prompts are reusable, parameterized templates that provide structured ways to interact with ServiceNow through natural language.

## Available Prompts

The server provides the following prompts for common ServiceNow operations:

### Incident Management Prompts

#### `create_critical_incident`
Create a critical priority incident with all necessary fields.

**Arguments:**
- `description` (required): Brief description of the critical incident
- `details` (optional): Detailed description of the incident  
- `affected_users` (optional): Number of users affected

**Usage Example:**
```
Prompt: create_critical_incident
Arguments:
- description: "Email server completely down"
- details: "Mail services crashed at 2:30 PM, affecting all departments"
- affected_users: "500"
```

#### `list_active_incidents`
List active incidents with optional filtering by priority, assignment group, and limit.

**Arguments:**
- `priority` (optional): Priority level to filter by (1-5)
- `assignment_group` (optional): Assignment group name to filter by
- `limit` (optional): Maximum number of incidents to return

**Usage Example:**
```
Prompt: list_active_incidents
Arguments:
- priority: "1"
- assignment_group: "IT Support"
- limit: "10"
```

#### `resolve_incident`
Resolve an incident with proper work notes and closure information.

**Arguments:**
- `incident_number` (required): Incident number (e.g., INC0010001)
- `resolution` (required): Description of how the incident was resolved
- `close_code` (optional): Close code for the incident

**Usage Example:**
```
Prompt: resolve_incident
Arguments:
- incident_number: "INC0010001"
- resolution: "Restarted email services and applied latest patches"
- close_code: "Solution provided"
```

#### `analyze_incident_trends`
Analyze incident trends over a specified time period.

**Arguments:**
- `time_period` (required): Time period for analysis (e.g., "last 30 days", "this month")
- `group_by` (optional): How to group the analysis (category, priority, assignment_group)

**Usage Example:**
```
Prompt: analyze_incident_trends
Arguments:
- time_period: "last 30 days"
- group_by: "priority"
```

### Script Include Management Prompts

#### `search_script_includes`
Search for Script Includes by functionality or purpose.

**Arguments:**
- `functionality` (required): Type of functionality to search for
- `search_in_code` (optional): Whether to search in the script code content

**Usage Example:**
```
Prompt: search_script_includes
Arguments:
- functionality: "string utilities"
- search_in_code: "true"
```

#### `create_utility_script`
Create a new utility Script Include with proper structure.

**Arguments:**
- `utility_type` (required): Type of utility (e.g., "StringUtil", "DateUtil")
- `description` (required): Description of what the utility does
- `client_callable` (optional): Whether the script should be callable from client-side

**Usage Example:**
```
Prompt: create_utility_script
Arguments:
- utility_type: "EmailUtil"
- description: "Utility functions for email validation and formatting"
- client_callable: "false"
```

### User and Data Management Prompts

#### `query_user_data`
Query user information with various filtering options.

**Arguments:**
- `department` (optional): Department to filter by
- `role` (optional): Role to filter by
- `active_only` (optional): Whether to only show active users

**Usage Example:**
```
Prompt: query_user_data
Arguments:
- department: "IT"
- active_only: "true"
```

#### `bulk_update_records`
Perform bulk updates on ServiceNow records with safety checks.

**Arguments:**
- `table_name` (required): Name of the table to update
- `filter_criteria` (required): Criteria to filter records for update
- `update_fields` (required): Description of fields and values to update

**Usage Example:**
```
Prompt: bulk_update_records
Arguments:
- table_name: "sys_user"
- filter_criteria: "department=IT^title=Developer"
- update_fields: "Set title to 'Senior Developer' and add phone extension"
```

### Process Management Prompts

#### `process_definition_workflow`
Work with process definitions and workflows.

**Arguments:**
- `workflow_type` (required): Type of workflow (approval, automation, notification)
- `action` (required): Action to perform (create, search, execute, update)
- `target_table` (optional): Table the workflow applies to

**Usage Example:**
```
Prompt: process_definition_workflow
Arguments:
- workflow_type: "approval"
- action: "create"
- target_table: "change_request"
```

## Using Prompts with MCP Clients

### Claude Desktop
In Claude Desktop, you can use prompts by typing `/prompt` followed by the prompt name:

```
/prompt create_critical_incident description="Database server outage" affected_users="200"
```

### Custom MCP Clients
When implementing custom clients, use the MCP protocol to list and get prompts:

```javascript
// List available prompts
const prompts = await client.request({
  method: 'prompts/list'
});

// Get a specific prompt
const prompt = await client.request({
  method: 'prompts/get',
  params: {
    name: 'create_critical_incident',
    arguments: {
      description: 'Email server down',
      details: 'Complete email outage affecting all users'
    }
  }
});
```

## Prompt Design Principles

### 1. Clear Structure
Each prompt provides:
- Clear instructions for the task
- Step-by-step guidance
- Specific tool usage
- Expected outcomes

### 2. Parameter Validation
Prompts handle missing or optional parameters gracefully:
- Required parameters are clearly marked
- Default values are provided where appropriate
- Placeholder text guides users when parameters are missing

### 3. Safety First
Prompts include safety measures:
- Bulk operations include verification steps
- Destructive actions require confirmation
- Best practices are embedded in the instructions

### 4. Contextual Help
Each prompt provides:
- Relevant background information
- Specific ServiceNow field references
- Error handling guidance
- Next steps after completion

## Advanced Usage Examples

### Chaining Prompts
You can chain multiple prompts for complex workflows:

```
1. Use "list_active_incidents" to identify high-priority incidents
2. Use "resolve_incident" for each incident that can be closed
3. Use "analyze_incident_trends" to review overall performance
```

### Customizing Prompts
While prompts provide structured guidance, you can modify the generated content:
- Add specific field values
- Adjust queries for your instance
- Include additional context or requirements

### Integration with Resources
Prompts can reference file resources:
- Reference configuration files
- Include documentation links

## Troubleshooting

### Common Issues

1. **Prompt Not Found**
   - Check the prompt name spelling
   - Use `/prompts/list` to see available prompts

2. **Missing Required Arguments**
   - Review the prompt definition for required parameters
   - Provide placeholder values if testing

3. **ServiceNow Connection Issues**
   - Ensure your environment variables are configured
   - Check ServiceNow instance accessibility

### Debug Mode

Enable debug mode for detailed prompt execution logging:
```bash
DEBUG=true npm start
```

## Contributing New Prompts

To add new prompts to the server:

1. Add the prompt definition to the `ListPromptsRequestSchema` handler
2. Implement the prompt generation method (e.g., `getNewPromptName`)
3. Add the case handler in `GetPromptRequestSchema`
4. Test the prompt with various argument combinations
5. Document the prompt in this guide

### Prompt Template

```javascript
{
  name: 'new_prompt_name',
  description: 'Brief description of what this prompt does',
  arguments: [
    {
      name: 'required_arg',
      description: 'Description of required argument',
      required: true
    },
    {
      name: 'optional_arg',
      description: 'Description of optional argument',
      required: false
    }
  ]
}
```

## Best Practices

1. **Use Descriptive Names**: Prompt names should clearly indicate their purpose
2. **Provide Context**: Include relevant ServiceNow concepts and field references
3. **Handle Edge Cases**: Account for missing data or error conditions  
4. **Include Examples**: Show expected values and formats
5. **Test Thoroughly**: Verify prompts work with various argument combinations
6. **Document Well**: Provide clear usage examples and parameter descriptions

This prompts system makes the ServiceNow MCP Server more accessible to users who prefer structured, guided interactions over free-form tool usage.

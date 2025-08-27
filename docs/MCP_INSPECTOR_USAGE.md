# Using ServiceNow MCP Resource Templates with MCP Inspector

This guide explains how to use the dynamic resource templates with the MCP Inspector tool.

## What You'll See in MCP Inspector

When you connect the ServiceNow MCP Server to MCP Inspector, you will see the following resources in the **Resources** tab:

### Listed Resources (Examples)
1. **Example Prompts** (`servicenow://examples`)
2. **Table Schema: Incident** (`servicenow://table-schema/incident`)
3. **Table Schema: User** (`servicenow://table-schema/sys_user`)
4. **Table Schema: Change Request** (`servicenow://table-schema/change_request`)
5. **Table Data Sample: Incident** (`servicenow://table-data/incident`)
6. **Table Data Sample: User** (`servicenow://table-data/sys_user`)
7. **Table Data Sample: Change Request** (`servicenow://table-data/change_request`)

## Understanding Resource Templates

The resources listed above are **examples** of the dynamic resource templates. The actual power comes from being able to substitute different parameters in the URI patterns.

### Template Patterns Available

#### 1. Table Schema Template
**Pattern:** `servicenow://table-schema/{table_name}`
**Purpose:** Get field definitions for any ServiceNow table

**Manual URI Examples:**
```
servicenow://table-schema/incident
servicenow://table-schema/problem
servicenow://table-schema/cmdb_ci_server
servicenow://table-schema/kb_knowledge
servicenow://table-schema/sys_user_group
servicenow://table-schema/task
```

#### 2. Table Data Sample Template  
**Pattern:** `servicenow://table-data/{table_name}`
**Purpose:** Get sample records (first 10) from any ServiceNow table

**Manual URI Examples:**
```
servicenow://table-data/incident
servicenow://table-data/problem
servicenow://table-data/cmdb_ci_server
servicenow://table-data/change_request
servicenow://table-data/kb_knowledge
servicenow://table-data/sys_user
```

#### 3. Specific Record Template
**Pattern:** `servicenow://record/{table_name}/{sys_id}`
**Purpose:** Get a specific record from any table by sys_id

**Manual URI Examples:**
```
servicenow://record/incident/1c741bd70b2322007518478d83673af3
servicenow://record/sys_user/6816f79cc0a8016401c5a33be04be441
servicenow://record/problem/a1b2c3d4e5f6789012345678901234567890
```

#### 4. Incident Template
**Pattern:** `servicenow://incident/{number_or_sys_id}`
**Purpose:** Get incident details by incident number or sys_id

**Manual URI Examples:**
```
servicenow://incident/INC0010001
servicenow://incident/INC0005432
servicenow://incident/1c741bd70b2322007518478d83673af3
```

#### 5. User Profile Template
**Pattern:** `servicenow://user/{username_or_sys_id}`
**Purpose:** Get user profile by username, email, or sys_id

**Manual URI Examples:**
```
servicenow://user/admin
servicenow://user/john.doe
servicenow://user/jane.smith@company.com
servicenow://user/6816f79cc0a8016401c5a33be04be441
```

#### 6. Process Definition Template
**Pattern:** `servicenow://process-definition/{sys_id}`
**Purpose:** Get complete process definition with lanes and activities

**Manual URI Examples:**
```
servicenow://process-definition/050f573577373110c2123a91fa5a9983
servicenow://process-definition/abcd1234567890123456789012345678
```

## How to Use in MCP Inspector

### Step 1: Connect to the ServiceNow MCP Server
1. Start your ServiceNow MCP Server
2. Connect MCP Inspector to the server
3. Go to the **Resources** tab

### Step 2: Use Example Resources
Click on any of the listed example resources to see them in action:
- `servicenow://table-schema/incident` - See incident table fields
- `servicenow://table-data/incident` - See sample incident records

### Step 3: Try Dynamic URIs
To access other tables or records, **manually type** URIs in the resource input field:

1. **For different table schemas:**
   - Type: `servicenow://table-schema/problem`
   - Type: `servicenow://table-schema/cmdb_ci_computer`

2. **For different table data:**
   - Type: `servicenow://table-data/problem`
   - Type: `servicenow://table-data/cmdb_ci_computer`

3. **For specific incidents:**
   - Type: `servicenow://incident/INC0000123`
   - Type: `servicenow://incident/your-sys-id-here`

4. **For specific users:**
   - Type: `servicenow://user/admin`
   - Type: `servicenow://user/your.username`

5. **For any specific record:**
   - Type: `servicenow://record/problem/your-problem-sys-id`
   - Type: `servicenow://record/cmdb_ci_server/your-server-sys-id`

## Common ServiceNow Table Names

Here are some useful ServiceNow table names you can use with the templates:

### Core Tables
- `incident` - Incidents
- `problem` - Problems  
- `change_request` - Change requests
- `task` - Generic tasks
- `sys_user` - Users
- `sys_user_group` - User groups

### CMDB Tables
- `cmdb_ci` - Configuration items (base)
- `cmdb_ci_computer` - Computers
- `cmdb_ci_server` - Servers
- `cmdb_ci_service` - Business services
- `cmdb_ci_application` - Applications

### Knowledge Management
- `kb_knowledge` - Knowledge articles
- `kb_knowledge_base` - Knowledge bases

### Service Catalog
- `sc_request` - Service catalog requests
- `sc_req_item` - Requested items

### System Tables
- `sys_dictionary` - Table/field definitions
- `sys_db_object` - Database objects
- `sys_script_include` - Script includes

## Tips for Success

1. **Find sys_id values:** Use table data samples first to find sys_id values for specific record lookups
2. **Check table names:** Use `servicenow://table-schema/sys_db_object` to see all available tables
3. **Validate responses:** All resources return structured JSON with metadata
4. **Use error messages:** Invalid URIs return helpful error messages with available patterns

## Error Handling

If you enter an invalid URI or template pattern, you'll get a helpful error message showing:
- The invalid URI you tried
- All available resource template patterns  
- Proper usage examples

## Example Workflow

1. **Explore available tables:**
   ```
   servicenow://table-data/sys_db_object
   ```

2. **Get table schema:**
   ```
   servicenow://table-schema/your_chosen_table
   ```

3. **Get sample data:**
   ```
   servicenow://table-data/your_chosen_table  
   ```

4. **Get specific record:**
   ```
   servicenow://record/your_chosen_table/sys_id_from_sample
   ```

This approach gives you complete access to your ServiceNow instance data through the MCP Inspector interface!

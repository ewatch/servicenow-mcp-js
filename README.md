# ServiceNow MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to ServiceNow's REST APIs. This server enables AI assistants to interact with ServiceNow instances for incident management, script development, process automation, and complete process design workflows.

## Features

### 🎫 Incident Management (5 tools)
- List, search, get, create, and update incidents
- Full CRUD operations with advanced filtering
- Support for assignment, state changes, and work notes

### 📜 Script Include Management (5 tools)
- Complete lifecycle management of ServiceNow script includes
- Create, read, update, and search script includes
- Support for client-callable scripts and access controls

### 🗃️ Generic Table API (5 tools)
- Universal access to any ServiceNow table
- Query, get, create, update, and delete records
- Dynamic field selection and advanced querying

### 🔄 Process Definition Management (7 tools)
- **NEW!** Complete process definition lifecycle
- Create, update, search, and validate process definitions
- Schema introspection and process validation
- Support for conditions, categories, and table bindings

### 🏊 Process Lane Management (7 tools)
- **NEW!** Full process lane creation and management
- Create lanes with proper ordering and conditions
- Lane lifecycle management (create, update, delete)
- Integration with process definitions

### 🎯 Process Activity Management (8 tools)
- **NEW!** Complete activity configuration system
- Create and configure process activities
- Activity definition discovery and management
- Input/output parameter configuration
- Activity positioning and flow control

## Total Capabilities

- **37 tools** across **6 categories**
- **Complete process design** from definition to activities
- **Full ServiceNow integration** with OAuth 2.0 authentication
- **MCP protocol compliance** for AI assistant integration

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd servicenow-mcp-js
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Configure your ServiceNow credentials in `.env`:
```env
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_CLIENT_ID=your_oauth_client_id
SERVICENOW_CLIENT_SECRET=your_oauth_client_secret
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password
SERVICENOW_OAUTH_SCOPE=useraccount
SERVICENOW_TIMEOUT=30000
```

## Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

The server will run using stdio transport and can be integrated with MCP-compatible AI assistants.

### Testing the Server

Run comprehensive tests:
```bash
# Test all capabilities
node test/test-complete-server.js

# Test specific areas
node test/test-process-definitions.js
node test/test-lanes-activities.js
node test/explore-lanes-activities.js

# Test basic connection
node test/test-connection.js
```

### Development Tasks

Available npm scripts:
```bash
npm run dev        # Run in development mode
npm run lint       # Run ESLint
npm run start      # Start the server
```

## Tool Categories

### Incident Tools
- `servicenow_list_incidents` - List incidents with filtering
- `servicenow_search_incidents` - Advanced incident search
- `servicenow_get_incident` - Get specific incident
- `servicenow_create_incident` - Create new incident
- `servicenow_update_incident` - Update existing incident

### Script Include Tools
- `servicenow_list_script_includes` - List script includes
- `servicenow_search_script_includes` - Search script includes
- `servicenow_get_script_include` - Get specific script include
- `servicenow_create_script_include` - Create new script include
- `servicenow_update_script_include` - Update existing script include

### Table API Tools
- `servicenow_table_api_query` - Query any table
- `servicenow_table_api_get_record` - Get specific record
- `servicenow_table_api_create_record` - Create new record
- `servicenow_table_api_update_record` - Update existing record
- `servicenow_table_api_delete_record` - Delete record

### Process Definition Tools
- `servicenow_list_process_definitions` - List process definitions
- `servicenow_search_process_definitions` - Search process definitions
- `servicenow_get_process_definition` - Get specific process definition
- `servicenow_create_process_definition` - Create new process definition
- `servicenow_update_process_definition` - Update process definition
- `servicenow_execute_process_validation` - Validate process definition
- `servicenow_get_process_definition_schema` - Get table schema

### Process Lane Tools
- `servicenow_list_process_lanes` - List process lanes
- `servicenow_search_process_lanes` - Search process lanes
- `servicenow_get_process_lane` - Get specific process lane
- `servicenow_create_process_lane` - Create new process lane
- `servicenow_update_process_lane` - Update process lane
- `servicenow_delete_process_lane` - Delete process lane
- `servicenow_get_process_lane_schema` - Get lane table schema

### Process Activity Tools
- `servicenow_list_process_activities` - List process activities
- `servicenow_search_process_activities` - Search process activities
- `servicenow_get_process_activity` - Get specific process activity
- `servicenow_create_process_activity` - Create new process activity
- `servicenow_update_process_activity` - Update process activity
- `servicenow_delete_process_activity` - Delete process activity
- `servicenow_get_process_activity_schema` - Get activity table schema
- `servicenow_list_activity_definitions` - List available activity types

## Complete Process Design Workflow

This MCP server enables complete ServiceNow process design:

1. **Create Process Definition**: Define the overall process with conditions and table bindings
2. **Design Process Lanes**: Create sequential lanes with proper ordering and conditions
3. **Configure Activities**: Add activities to lanes with proper activity definitions
4. **Validate Process**: Use validation tools to ensure process integrity
5. **Manage Lifecycle**: Update, modify, and maintain processes over time

## Authentication

The server uses OAuth 2.0 with Basic Authentication headers for ServiceNow integration. Ensure your ServiceNow instance has OAuth configured with the appropriate client credentials.

## MCP Integration

This server is compatible with:
- Claude Desktop
- Cline VS Code Extension
- Any MCP-compatible AI assistant

Add the server to your MCP client configuration to enable ServiceNow integration in your AI workflows.

## Architecture

- **Node.js** with ES modules
- **MCP SDK** for protocol compliance
- **ServiceNow REST APIs** with OAuth 2.0
- **Modular tool organization** for maintainability
- **Comprehensive error handling** and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details
# servicenow-mcp-js

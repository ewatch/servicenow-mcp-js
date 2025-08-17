# ServiceNow MCP Server Tests

This directory contains all test and exploration scripts for the ServiceNow MCP Server.

## Test Categories

### 🧪 Core Functionality Tests
- `test-connection.js` - Test basic ServiceNow connection and authentication
- `test-complete-server.js` - Comprehensive test of all server capabilities

### 🔧 Component-Specific Tests
- `test-script-include.js` - Test script include creation and management
- `test-process-definitions.js` - Test process definition tools
- `test-lanes-activities.js` - Test process lanes and activities tools

### 🔍 Exploration Scripts
- `explore-pd-process.js` - Explore process definition table structure
- `explore-lanes-activities.js` - Explore lane and activity table structures

## Running Tests

From the project root directory:

```bash
# Test all capabilities
node test/test-complete-server.js

# Test specific components
node test/test-connection.js
node test/test-process-definitions.js
node test/test-lanes-activities.js
node test/test-script-include.js

# Explore table structures
node test/explore-pd-process.js
node test/explore-lanes-activities.js
```

## Prerequisites

Before running tests, ensure:

1. Environment variables are configured in `.env`
2. ServiceNow instance is accessible
3. OAuth credentials are valid
4. Required ServiceNow roles are assigned

## Test Output

Tests provide detailed output including:
- ✅ Success indicators
- ❌ Error messages with details
- 📊 Data summaries and counts
- 🔍 Sample record displays
- 📋 Schema information

## Environment Setup

Tests require the following environment variables:
- `SERVICENOW_INSTANCE_URL`
- `SERVICENOW_CLIENT_ID`
- `SERVICENOW_CLIENT_SECRET`
- `SERVICENOW_USERNAME`
- `SERVICENOW_PASSWORD`
- `SERVICENOW_OAUTH_SCOPE` (optional, defaults to 'useraccount')
- `SERVICENOW_TIMEOUT` (optional, defaults to 30000ms)

## Test Coverage

The test suite covers:
- **37 tools** across **6 categories**
- OAuth 2.0 authentication
- Table API operations
- Process definition management
- Process lane management
- Process activity management
- Schema introspection
- Error handling and validation

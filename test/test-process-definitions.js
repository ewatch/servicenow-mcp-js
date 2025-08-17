#!/usr/bin/env node

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';
import { handleProcessDefinitionTools } from './src/tools/process-definitions.js';

// Load environment variables
dotenv.config();

async function testProcessDefinitionTools() {
  try {
    console.log('🔧 Initializing ServiceNow client...');
    
    const client = new ServiceNowClient({
      instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
      clientId: process.env.SERVICENOW_CLIENT_ID,
      clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
      username: process.env.SERVICENOW_USERNAME,
      password: process.env.SERVICENOW_PASSWORD,
      scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount',
      timeout: parseInt(process.env.SERVICENOW_TIMEOUT) || 30000,
    });
    
    console.log('🔐 Authenticating...');
    await client.authenticate();
    console.log('✅ Authentication successful');
    
    // Test 1: List all active process definitions
    console.log('\n📋 Test 1: List active process definitions...');
    const listResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_list', {
      query: 'active=true',
      limit: 5
    });
    console.log(listResult.content[0].text);
    
    // Test 2: Search for security-related processes
    console.log('\n🔍 Test 2: Search for security-related processes...');
    const searchResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_search', {
      search_term: 'security',
      limit: 3
    });
    console.log(searchResult.content[0].text);
    
    // Test 3: Get schema information
    console.log('\n📊 Test 3: Get process definition table schema...');
    const schemaResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_schema', {});
    console.log(schemaResult.content[0].text.substring(0, 500) + '...');
    
    // Test 4: Get detailed view of first process
    console.log('\n🔍 Test 4: Get detailed view of a specific process...');
    // First get the list to find a sys_id
    const processListResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_list', {
      query: 'active=true',
      fields: 'sys_id,name,label',
      limit: 1
    });
    
    if (processListResult.content[0].text.includes('Found 1 process definition')) {
      // Extract sys_id from the result text (this is a simplified extraction)
      const text = processListResult.content[0].text;
      const sysIdMatch = text.match(/Sys ID: ([a-f0-9]{32})/);
      
      if (sysIdMatch) {
        const sysId = sysIdMatch[1];
        console.log(`Getting details for process with sys_id: ${sysId}`);
        
        const detailResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_get', {
          sys_id: sysId,
          fields: 'name,label,description,status,active,sys_created_on'
        });
        console.log(detailResult.content[0].text);
      }
    }
    
    // Test 5: Create a simple test process definition
    console.log('\n➕ Test 5: Create a test process definition...');
    const createResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_create', {
      name: 'mcp_test_process_' + Date.now(),
      label: 'MCP Test Process',
      description: 'A test process definition created via MCP server for demonstration purposes',
      access: 'public',
      active: true,
      restartable: 'RESTARTABLE_FALSE'
    });
    console.log(createResult.content[0].text);
    
    // Extract the sys_id of the created process for cleanup
    const createText = createResult.content[0].text;
    const createdSysIdMatch = createText.match(/sys_id: ([a-f0-9]{32})/);
    
    if (createdSysIdMatch) {
      const createdSysId = createdSysIdMatch[1];
      console.log(`\n✏️ Test 6: Update the created process...`);
      
      const updateResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_update', {
        sys_id: createdSysId,
        description: 'Updated description: This test process was created and modified via MCP server',
        status: 'draft'
      });
      console.log(updateResult.content[0].text);
      
      console.log(`\n▶️ Test 7: Try to execute the process (should fail since it's not published)...`);
      const executeResult = await handleProcessDefinitionTools(client, 'servicenow_process_definition_execute', {
        sys_id: createdSysId,
        input_data: { test: 'data' }
      });
      console.log(executeResult.content[0].text);
    }
    
    console.log('\n🎉 Process definition tools test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testProcessDefinitionTools();

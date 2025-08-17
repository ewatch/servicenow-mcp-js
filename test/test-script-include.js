#!/usr/bin/env node

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

// Load environment variables
dotenv.config();

async function testScriptIncludeCreation() {
  try {
    console.log('🔧 Initializing ServiceNow client...');
    
    // Initialize ServiceNow client
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
    
    // Create a sample script include
    console.log('\n📝 Creating script include...');
    
    const scriptIncludeData = {
      name: 'MCPTestUtil',
      api_name: 'MCPTestUtil',
      description: 'A test utility script include created via MCP server',
      script: `var MCPTestUtil = Class.create();
MCPTestUtil.prototype = {
    initialize: function() {
    },
    
    // Test function that returns current date/time
    getCurrentDateTime: function() {
        return new Date().toString();
    },
    
    // Test function that formats a string
    formatMessage: function(message, prefix) {
        prefix = prefix || 'INFO';
        return '[' + prefix + '] ' + message + ' - ' + this.getCurrentDateTime();
    },
    
    // Test function that validates an email
    isValidEmail: function(email) {
        var emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        return emailRegex.test(email);
    },
    
    type: 'MCPTestUtil'
};`,
      client_callable: true,
      active: true,
      access: 'public'
    };
    
    const result = await client.createScriptInclude(scriptIncludeData);
    
    console.log('✅ Script include created successfully!');
    console.log('📋 Details:');
    console.log('   - Name:', result.result.name);
    console.log('   - Sys ID:', result.result.sys_id);
    console.log('   - API Name:', result.result.api_name);
    console.log('   - Active:', result.result.active);
    console.log('   - Client Callable:', result.result.client_callable);
    
    // Test retrieving the script include
    console.log('\n🔍 Retrieving the created script include...');
    const retrieved = await client.getScriptInclude(result.result.sys_id);
    console.log('✅ Retrieved script include:', retrieved.result.name);
    
    // Test searching for script includes
    console.log('\n🔍 Searching for script includes with "MCP" in the name...');
    const searchResult = await client.queryScriptIncludes('nameLIKEMCP', 'name,sys_id,active,description', 10);
    console.log(`✅ Found ${searchResult.result.length} script include(s):`);
    searchResult.result.forEach((script, index) => {
      console.log(`   ${index + 1}. ${script.name} (${script.sys_id}) - Active: ${script.active}`);
    });
    
    console.log('\n🎉 Script include test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testScriptIncludeCreation();

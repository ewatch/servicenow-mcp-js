#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testServiceNowConnection() {
  try {
    const { ServiceNowClient } = await import('../src/servicenow-client.js');
    
    // Check if required environment variables are set
    const requiredVars = [
      'SERVICENOW_INSTANCE_URL',
      'SERVICENOW_CLIENT_ID',
      'SERVICENOW_CLIENT_SECRET',
      'SERVICENOW_USERNAME',
      'SERVICENOW_PASSWORD'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\nPlease create a .env file based on .env.example');
      process.exit(1);
    }
    
    console.log('🔧 Testing ServiceNow connection...');
    
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
    
    // Test authentication
    console.log('🔐 Testing OAuth authentication...');
    await client.authenticate();
    console.log('✅ Authentication successful');
    
    // Test a simple API call
    console.log('📊 Testing Table API...');
    const result = await client.queryIncidents(null, 'number,short_description,state', 5);
    console.log(`✅ Retrieved ${result.result.length} incidents from ServiceNow`);
    
    if (result.result.length > 0) {
      console.log('\n📋 Sample incidents:');
      result.result.forEach((incident, index) => {
        console.log(`   ${index + 1}. ${incident.number} - ${incident.short_description}`);
      });
    }
    
    console.log('\n🎉 ServiceNow MCP Server test completed successfully!');
    console.log('\nYou can now use this server with MCP-compatible clients.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testServiceNowConnection();

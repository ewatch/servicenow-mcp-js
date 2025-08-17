#!/usr/bin/env node

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

// Load environment variables
dotenv.config();

async function explorePDProcessDefinitions() {
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
    
    // First, let's get the schema for the table
    console.log('\n📊 Getting table schema for sys_pd_process_definition...');
    try {
      const schema = await client.queryTable('sys_dictionary', 
        'name=sys_pd_process_definition^active=true', 
        'element,column_label,internal_type,max_length,mandatory,reference', 
        50, 0, 'element');
      
      console.log(`✅ Found ${schema.result.length} field definitions:`);
      schema.result.forEach((field, index) => {
        if (field.element) {
          console.log(`   ${index + 1}. ${field.element} (${field.column_label || 'No label'}) - Type: ${field.internal_type}`);
        }
      });
    } catch (schemaError) {
      console.log('⚠️  Could not retrieve schema, proceeding with data query...');
    }
    
    // Query the process definitions
    console.log('\n🔍 Querying sys_pd_process_definition table...');
    const result = await client.queryTable('sys_pd_process_definition', 
      'active=true', 
      'name,sys_id,active,description,sys_created_on,sys_updated_on', 
      10, 0, '^sys_created_on');
    
    console.log(`✅ Found ${result.result.length} process definition(s):`);
    
    if (result.result.length === 0) {
      console.log('   No process definitions found in this instance.');
    } else {
      result.result.forEach((process, index) => {
        console.log(`\n   ${index + 1}. ${process.name || 'Unnamed Process'}`);
        console.log(`      Sys ID: ${process.sys_id}`);
        console.log(`      Active: ${process.active}`);
        if (process.description) {
          console.log(`      Description: ${process.description}`);
        }
        console.log(`      Created: ${process.sys_created_on}`);
        console.log(`      Updated: ${process.sys_updated_on}`);
      });
    }
    
    // Try to get a specific record with more details
    if (result.result.length > 0) {
      console.log('\n🔍 Getting detailed view of first process definition...');
      const detailed = await client.getRecord('sys_pd_process_definition', result.result[0].sys_id);
      console.log('✅ Detailed record:');
      console.log(JSON.stringify(detailed.result, null, 2));
    }
    
    console.log('\n🎉 Process definition exploration completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

explorePDProcessDefinitions();

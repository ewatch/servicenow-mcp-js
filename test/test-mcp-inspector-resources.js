#!/usr/bin/env node

/**
 * Simple test to demonstrate what the MCP Inspector should see for resources
 */

import dotenv from 'dotenv';

dotenv.config();

async function testResourceListing() {
  console.log('🔍 Testing MCP Resource Listing for Inspector');
  console.log('═'.repeat(60));

  // Create a simple mock to test the resource list response
  const mockResources = [
    {
      uri: 'servicenow://examples',
      name: 'Example Prompts',
      description: 'Example prompts for using ServiceNow MCP tools',
      mimeType: 'text/markdown'
    },
    {
      uri: 'servicenow://table-schema/incident',
      name: 'Table Schema: Incident',
      description: 'Example: Get field definitions for the incident table (Template: servicenow://table-schema/{table})',
      mimeType: 'application/json'
    },
    {
      uri: 'servicenow://table-schema/sys_user',
      name: 'Table Schema: User',
      description: 'Example: Get field definitions for the sys_user table (Template: servicenow://table-schema/{table})',
      mimeType: 'application/json'
    },
    {
      uri: 'servicenow://table-schema/change_request',
      name: 'Table Schema: Change Request',
      description: 'Example: Get field definitions for the change_request table (Template: servicenow://table-schema/{table})',
      mimeType: 'application/json'
    },
    {
      uri: 'servicenow://table-data/incident',
      name: 'Table Data Sample: Incident',
      description: 'Example: Get sample data from incident table (Template: servicenow://table-data/{table})',
      mimeType: 'application/json'
    },
    {
      uri: 'servicenow://table-data/sys_user',
      name: 'Table Data Sample: User',
      description: 'Example: Get sample data from sys_user table (Template: servicenow://table-data/{table})',
      mimeType: 'application/json'
    },
    {
      uri: 'servicenow://table-data/change_request',
      name: 'Table Data Sample: Change Request',
      description: 'Example: Get sample data from change_request table (Template: servicenow://table-data/{table})',
      mimeType: 'application/json'
    }
  ];
  
  console.log('\n📋 Resources that MCP Inspector should see:');
  console.log('═'.repeat(60));
  
  mockResources.forEach((resource, index) => {
    console.log(`${index + 1}. ${resource.name}`);
    console.log(`   URI: ${resource.uri}`);
    console.log(`   Description: ${resource.description}`);
    console.log(`   Type: ${resource.mimeType}\n`);
  });
  
  console.log('📝 How to use dynamic resources in MCP Inspector:');
  console.log('═'.repeat(60));
  console.log('The resources above are examples. For dynamic templates, you can manually enter URIs like:');
  console.log('');
  console.log('🔧 Table Schema Templates:');
  console.log('• servicenow://table-schema/cmdb_ci_server');
  console.log('• servicenow://table-schema/problem');  
  console.log('• servicenow://table-schema/kb_knowledge');
  console.log('');
  console.log('📊 Table Data Templates:');
  console.log('• servicenow://table-data/problem');
  console.log('• servicenow://table-data/cmdb_ci_server');
  console.log('• servicenow://table-data/kb_knowledge');
  console.log('');
  console.log('🎫 Specific Record Templates:');
  console.log('• servicenow://incident/INC0010001');
  console.log('• servicenow://incident/1c741bd70b2322007518478d83673af3');
  console.log('• servicenow://user/admin');
  console.log('• servicenow://user/john.doe');
  console.log('• servicenow://record/sys_user_group/some-sys-id');
  console.log('• servicenow://record/problem/some-sys-id');
  console.log('');
  console.log('✅ The MCP Inspector should list the example resources above.');
  console.log('   You can then manually type any valid template URI to access dynamic data.');
}

testResourceListing().catch(console.error);

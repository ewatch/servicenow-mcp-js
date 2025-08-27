#!/usr/bin/env node

/**
 * Test script to demonstrate the new MCP resource templates
 * 
 * This script shows how to use the dynamic resource templates that allow
 * clients to fetch ServiceNow data using parameterized URIs.
 */

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

dotenv.config();

class ResourceTemplateDemo {
  constructor() {
    this.client = null;
  }

  async initialize() {
    try {
      const instanceUrl = process.env.SERVICENOW_INSTANCE_URL.replace(/\/+$/, '');
      this.client = new ServiceNowClient({
        instanceUrl,
        clientId: process.env.SERVICENOW_CLIENT_ID,
        clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
        scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount',
        timeout: 30000,
        debug: true,
      });
      await this.client.authenticate();
      console.log('✅ Connected to ServiceNow instance');
    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      throw error;
    }
  }

  async testTableSchemaResource() {
    console.log('\n🔍 Testing Table Schema Resource Template');
    console.log('URI Pattern: servicenow://table-schema/{table}');
    console.log('═'.repeat(60));
    
    const tables = ['incident', 'sys_user', 'change_request'];
    
    for (const table of tables) {
      try {
        console.log(`\n📋 Getting schema for table: ${table}`);
        console.log(`Resource URI: servicenow://table-schema/${table}`);
        
        // Simulate what the MCP resource template would do
        const query = `name=${table}^active=true`;
        const fields = 'element,column_label,internal_type,max_length,mandatory,reference,choice_field,default_value,comments';
        const result = await this.client.queryTable('sys_dictionary', query, fields, 20, 0, 'element');
        
        const fieldDefinitions = result.result.filter(field => field.element && field.element !== '');
        console.log(`Found ${fieldDefinitions.length} fields for table '${table}'`);
        
        // Show first few fields
        fieldDefinitions.slice(0, 3).forEach(field => {
          console.log(`  • ${field.element} (${field.column_label || 'No label'}) - ${field.internal_type}`);
        });
        
      } catch (error) {
        console.error(`❌ Error getting schema for ${table}:`, error.message);
      }
    }
  }

  async testTableDataResource() {
    console.log('\n📊 Testing Table Data Sample Resource Template');
    console.log('URI Pattern: servicenow://table-data/{table}');
    console.log('═'.repeat(60));
    
    const tables = ['incident', 'sys_user', 'change_request'];
    
    for (const table of tables) {
      try {
        console.log(`\n📁 Getting sample data for table: ${table}`);
        console.log(`Resource URI: servicenow://table-data/${table}`);
        
        // Simulate what the MCP resource template would do
        const result = await this.client.queryTable(table, '', '', 5, 0, '^sys_created_on');
        console.log(`Found ${result.result.length} sample records for table '${table}'`);
        
        if (result.result.length > 0) {
          const sample = result.result[0];
          const keyFields = ['number', 'name', 'title', 'short_description', 'display_value'];
          const displayField = keyFields.find(field => sample[field]);
          if (displayField) {
            console.log(`  Sample: ${displayField} = "${sample[displayField]}"`);
          }
          console.log(`  Created: ${sample.sys_created_on}`);
        }
        
      } catch (error) {
        console.error(`❌ Error getting sample data for ${table}:`, error.message);
      }
    }
  }

  async testRecordResource() {
    console.log('\n📄 Testing Specific Record Resource Template');
    console.log('URI Pattern: servicenow://record/{table}/{sys_id}');
    console.log('═'.repeat(60));
    
    try {
      // Get a sample incident first
      console.log('\n🔍 Finding a sample incident...');
      const incidentResult = await this.client.queryTable('incident', '', 'sys_id,number,short_description', 1, 0);
      
      if (incidentResult.result.length > 0) {
        const incident = incidentResult.result[0];
        console.log(`Found incident: ${incident.number} - "${incident.short_description}"`);
        console.log(`Resource URI: servicenow://record/incident/${incident.sys_id}`);
        
        // Simulate getting the record via resource template
        const recordResult = await this.client.getRecord('incident', incident.sys_id);
        console.log(`✅ Successfully retrieved record with ${Object.keys(recordResult.result).length} fields`);
        console.log(`  Number: ${recordResult.result.number}`);
        console.log(`  State: ${recordResult.result.state}`);
        console.log(`  Priority: ${recordResult.result.priority}`);
      } else {
        console.log('No incidents found to test with');
      }
      
    } catch (error) {
      console.error('❌ Error testing record resource:', error.message);
    }
  }

  async testIncidentResource() {
    console.log('\n🎫 Testing Incident Resource Template');
    console.log('URI Pattern: servicenow://incident/{number_or_sys_id}');
    console.log('═'.repeat(60));
    
    try {
      // Get a sample incident
      const result = await this.client.queryTable('incident', '', 'sys_id,number,short_description,state', 1, 0);
      
      if (result.result.length > 0) {
        const incident = result.result[0];
        
        // Test by number
        console.log(`\n📋 Testing lookup by number: ${incident.number}`);
        console.log(`Resource URI: servicenow://incident/${incident.number}`);
        
        const byNumberQuery = `number=${incident.number}`;
        const byNumberResult = await this.client.queryTable('incident', byNumberQuery, '', 1, 0);
        if (byNumberResult.result.length > 0) {
          console.log(`✅ Found incident by number: ${byNumberResult.result[0].short_description}`);
        }
        
        // Test by sys_id
        console.log(`\n🔑 Testing lookup by sys_id: ${incident.sys_id}`);
        console.log(`Resource URI: servicenow://incident/${incident.sys_id}`);
        
        const bySysIdResult = await this.client.getRecord('incident', incident.sys_id);
        console.log(`✅ Found incident by sys_id: ${bySysIdResult.result.short_description}`);
        
      } else {
        console.log('No incidents found to test with');
      }
      
    } catch (error) {
      console.error('❌ Error testing incident resource:', error.message);
    }
  }

  async testUserResource() {
    console.log('\n👤 Testing User Profile Resource Template');
    console.log('URI Pattern: servicenow://user/{username_or_sys_id}');
    console.log('═'.repeat(60));
    
    try {
      // Get a sample user
      const result = await this.client.queryTable('sys_user', 'active=true', 'sys_id,user_name,email,name', 1, 0);
      
      if (result.result.length > 0) {
        const user = result.result[0];
        
        // Test by username
        if (user.user_name) {
          console.log(`\n👤 Testing lookup by username: ${user.user_name}`);
          console.log(`Resource URI: servicenow://user/${user.user_name}`);
          
          const byUsernameQuery = `user_name=${user.user_name}`;
          const byUsernameResult = await this.client.queryTable('sys_user', byUsernameQuery, '', 1, 0);
          if (byUsernameResult.result.length > 0) {
            console.log(`✅ Found user by username: ${byUsernameResult.result[0].name || 'No display name'}`);
          }
        }
        
        // Test by sys_id
        console.log(`\n🔑 Testing lookup by sys_id: ${user.sys_id}`);
        console.log(`Resource URI: servicenow://user/${user.sys_id}`);
        
        const bySysIdResult = await this.client.getRecord('sys_user', user.sys_id);
        console.log(`✅ Found user by sys_id: ${bySysIdResult.result.name || 'No display name'}`);
        
      } else {
        console.log('No users found to test with');
      }
      
    } catch (error) {
      console.error('❌ Error testing user resource:', error.message);
    }
  }

  async testProcessDefinitionResource() {
    console.log('\n⚙️ Testing Process Definition Resource Template');
    console.log('URI Pattern: servicenow://process-definition/{sys_id}');
    console.log('═'.repeat(60));
    
    try {
      // Get a sample process definition
      const result = await this.client.queryTable('sys_pd_process_definition', 'active=true', 'sys_id,name,label,status', 1, 0);
      
      if (result.result.length > 0) {
        const pd = result.result[0];
        console.log(`\n🏗️ Testing process definition: ${pd.name} (${pd.label})`);
        console.log(`Resource URI: servicenow://process-definition/${pd.sys_id}`);
        
        // Get process definition details
        const pdDetails = await this.client.getRecord('sys_pd_process_definition', pd.sys_id);
        console.log(`✅ Process Definition: ${pdDetails.result.name}`);
        console.log(`   Status: ${pdDetails.result.status}`);
        console.log(`   Active: ${pdDetails.result.active}`);
        
        // Get associated lanes
        const lanesQuery = `process_definition=${pd.sys_id}^active=true`;
        const lanesResult = await this.client.queryTable('sys_pd_lane_definition', lanesQuery, '', 10, 0, 'order');
        console.log(`   Lanes: ${lanesResult.result.length}`);
        
        if (lanesResult.result.length > 0) {
          // Get activities for first lane
          const firstLane = lanesResult.result[0];
          const activitiesQuery = `lane=${firstLane.sys_id}^active=true`;
          const activitiesResult = await this.client.queryTable('sys_pd_activity_definition', activitiesQuery, '', 10, 0, 'order');
          console.log(`   Activities in "${firstLane.name}": ${activitiesResult.result.length}`);
        }
        
      } else {
        console.log('No process definitions found to test with');
      }
      
    } catch (error) {
      console.error('❌ Error testing process definition resource:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 ServiceNow MCP Resource Template Demonstration');
    console.log('═'.repeat(60));
    console.log('This demo shows the new dynamic resource templates that allow');
    console.log('MCP clients to access ServiceNow data using parameterized URIs.');
    
    await this.testTableSchemaResource();
    await this.testTableDataResource();
    await this.testRecordResource();
    await this.testIncidentResource();
    await this.testUserResource();
    await this.testProcessDefinitionResource();
    
    console.log('\n✅ Demo completed!');
    console.log('\n📖 Available Resource Templates:');
    console.log('   • servicenow://table-schema/{table}');
    console.log('   • servicenow://table-data/{table}');
    console.log('   • servicenow://record/{table}/{sys_id}');
    console.log('   • servicenow://incident/{number_or_sys_id}');
    console.log('   • servicenow://user/{username_or_sys_id}');
    console.log('   • servicenow://process-definition/{sys_id}');
    console.log('\n📚 Use these URIs with MCP clients to dynamically fetch ServiceNow data!');
  }
}

async function main() {
  const demo = new ResourceTemplateDemo();
  
  try {
    await demo.initialize();
    await demo.runAllTests();
  } catch (error) {
    console.error('Demo failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ResourceTemplateDemo };

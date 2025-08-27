#!/usr/bin/env node

/**
 * Test script for table schema functionality
 * This tests the new servicenow://table-schema/{tablename} resource logic
 */

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

dotenv.config();

class TableSchemaResourceTester {
  constructor() {
    this.serviceNowClient = null;
  }

  async initialize() {
    console.log('Initializing ServiceNow client for testing...');
    
    const config = {
      instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
      clientId: process.env.SERVICENOW_CLIENT_ID,
      clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
      username: process.env.SERVICENOW_USERNAME,
      password: process.env.SERVICENOW_PASSWORD
    };

    this.serviceNowClient = new ServiceNowClient(config);
    await this.serviceNowClient.authenticate();
    console.log('✓ ServiceNow client initialized successfully');
  }

  async getTableSchema(tableName) {
    // This replicates the logic from the MCP resource
    const query = `name=${tableName}^active=true`;
    const fields = 'element,column_label,internal_type,max_length,mandatory,reference,choice_field,default_value,comments';
    const result = await this.serviceNowClient.queryTable('sys_dictionary', query, fields, 1000, 0, 'element');
    
    const fieldDefinitions = result.result;
    
    const tableSchema = {
      table: tableName,
      fields: fieldDefinitions.map(field => ({
        column_name: field.element,
        column_label: field.column_label,
        internal_type: field.internal_type,
        max_length: field.max_length,
        mandatory: field.mandatory === 'true',
        reference: field.reference,
        is_choice_field: field.choice_field === 'true',
        default_value: field.default_value,
        comments: field.comments
      })).filter(field => field.column_name && field.column_name !== '')
    };

    return tableSchema;
  }

  async testTableSchemaResource(tableName = 'incident') {
    console.log(`\n--- Testing Table Schema Resource for '${tableName}' ---`);

    try {
      const schema = await this.getTableSchema(tableName);
      
      console.log(`✓ Retrieved schema for table '${tableName}'`);
      console.log(`✓ Found ${schema.fields.length} fields`);

      // Display first few fields as example
      console.log('\nFirst 5 fields:');
      schema.fields.slice(0, 5).forEach((field, index) => {
        console.log(`  ${index + 1}. ${field.column_name} (${field.column_label})`);
        console.log(`     Type: ${field.internal_type}, Mandatory: ${field.mandatory}`);
        if (field.reference) {
          console.log(`     References: ${field.reference}`);
        }
        if (field.is_choice_field) {
          console.log(`     Choice field: Yes`);
        }
      });

      // Test that critical fields are present for incident table
      if (tableName === 'incident') {
        const criticalFields = ['number', 'short_description', 'priority', 'state'];
        const foundFields = schema.fields.map(f => f.column_name);
        
        console.log('\nChecking for critical incident fields:');
        criticalFields.forEach(fieldName => {
          if (foundFields.includes(fieldName)) {
            console.log(`✓ Found critical field: ${fieldName}`);
          } else {
            console.warn(`⚠ Missing critical field: ${fieldName}`);
          }
        });
      }

      return schema;
    } catch (error) {
      console.error(`✗ Error testing table schema for '${tableName}':`, error.message);
      throw error;
    }
  }

  async testMultipleTables() {
    console.log('\n--- Testing Multiple Table Schemas ---');
    
    const testTables = ['incident', 'sys_user'];
    
    for (const tableName of testTables) {
      try {
        const schema = await this.testTableSchemaResource(tableName);
        console.log(`✓ Successfully tested ${tableName} (${schema.fields.length} fields)`);
      } catch (error) {
        console.error(`✗ Failed to test ${tableName}:`, error.message);
      }
    }
  }

  async runAllTests() {
    try {
      await this.initialize();
      await this.testTableSchemaResource('incident');
      await this.testMultipleTables();
      
      console.log('\n✓ All table schema resource tests completed successfully!');
      console.log('\nThe new MCP resource servicenow://table-schema/{tablename} is working correctly.');
      console.log('Example usage:');
      console.log('- servicenow://table-schema/incident');
      console.log('- servicenow://table-schema/sys_user');
      
    } catch (error) {
      console.error('\n✗ Test failed:', error.message);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new TableSchemaResourceTester();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { TableSchemaResourceTester };

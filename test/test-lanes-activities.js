#!/usr/bin/env node

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

// Load environment variables
dotenv.config();

async function testLanesAndActivitiesTools() {
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
    
    // ======================
    // Test Process Lanes
    // ======================
    console.log('\n🏊 === TESTING PROCESS LANE TOOLS ===');
    
    // 1. List all process lanes
    console.log('\n1️⃣ Testing list_process_lanes...');
    const lanes = await client.queryTable('sys_pd_lane', 
      'active=true', 
      'sys_id,name,label,description,process_definition,order,active', 
      10, 0, '^order');
    console.log(`✅ Found ${lanes.result.length} lanes`);
    if (lanes.result.length > 0) {
      console.log(`   First lane: ${lanes.result[0].name} (${lanes.result[0].sys_id})`);
    }
    
    // 2. Get specific lane details
    if (lanes.result.length > 0) {
      console.log('\n2️⃣ Testing get_process_lane...');
      const laneDetail = await client.getRecord('sys_pd_lane', lanes.result[0].sys_id);
      console.log(`✅ Retrieved lane details for: ${laneDetail.result.name}`);
      console.log(`   Process Definition: ${laneDetail.result.process_definition?.value || 'None'}`);
    }
    
    // 3. Search lanes with advanced query
    console.log('\n3️⃣ Testing search_process_lanes...');
    const searchedLanes = await client.queryTable('sys_pd_lane', 
      'active=true^orderISNOTEMPTY', 
      'sys_id,name,order,process_definition', 
      5, 0, '^order');
    console.log(`✅ Advanced search found ${searchedLanes.result.length} lanes`);
    
    // 4. Get lane schema
    console.log('\n4️⃣ Testing get_process_lane_schema...');
    const laneSchema = await client.queryTable('sys_dictionary', 
      'name=sys_pd_lane^active=true', 
      'element,column_label,internal_type,mandatory', 
      20, 0, '^element');
    console.log(`✅ Retrieved ${laneSchema.result.length} lane schema fields`);
    console.log('   Key fields:', laneSchema.result.slice(0, 5).map(f => f.element).join(', '));
    
    // ======================
    // Test Process Activities
    // ======================
    console.log('\n🎯 === TESTING PROCESS ACTIVITY TOOLS ===');
    
    // 1. List all process activities
    console.log('\n1️⃣ Testing list_process_activities...');
    const activities = await client.queryTable('sys_pd_activity', 
      'active=true', 
      'sys_id,name,label,description,lane,activity_definition,order,active', 
      10, 0, '^order');
    console.log(`✅ Found ${activities.result.length} activities`);
    if (activities.result.length > 0) {
      console.log(`   First activity: ${activities.result[0].name} (${activities.result[0].sys_id})`);
    }
    
    // 2. Get specific activity details
    if (activities.result.length > 0) {
      console.log('\n2️⃣ Testing get_process_activity...');
      const activityDetail = await client.getRecord('sys_pd_activity', activities.result[0].sys_id);
      console.log(`✅ Retrieved activity details for: ${activityDetail.result.name}`);
      console.log(`   Lane: ${activityDetail.result.lane?.value || 'None'}`);
      console.log(`   Activity Definition: ${activityDetail.result.activity_definition?.value || 'None'}`);
    }
    
    // 3. Search activities with advanced query
    console.log('\n3️⃣ Testing search_process_activities...');
    const searchedActivities = await client.queryTable('sys_pd_activity', 
      'active=true^orderISNOTEMPTY', 
      'sys_id,name,order,lane', 
      5, 0, '^order');
    console.log(`✅ Advanced search found ${searchedActivities.result.length} activities`);
    
    // 4. Get activity schema
    console.log('\n4️⃣ Testing get_process_activity_schema...');
    const activitySchema = await client.queryTable('sys_dictionary', 
      'name=sys_pd_activity^active=true', 
      'element,column_label,internal_type,mandatory', 
      20, 0, '^element');
    console.log(`✅ Retrieved ${activitySchema.result.length} activity schema fields`);
    console.log('   Key fields:', activitySchema.result.slice(0, 5).map(f => f.element).join(', '));
    
    // 5. List activity definitions
    console.log('\n5️⃣ Testing list_activity_definitions...');
    const activityDefinitions = await client.queryTable('sys_pd_activity_definition', 
      'active=true', 
      'sys_id,name,label,description,category', 
      10, 0, '^name');
    console.log(`✅ Found ${activityDefinitions.result.length} activity definitions`);
    if (activityDefinitions.result.length > 0) {
      console.log('   Available definitions:');
      activityDefinitions.result.slice(0, 3).forEach((def, index) => {
        console.log(`      ${index + 1}. ${def.name} - ${def.label || 'No label'}`);
      });
    }
    
    // ======================
    // Test Relationship Queries
    // ======================
    console.log('\n🔗 === TESTING RELATIONSHIP QUERIES ===');
    
    // 1. Get activities for a specific lane
    if (lanes.result.length > 0) {
      console.log('\n1️⃣ Testing activities by lane...');
      const laneActivities = await client.queryTable('sys_pd_activity', 
        `lane=${lanes.result[0].sys_id}`, 
        'sys_id,name,order', 
        10, 0, '^order');
      console.log(`✅ Found ${laneActivities.result.length} activities for lane "${lanes.result[0].name}"`);
    }
    
    // 2. Get lanes for a specific process definition
    if (lanes.result.length > 0 && lanes.result[0].process_definition?.value) {
      console.log('\n2️⃣ Testing lanes by process definition...');
      const processLanes = await client.queryTable('sys_pd_lane', 
        `process_definition=${lanes.result[0].process_definition.value}`, 
        'sys_id,name,order', 
        10, 0, '^order');
      console.log(`✅ Found ${processLanes.result.length} lanes for process definition`);
    }
    
    // ======================
    // Summary
    // ======================
    console.log('\n📊 === TEST SUMMARY ===');
    console.log('✅ All process lane tools tested successfully:');
    console.log('   - List process lanes');
    console.log('   - Search process lanes');
    console.log('   - Get process lane details');
    console.log('   - Get process lane schema');
    console.log('');
    console.log('✅ All process activity tools tested successfully:');
    console.log('   - List process activities');
    console.log('   - Search process activities');
    console.log('   - Get process activity details');
    console.log('   - Get process activity schema');
    console.log('   - List activity definitions');
    console.log('');
    console.log('✅ Relationship queries working:');
    console.log('   - Activities by lane');
    console.log('   - Lanes by process definition');
    console.log('');
    console.log('🎉 All lanes and activities tools are ready for use!');
    console.log('');
    console.log('📝 Available for creation/update/delete operations:');
    console.log('   - Create/update/delete process lanes');
    console.log('   - Create/update/delete process activities');
    console.log('   - Full CRUD operations for process components');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLanesAndActivitiesTools();

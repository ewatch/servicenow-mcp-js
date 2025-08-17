#!/usr/bin/env node

import dotenv from 'dotenv';
import { ServiceNowClient } from '../src/servicenow-client.js';

// Load environment variables
dotenv.config();

async function exploreLanesAndActivities() {
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
    
    // Explore sys_pd_lane table
    console.log('\n🏊 === EXPLORING SYS_PD_LANE TABLE ===');
    
    // Get schema for lanes
    console.log('\n📊 Getting table schema for sys_pd_lane...');
    try {
      const laneSchema = await client.queryTable('sys_dictionary', 
        'name=sys_pd_lane^active=true', 
        'element,column_label,internal_type,max_length,mandatory,reference', 
        50, 0, 'element');
      
      console.log(`✅ Found ${laneSchema.result.length} lane field definitions:`);
      laneSchema.result.forEach((field, index) => {
        if (field.element) {
          console.log(`   ${index + 1}. ${field.element} (${field.column_label || 'No label'}) - Type: ${field.internal_type}`);
        }
      });
    } catch (schemaError) {
      console.log('⚠️  Could not retrieve lane schema, proceeding with data query...');
    }
    
    // Query lanes
    console.log('\n🔍 Querying sys_pd_lane table...');
    const laneResult = await client.queryTable('sys_pd_lane', 
      'active=true', 
      'name,sys_id,active,process_definition,lane_type,order,sys_created_on', 
      10, 0, '^sys_created_on');
    
    console.log(`✅ Found ${laneResult.result.length} lane(s):`);
    
    if (laneResult.result.length === 0) {
      console.log('   No lanes found in this instance.');
    } else {
      laneResult.result.forEach((lane, index) => {
        console.log(`\n   ${index + 1}. ${lane.name || 'Unnamed Lane'}`);
        console.log(`      Sys ID: ${lane.sys_id}`);
        console.log(`      Process Definition: ${lane.process_definition}`);
        console.log(`      Lane Type: ${lane.lane_type}`);
        console.log(`      Order: ${lane.order}`);
        console.log(`      Created: ${lane.sys_created_on}`);
      });
    }
    
    // Explore sys_pd_activity table
    console.log('\n🎯 === EXPLORING SYS_PD_ACTIVITY TABLE ===');
    
    // Get schema for activities
    console.log('\n📊 Getting table schema for sys_pd_activity...');
    try {
      const activitySchema = await client.queryTable('sys_dictionary', 
        'name=sys_pd_activity^active=true', 
        'element,column_label,internal_type,max_length,mandatory,reference', 
        50, 0, 'element');
      
      console.log(`✅ Found ${activitySchema.result.length} activity field definitions:`);
      activitySchema.result.forEach((field, index) => {
        if (field.element) {
          console.log(`   ${index + 1}. ${field.element} (${field.column_label || 'No label'}) - Type: ${field.internal_type}`);
        }
      });
    } catch (schemaError) {
      console.log('⚠️  Could not retrieve activity schema, proceeding with data query...');
    }
    
    // Query activities
    console.log('\n🔍 Querying sys_pd_activity table...');
    const activityResult = await client.queryTable('sys_pd_activity', 
      'active=true', 
      'name,sys_id,active,lane,activity_type,order,x,y,sys_created_on', 
      10, 0, '^sys_created_on');
    
    console.log(`✅ Found ${activityResult.result.length} activity(ies):`);
    
    if (activityResult.result.length === 0) {
      console.log('   No activities found in this instance.');
    } else {
      activityResult.result.forEach((activity, index) => {
        console.log(`\n   ${index + 1}. ${activity.name || 'Unnamed Activity'}`);
        console.log(`      Sys ID: ${activity.sys_id}`);
        console.log(`      Lane: ${activity.lane}`);
        console.log(`      Activity Type: ${activity.activity_type}`);
        console.log(`      Order: ${activity.order}`);
        console.log(`      Position: (${activity.x}, ${activity.y})`);
        console.log(`      Created: ${activity.sys_created_on}`);
      });
    }
    
    // Try to get detailed records if they exist
    if (laneResult.result.length > 0) {
      console.log('\n🔍 Getting detailed view of first lane...');
      const detailedLane = await client.getRecord('sys_pd_lane', laneResult.result[0].sys_id);
      console.log('✅ Detailed lane record:');
      console.log(JSON.stringify(detailedLane.result, null, 2));
    }
    
    if (activityResult.result.length > 0) {
      console.log('\n🔍 Getting detailed view of first activity...');
      const detailedActivity = await client.getRecord('sys_pd_activity', activityResult.result[0].sys_id);
      console.log('✅ Detailed activity record:');
      console.log(JSON.stringify(detailedActivity.result, null, 2));
    }
    
    console.log('\n🎉 Lanes and activities exploration completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

exploreLanesAndActivities();

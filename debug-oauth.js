#!/usr/bin/env node

import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function debugOAuthRequest() {
  try {
    const tokenUrl = `${process.env.SERVICENOW_INSTANCE_URL}/oauth_token.do`;
    
    // Create Basic Auth header for client credentials (like Postman)
    const clientCredentials = Buffer.from(`${process.env.SERVICENOW_CLIENT_ID}:${process.env.SERVICENOW_CLIENT_SECRET}`).toString('base64');
    
    console.log('🔍 Debug Information:');
    console.log('Instance URL:', process.env.SERVICENOW_INSTANCE_URL);
    console.log('Token URL:', tokenUrl);
    console.log('Client ID:', process.env.SERVICENOW_CLIENT_ID);
    console.log('Client Secret:', process.env.SERVICENOW_CLIENT_SECRET);
    console.log('Username:', process.env.SERVICENOW_USERNAME);
    console.log('Password:', process.env.SERVICENOW_PASSWORD);
    console.log('Basic Auth Header:', `Basic ${clientCredentials}`);
    
    const data = new URLSearchParams({
      grant_type: 'password',
      username: process.env.SERVICENOW_USERNAME,
      password: process.env.SERVICENOW_PASSWORD,
      scope: process.env.SERVICENOW_OAUTH_SCOPE || 'useraccount'
    });
    
    console.log('\n📤 Request Body:', data.toString());
    
    const requestConfig = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${clientCredentials}`
      },
      timeout: 30000
    };
    
    console.log('\n📋 Request Headers:', requestConfig.headers);
    
    console.log('\n🔐 Making OAuth request...');
    
    const response = await axios.post(tokenUrl, data, requestConfig);
    
    console.log('✅ Success! Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

debugOAuthRequest();

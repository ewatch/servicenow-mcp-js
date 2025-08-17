import axios from 'axios';

export class ServiceNowClient {
  constructor(config) {
    this.instanceUrl = config.instanceUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
    this.scope = config.scope || 'useraccount';
    this.timeout = config.timeout || 30000;
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Create axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.instanceUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  async authenticate() {
    try {
      const tokenUrl = `${this.instanceUrl}/oauth_token.do`;
      
      // Create Basic Auth header for client credentials
      const clientCredentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const data = new URLSearchParams({
        grant_type: 'password',
        username: this.username,
        password: this.password,
        scope: this.scope
      });

      const response = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${clientCredentials}`
        },
        timeout: this.timeout
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Set token expiry (default to 1 hour if not provided)
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        
        // Update default authorization header
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
        
        console.error('Successfully authenticated with ServiceNow');
        return true;
      } else {
        throw new Error('No access token received from ServiceNow');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.status} - ${error.response.data?.error_description || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Authentication failed: No response from ServiceNow server');
      } else {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  }

  async ensureAuthenticated() {
    // Check if token is expired or will expire in the next 5 minutes
    if (!this.accessToken || !this.tokenExpiry || Date.now() > (this.tokenExpiry - 300000)) {
      await this.authenticate();
    }
  }

  async makeRequest(method, path, data = null, params = null) {
    await this.ensureAuthenticated();
    
    try {
      const config = {
        method,
        url: path,
        ...(data && { data }),
        ...(params && { params })
      };

      const response = await this.httpClient.request(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || 
                           error.response.data?.error?.detail ||
                           error.response.statusText;
        throw new Error(`ServiceNow API error (${error.response.status}): ${errorMessage}`);
      } else if (error.request) {
        throw new Error('No response from ServiceNow server');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  }

  // Table API methods
  async getRecord(table, sysId, fields = null) {
    const params = {};
    if (fields) {
      params.sysparm_fields = Array.isArray(fields) ? fields.join(',') : fields;
    }
    
    return await this.makeRequest('GET', `/api/now/table/${table}/${sysId}`, null, params);
  }

  async queryTable(table, query = null, fields = null, limit = 100, offset = 0, orderBy = null) {
    const params = {
      sysparm_limit: limit,
      sysparm_offset: offset
    };
    
    if (query) {
      params.sysparm_query = query;
    }
    if (fields) {
      params.sysparm_fields = Array.isArray(fields) ? fields.join(',') : fields;
    }
    if (orderBy) {
      params.sysparm_orderby = orderBy;
    }
    
    return await this.makeRequest('GET', `/api/now/table/${table}`, null, params);
  }

  async createRecord(table, data) {
    return await this.makeRequest('POST', `/api/now/table/${table}`, data);
  }

  async updateRecord(table, sysId, data) {
    return await this.makeRequest('PUT', `/api/now/table/${table}/${sysId}`, data);
  }

  async deleteRecord(table, sysId) {
    return await this.makeRequest('DELETE', `/api/now/table/${table}/${sysId}`);
  }

  // Incident-specific methods
  async getIncident(sysId, fields = null) {
    return await this.getRecord('incident', sysId, fields);
  }

  async createIncident(incidentData) {
    return await this.createRecord('incident', incidentData);
  }

  async updateIncident(sysId, incidentData) {
    return await this.updateRecord('incident', sysId, incidentData);
  }

  async queryIncidents(query = null, fields = null, limit = 100, offset = 0) {
    return await this.queryTable('incident', query, fields, limit, offset);
  }

  // Script Include methods
  async getScriptInclude(sysId, fields = null) {
    return await this.getRecord('sys_script_include', sysId, fields);
  }

  async createScriptInclude(scriptData) {
    return await this.createRecord('sys_script_include', scriptData);
  }

  async updateScriptInclude(sysId, scriptData) {
    return await this.updateRecord('sys_script_include', sysId, scriptData);
  }

  async queryScriptIncludes(query = null, fields = null, limit = 100, offset = 0) {
    return await this.queryTable('sys_script_include', query, fields, limit, offset);
  }
}

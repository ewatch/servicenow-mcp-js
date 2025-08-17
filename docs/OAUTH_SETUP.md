# ServiceNow OAuth Setup Guide

This guide will help you set up OAuth 2.0 authentication for your ServiceNow instance to work with the MCP server.

## Prerequisites

- Admin access to your ServiceNow PDI (Personal Developer Instance)
- Basic understanding of OAuth 2.0 flow

## Step 1: Create OAuth Application Registry

1. **Navigate to System OAuth → Application Registry**
   - In your ServiceNow instance, go to the navigation menu
   - Search for "Application Registry" or navigate to `System OAuth > Application Registry`

2. **Create New OAuth API Endpoint**
   - Click "New" button
   - Select "Create an OAuth API endpoint for external clients"

3. **Configure the OAuth Application**
   - **Name**: `MCP ServiceNow Integration` (or any descriptive name)
   - **Client ID**: This will be auto-generated (copy this value)
   - **Client Secret**: This will be auto-generated (copy this value)
   - **Redirect URL**: `http://localhost` (not used for password grant, but required)
   - **Refresh Token Lifespan**: 7776000 (90 days, or as needed)
   - **Access Token Lifespan**: 1800 (30 minutes, or as needed)
   - **Logo**: Optional

4. **Save the OAuth Application**
   - Click "Submit" to create the application
   - **Important**: Copy and securely store the Client ID and Client Secret

## Step 2: Configure OAuth Scopes

1. **Default Scope Configuration**
   - The server uses the `useraccount` scope by default
   - This provides basic user account access and table API permissions

2. **Custom Scopes (Optional)**
   - You can create custom scopes if needed for specific use cases
   - Navigate to `System OAuth > OAuth Entity Scopes` to create custom scopes

## Step 3: User Role Configuration

Ensure your ServiceNow user has the necessary roles:

### Required Roles:
- **rest_service**: Allows access to REST APIs
- **web_service_admin**: Administrative access to web services (optional)

### For Incident Management:
- **itil**: Basic ITIL role for incident access
- **incident_manager**: For full incident management capabilities

### For Script Includes:
- **admin**: Administrative access (required for script include management)
- **security_admin**: For advanced script include operations

### To Assign Roles:
1. Navigate to `User Administration > Users`
2. Find your user account
3. Open the user record
4. Go to the "Roles" tab
5. Add the required roles

## Step 4: Configure Environment Variables

Create a `.env` file in your project root:

```env
# ServiceNow Instance Configuration
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com

# OAuth 2.0 Credentials (from Step 1)
SERVICENOW_CLIENT_ID=your_client_id_from_step1
SERVICENOW_CLIENT_SECRET=your_client_secret_from_step1

# User Credentials
SERVICENOW_USERNAME=your_servicenow_username
SERVICENOW_PASSWORD=your_servicenow_password

# Optional Configuration
SERVICENOW_OAUTH_SCOPE=useraccount
SERVICENOW_TIMEOUT=30000
DEBUG=false
```

## Step 5: Test the Configuration

Run the test script to verify your setup:

```bash
npm run test-connection
```

This will:
- Verify all required environment variables are set
- Test OAuth authentication
- Make a sample API call to retrieve incidents
- Display connection status

## Security Best Practices

### 1. Secure Credential Storage
- Never commit your `.env` file to version control
- Use secure secret management in production environments
- Rotate OAuth credentials regularly

### 2. Network Security
- Use HTTPS for all ServiceNow communications (default)
- Consider IP whitelisting for production deployments
- Monitor OAuth token usage and revoke unused tokens

### 3. User Account Security
- Use a dedicated service account for MCP integration
- Apply principle of least privilege (minimum required roles)
- Enable multi-factor authentication on the service account
- Regularly review and audit service account access

## Troubleshooting Common Issues

### Authentication Failures

**Issue**: "Authentication failed: 400 - invalid_grant"
- **Cause**: Incorrect username/password or expired credentials
- **Solution**: Verify credentials and ensure account is not locked

**Issue**: "Authentication failed: 400 - invalid_client"
- **Cause**: Incorrect Client ID or Client Secret
- **Solution**: Verify OAuth application configuration

### Permission Errors

**Issue**: "ServiceNow API error (403): Forbidden"
- **Cause**: User lacks required roles
- **Solution**: Add necessary roles to the user account

**Issue**: "Table not accessible"
- **Cause**: User doesn't have read/write access to specific tables
- **Solution**: Grant table-specific ACLs or assign appropriate roles

### Network Issues

**Issue**: "No response from ServiceNow server"
- **Cause**: Network connectivity or instance URL issues
- **Solution**: 
  - Verify instance URL format: `https://instance-name.service-now.com`
  - Check network connectivity to ServiceNow
  - Verify instance is active and accessible

### Token Expiration

**Issue**: Frequent re-authentication required
- **Cause**: Short token lifespan
- **Solution**: 
  - Increase access token lifespan in OAuth application settings
  - The server automatically handles token refresh

## Advanced Configuration

### Custom OAuth Scopes

For specific use cases, you can create custom OAuth scopes:

1. Navigate to `System OAuth > OAuth Entity Scopes`
2. Create new scope with required permissions
3. Update the `SERVICENOW_OAUTH_SCOPE` environment variable

### API Rate Limiting

ServiceNow has rate limiting in place:
- Default: 5000 requests per hour per user
- Monitor usage in `System Logs > REST Message Logs`
- Implement request throttling if needed

### Development vs Production

**Development (PDI)**:
- Use personal credentials for testing
- Enable debug logging
- Use shorter token lifespans for security

**Production**:
- Use dedicated service accounts
- Implement proper secret management
- Use longer token lifespans for efficiency
- Monitor and log all API access

## Support and Resources

- [ServiceNow OAuth Documentation](https://docs.servicenow.com/bundle/vancouver-platform-security/page/administer/security/concept/c_OAuthApplications.html)
- [ServiceNow REST API Documentation](https://docs.servicenow.com/bundle/vancouver-application-development/page/integrate/inbound-rest/concept/c_RESTAPI.html)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)

For additional help, consult the ServiceNow Developer Community or documentation.

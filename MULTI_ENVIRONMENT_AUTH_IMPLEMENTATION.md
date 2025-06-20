# Multi-Environment Authentication Implementation

## Overview

This implementation adds support for being logged into multiple Roo Code Cloud environments simultaneously. Previously, the system only supported authentication to a single environment at a time. Now users can authenticate to multiple environments (e.g., production, staging, development) and switch between them seamlessly.

## Architecture Changes

### 1. CloudService Refactoring

**Before**: Single singleton instance managing one authentication session
**After**: Multiple instances managed by environment ID, with an active environment concept

Key changes:
- `CloudService` now manages multiple instances via `_instances` map
- Each instance is associated with a specific `CloudEnvironment`
- Active environment concept allows switching context without losing other sessions
- Environment-specific method variants (e.g., `loginToEnvironment()`, `logoutFromEnvironment()`)

### 2. AuthService Updates

**Before**: Single credential storage with fixed keys
**After**: Environment-specific credential storage with dynamic keys

Key changes:
- Constructor now requires `CloudEnvironment` parameter
- Credential storage keys are environment-specific: `clerk-auth-credentials-{environmentId}`
- State keys are environment-specific: `clerk-auth-state-{environmentId}`
- Login URLs include environment parameter for proper callback handling
- Logging includes environment ID for better debugging

### 3. New EnvironmentManager Service

A new service that orchestrates multiple CloudService instances:
- Loads environment configuration from VS Code settings
- Initializes CloudService instances for each configured environment
- Provides high-level environment management operations
- Handles environment switching and authentication coordination

## Configuration

### VS Code Settings

Add environment configuration to your VS Code settings:

```json
{
  "rooCode.cloud": {
    "environments": [
      {
        "id": "production",
        "name": "Roo Code Cloud (Production)"
      },
      {
        "id": "staging", 
        "name": "Roo Code Cloud (Staging)",
        "apiUrl": "https://staging-api.roocode.com",
        "clerkBaseUrl": "https://staging-clerk.roocode.com"
      },
      {
        "id": "development",
        "name": "Roo Code Cloud (Development)", 
        "apiUrl": "https://dev-api.roocode.com",
        "clerkBaseUrl": "https://dev-clerk.roocode.com"
      }
    ],
    "defaultEnvironment": "production"
  }
}
```

If no environments are configured, the system defaults to a single production environment.

## New Message Types

### WebviewMessage (from UI to extension)

- `rooCloudSignInToEnvironment` - Sign in to specific environment
- `rooCloudSignOutFromEnvironment` - Sign out from specific environment  
- `rooCloudSetActiveEnvironment` - Switch active environment
- `rooCloudGetEnvironments` - Request list of all environments
- `rooCloudGetAuthenticatedEnvironments` - Request list of authenticated environments
- `rooCloudLogoutFromAllEnvironments` - Sign out from all environments

### ExtensionMessage (from extension to UI)

- `cloudEnvironments` - List of all configured environments
- `cloudAuthenticatedEnvironments` - List of authenticated environments
- `cloudActiveEnvironment` - Currently active environment

## Usage Examples

### Backend Usage

```typescript
// Initialize environment manager
const environmentManager = await EnvironmentManager.createInstance(context, callbacks)

// Get all environments
const environments = environmentManager.getEnvironments()

// Get authenticated environments  
const authenticatedEnvs = environmentManager.getAuthenticatedEnvironments()

// Login to specific environment
await environmentManager.loginToEnvironment('staging')

// Switch active environment
environmentManager.setActiveEnvironment('development')

// Check authentication status
const isAuthenticated = environmentManager.isAuthenticated('production')

// Get user info for specific environment
const userInfo = environmentManager.getUserInfo('staging')
```

### Frontend Usage

```typescript
// Sign in to specific environment
vscode.postMessage({ 
  type: "rooCloudSignInToEnvironment", 
  environmentId: "staging" 
})

// Sign out from specific environment
vscode.postMessage({ 
  type: "rooCloudSignOutFromEnvironment", 
  environmentId: "production" 
})

// Switch active environment
vscode.postMessage({ 
  type: "rooCloudSetActiveEnvironment", 
  environmentId: "development" 
})

// Get list of environments
vscode.postMessage({ type: "rooCloudGetEnvironments" })

// Sign out from all environments
vscode.postMessage({ type: "rooCloudLogoutFromAllEnvironments" })
```

## Data Storage

### Credential Storage

Each environment stores its credentials separately:
- Production: `clerk-auth-credentials-production`
- Staging: `clerk-auth-credentials-staging`  
- Development: `clerk-auth-credentials-development`

### State Storage

Each environment stores its auth state separately:
- Production: `clerk-auth-state-production`
- Staging: `clerk-auth-state-staging`
- Development: `clerk-auth-state-development`

## Error Handling

The implementation includes comprehensive error handling:
- Environment-specific error logging with environment ID prefixes
- Graceful handling of missing environments
- Proper cleanup on environment removal
- Fallback to default environment on active environment removal

## Migration

### Existing Users

Existing users with single-environment authentication will:
1. Have their existing credentials migrated to the default "production" environment
2. Continue to work without any configuration changes
3. Can optionally configure additional environments as needed

### Backward Compatibility

The original `CloudService.instance` getter still works and returns the active environment's instance, ensuring existing code continues to function.

## UI Integration

The account view in the webview needs to be updated to:
1. Display available environments
2. Show authentication status per environment
3. Provide environment-specific sign in/out buttons
4. Allow switching between active environments

## Security Considerations

- Each environment maintains separate authentication sessions
- Credentials are stored using VS Code's secure secret storage
- Environment-specific state prevents cross-environment data leakage
- Proper logout procedures clear environment-specific data

## Testing

To test the multi-environment authentication:

1. Configure multiple environments in VS Code settings
2. Sign in to different environments
3. Verify separate credential storage
4. Test environment switching
5. Verify proper logout behavior
6. Test error scenarios (invalid environments, network issues)

## Troubleshooting

### Common Issues

1. **Environment not found**: Check VS Code settings configuration
2. **Authentication failures**: Verify API URLs and environment configuration
3. **Credential conflicts**: Clear existing credentials and re-authenticate
4. **State inconsistencies**: Use "Sign out from all environments" to reset

### Debug Logging

All operations include environment-specific logging:
```
[CloudService:production] Successfully authenticated
[auth:staging] Transitioned to active-session state
[EnvironmentManager] Set active environment to: development
```

## Future Enhancements

Potential future improvements:
- Environment-specific user preferences
- Cross-environment data synchronization options
- Environment health monitoring
- Bulk operations across environments
- Environment templates for common configurations

## Implementation Notes

This implementation maintains backward compatibility while adding powerful multi-environment capabilities. The modular design allows for easy extension and maintenance, with clear separation of concerns between authentication, environment management, and UI coordination.
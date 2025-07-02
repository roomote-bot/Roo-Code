# Deployment Guide

## ⚠️ Vercel Deployment Warning

**IMPORTANT**: The Next.js applications in this repository (`apps/web-evals` and `apps/web-roo-code`) are configured to **prevent accidental Vercel deployments**.

### Vercel Prevention Measures

1. **Automatic Vercel Monitoring Disabled**: Both applications have `automaticVercelMonitors: false` in their Next.js configuration
2. **Vercel Ignore Files**: `.vercelignore` files are present in both applications to prevent deployment
3. **Manual Override Required**: If you need to deploy to Vercel, you must manually remove these protections

### Why These Protections Exist

- Prevents accidental deployments during development
- Avoids unintended resource usage on Vercel
- Ensures intentional deployment decisions
- Protects against misconfigured CI/CD pipelines
- Maintains control over deployment environments
- Prevents unauthorized or unmonitored deployments

### Vercel Cleanup and Disconnection

If you previously had Vercel deployments and need to clean them up, see the comprehensive guide:

📖 **[Vercel Cleanup Guide](./VERCEL_CLEANUP.md)** - Step-by-step instructions for safely disconnecting and cleaning up existing Vercel deployments.

### If You Need to Deploy to Vercel

⚠️ **Warning**: Only proceed if you have explicit approval and understand the implications.

If you intentionally want to deploy to Vercel, you must:

1. **Remove Protection Files**:

    ```bash
    # Remove .vercelignore files
    rm apps/web-evals/.vercelignore
    rm apps/web-roo-code/.vercelignore
    ```

2. **Update Next.js Configuration**:

    - Remove `automaticVercelMonitors: false` from `apps/web-evals/next.config.ts`
    - Remove `automaticVercelMonitors: false` from `apps/web-roo-code/next.config.ts`

3. **Configure Vercel Project Settings**:

    - Set up proper environment variables
    - Configure build and deployment settings
    - Set up custom domains if needed

4. **Test Thoroughly**:
    - Verify the deployment works as expected
    - Test all functionality in the deployed environment
    - Monitor resource usage and costs

### Alternative Deployment Options

Consider these recommended alternatives for deploying the Next.js applications:

#### 🐳 Docker Deployment

Both applications can be containerized and deployed to any container platform:

```bash
# Build Docker image
docker build -t roo-code-app .

# Run locally
docker run -p 3000:3000 roo-code-app

# Deploy to container platforms
# - AWS ECS/Fargate
# - Google Cloud Run
# - Azure Container Instances
# - DigitalOcean App Platform
```

#### 📦 Static Export

Configure Next.js for static export if your app supports it:

```bash
# Add to next.config.ts
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
}

# Build and export
npm run build
```

#### 🌐 Other Hosting Platforms

- **Netlify**: Excellent for static sites and JAMstack applications
- **Railway**: Simple deployment with Git integration and databases
- **DigitalOcean App Platform**: Managed container deployment
- **AWS Amplify**: Full-stack deployment with AWS integration
- **Cloudflare Pages**: Fast global deployment with edge computing

#### 🏠 Self-hosted Options

- **Traditional VPS**: Deploy to your own virtual private server
- **Kubernetes**: For scalable container orchestration
- **PM2**: Process manager for Node.js applications

## Application-Specific Notes

### web-evals

- **Location**: `apps/web-evals/`
- **Purpose**: Next.js application for evaluation management
- **Vercel Protections**:
    - `.vercelignore` file (ignores all files: `*`)
    - `automaticVercelMonitors: false` in Next.js config
- **Dependencies**: Requires database connection and evaluation services
- **Recommended Deployment**: Docker with database container

### web-roo-code

- **Location**: `apps/web-roo-code/`
- **Purpose**: Next.js application for the main website
- **Vercel Protections**:
    - `.vercelignore` file (ignores all files: `*`)
    - `automaticVercelMonitors: false` in Next.js config
- **Special Features**:
    - Production domain redirects (www → non-www, HTTP → HTTPS)
    - Custom redirect configuration in `next.config.ts`
- **Recommended Deployment**: Static export or Docker for dynamic features

## Protection Mechanism Details

### How .vercelignore Works

The `.vercelignore` file contains a single `*` wildcard that tells Vercel to ignore all files in the project, effectively preventing any deployment.

### How automaticVercelMonitors Works

Setting `automaticVercelMonitors: false` in the Next.js configuration disables Vercel's automatic monitoring features, which can trigger deployments.

### Bypassing Protections (Advanced)

If you need to temporarily bypass protections for testing:

```bash
# Temporarily rename protection files
mv apps/web-evals/.vercelignore apps/web-evals/.vercelignore.bak
mv apps/web-roo-code/.vercelignore apps/web-roo-code/.vercelignore.bak

# Deploy to Vercel
vercel --prod

# Restore protections
mv apps/web-evals/.vercelignore.bak apps/web-evals/.vercelignore
mv apps/web-roo-code/.vercelignore.bak apps/web-roo-code/.vercelignore
```

## Development

For local development, these protections do not affect your workflow:

```bash
# Install dependencies
npm install

# Start development servers
cd apps/web-evals && npm run dev     # Usually runs on :3000
cd apps/web-roo-code && npm run dev  # Usually runs on :3001

# Run both applications simultaneously
npm run dev  # If workspace script is configured
```

### Development Environment Setup

1. **Prerequisites**:

    - Node.js 18+
    - npm or pnpm
    - Git

2. **Environment Variables**:

    - Copy `.env.example` to `.env.local` in each app directory
    - Configure required environment variables
    - Never commit `.env.local` files

3. **Database Setup** (for web-evals):
    - Set up local database or use development database
    - Run migrations if applicable
    - Seed test data if needed

## Monitoring and Maintenance

### Regular Checks

- Verify protection files are still in place
- Monitor for accidental Vercel project creation
- Review deployment logs and costs
- Update alternative deployment configurations

### Security Considerations

- Regularly rotate API keys and secrets
- Monitor access logs for unauthorized deployment attempts
- Keep deployment documentation up to date
- Review team access to deployment platforms

## Troubleshooting

### Common Issues

**Problem**: Vercel deployment still occurs despite protections
**Solution**:

1. Verify `.vercelignore` contains `*`
2. Check `automaticVercelMonitors: false` is in config
3. Remove any existing Vercel projects (see [VERCEL_CLEANUP.md](./VERCEL_CLEANUP.md))

**Problem**: Local development not working
**Solution**:

1. Run `npm install` in project root and app directories
2. Check Node.js version compatibility
3. Verify environment variables are set correctly

**Problem**: Alternative deployment failing
**Solution**:

1. Check platform-specific requirements
2. Verify build process works locally
3. Review deployment logs for specific errors

## Questions and Support

If you have questions about deployment or need to modify these protections:

1. **First**: Review this documentation and the [Vercel Cleanup Guide](./VERCEL_CLEANUP.md)
2. **Development Team**: Consult with the development team before making changes
3. **Security Team**: For security-related deployment questions
4. **DevOps Team**: For infrastructure and deployment platform questions

### Emergency Contacts

For urgent deployment issues:

- Check the project's README for current contact information
- Use the project's communication channels (Slack, Discord, etc.)
- Create an issue in the repository with the `deployment` label

---

**Last Updated**: January 2025
**Version**: 1.0
**Maintainer**: Development Team

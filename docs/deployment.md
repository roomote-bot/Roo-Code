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

### If You Need to Deploy to Vercel

If you intentionally want to deploy to Vercel, you must:

1. Remove or modify the `.vercelignore` files in the respective app directories
2. Remove `automaticVercelMonitors: false` from the Next.js configuration files
3. Configure your Vercel project settings appropriately

### Alternative Deployment Options

Consider these alternatives for deploying the Next.js applications:

- **Docker**: Both applications can be containerized and deployed to any container platform
- **Static Export**: Configure Next.js for static export if applicable
- **Other Platforms**: Deploy to Netlify, Railway, or other hosting providers
- **Self-hosted**: Deploy to your own infrastructure

## Application-Specific Notes

### web-evals

- Located in `apps/web-evals/`
- Next.js application for evaluation management
- Vercel protections: `.vercelignore` + `automaticVercelMonitors: false`

### web-roo-code

- Located in `apps/web-roo-code/`
- Next.js application for the main website
- Vercel protections: `.vercelignore` + `automaticVercelMonitors: false`
- Additional redirects configured for production domains

## Development

For local development, these protections do not affect your workflow:

```bash
# Start development servers
cd apps/web-evals && npm run dev
cd apps/web-roo-code && npm run dev
```

## Questions?

If you have questions about deployment or need to modify these protections, please consult with the development team before making changes.

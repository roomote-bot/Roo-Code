# Vercel Cleanup and Disconnection Guide

This guide provides step-by-step instructions for safely disconnecting and cleaning up Vercel deployments for the Roo-Code-Cloud repository.

## ⚠️ Important Notice

The applications in this repository (`apps/web-evals` and `apps/web-roo-code`) are now configured with **automatic Vercel deployment protections**. However, if you previously had Vercel deployments, you may need to clean them up manually.

## Pre-Cleanup Checklist

Before proceeding with Vercel cleanup:

- [ ] Ensure you have admin access to the Vercel project(s)
- [ ] Document any custom domain configurations
- [ ] Back up any environment variables or project settings
- [ ] Notify team members about the disconnection
- [ ] Verify alternative deployment methods are in place

## Step 1: Access Vercel Dashboard

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project(s) related to Roo-Code-Cloud
3. Identify the projects that need to be removed:
    - `roo-code-cloud-web-evals` (or similar)
    - `roo-code-cloud-web-roo-code` (or similar)

## Step 2: Remove Custom Domains (if applicable)

For each project with custom domains:

1. Go to **Settings** → **Domains**
2. Remove all custom domains by clicking the **Remove** button
3. Confirm the removal when prompted
4. Wait for DNS propagation (may take up to 48 hours)

## Step 3: Download Project Data (Optional)

If you need to preserve any data:

1. Go to **Settings** → **Environment Variables**
2. Export/copy any important environment variables
3. Go to **Deployments** tab
4. Note any important deployment configurations

## Step 4: Delete Vercel Projects

For each project:

1. Navigate to **Settings** → **Advanced**
2. Scroll to the **Delete Project** section
3. Type the project name to confirm deletion
4. Click **Delete Project**
5. Confirm the deletion in the popup

## Step 5: Remove GitHub Integration (if applicable)

If the repository was connected via GitHub integration:

1. Go to [Vercel Integrations](https://vercel.com/dashboard/integrations)
2. Find the GitHub integration
3. Click **Manage** → **Repository Access**
4. Remove access to the `RooCodeInc/Roo-Code-Cloud` repository
5. Save the changes

## Step 6: Clean Up Local Vercel Configuration

Remove any local Vercel configuration files:

```bash
# Remove Vercel configuration files (if they exist)
rm -f .vercel/project.json
rm -f .vercel/README.txt
rmdir .vercel 2>/dev/null || true

# Remove any Vercel-specific files from apps
rm -f apps/web-evals/vercel.json
rm -f apps/web-roo-code/vercel.json
```

## Step 7: Verify Cleanup

Confirm the cleanup was successful:

1. Check that projects no longer appear in Vercel Dashboard
2. Verify custom domains are no longer pointing to Vercel
3. Confirm GitHub integration no longer has repository access
4. Test that local development still works:

```bash
# Test local development
cd apps/web-evals && npm run dev
cd apps/web-roo-code && npm run dev
```

## Step 8: Update DNS (if custom domains were used)

If you were using custom domains:

1. Update DNS records to point to your new hosting provider
2. Remove any CNAME records pointing to Vercel
3. Add appropriate A/AAAA records for your new hosting

## Troubleshooting

### Project Won't Delete

If you can't delete a project:

- Ensure you have admin permissions
- Remove all custom domains first
- Contact Vercel support if the issue persists

### DNS Still Points to Vercel

If DNS records still point to Vercel after cleanup:

- Check your DNS provider's control panel
- Remove CNAME records pointing to `cname.vercel-dns.com`
- DNS changes can take up to 48 hours to propagate

### GitHub Integration Issues

If you can't remove GitHub integration:

- Go to GitHub → Settings → Applications → Authorized OAuth Apps
- Find Vercel and revoke access
- Remove the integration from Vercel dashboard

## Alternative Deployment Options

After Vercel cleanup, consider these deployment alternatives:

### Docker Deployment

```bash
# Build and deploy with Docker
docker build -t roo-code-app .
docker run -p 3000:3000 roo-code-app
```

### Static Export

```bash
# Configure Next.js for static export
npm run build
npm run export
```

### Other Platforms

- **Netlify**: Great for static sites and JAMstack
- **Railway**: Simple deployment with Git integration
- **DigitalOcean App Platform**: Managed container deployment
- **AWS Amplify**: Full-stack deployment with AWS integration

## Post-Cleanup Verification

After completing the cleanup:

- [ ] Vercel projects are deleted
- [ ] Custom domains are disconnected
- [ ] GitHub integration is removed
- [ ] Local development works
- [ ] Alternative deployment is configured
- [ ] Team is notified of changes
- [ ] DNS records are updated (if applicable)

## Need Help?

If you encounter issues during cleanup:

1. Check the [Vercel Documentation](https://vercel.com/docs)
2. Contact Vercel Support through their dashboard
3. Consult with the development team
4. Review this repository's deployment documentation

## Security Note

After cleanup, ensure:

- No sensitive environment variables remain in Vercel
- API keys used with Vercel are rotated if necessary
- Access tokens are revoked
- Team members' access is properly managed in new deployment platform

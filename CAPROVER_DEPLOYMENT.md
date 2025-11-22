# Caprover Deployment Guide

This guide explains how to deploy the Chordboy application to your Caprover infrastructure.

## Prerequisites

- A Caprover instance up and running
- Access to your Caprover dashboard
- Bash shell (macOS/Linux)
- `rsync` and `tar` utilities installed (usually pre-installed on macOS/Linux)

## Files Overview

The following files have been created for Caprover deployment:

### 1. `captain-definition`

This file tells Caprover to use a Dockerfile for deployment. It's a JSON file that Caprover requires to understand how to build your application.

### 2. `Dockerfile`

A multi-stage Docker build configuration:

- **Build Stage**: Uses Node.js 18 Alpine to install dependencies and build the Vite application
- **Production Stage**: Uses Nginx Alpine to serve the built static files
- Includes proper SPA routing configuration for React applications

### 3. `build-deploy.sh`

An automated script that creates deployment-ready `.tar` files for Caprover.

## Deployment Process

### Step 1: Build the Deployment Package

Run the build script from the project root:

```bash
./build-deploy.sh
```

This script will:

1. Create a temporary directory with your project files
2. Exclude unnecessary files (node_modules, .git, dist, etc.)
3. Verify that required files exist (captain-definition, Dockerfile)
4. Create a timestamped `.tar` file
5. Output the file to the `caprover-deploy/` directory

**Output**: `caprover-deploy/chordboy_YYYYMMDD_HHMMSS.tar`

### Step 2: Deploy to Caprover

#### Option A: Web Interface (Drag & Drop)

1. Log into your Caprover dashboard
2. Navigate to **Apps** in the sidebar
3. Either:
   - Select your existing app, OR
   - Click **"Create New App"** and name it (e.g., `chordboy`, `chordboy-app`, or `my-chordboy`)
   - **Important:** App names must be at least 4 characters long and contain only lowercase letters, numbers, and hyphens. Avoid very short names like "ch" or "app".
4. Click on your app to open its settings
5. Go to the **Deployment** tab
6. Scroll to the **"Method 3: Deploy from Tarball"** section
7. Drag and drop the `.tar` file from `caprover-deploy/` directory
8. Click **"Upload & Deploy"**
9. Wait for the build to complete (you'll see build logs in real-time)

#### Option B: Caprover CLI

Alternatively, you can use the Caprover CLI tool:

```bash
# Install Caprover CLI (if not already installed)
npm install -g caprover

# Login to your Caprover instance (one-time setup)
caprover login

# Deploy the tarball
caprover deploy -t ./caprover-deploy/chordboy_YYYYMMDD_HHMMSS.tar
```

### Step 3: Configure Your App (First-time Setup)

After the first deployment, you MUST configure these settings to access your app:

#### Required Configuration:

1. **Enable HTTP Settings** (REQUIRED to access your app):
   - Go to your app's page in Caprover dashboard
   - Click on the **HTTP Settings** tab
   - Check **"Enable HTTP"** or **"Has Persistent Data"** checkbox
   - Your app will now be accessible at: `http://chordboy.your-caprover-domain.com`
   - Wait 10-30 seconds for the changes to take effect

2. **Verify App is Running**:
   - Go to the **App Configs** tab
   - Check that the app status shows as "Running" (green indicator)
   - If not running, check **App Logs** tab for errors

#### Optional Configuration:

3. **Enable HTTPS** (Recommended for production):
   - Go to **HTTP Settings** tab
   - Check **"Enable HTTPS"**
   - Wait for SSL certificate to be generated (may take 1-2 minutes)
   - Check **"Force HTTPS by redirecting all HTTP traffic"**

4. **Enable Websocket Support** (if needed):
   - Go to **HTTP Settings** tab
   - Check **"Websocket Support"**

5. **Set Environment Variables** (if needed):
   - Go to **App Configs** tab
   - Add any required environment variables
   - Click **Save & Update** after adding variables

6. **Configure Custom Domain** (optional):
   - Go to **HTTP Settings** tab
   - Click **Connect New Domain**
   - Add your custom domain (e.g., `chordboy.yourdomain.com`)
   - Point your domain's DNS `A` record to your Caprover IP
   - Wait for DNS propagation (can take 5 minutes to 48 hours)
   - Enable HTTPS for the custom domain

## Rebuilding and Redeploying

Whenever you make changes to your application:

1. Commit your changes to git (recommended)
2. Run `./build-deploy.sh` to create a new tar file
3. Upload the new tar file through the Caprover dashboard
4. Caprover will rebuild and redeploy your app automatically

## Troubleshooting

### Build Fails

- Check the build logs in the Caprover dashboard for specific error messages
- Ensure your `package.json` has all required dependencies
- Verify that `npm run build` works locally before deploying

### App Won't Start

- Check the app logs in Caprover dashboard (**App Logs** tab)
- Verify Nginx configuration in the Dockerfile
- Ensure port 80 is exposed (already configured in Dockerfile)

### 404 Errors on Refresh

The Dockerfile includes SPA routing configuration (`try_files $uri $uri/ /index.html`), which should handle this. If you still get 404s, verify the Nginx configuration in the Dockerfile.

### Deployment Package Too Large

If your `.tar` file is very large, you might need to add more exclusions to the `build-deploy.sh` script. Common candidates:

- `.env` files (don't commit secrets!)
- Large media files
- Documentation that's not needed for deployment
- Test files

Edit the `rsync --exclude` list in `build-deploy.sh` to add more exclusions.

## Production Considerations

### Performance

- The Dockerfile uses multi-stage builds to minimize image size
- Nginx serves static files efficiently
- Consider enabling Caprover's built-in CDN features for better performance

### Security

- Always use HTTPS in production
- Never commit sensitive data (API keys, credentials) to your repository
- Use Caprover's environment variables for sensitive configuration

### Monitoring

- Monitor your app logs regularly in the Caprover dashboard
- Set up Caprover's alerting if your instance has excessive restarts
- Monitor resource usage (CPU/Memory) in the Monitoring tab

## Quick Reference

```bash
# Build deployment package
./build-deploy.sh

# Output location
caprover-deploy/chordboy_YYYYMMDD_HHMMSS.tar

# Deploy via CLI (optional)
caprover deploy -t ./caprover-deploy/chordboy_*.tar
```

## Additional Resources

- [Caprover Documentation](https://caprover.com/docs/)
- [Caprover CLI](https://github.com/caprover/caprover-cli)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

If you encounter issues:

1. Check Caprover logs in the dashboard
2. Review the Dockerfile and captain-definition
3. Test Docker build locally: `docker build -t chordboy-test .`
4. Consult Caprover documentation and community forums

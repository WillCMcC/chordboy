# Chordboy - Caprover Quick Start

## After Deployment Success, Follow These Steps:

### Step 1: Enable HTTP Access (REQUIRED!)

Your app deployed successfully but is not accessible yet because HTTP is not enabled by default.

1. Go to your Caprover dashboard
2. Click on your app (e.g., "chordboy")
3. Click the **"HTTP Settings"** tab
4. ✅ **Check the "Enable HTTP" checkbox** (this is the critical step!)
5. Click **"Save & Update"**
6. Wait 10-30 seconds

### Step 2: Access Your App

Your app is now available at:

```
http://chordboy.your-caprover-domain.com
```

Replace `your-caprover-domain.com` with your actual Caprover root domain.

### Step 3: Enable HTTPS (Recommended)

Once you confirm the app works over HTTP:

1. Still in **HTTP Settings** tab
2. ✅ Check **"Enable HTTPS"**
3. Wait 1-2 minutes for SSL certificate generation
4. ✅ Check **"Force HTTPS"** to redirect all HTTP to HTTPS
5. Click **"Save & Update"**

Now access at: `https://chordboy.your-caprover-domain.com`

## Common Issues

### "Cannot access the app" or Connection Refused

- ✅ Make sure **"Enable HTTP"** is checked in HTTP Settings
- ✅ Verify app is **Running** (check App Configs tab for green status)
- ✅ Wait 30 seconds after enabling HTTP
- ✅ Try accessing without HTTPS first (use `http://` not `https://`)

### App shows as "Not Running"

1. Go to **App Logs** tab
2. Check for errors
3. Common fix: Restart the app from **App Configs** tab

### SSL/HTTPS Issues

- Make sure your Caprover root domain has valid DNS records
- SSL generation takes 1-2 minutes, be patient
- Try HTTP first before enabling HTTPS

### Cloudflare Beacon Error (Safe to Ignore)

If you see this error in console:

```
GET https://static.cloudflareinsights.com/beacon.min.js ... net::ERR_BLOCKED_BY_CLIENT
```

This is just your ad blocker blocking Cloudflare analytics. It's completely harmless and won't affect your app's functionality.

### CSS/Assets Not Loading (404 Errors)

If the page loads but has no styling or you see 404 errors for CSS/JS files:

1. **Check App Logs** in Caprover - look for nginx errors
2. **Verify the build** worked correctly (should see "dist" folder with index.html and assets/)
3. **Try clearing your browser cache** - Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
4. If still broken, **redeploy** with a fresh tar file:
   ```bash
   ./build-deploy.sh
   ```
   Then upload the new tar file to Caprover

## Build & Deploy Command

```bash
./build-deploy.sh
```

Then drag and drop the tar file from `caprover-deploy/` directory into Caprover's Deployment tab.

## Need More Help?

See full documentation: `CAPROVER_DEPLOYMENT.md`

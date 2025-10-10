# Firebase Storage CORS Configuration Fix

## Problem
Images from Firebase Storage are blocked by CORS policy when accessing from `localhost` during development.

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:60167' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution: Configure CORS for Firebase Storage

### Method 1: Using Google Cloud Console (Easiest)

1. **Go to Cloud Console**:
   - Visit: https://console.cloud.google.com/storage/browser
   - Select your project: `visitaproject-5cd9f`
   - Find your bucket: `visitaproject-5cd9f.firebasestorage.app`

2. **Open Cloud Shell** (top-right terminal icon)

3. **Create CORS configuration file**:
   ```bash
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization"]
     }
   ]
   EOF
   ```

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://visitaproject-5cd9f.firebasestorage.app
   ```

5. **Verify CORS configuration**:
   ```bash
   gsutil cors get gs://visitaproject-5cd9f.firebasestorage.app
   ```

### Method 2: Install gsutil Locally (Alternative)

If you prefer to run commands locally:

1. **Install Google Cloud SDK**:
   - Download: https://cloud.google.com/sdk/docs/install
   - Or use PowerShell (Windows):
     ```powershell
     (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
     & $env:Temp\GoogleCloudSDKInstaller.exe
     ```

2. **Initialize gcloud**:
   ```bash
   gcloud init
   ```
   - Select your Google account
   - Choose project: `visitaproject-5cd9f`

3. **Apply CORS configuration**:
   ```bash
   gsutil cors set mobile-app/storage-cors.json gs://visitaproject-5cd9f.firebasestorage.app
   ```

### Method 3: Production Configuration (More Restrictive)

For production, use specific origins instead of wildcard:

```json
[
  {
    "origin": [
      "http://localhost:60167",
      "https://visitaproject-5cd9f.web.app",
      "https://visitaproject-5cd9f.firebaseapp.com"
    ],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type"]
  }
]
```

## Why This Happens

- **CORS (Cross-Origin Resource Sharing)** is a browser security feature
- By default, Firebase Storage doesn't allow requests from `localhost` or other origins
- You must explicitly configure which origins can access your storage files
- Using `"*"` allows all origins (fine for capstone/development)
- For production, restrict to specific domains

## After Applying CORS

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** the Flutter web app (Ctrl+F5)
3. **Restart the dev server** if needed:
   ```bash
   cd mobile-app
   flutter run -d chrome
   ```

## Verify It Works

After applying CORS, the images should load without errors. Check browser console:
- ✅ No CORS errors
- ✅ Images display in church cards
- ✅ 200 OK status for image requests

## Quick Test

Run this in browser console while on your app:
```javascript
fetch('https://firebasestorage.googleapis.com/v0/b/visitaproject-5cd9f.firebasestorage.app/o/churches%2FSt.%20Joseph%20the%20Worker%20Parish%2Fimages%2Fmain-1759803209183.jpg?alt=media')
  .then(r => console.log('✅ CORS fixed!', r.status))
  .catch(e => console.log('❌ CORS still blocked', e));
```

## Troubleshooting

### CORS still not working?
1. Wait 5-10 minutes for changes to propagate
2. Try incognito/private browsing mode
3. Verify bucket name is exactly: `visitaproject-5cd9f.firebasestorage.app`
4. Check Firebase Storage rules allow `read` access

### gsutil command not found?
- Use **Google Cloud Console Shell** (Method 1) - it's pre-installed there
- Or install Google Cloud SDK locally

### Permission denied?
- Make sure you're logged in to the correct Google account
- Your account must have `Storage Admin` role on the Firebase project

## Security Notes

- Using `origin: ["*"]` is fine for development and capstone projects
- For production apps, restrict origins to your actual domains
- Keep storage rules properly configured (public read, admin write)
- Monitor usage in Firebase Console to stay within free tier

---

**Quick Action**: Use **Method 1** with Google Cloud Console Shell - it's the fastest way! ⚡

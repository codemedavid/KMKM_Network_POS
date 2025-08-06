# Mobile Device Access Setup

## Problem
You're trying to access `http://192.168.18.226:3000` from a mobile device, but:
1. The Next.js dev server only binds to localhost by default
2. Camera access requires HTTPS when accessing via IP addresses
3. Browsers block camera access on HTTP connections from non-localhost addresses

## Solutions

### Option 1: Quick HTTPS Setup with ngrok (Recommended)

1. **Install ngrok** (if not already installed):
   ```bash
   # Using Homebrew (macOS)
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your Next.js server** (already configured for network access):
   ```bash
   npm run dev
   # Server runs on http://0.0.0.0:3000 (accessible from network)
   ```

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Use the HTTPS URL** provided by ngrok on your mobile device:
   ```
   https://abc123.ngrok.io  # Example URL
   ```

5. **Access from mobile** - camera will work with HTTPS!

### Option 2: Local Network Access (File Upload Only)

If you just need file upload (not live camera), you can use:

1. **Access via IP**: `http://192.168.18.226:3000`
2. **Camera won't work** (requires HTTPS)
3. **File upload will work** for existing photos

### Option 3: Same Machine Access

Access from the same machine where the server is running:
```
http://localhost:3000  # Camera works on localhost
```

## Current Server Configuration

✅ **Server is now configured to accept network connections**
- Changed from `next dev` to `next dev -H 0.0.0.0`
- Accessible from other devices on the same network
- Available at: `http://192.168.18.226:3000`

## Camera Access Requirements

| Access Method | Camera | File Upload | Notes |
|---------------|---------|-------------|-------|
| `localhost:3000` | ✅ Works | ✅ Works | Local access only |
| `192.168.x.x:3000` (HTTP) | ❌ Blocked | ✅ Works | No HTTPS |
| `https://xxx.ngrok.io` | ✅ Works | ✅ Works | **Recommended** |

## Testing Steps

1. **Start the server**: `npm run dev`
2. **Test locally**: Visit `http://localhost:3000` - camera should work
3. **Test network**: Visit `http://192.168.18.226:3000` - file upload works, camera shows error with helpful message
4. **Test HTTPS**: Use ngrok URL - everything works!

## Troubleshooting

**If ngrok is not available:**
- Use the file upload feature instead of live camera
- Or set up SSL certificates manually
- Or access from localhost on the same machine

**Mobile browser issues:**
- Clear browser cache
- Try Chrome/Safari on mobile
- Ensure permissions are granted for camera

The app now provides helpful error messages and fallback options when camera access isn't available!
# Camera Setup Instructions

## Camera Access Requirements

The mobile camera interface requires specific conditions to work properly:

### 🔒 **HTTPS Required**
Camera access is only available over HTTPS connections (or localhost for development).

#### For Development:
```bash
# Next.js runs on HTTP by default on localhost, which should work
npm run dev
# Access via: http://localhost:3000
```

#### For Production:
- **HTTPS is mandatory** for camera access
- Ensure your deployment platform provides SSL certificates
- Vercel, Netlify, and most modern hosting platforms provide HTTPS by default

### 🌐 **Browser Support**
The camera interface requires modern browsers that support:
- `navigator.mediaDevices.getUserMedia()`
- WebRTC
- ES6+ features

**Supported Browsers:**
- ✅ Chrome 53+
- ✅ Firefox 36+
- ✅ Safari 11+
- ✅ Edge 12+
- ✅ Mobile Chrome/Safari on iOS 11+
- ✅ Android Browser 53+

### 📱 **Mobile Considerations**

#### iOS Safari:
- Requires user gesture to start camera
- May need to tap "Allow" twice
- Works best in full-screen mode

#### Android Chrome:
- Usually works seamlessly
- May require microphone permission as well

### 🔧 **Troubleshooting**

#### Common Issues:

1. **"Camera API not supported"**
   - Use a modern browser
   - Ensure you're on HTTPS (production)
   - Check if browser has camera permissions

2. **"Camera access requires HTTPS"**
   - Deploy to HTTPS-enabled hosting
   - For development, use `localhost` (not IP address)

3. **"Camera permission denied"**
   - Check browser permissions
   - Clear site data and try again
   - Ensure no other apps are using the camera

4. **"No camera found"**
   - Check if device has a camera
   - Ensure camera is not being used by other apps
   - Try refreshing the page

#### Quick Fixes:

```bash
# Development - ensure using localhost
npm run dev
# Then access: http://localhost:3000 (not 127.0.0.1:3000)

# Production - check HTTPS
curl -I https://your-domain.com
# Should return HTTP/2 200 with SSL certificate
```

### 🚀 **Deployment Checklist**

- [ ] HTTPS certificate configured
- [ ] Camera permissions policy set (if using iframe)
- [ ] CSP headers allow camera access
- [ ] Browser compatibility tested
- [ ] Mobile devices tested
- [ ] Fallback to file upload working

### 📄 **Permissions Policy (Optional)**
If embedding in iframe or need explicit permissions:

```html
<meta http-equiv="Permissions-Policy" content="camera=*, microphone=*">
```

### 🔄 **Fallback Behavior**

The app automatically provides fallbacks:
1. **Camera not available** → File upload option
2. **HTTPS required** → Clear error message with instructions
3. **Permission denied** → Retry button and file upload
4. **No camera found** → File upload alternative

### 📊 **Testing**

Test camera functionality on:
- [ ] Desktop Chrome (latest)
- [ ] Desktop Firefox (latest)
- [ ] iPhone Safari (iOS 11+)
- [ ] Android Chrome (latest)
- [ ] Different network conditions
- [ ] HTTPS vs HTTP environments

The mobile camera interface will gracefully degrade to file upload when camera access is not available, ensuring all users can still use the receipt scanning functionality.
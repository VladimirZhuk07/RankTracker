# PWA Setup Guide

Your RankTracker app is now configured as a Progressive Web App (PWA)! 🎉

## What's Been Configured

✅ **Service Worker** - Automatic caching for offline support  
✅ **Web App Manifest** - Makes your app installable  
✅ **PWA Meta Tags** - Proper iOS and Android support  
✅ **Auto-registration** - PWA features work automatically in production

## Required: Create App Icons

You need to create two icon files and place them in the `public/` directory:

- `public/icon-192x192.png` (192x192 pixels)
- `public/icon-512x512.png` (512x512 pixels)

### Option 1: Use Online Icon Generators (Easiest)

**Recommended Tools:**

1. **[Favicon.io PWA Icon Generator](https://favicon.io/favicon-generator/)**
   - Create from text, image, or emoji
   - Downloads all sizes you need
   - Free and easy to use

2. **[PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)**
   - Upload one image
   - Generates all required sizes
   - From Microsoft's PWABuilder

3. **[RealFaviconGenerator](https://realfavicongenerator.net/)**
   - Comprehensive favicon/icon generator
   - Preview on all devices
   - Generates complete package

### Option 2: Create Icons Manually

If you have your logo/icon:

1. Use any image editor (Photoshop, GIMP, Figma, Canva)
2. Create two square images:
   - 192x192px (for mobile)
   - 512x512px (for high-res displays)
3. Export as PNG with transparent background (recommended)
4. Save to `public/icon-192x192.png` and `public/icon-512x512.png`

### Option 3: Use Placeholder Icons (For Testing)

For quick testing, you can create simple colored squares:

```bash
# Using ImageMagick (if installed)
convert -size 192x192 xc:#000000 -pointsize 60 -fill white -gravity center -annotate +0+0 "RT" public/icon-192x192.png
convert -size 512x512 xc:#000000 -pointsize 160 -fill white -gravity center -annotate +0+0 "RT" public/icon-512x512.png
```

Or use an online placeholder generator like [Placehold.co](https://placehold.co/):
- Download: `https://placehold.co/192x192/000000/FFF/png?text=RT`
- Download: `https://placehold.co/512x512/000000/FFF/png?text=RT`

## How to Test PWA

### Development
PWA features are **disabled** in development mode to avoid caching issues.

### Production Build
1. Build your app:
   ```bash
   npm run build
   npm start
   ```

2. Open in browser: `http://localhost:3000`

3. Look for install prompt:
   - **Desktop**: Install icon in address bar
   - **Mobile Chrome**: "Add to Home Screen" banner
   - **iOS Safari**: Share → Add to Home Screen

### Test Checklist

- [ ] Icons are present in `public/` directory
- [ ] App shows install prompt
- [ ] App works offline (after first visit)
- [ ] App icon appears on home screen when installed
- [ ] App opens without browser UI when launched from home screen

## Customization

### Update App Colors

Edit `public/manifest.json`:
```json
{
  "theme_color": "#000000",      // Browser toolbar color
  "background_color": "#ffffff"  // Splash screen background
}
```

### Update App Name

Edit `public/manifest.json`:
```json
{
  "name": "Your Full App Name",
  "short_name": "Short Name"  // Max 12 characters for home screen
}
```

### Advanced: Offline Fallback Page

The current setup caches pages automatically. To add a custom offline page:

1. Create `public/offline.html`
2. Update `next.config.ts`:
   ```typescript
   withPWA({
     dest: 'public',
     disable: process.env.NODE_ENV === 'development',
     register: true,
     skipWaiting: true,
     fallbacks: {
       document: '/offline.html'
     }
   })
   ```

## Troubleshooting

**Install prompt doesn't appear:**
- Ensure you're on HTTPS (or localhost)
- Check DevTools → Application → Manifest for errors
- Icons must be present and correct size
- Clear browser cache and rebuild

**App not working offline:**
- Service worker only registers in production
- Visit app online first to cache assets
- Check DevTools → Application → Service Workers

**Changes not reflecting:**
- Service workers cache aggressively
- Clear browser cache
- Unregister old service worker in DevTools
- Rebuild app: `npm run build`

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Next.js PWA Guide](https://ducanh-next-pwa.vercel.app/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)


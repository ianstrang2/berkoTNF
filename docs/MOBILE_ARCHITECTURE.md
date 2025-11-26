# 📱 Mobile App Architecture

**Last Updated:** November 26, 2025  
**Architecture Type:** Webview Wrapper (Hybrid App)

---

## 🎯 **Summary**

Capo mobile app uses a **webview wrapper architecture** - the simplest and most reliable approach for a web-first app.

**What it is:**
- Native iOS/Android shell
- Contains a webview (Safari/Chrome engine)
- Webview loads your Next.js web app
- No static export, no complex builds

**Think of it as:** A native app frame around your website 📱

---

## 🏗️ **Architecture Diagram**

```
┌─────────────────────────────────────────┐
│   Native App Shell (iOS/Android)        │
│                                          │
│   ┌──────────────────────────────────┐  │
│   │   WebView (Safari/Chrome)        │  │
│   │                                  │  │
│   │   Loads URL based on mode:       │  │
│   │                                  │  │
│   │   DEV:  http://localhost:3000    │  │
│   │   PROD: https://app.caposport.com│  │
│   │                                  │  │
│   │   Shows full Next.js app:        │  │
│   │   • React components             │  │
│   │   • Tailwind styling             │  │
│   │   • API routes via apiFetch()    │  │
│   └──────────────────────────────────┘  │
│                                          │
│   Native capabilities:                  │
│   • Deep links (capo://)                │
│   • Push notifications (future)         │
│   • Status bar styling                  │
└─────────────────────────────────────────┘
```

---

## 📋 **How It Works**

### **Development Mode**

```bash
# Terminal 1
npm run dev
# Starts Next.js dev server on localhost:3000

# Terminal 2  
npm run ios:dev
# Launches simulator with webview pointing to localhost:3000
```

**What happens:**
1. Native app launches
2. Webview loads `http://localhost:3000`
3. Shows your Next.js app with live reload
4. All API routes work (running on localhost)

### **Production Mode**

```bash
npm run ios:build
# Opens Xcode, webview points to app.caposport.com
```

**What happens:**
1. Native app launches
2. Webview loads `https://app.caposport.com`
3. Shows your deployed Vercel app
4. All API routes work (running on Vercel)

---

## 🔧 **Technical Implementation**

### **capacitor.config.ts**

```typescript
const isDev = process.env.CAP_SERVER_ENV === 'dev';

const config: CapacitorConfig = {
  appId: 'com.caposport.capo',
  appName: 'Capo',
  webDir: 'public', // Not used in webview mode
  
  // Server config switches based on environment
  ...(isDev ? {
    server: {
      url: 'http://localhost:3000',
      cleartext: true, // Allow HTTP for dev
    }
  } : {
    server: {
      url: 'https://app.caposport.com',
      cleartext: false, // HTTPS only
    }
  }),
};
```

### **package.json scripts**

```json
{
  "scripts": {
    "ios:dev": "CAP_SERVER_ENV=dev npx cap run ios",
    "ios:build": "CAP_SERVER_ENV=prod npx cap sync ios && npx cap open ios"
  }
}
```

### **next.config.mjs**

```javascript
// Just a normal Next.js config - no static export!
const nextConfig = {
  images: {
    unoptimized: true, // Optional for mobile compatibility
  },
};
```

---

## ✅ **Benefits of This Architecture**

### **1. Simplicity**
- ✅ No static export complexity
- ✅ No "generateStaticParams" errors
- ✅ No build-time API route issues
- ✅ Works exactly like your web app

### **2. Development Speed**
- ✅ Live reload in dev mode
- ✅ No long build times
- ✅ Instant updates
- ✅ Easy debugging (Safari Web Inspector)

### **3. Maintainability**
- ✅ Single codebase for web + mobile
- ✅ Deploy once to Vercel, mobile gets it
- ✅ No duplicate UI code
- ✅ Same API routes everywhere

### **4. Testing**
- ✅ Test on localhost before deploying
- ✅ Test on production URL before archiving
- ✅ No "works in dev, broken in prod" issues
- ✅ Safari Web Inspector for debugging

---

## ❌ **Trade-offs**

### **Requires Internet**
- App needs connection to load (can't use offline)
- For Capo this is fine - football app needs connection anyway for:
  - Live match updates
  - RSVP system
  - Real-time stats
  - Team balancing

### **First Load Speed**
- Slightly slower first load (loading from URL)
- Not noticeable on WiFi/4G
- Can add splash screen if needed

### **Not "Pure Native"**
- Still a webview (not SwiftUI/Kotlin)
- But 95% of hybrid apps work this way
- Airbnb, Uber Eats, Instagram use similar patterns

---

## 🆚 **Alternative Architectures (Why We Didn't Use Them)**

### **Static Export + Remote API**
```
❌ Tried this first
❌ Hit "generateStaticParams" errors
❌ API routes can't be exported
❌ Complex build process
❌ More things to break
```

### **Separate Mobile App (React Native)**
```
❌ Duplicate codebase
❌ Separate components
❌ Separate API client
❌ 2x maintenance
❌ Slower development
```

### **Monorepo with Separate Apps**
```
❌ More complex folder structure
❌ Shared component setup needed
❌ Build complexity
❌ Overkill for solo dev
```

---

## 🎯 **When to Reconsider This Architecture**

You might need a different approach if:

1. **Offline mode is critical** → Consider static export with service workers
2. **Native performance needed** → Consider React Native
3. **Complex native integrations** → Consider native app with API only
4. **Very large team** → Consider monorepo with separate mobile team

**For now:** This architecture is perfect for Capo's needs! ✅

---

## 📚 **Related Documentation**

- **User Guide:** `docs/MOBILE_USER_GUIDE.md` - Commands and workflows
- **Status:** `docs/MOBILE_APP_STATUS.md` - What's done/todo
- **Spec:** `docs/MOBILE_SPEC.md` - Technical details
- **Screenshots:** See chat history for screenshot guide

---

## 🆘 **Common Questions**

**Q: Is this a "real" mobile app?**  
A: Yes! It's a hybrid app - native shell + web content. Used by many major apps.

**Q: Will it be slow?**  
A: No. Modern webviews are very fast. Users won't notice it's a hybrid app.

**Q: Can I add native features later?**  
A: Yes! Capacitor has plugins for camera, push notifications, etc.

**Q: What about offline mode?**  
A: Can be added later with service workers if needed. Not critical for v1.

**Q: Why not just tell users to use the website?**  
A: Mobile app enables:
- Push notifications (critical for RSVP)
- App Store presence
- Home screen icon
- Better UX on mobile

---

**Architecture approved:** November 26, 2025  
**By:** Vibe coder + helpful AI assistant 🤖✨


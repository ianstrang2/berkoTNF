# TestFlight Quick Reference Card

**💡 Keep this open during submission for quick lookups!**

---

## 📋 **Your App Details**

| Item | Value |
|------|-------|
| **App Name** | Capo |
| **Bundle ID** | `com.caposport.capo` |
| **SKU** | `capo-ios-001` |
| **Category** | Sports |
| **Age Rating** | 4+ |
| **Privacy Policy** | https://app.caposport.com/privacy |
| **App URL** | https://app.caposport.com |
| **Version** | 1.0.0 |
| **Build** | 1 (increment for each upload) |

---

## 🔗 **Essential Links**

| Resource | URL |
|----------|-----|
| **App Store Connect** | https://appstoreconnect.apple.com |
| **Apple Developer** | https://developer.apple.com/account |
| **Enroll Program** | https://developer.apple.com/programs/enroll/ |
| **TestFlight Guide** | https://developer.apple.com/testflight/ |
| **Review Guidelines** | https://developer.apple.com/app-store/review/guidelines/ |

---

## ⚡ **Quick Commands (On Mac)**

```bash
# Pull latest code
cd ~/Developer/capo
git pull origin main

# Open Xcode (production build)
npm run ios:build

# Dev mode testing (2 terminals)
# Terminal 1:
npm run dev
# Terminal 2:
npm run ios:dev

# Check Xcode version
xcodebuild -version
```

---

## 📱 **4 Phases at a Glance**

### **Phase 1: Apple Developer Account (Day 1)**
- ⏱️ 15 min active + 24h wait
- 💰 $99/year
- 🔗 https://developer.apple.com/programs/enroll/
- 📖 Full guide: Phase 1

### **Phase 2: App Store Connect (Day 2)**
- ⏱️ 1 hour
- 📸 Screenshots: `~/Desktop/Capo_Screenshots/`
- 📝 Description, keywords, metadata
- 📖 Full guide: Phase 2

### **Phase 3: Xcode Archive (Day 2-3)**
- ⏱️ 45 min
- 🏗️ Archive → Validate → Upload
- ⏳ Processing: ~30 min after upload
- 📖 Full guide: Phase 3

### **Phase 4: TestFlight (Day 3)**
- ⏱️ 15 min
- 👥 Add internal testers
- ✅ Immediate access (no review!)
- 📖 Full guide: Phase 4

---

## 📸 **Screenshot Locations**

**On Desktop:**
- Path: `~/Desktop/Capo_Screenshots/`
- Size: 1320 x 2868 pixels (6.9" iPhone)
- Count: 5-7 screenshots

**Order (most important first):**
1. Dashboard (stats overview)
2. Match Report (detailed view)
3. Leaderboard (rankings)
4. Player Profile (individual stats)
5. Additional features...

---

## ✍️ **App Store Copy (Ready to Paste)**

### **Subtitle (30 chars):**
```
5-a-Side Football Management
```

### **Keywords (100 chars):**
```
football,soccer,5-a-side,stats,matches,sports,team,league,goals,tracking
```

### **Promotional Text (170 chars):**
```
Track your 5-a-side football stats, manage matches, and compete with teammates. Perfect for players and organizers. Join your club today!
```

### **Description (See full guide Phase 2, Step 2.4)**

---

## 🐛 **Quick Troubleshooting**

### **"Bundle ID not found"**
→ Register at: https://developer.apple.com/account/resources/identifiers/list

### **"Signing failed"**
→ Xcode → Signing & Capabilities → Toggle "Automatically manage signing" off/on

### **"Build processing forever"**
→ Check App Store Connect status, wait 30-60 min, contact Apple if 2+ hours

### **"White screen in TestFlight"**
→ Verify https://app.caposport.com works in Safari
→ Check NEXT_PUBLIC_APP_URL in Vercel

### **"Validation failed"**
→ Read error carefully
→ Common: Missing icons, invalid signature, compliance issues
→ See guide Phase 3, Step 3.9

---

## 📞 **Test Account Info (For App Review)**

**Sign-in:** Phone number authentication (SMS OTP)

**Demo Account:**
```
Phone: [Your test number]
Code: Will be sent via SMS

Instructions:
1. Enter phone number
2. Enter verification code
3. Browse dashboard and features
```

**Review Notes:**
```
Multi-tenant football stats app. Uses webview wrapper loading 
Vercel-hosted Next.js app (app.caposport.com). Phone auth via 
Supabase. Privacy policy at /privacy.
```

---

## ⏱️ **Timeline Expectations**

| Step | Active Time | Wait Time |
|------|-------------|-----------|
| Apple Developer signup | 15 min | ~24 hours |
| App Store Connect setup | 1 hour | None |
| Xcode archive & upload | 45 min | ~30 min processing |
| TestFlight config | 15 min | None (internal) |
| **Total** | **~2 hours** | **~1-2 days** |

---

## ✅ **Pre-Archive Checklist**

Before creating archive in Xcode:

- [ ] `git pull origin main` on Mac
- [ ] Xcode signing configured (Team selected)
- [ ] Version: 1.0.0, Build: 1
- [ ] Target: "Any iOS Device (arm64)"
- [ ] Clean build folder (Cmd+Shift+K)
- [ ] https://app.caposport.com working in browser

---

## 🎯 **Success Indicators**

**✅ Phase 1 complete:**
- Email: "Welcome to Apple Developer Program"
- Can sign in to https://developer.apple.com/account

**✅ Phase 2 complete:**
- App listing visible in App Store Connect
- Screenshots uploaded
- Metadata saved

**✅ Phase 3 complete:**
- "Upload Successful" in Xcode Organizer
- Build shows "Processing" in App Store Connect
- Email: "Your build has been processed"

**✅ Phase 4 complete:**
- Internal testers added
- Build enabled for test group
- TestFlight email received
- App installs on iPhone via TestFlight

---

## 🚨 **Common Mistakes to Avoid**

- ❌ Archiving with simulator selected (must be "Any iOS Device")
- ❌ Forgetting to increment build number for new uploads
- ❌ Not answering Export Compliance questions
- ❌ Using placeholder content in screenshots
- ❌ Skipping validation before upload
- ❌ Adding external testers (requires review - use internal first!)

---

## 📚 **Full Documentation**

**Complete Step-by-Step Guide:**
→ `docs/TESTFLIGHT_SUBMISSION_GUIDE.md`

**Other Helpful Docs:**
- Current Status: `docs/MOBILE_APP_STATUS.md`
- Build Commands: `docs/MOBILE_USER_GUIDE.md`
- Architecture: `docs/MOBILE_SPEC.md`
- Security: `docs/MOBILE_SECURITY_AUDIT.md`
- Pre-Production: `docs/ios/PRE_PRODUCTION_CHECKLIST.md`

---

## 💡 **Pro Tips**

1. **Use Internal Testing First**
   - No review wait (immediate!)
   - Up to 100 testers
   - Perfect for Berko TNF beta

2. **Upload Frequently**
   - New builds process in ~30 min
   - No review needed for TestFlight updates
   - Just increment build number

3. **Test on Real Device**
   - TestFlight is the best way
   - Push notifications only work on real devices
   - Perfect for RSVP development

4. **Keep Builds Organized**
   - Note what changed in "What to Test"
   - Use semantic versioning (1.0.0, 1.0.1, 1.1.0)
   - Build numbers increment: 1, 2, 3, 4...

5. **Read Errors Carefully**
   - Apple's error messages are usually clear
   - Google the error code if confused
   - Check guide troubleshooting section

---

## 🎉 **You're Ready!**

**Start here:** Sign up for Apple Developer account  
**Then:** Follow the full guide phase by phase

**You've got this! 🚀⚽**

---

**Last Updated:** November 26, 2025


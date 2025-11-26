# TestFlight Submission Checklist

**Print this or keep it open to track your progress! ✅**

**App:** Capo  
**Target:** TestFlight Beta Testing  
**Date Started:** _______________

---

## 🎯 **Phase 1: Apple Developer Account**

**Target:** Day 1 (15 min + 24h wait)

### **Setup:**
- [ ] Go to https://developer.apple.com/programs/enroll/
- [ ] Sign in with Apple ID
- [ ] Select "Individual" account type
- [ ] Fill out enrollment form (name, DOB, country, phone)
- [ ] Review Apple Developer Agreement
- [ ] Pay $99 USD (credit/debit card)
- [ ] Submit enrollment

### **Confirmation:**
- [ ] Received email: "Your enrollment is being processed"
- [ ] Waiting for approval (~24 hours)

### **Approved:**
- [ ] Received email: "Welcome to the Apple Developer Program"
- [ ] Can sign in to https://developer.apple.com/account
- [ ] Apple Developer dashboard accessible

**✅ Phase 1 Complete!** → Move to Phase 2

---

## 🎨 **Phase 2: App Store Connect**

**Target:** Day 2 (1 hour)

### **Step 1: Create App Listing (10 min)**
- [ ] Go to https://appstoreconnect.apple.com
- [ ] Click "My Apps" → "+" → "New App"
- [ ] Platform: iOS ✅
- [ ] Name: `Capo`
- [ ] Primary Language: English (U.K.)
- [ ] Bundle ID: `com.caposport.capo`
  - [ ] If not available, register at: https://developer.apple.com/account/resources/identifiers/list
  - [ ] Description: `Capo Football Stats App`
  - [ ] Bundle ID: `com.caposport.capo`
  - [ ] Capabilities: Associated Domains ✅, Push Notifications ✅
- [ ] SKU: `capo-ios-001`
- [ ] User Access: Full Access
- [ ] Click "Create"

### **Step 2: Basic Information (5 min)**
- [ ] Navigate to: App Information
- [ ] Subtitle: `5-a-Side Football Match Management`
- [ ] Category: Primary → **Sports**
- [ ] Category: Secondary → (optional)
- [ ] Privacy Policy URL: `https://app.caposport.com/privacy`
- [ ] Click "Save"

### **Step 3: Age Rating (3 min)**
- [ ] Navigate to: App Information → Age Rating
- [ ] Click "Edit"
- [ ] Answer "No" to all questions (violence, gambling, etc.)
- [ ] Result should be: `4+`
- [ ] Click "Save"

### **Step 4: Upload Screenshots (10 min)**
- [ ] Navigate to: Version → App Store
- [ ] Find: "6.9" iPhone Display" section
- [ ] Click "+" to add screenshots
- [ ] Upload 5-7 screenshots from: `~/Desktop/Capo_Screenshots/`
- [ ] Arrange in order:
  - [ ] 1. Dashboard
  - [ ] 2. Match Report
  - [ ] 3. Leaderboard
  - [ ] 4. Player Profile
  - [ ] 5. Additional features...
- [ ] (Optional) Add captions to each screenshot
- [ ] Click "Save"

### **Step 5: App Description (10 min)**
- [ ] Navigate to: Version → App Store
- [ ] Copy description from guide (Phase 2, Step 2.4)
- [ ] Paste into "Description" field
- [ ] Copy keywords: `football,soccer,5-a-side,stats,matches,sports,team,league,goals,tracking`
- [ ] Paste into "Keywords" field
- [ ] (Optional) Add promotional text
- [ ] Support URL: `https://app.caposport.com/support`
- [ ] Marketing URL: `https://caposport.com` (optional)
- [ ] Click "Save"

### **Step 6: App Review Information (10 min)**
- [ ] Navigate to: Version → App Review Information
- [ ] Sign-in required: **Yes**
- [ ] Demo Account:
  - [ ] Phone number: `[Your test number]`
  - [ ] Instructions: Enter phone, then verification code (SMS)
- [ ] Contact Information:
  - [ ] First Name: `_______________`
  - [ ] Last Name: `_______________`
  - [ ] Phone: `_______________`
  - [ ] Email: `_______________`
- [ ] Notes: Copy from guide (Phase 2, Step 2.7)
- [ ] Click "Save"

**✅ Phase 2 Complete!** → Move to Phase 3

---

## 🏗️ **Phase 3: Xcode Archive & Upload**

**Target:** Day 2-3 (45 min + 30 min processing)

### **Step 1: Prepare Mac (5 min)**
- [ ] On Mac, open Terminal
- [ ] `cd ~/Developer/capo`
- [ ] `git pull origin main`
- [ ] Verify Xcode installed: `xcodebuild -version` (should be 15.0+)

### **Step 2: Verify Configuration (2 min)**
- [ ] Check: `cat capacitor.config.ts`
- [ ] Confirm URL: `https://app.caposport.com`
- [ ] Check: `cat .env.local | grep NEXT_PUBLIC_APP_URL`
- [ ] Should be: `NEXT_PUBLIC_APP_URL=https://app.caposport.com`

### **Step 3: Open Xcode (3 min)**
- [ ] Run: `npm run ios:build`
- [ ] Wait for Xcode to open (~30 seconds)
- [ ] Project loaded successfully

### **Step 4: Configure Signing (5 min)**
- [ ] In Xcode, click "App" in project navigator (top left)
- [ ] Select "App" under TARGETS
- [ ] Select "Signing & Capabilities" tab
- [ ] Check: "Automatically manage signing" ✅
- [ ] Team: Select your Apple Developer account
- [ ] Bundle Identifier: `com.caposport.capo` ✅
- [ ] No errors in signing section ✅

### **Step 5: Version Numbers (2 min)**
- [ ] In Xcode, select "App" target
- [ ] General tab
- [ ] Version: `1.0.0`
- [ ] Build: `1` (increment for each upload)
- [ ] Click anywhere to save

### **Step 6: Select Target (1 min)**
- [ ] In Xcode toolbar (top)
- [ ] Click device selector (next to "App")
- [ ] Select: "Any iOS Device (arm64)"
- [ ] ⚠️ NOT simulator!

### **Step 7: Clean Build (30 sec)**
- [ ] Xcode menu: Product → Clean Build Folder (Cmd+Shift+K)
- [ ] Wait for "Clean Finished"

### **Step 8: Create Archive (10 min)**
- [ ] Xcode menu: Product → Archive (Cmd+Shift+B)
- [ ] Wait for build process (5-10 min)
- [ ] No red errors ✅
- [ ] Archive succeeded ✅
- [ ] Xcode Organizer opens automatically

### **Step 9: Validate Archive (5 min)**
- [ ] In Xcode Organizer, find your archive (top of list)
- [ ] Click "Validate App"
- [ ] Distribution: App Store Connect
- [ ] Click "Next"
- [ ] Upload app symbols: ✅
- [ ] Manage Version/Build Number: ✅
- [ ] Click "Next"
- [ ] Signing: Automatically manage
- [ ] Click "Next"
- [ ] Review summary
- [ ] Click "Validate"
- [ ] Wait for validation (~3-5 min)
- [ ] Validation successful ✅ (green checkmark)

### **Step 10: Upload to App Store Connect (20 min)**
- [ ] Click "Distribute App"
- [ ] Distribution: App Store Connect
- [ ] Click "Next"
- [ ] Destination: Upload
- [ ] Click "Next"
- [ ] Upload app symbols: ✅
- [ ] Manage Version/Build Number: ✅
- [ ] Click "Next"
- [ ] Signing: Automatically manage
- [ ] Click "Next"
- [ ] Review summary
- [ ] Click "Upload"
- [ ] Wait for upload (10-20 min)
- [ ] Upload successful ✅

### **Step 11: Wait for Processing (30-60 min)**
- [ ] Go to: https://appstoreconnect.apple.com
- [ ] Navigate: My Apps → Capo → TestFlight
- [ ] Status shows: "Processing" (yellow dot)
- [ ] Wait for email: "Your build has been processed"
- [ ] Status shows: "Ready to Submit" (green dot) ✅

**✅ Phase 3 Complete!** → Move to Phase 4

---

## 🚀 **Phase 4: TestFlight Configuration**

**Target:** Day 3 (15 min)

### **Step 1: Configure Build (5 min)**
- [ ] In App Store Connect: TestFlight tab
- [ ] Click on your build (e.g., "1.0 (1)")
- [ ] Fill "What to Test" field (copy from guide Phase 4, Step 4.1)
- [ ] Click "Save"

### **Step 2: Export Compliance (2 min)**
- [ ] In build details, find "Export Compliance"
- [ ] Click "Manage"
- [ ] Question: "Does your app use encryption?"
- [ ] Answer: **No** (only standard HTTPS)
- [ ] Click "Save"

### **Step 3: Create Internal Test Group (5 min)**
- [ ] Navigate: TestFlight → Internal Testing
- [ ] Click "+" button
- [ ] Name: `Capo Core Team`
- [ ] Click "Create"
- [ ] Click "+ Add Testers"
- [ ] Enter emails (Apple IDs):
  - [ ] Your email: `_______________`
  - [ ] Tester 2: `_______________`
  - [ ] Tester 3: `_______________`
  - [ ] (Add 5-10 testers from Berko TNF)
- [ ] Click "Add"
- [ ] Enable build: Toggle switch for version 1.0 ✅

### **Step 4: Verify Invites Sent (1 min)**
- [ ] Check email: "You're invited to test Capo"
- [ ] Testers should receive invites immediately ✅

**✅ Phase 4 Complete!** → TestFlight Live!

---

## 📱 **Bonus: Install & Test on iPhone**

### **Install TestFlight App:**
- [ ] On iPhone, open App Store
- [ ] Search: "TestFlight"
- [ ] Download TestFlight app (by Apple)
- [ ] Open TestFlight app

### **Install Capo:**
- [ ] Check email on iPhone: "You're invited to test Capo"
- [ ] Tap "View in TestFlight" or open link
- [ ] TestFlight app opens
- [ ] Tap "Install"
- [ ] Wait for download
- [ ] App appears on home screen

### **Test App:**
- [ ] Open Capo app
- [ ] App opens without crash ✅
- [ ] Login with phone number
- [ ] Enter verification code
- [ ] Dashboard loads correctly ✅
- [ ] View matches and statistics ✅
- [ ] Navigate through features ✅
- [ ] No layout issues ✅
- [ ] Performance is smooth ✅
- [ ] Test deep link: Open `capo://player/dashboard` in Safari

### **Provide Feedback (Optional):**
- [ ] In TestFlight app, tap "Send Beta Feedback"
- [ ] Describe any issues or suggestions
- [ ] Submit

**✅ Testing Complete!** → You're live on TestFlight! 🎉

---

## 🎯 **Final Verification**

### **All Phases Complete:**
- [ ] ✅ Phase 1: Apple Developer account approved
- [ ] ✅ Phase 2: App Store Connect listing created
- [ ] ✅ Phase 3: Build uploaded and processed
- [ ] ✅ Phase 4: TestFlight configured

### **TestFlight Live:**
- [ ] ✅ Internal testers invited
- [ ] ✅ App installs on iPhone via TestFlight
- [ ] ✅ All major features work
- [ ] ✅ No critical bugs

### **Ready for Next Steps:**
- [ ] Invite more Berko TNF players as beta testers
- [ ] Collect feedback over 1-2 weeks
- [ ] Fix any bugs (upload new builds as needed)
- [ ] Implement RSVP system with push notification testing
- [ ] Consider App Store public release (when ready)

---

## 📊 **Progress Tracker**

| Phase | Target Date | Started | Completed | Notes |
|-------|-------------|---------|-----------|-------|
| **Phase 1: Developer Account** | Day 1 | ___/___/___ | ___/___/___ | |
| **Phase 2: App Store Connect** | Day 2 | ___/___/___ | ___/___/___ | |
| **Phase 3: Archive & Upload** | Day 2-3 | ___/___/___ | ___/___/___ | |
| **Phase 4: TestFlight Config** | Day 3 | ___/___/___ | ___/___/___ | |

**Total Active Time:** ~2 hours  
**Total Calendar Time:** 2-3 days (mostly waiting)

---

## 🆘 **Quick Help**

**Stuck? Check:**
1. Troubleshooting section in full guide
2. Quick Reference card: `docs/TESTFLIGHT_QUICK_REFERENCE.md`
3. Full guide: `docs/TESTFLIGHT_SUBMISSION_GUIDE.md`

**Common Issues:**
- Bundle ID not found → Register in Apple Developer Portal
- Signing failed → Toggle "Automatically manage signing" in Xcode
- White screen → Verify app.caposport.com works in Safari
- Validation error → Read error message, check guide troubleshooting

---

## 🎉 **Success!**

**When all boxes are checked:**
- Your app is live on TestFlight! ✅
- Real users can test on real devices! ✅
- Push notifications will work (for RSVP development)! ✅
- You're ready to iterate and improve! ✅

**Celebrate! You've successfully launched on TestFlight! 🚀⚽**

---

**Last Updated:** November 26, 2025


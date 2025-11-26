# TestFlight Submission Guide - Capo

**Last Updated:** November 26, 2025  
**Status:** Ready to begin submission process  
**App:** Capo - 5-a-side Football Stats & Match Management

---

## 📋 **Pre-Flight Checklist**

**✅ You've already completed:**
- [x] iOS app working on simulator
- [x] Screenshots captured (5-7 images at 1320 x 2868)
- [x] App loads from https://app.caposport.com
- [x] Webview wrapper architecture implemented
- [x] Environment variables configured
- [x] Supabase configured for app.caposport.com
- [x] Privacy policy live at https://app.caposport.com/privacy
- [x] Deep links configured (capo:// and universal links)
- [x] App icons and splash screens complete

**⏳ What we'll do together:**
1. Apple Developer Account Setup (15 min + 24h wait)
2. App Store Connect Configuration (30 min)
3. Xcode Archive & Upload (30 min)
4. TestFlight Submission (15 min)

**Total Active Time:** ~90 minutes  
**Total Calendar Time:** 2-3 days (waiting for Apple approval)

---

## 🎯 **Phase 1: Apple Developer Account (Day 1)**

### **Before You Start**

**Have these ready:**
- ✅ Apple ID (your current email/Apple ID is fine)
- ✅ Credit/debit card ($99 USD/year)
- ✅ Legal entity name (your name or business name)
- ✅ D-U-N-S Number (only if registering as organization - skip for individual)

**Decision: Individual vs Organization?**

| Individual Account | Organization Account |
|-------------------|---------------------|
| ✅ Your name on App Store | ✅ Business name on App Store |
| ✅ Fast approval (~24 hours) | ⚠️ Slower approval (~1 week) |
| ✅ No extra documents | ⚠️ Requires business verification |
| ✅ $99/year | ✅ $99/year |
| ⚠️ Can't transfer apps easily | ✅ Can transfer ownership |

**Recommendation for Capo:** Start with **Individual Account**
- Get to market faster (24h vs 1 week)
- You can always upgrade to organization later
- Perfect for initial TestFlight + MVP launch

---

### **Step 1.1: Sign Up**

**⏱️ Time:** 15 minutes

1. **Go to:** https://developer.apple.com/programs/enroll/

2. **Sign in** with your Apple ID

3. **Click "Enroll"**

4. **Select "Individual"** (recommended)

5. **Fill out the form:**
   - Legal Name: `Your Full Name`
   - Date of Birth: `Your DOB`
   - Country: `United Kingdom` (assuming)
   - Phone: `Your mobile number`

6. **Review** Apple Developer Agreement

7. **Enter payment** ($99 USD - charged immediately)

8. **Submit enrollment**

**✅ Confirmation:** You'll receive email: "Your enrollment is being processed"

---

### **Step 1.2: Wait for Approval**

**⏱️ Time:** ~24 hours (usually faster)

**What happens:**
- Apple reviews your enrollment
- Automated verification (for individual accounts)
- Email arrives: "Welcome to the Apple Developer Program"

**During the wait:**
- ✅ Read App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- ✅ Prepare app description (see Phase 2)
- ✅ Review screenshots (make sure they look professional)

**Common issues:**
- **Payment declined:** Check card, try different card
- **Name mismatch:** Legal name must match government ID
- **Waiting 48+ hours:** Check spam folder, contact Apple Support

---

## 🎨 **Phase 2: App Store Connect Setup (Day 2)**

### **Prerequisites**
- ✅ Apple Developer account approved (email received)
- ✅ Screenshots ready on Desktop

---

### **Step 2.1: Create App Listing**

**⏱️ Time:** 10 minutes

1. **Go to:** https://appstoreconnect.apple.com

2. **Sign in** with your Apple ID

3. **Click "My Apps"** → **"+" button** → **"New App"**

4. **Fill out form:**

| Field | Value |
|-------|-------|
| **Platforms** | ✅ iOS |
| **Name** | `Capo` |
| **Primary Language** | English (U.K.) |
| **Bundle ID** | Select: `com.caposport.capo`* |
| **SKU** | `capo-ios-001` (unique identifier for your records) |
| **User Access** | Full Access |

*If Bundle ID doesn't appear, you need to register it first (see Troubleshooting below)

5. **Click "Create"**

**✅ Success:** You'll see your app dashboard

---

### **Step 2.2: Register Bundle ID (If Needed)**

**⚠️ Only if Bundle ID wasn't available in dropdown above**

**⏱️ Time:** 5 minutes

1. **Go to:** https://developer.apple.com/account/resources/identifiers/list

2. **Click "+" button**

3. **Select:** App IDs → Continue

4. **Fill out:**
   - Description: `Capo Football Stats App`
   - Bundle ID: `com.caposport.capo` (Explicit)

5. **Capabilities:** (check these)
   - ✅ Associated Domains (for universal links)
   - ✅ Push Notifications (for future RSVP)

6. **Click "Register"**

7. **Go back to App Store Connect** and create app (Step 2.1)

---

### **Step 2.3: Add App Information**

**⏱️ Time:** 15 minutes

**Navigate to:** Your app → App Information

**Fill out these fields:**

#### **Basic Info:**
| Field | Value |
|-------|-------|
| **Subtitle** (optional) | `5-a-Side Football Match Management` |
| **Category** | Primary: **Sports** |
| **Category** | Secondary: **None** (optional) |

#### **Age Rating:**
Click "Edit" next to Age Rating:
- ❌ No to all questions (violence, gambling, etc.)
- **Result:** `4+` (suitable for all ages)
- Save

#### **Privacy Policy:**
- **Privacy Policy URL:** `https://app.caposport.com/privacy`
- Click "Save"

---

### **Step 2.4: Prepare App Description**

**⏱️ Time:** 5 minutes

**Copy this template** (customize as needed):

**App Description (4000 chars max):**

```
Capo is the ultimate 5-a-side football match management and statistics platform. Designed for players and organizers, Capo makes tracking your football journey effortless.

⚽ FEATURES

Match Management:
• View upcoming matches and fixtures
• Track match history and results
• Detailed match reports and player ratings
• Team balancing and player selection

Personal Statistics:
• Track your goals, assists, and clean sheets
• View your win/loss record
• Monitor your performance over time
• Compare stats with teammates

Leaderboards:
• Season standings and rankings
• All-time records and achievements
• Player performance metrics
• Individual and team statistics

For Players:
• Join your club with a simple invite code
• View your personal dashboard
• Track your football journey
• Stay updated on upcoming matches

For Organizers:
• Manage matches and teams
• Track player attendance and RSVPs
• Generate match reports
• Maintain season statistics

🏆 WHY CAPO?

• Built by football players, for football players
• Clean, intuitive interface
• Real-time updates
• Privacy-focused and secure
• Multi-tenant support for clubs

Whether you're a casual player or organizing regular matches, Capo helps you focus on what matters most: the beautiful game.

Download Capo and elevate your 5-a-side experience today! ⚽
```

**Keywords (100 chars max):**
```
football,soccer,5-a-side,stats,matches,sports,team,league,goals,tracking
```

**Promotional Text (170 chars max) - Optional:**
```
Track your 5-a-side football stats, manage matches, and compete with teammates. Perfect for players and organizers. Join your club today!
```

**Save for later** - we'll add these in Step 2.6

---

### **Step 2.5: Upload Screenshots**

**⏱️ Time:** 10 minutes

**Navigate to:** Your app → Version (e.g. "1.0 Prepare for Submission") → App Store

**Find:** iPhone Screenshots section

**Your screenshots are:** `~/Desktop/Capo_Screenshots/` (1320 x 2868 pixels)

**Upload:**
1. Click **"+"** under "6.9" iPhone Display"
2. **Drag and drop** 3-7 screenshots from Desktop
3. **Arrange order** (most impressive first):
   - Screenshot 1: Dashboard (show stats overview)
   - Screenshot 2: Match Report (show detailed match view)
   - Screenshot 3: Leaderboard (show rankings)
   - Screenshot 4: Player Profile (show individual stats)
   - Screenshot 5+: Additional key features

**Optional but recommended:**
- Add captions to each screenshot (describe what's shown)

**Tips:**
- ✅ First 2-3 screenshots are most important (users see these first)
- ✅ Show your best features
- ✅ Use real data (not placeholders)
- ✅ Clean, professional appearance

**Click "Save" when done**

---

### **Step 2.6: Add Metadata**

**Navigate to:** Your app → Version → App Store

**Fill out:**

1. **Description:** (paste from Step 2.4)
2. **Keywords:** (paste from Step 2.4)
3. **Promotional Text:** (paste from Step 2.4 - optional)
4. **Support URL:** `https://app.caposport.com/support` (create if needed)
5. **Marketing URL:** `https://caposport.com` (optional)

**What's New in This Version** (for updates only - leave blank for 1.0):
```
Initial release of Capo! 🎉

Features:
• View match history and upcoming fixtures
• Track personal statistics
• Leaderboard rankings
• Player profiles
• Match reports
```

**Click "Save"**

---

### **Step 2.7: Add Test Information**

**⚠️ IMPORTANT for reviewers to test your app**

**Navigate to:** Your app → Version → App Review Information

**Fill out:**

**Test Account (Demo/Sandbox):**

Create a test account they can use:

```
Sign-in required: Yes

Demo Account:
Phone Number: +44 7700 900XXX (use a real test number you control)
Verification Code: Will be sent via SMS

How to test:
1. Enter the phone number above
2. Enter the verification code (sent via SMS)
3. Browse dashboard, matches, and player stats
4. View leaderboards and match reports

Note: This is a multi-tenant app. The demo account is pre-configured with test data.
```

**Contact Information:**
- First Name: `Your First Name`
- Last Name: `Your Last Name`
- Phone Number: `Your Mobile`
- Email: `Your Email`

**Notes (optional but helpful):**
```
Capo is a football (soccer) match management and statistics app for 5-a-side leagues.

Key features:
- Phone number authentication via SMS OTP
- Multi-tenant architecture (each club is isolated)
- Match management and player statistics
- Leaderboards and personal dashboards

The app uses a webview wrapper to load our web application hosted on Vercel (app.caposport.com). All functionality is web-based with native app wrapper for app store distribution.

Privacy policy: https://app.caposport.com/privacy

For any questions during review, please contact: [your email]
```

**Click "Save"**

---

## 🏗️ **Phase 3: Xcode Archive & Upload (Day 2-3)**

### **Prerequisites**
- ✅ App Store Connect app created
- ✅ Apple Developer account active
- ✅ Mac available with Xcode installed

---

### **Step 3.1: Prepare Mac Environment**

**⏱️ Time:** 5 minutes

**On your Mac:**

```bash
# Navigate to project
cd ~/Developer/capo

# Pull latest code from Git
git pull origin main

# Install dependencies (if needed)
npm install
```

**Verify Xcode:**
```bash
# Check Xcode version (should be 15.0+)
xcodebuild -version

# If not installed:
# Download from App Store (free, ~12GB)
```

---

### **Step 3.2: Verify Capacitor Configuration**

**⏱️ Time:** 2 minutes

**Check `capacitor.config.ts`:**

```bash
cat capacitor.config.ts
```

**Should see:**
```typescript
server: {
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://app.caposport.com',
  // ...
}
```

**Verify environment variable (if using .env.local):**
```bash
cat .env.local | grep NEXT_PUBLIC_APP_URL
```

**Should see:**
```
NEXT_PUBLIC_APP_URL=https://app.caposport.com
```

**✅ If correct:** Continue  
**❌ If missing/wrong:** Add to `.env.local` or let config use default

---

### **Step 3.3: Open Project in Xcode**

**⏱️ Time:** 3 minutes

```bash
# Open Xcode project
npm run ios:build
```

**This command:**
- Syncs Capacitor
- Opens Xcode automatically
- Loads production configuration (app.caposport.com)

**In Xcode:**
1. **Wait** for project to fully load (~30 seconds)
2. **Check** top left: Should say "App" as the scheme

---

### **Step 3.4: Configure Signing**

**⏱️ Time:** 5 minutes

**In Xcode:**

1. **Click** on "App" in the project navigator (left sidebar, top item)

2. **Select** "App" target (under TARGETS)

3. **Select** "Signing & Capabilities" tab

4. **Check** "Automatically manage signing"

5. **Select Team:** Your Apple Developer account (should appear in dropdown)

6. **Bundle Identifier:** Should show `com.caposport.capo`

**Verify:**
- ✅ Provisioning Profile: Managed by Xcode
- ✅ Signing Certificate: Apple Development / Apple Distribution
- ✅ No errors in signing section

**Common issues:**
- **"Failed to create provisioning profile"**: Sign out and back in to Xcode (Preferences → Accounts)
- **Team not appearing**: Wait 10 min after Apple Developer approval, restart Xcode
- **Bundle ID error**: Verify Bundle ID is registered (Phase 2, Step 2.2)

---

### **Step 3.5: Update Version Numbers**

**⏱️ Time:** 2 minutes

**In Xcode, with "App" target selected:**

1. **General tab:**
   - **Version:** `1.0.0` (this is your marketing version)
   - **Build:** `1` (increment for each upload: 1, 2, 3, etc.)

**For future updates:**
- Bug fix: `1.0.1`, `1.0.2` (increment Build each time)
- Minor feature: `1.1.0`, `1.2.0`
- Major update: `2.0.0`, `3.0.0`

**Click** anywhere to save

---

### **Step 3.6: Select Archive Target**

**⏱️ Time:** 1 minute

**In Xcode toolbar (top):**

1. **Click** the device selector (next to "App" scheme)
2. **Select:** "Any iOS Device (arm64)"

**⚠️ Important:** Don't select simulator - archives must be for real devices!

---

### **Step 3.7: Clean Build**

**⏱️ Time:** 30 seconds

**In Xcode menu:**

1. **Product** → **Clean Build Folder** (or `Cmd+Shift+K`)

2. Wait for "Clean Finished" message

**Why:** Ensures no old cached files interfere with archive

---

### **Step 3.8: Create Archive**

**⏱️ Time:** 5-10 minutes

**In Xcode menu:**

1. **Product** → **Archive** (or `Cmd+B` then `Cmd+Shift+B`)

2. **Wait** for build process:
   - Compiling files
   - Linking
   - Creating archive
   - "Archive succeeded" notification

**Watch for:**
- ✅ No red errors (build must succeed)
- ⚠️ Yellow warnings are usually okay

**If build fails:**
- Read error carefully
- Common issues:
  - Signing error → Check Step 3.4
  - Missing dependencies → Run `npm install`
  - Code errors → Fix in code, git pull, try again

**✅ Success:** Xcode Organizer opens automatically

---

### **Step 3.9: Validate Archive**

**⏱️ Time:** 5 minutes

**In Xcode Organizer (should open automatically):**

1. **Find** your archive (top of list, shows timestamp)

2. **Click "Validate App"** button (on right)

3. **Select distribution method:**
   - Choose: "App Store Connect"
   - Click "Next"

4. **Distribution options:**
   - ✅ Upload app symbols (recommended)
   - ✅ Manage Version and Build Number
   - Click "Next"

5. **Signing:**
   - Select "Automatically manage signing"
   - Click "Next"

6. **Review summary:**
   - Check details look correct
   - Click "Validate"

7. **Wait** for validation (~3-5 minutes):
   - Apple checks your archive
   - Verifies signing
   - Checks for common issues

**Results:**

**✅ Validation successful:**
- Green checkmark appears
- Ready to upload!
- Continue to Step 3.10

**❌ Errors or warnings:**
- Read carefully
- Common issues:
  - **Missing icon sizes:** Add in Xcode Assets catalog
  - **Invalid signature:** Re-sign in Step 3.4
  - **API usage issues:** May need to add privacy descriptions

**⚠️ Safe to ignore:**
- "Missing Marketing Icon" (you uploaded screenshots in App Store Connect)
- "Missing compliance" (you'll answer in App Store Connect)

---

### **Step 3.10: Upload to App Store Connect**

**⏱️ Time:** 10-20 minutes

**After successful validation:**

1. **Click "Distribute App"** button (in Organizer)

2. **Select distribution method:**
   - Choose: "App Store Connect"
   - Click "Next"

3. **Destination:**
   - Select: "Upload"
   - Click "Next"

4. **Distribution options:**
   - ✅ Upload app symbols
   - ✅ Manage Version and Build Number
   - Click "Next"

5. **Signing:**
   - Automatically manage signing
   - Click "Next"

6. **Review summary:**
   - Verify details
   - Click "Upload"

7. **Wait for upload:**
   - Progress bar appears
   - Usually 5-15 minutes (depends on internet speed)
   - Archive is ~100-200 MB

**✅ Upload complete:** "Upload Successful" message appears

---

### **Step 3.11: Wait for App Store Connect Processing**

**⏱️ Time:** 15-60 minutes (you can close Xcode)

**After upload completes:**

1. **Go to:** https://appstoreconnect.apple.com

2. **Navigate to:** My Apps → Capo → TestFlight tab

3. **Check status:**
   - Initially: "Processing" (yellow dot)
   - After processing: "Ready to Submit" (green dot)

**While waiting:**
- ✅ Processing typically takes 15-30 minutes
- ✅ You'll receive email when processing completes
- ✅ Continue to Phase 4 prep work below

**If processing fails:**
- You'll receive email with reason
- Common issues:
  - Missing compliance info (fix in App Store Connect)
  - Invalid binary (archive again)

---

## 🚀 **Phase 4: TestFlight Submission (Day 3)**

### **Prerequisites**
- ✅ Build processed successfully in App Store Connect
- ✅ Status shows "Ready to Submit" or "Ready to Test"

---

### **Step 4.1: Configure TestFlight**

**⏱️ Time:** 5 minutes

**In App Store Connect:**

1. **Navigate to:** My Apps → Capo → **TestFlight** tab

2. **Click** on your build (e.g., "1.0 (1)")

3. **Fill out "Test Information":**

**What to Test:**
```
Initial TestFlight release of Capo! 🎉

Please test:
✅ Login with phone number authentication
✅ Dashboard displays correctly
✅ Match history and upcoming matches
✅ Player statistics and leaderboards
✅ Match reports
✅ Profile editing
✅ Deep links (if you receive any)

Known issues:
• None currently

Please report any bugs or issues!
```

**App Clip (if applicable):** Skip (not using App Clips)

4. **Click "Save"**

---

### **Step 4.2: Export Compliance**

**⏱️ Time:** 2 minutes

**In the build details:**

1. **Find** "Export Compliance"

2. **Click "Manage"**

3. **Answer questions:**

**Q: Does your app use encryption?**
- If you only use HTTPS: **No** (standard encryption exempt)
- If you use custom crypto: **Yes** → Follow Apple's instructions

**For Capo:** Answer **No** (only uses standard HTTPS)

4. **Click "Save"**

---

### **Step 4.3: Add Internal Testers**

**⏱️ Time:** 5 minutes

**⚠️ Start with internal testing (automatic approval)**

**In App Store Connect:**

1. **Navigate to:** TestFlight → Internal Testing

2. **Click "+" button** (Create Group)

3. **Name:** "Capo Core Team"

4. **Click "Create"**

5. **Add Testers:**
   - Click "+ Add Testers"
   - Enter emails (must have Apple IDs)
   - Apple IDs can be iCloud accounts or regular email addresses
   - Example: your email, friends, family
   - Click "Add"

6. **Enable build:**
   - Find your build (1.0)
   - Toggle switch to enable for this group

**✅ Automatic:** Testers receive email invite immediately!

**Internal testers:**
- ✅ Up to 100 testers
- ✅ Immediate access (no Apple review)
- ✅ Perfect for initial testing
- ✅ Can test before public release

---

### **Step 4.4: Test with Internal TestFlight**

**⏱️ Time:** 30 minutes

**As a tester (you!):**

1. **Check email:** "You're invited to test Capo"

2. **On iPhone:**
   - Download **TestFlight** app from App Store (if not installed)
   - Open TestFlight
   - Tap notification or "Redeem" → Enter code from email

3. **Install Capo:**
   - Tap "Install" in TestFlight
   - Wait for download
   - Open app

4. **Test thoroughly:**
   - ✅ App opens without crashing
   - ✅ Login flow works
   - ✅ Dashboard loads
   - ✅ All main features work
   - ✅ No white screens
   - ✅ No weird layout issues
   - ✅ Performance is smooth

**Found issues?**
- Fix bugs in code
- Update version/build numbers
- Archive and upload again (repeat Phase 3)
- New build appears in TestFlight within ~30 minutes

**Everything works?**
- Continue to Step 4.5 (external testing)
- Or keep with internal testing for now (safe choice!)

---

### **Step 4.5: Add External Testers (Optional - Requires Review)**

**⏱️ Time:** 10 minutes + 1-3 days Apple review

**⚠️ Only needed if you want > 100 testers or public beta**

**In App Store Connect:**

1. **Navigate to:** TestFlight → External Testing

2. **Click "+ Add Testers"** or "Create Group"

3. **Name:** "Public Beta Testers"

4. **Add testers by:**
   - Email invitation
   - Public link (anyone can join)

5. **Enable build** for group

6. **Submit for Beta Review:**
   - Apple reviews your app
   - Takes 1-3 days
   - Similar to App Store review but faster

**External testers:**
- ✅ Up to 10,000 testers
- ⏳ Requires Apple review (1-3 days)
- ✅ Public link option (easy sharing)
- ⏳ Need to resubmit for major changes

**Recommendation for Capo:**
- Start with **internal testing** (automatic, fast)
- Test with 10-20 people from Berko TNF
- Once stable, consider external testing for wider audience

---

## ✅ **Success! You're on TestFlight**

**What you've accomplished:**
- ✅ Apple Developer account active
- ✅ App Store Connect listing complete
- ✅ First build uploaded and processed
- ✅ TestFlight internal testing live
- ✅ App installed on real devices

**What happens now:**

### **Internal Testing Phase (Weeks 1-2)**
- Testers use your app on real devices
- Collect feedback via TestFlight
- Fix critical bugs
- Upload new builds as needed (no review wait!)
- Test RSVP development with real push notifications

### **Prepare for App Store Release (Weeks 2-4)**
- Polish based on feedback
- Implement RSVP system (with real push testing!)
- Consider external beta (optional)
- Build confidence in stability

### **App Store Submission (When Ready)**
- Navigate to: App Store → Version → "Submit for Review"
- Wait 1-5 days for Apple review
- Respond to any questions
- Approve for release when accepted
- App goes live! 🎉

---

## 📱 **Installing & Testing on Your iPhone**

**For you (internal tester):**

### **Initial Install:**
1. Open TestFlight email on iPhone
2. Tap "View in TestFlight" or open link
3. TestFlight app opens
4. Tap "Install"
5. App appears on home screen

### **Testing checklist:**
- [ ] App opens without crash
- [ ] Login with phone number works
- [ ] Dashboard loads correctly
- [ ] View matches and statistics
- [ ] Navigation works smoothly
- [ ] No layout issues on your device
- [ ] Performance is acceptable
- [ ] Deep links work (test: capo://player/dashboard)

### **Provide feedback:**
**In TestFlight app:**
- Tap "Send Beta Feedback"
- Describe issue or suggestion
- Optionally attach screenshot
- Submit

**Or directly to you:**
- Takes screenshot of issue
- Emails you with details

---

## 🐛 **Common Issues & Troubleshooting**

### **Upload Issues**

**"No Bundle ID found"**
- **Fix:** Register Bundle ID in Apple Developer (Phase 2, Step 2.2)
- Wait 5 minutes, retry in Xcode

**"Invalid signature"**
- **Fix:** In Xcode → Signing & Capabilities → Toggle "Automatically manage signing" off then on
- Clean build (Cmd+Shift+K), try archive again

**"Missing compliance"**
- **Fix:** In App Store Connect → Build → Export Compliance → Answer "No" for standard HTTPS

---

### **TestFlight Issues**

**"App not appearing in TestFlight"**
- **Check:** Did you enable build for test group?
- **Check:** Is build still "Processing"? Wait for email
- **Check:** Is tester email correct? Resend invite

**"White screen in TestFlight app"**
- **Check:** Is https://app.caposport.com working in Safari?
- **Check:** In Xcode, verify `capacitor.config.ts` has correct URL
- **Check:** Verify NEXT_PUBLIC_APP_URL env var is set in Vercel

**"App crashes immediately"**
- **Check:** Xcode → Window → Devices and Simulators → View Device Logs
- **Find:** Crash log for Capo
- **Read:** Error message (share with developer/AI assistant)

---

### **Build Processing Issues**

**"Processing" for 2+ hours**
- **Check:** App Store Connect status
- **Action:** Contact Apple Support (usually resolves in 24h)

**"Invalid binary" error**
- **Common causes:**
  - Missing app icon sizes
  - Invalid Info.plist
  - Bitcode issues (disable in build settings)
- **Fix:** Read email from Apple with specific issue
- **Fix in Xcode**, archive again, reupload

---

## 📊 **Timeline Summary**

**Day 1 (Active: 15 min):**
- ✅ Sign up for Apple Developer ($99)
- ⏳ Wait for approval (~24 hours)

**Day 2 (Active: 1 hour):**
- ✅ Create App Store Connect listing (30 min)
- ✅ Upload screenshots and metadata (30 min)

**Day 2-3 (Active: 45 min):**
- ✅ Archive in Xcode (15 min)
- ✅ Upload to App Store Connect (15 min)
- ⏳ Wait for processing (~30 min)
- ✅ Configure TestFlight (15 min)

**Day 3 onwards:**
- ✅ Internal testing begins (immediate)
- ✅ Iterate on feedback (ongoing)
- ⏳ Optional: External testing (requires 1-3 day review)

**Total active work:** ~2 hours  
**Total calendar time:** 2-3 days (mostly waiting)

---

## 🎯 **Next Steps After TestFlight**

### **Immediate (Week 1):**
1. ✅ Install TestFlight on your iPhone
2. ✅ Invite 5-10 Berko TNF players as internal testers
3. ✅ Test all major features
4. ✅ Collect feedback
5. ✅ Fix critical bugs (upload new builds via Phase 3)

### **Short-term (Weeks 2-4):**
1. ✅ Test RSVP system development with real push notifications
2. ✅ Expand internal testing to 20-30 testers
3. ✅ Polish based on feedback
4. ✅ Consider external beta (optional)

### **Long-term (Weeks 4-6):**
1. ✅ Finalize RSVP features
2. ✅ Prepare App Store submission (same process, different tab)
3. ✅ Submit for App Store review
4. ✅ Public release! 🎉

---

## 📚 **Quick Reference Links**

**Apple Resources:**
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com/account)
- [TestFlight Guide](https://developer.apple.com/testflight/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

**Your Resources:**
- Privacy Policy: https://app.caposport.com/privacy
- App URL: https://app.caposport.com
- Bundle ID: `com.caposport.capo`
- Support Email: [Your email]

**Internal Docs:**
- Status: `docs/MOBILE_APP_STATUS.md`
- User Guide: `docs/MOBILE_USER_GUIDE.md`
- Architecture: `docs/MOBILE_SPEC.md`
- Security: `docs/MOBILE_SECURITY_AUDIT.md`
- Pre-Production: `docs/ios/PRE_PRODUCTION_CHECKLIST.md`

---

## 💡 **Pro Tips**

**For smooth submission:**
- ✅ Use "Internal Testing" first (no review wait)
- ✅ Test on multiple iPhone models via TestFlight
- ✅ Read App Store Review Guidelines (30 min investment)
- ✅ Respond quickly to Apple if they have questions
- ✅ Keep App Store Connect metadata up to date

**For ongoing development:**
- ✅ Upload new TestFlight builds frequently (no review needed!)
- ✅ Increment build number each time (1, 2, 3...)
- ✅ Use TestFlight to develop RSVP with real push notifications
- ✅ Testers auto-update to latest build
- ✅ Collect feedback in TestFlight app (built-in!)

**Common pitfalls to avoid:**
- ❌ Don't skip validation (catches issues early)
- ❌ Don't submit to App Store without TestFlight testing first
- ❌ Don't forget to answer Export Compliance
- ❌ Don't add external testers unless needed (review wait)
- ❌ Don't use placeholder content in screenshots

---

## 🆘 **Need Help?**

**During the process:**
1. **Check** Troubleshooting section above
2. **Search** Apple Developer Forums: https://developer.apple.com/forums/
3. **Contact** Apple Developer Support (if account/technical issues)
4. **Ask** AI assistant with specific error messages

**Common questions answered:**
- **"Can I test before Apple approval?"** Yes! Internal testing is immediate
- **"How many builds can I upload?"** Unlimited to TestFlight
- **"Do builds expire?"** Yes, after 90 days (auto-handled)
- **"Can I revert to old build?"** Yes, in TestFlight
- **"What if review is rejected?"** Fix issues, resubmit (common, don't worry!)

---

## ✅ **Ready to Start?**

You have everything you need:
- ✅ App is working and tested
- ✅ Screenshots are ready
- ✅ Privacy policy is live
- ✅ Architecture is solid
- ✅ This guide has every step

**Start with Phase 1:** Sign up for Apple Developer account (15 minutes)

**Then:** Come back to this guide for each subsequent phase!

---

**Good luck with your submission! 🚀⚽**

**You've got this!**


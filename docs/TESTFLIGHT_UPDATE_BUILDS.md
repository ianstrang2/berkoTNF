# 📲 TestFlight - Update Build Process

**When to use:** After making code changes that you want to test on TestFlight

**Time required:** ~30 minutes (including processing)

---

## 🚀 **Quick Update Process**

### **On Windows (Development Machine):**

```bash
# 1. Make your code changes
# 2. Test locally first
npm run dev

# 3. Commit and push
git add .
git commit -m "Your update description"
git push origin main
```

---

### **On Mac (Build Machine):**

```bash
# 1. Pull latest changes
cd ~/Developer/capo
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Build and open Xcode
npm run ios:build
```

---

### **In Xcode:**

1. **Verify target:** "Any iOS Device (arm64)" (top center)
2. **Clean:** Product → Clean Build Folder (Cmd+Shift+K)
3. **Archive:** Product → Archive (Cmd+Shift+B)
4. Wait 5-10 minutes for archive to complete
5. **Organizer window opens automatically**

---

### **In Organizer:**

1. Click **"Distribute App"**
2. Select: **App Store Connect**
3. Click **Next**
4. Select: **Upload**
5. Click **Next**
6. **Signing:** Manually manage signing
7. Click **Next**
8. Should show your Distribution certificate
9. Click **Upload**
10. Wait 10-20 minutes for upload

---

### **In App Store Connect:**

1. Go to: https://appstoreconnect.apple.com
2. **TestFlight** tab
3. Wait for "Processing" to complete (~15-30 min)
4. You'll get email: "Your build has been processed"
5. Go to **Internal Testing** group
6. Click **"+"** next to Builds
7. Select your new build
8. Click **Add**
9. (Optional) Add "What to Test" notes
10. Click **Submit**

---

### **On Your iPhone:**

**Testers get automatic notification!**
1. TestFlight app shows "Update Available"
2. Tap **Update**
3. New version installs
4. Test your changes!

---

## 🔢 **Version Numbering**

**Before building, update version in Xcode:**

1. Open project in Xcode
2. Select **App** target
3. **General** tab
4. **Version:** Increment (1.0.0 → 1.0.1 → 1.1.0, etc.)
5. **Build:** Auto-increments (or set manually)

**Versioning strategy:**
- **Major (1.0.0 → 2.0.0):** Big features (RSVP launch)
- **Minor (1.0.0 → 1.1.0):** New features
- **Patch (1.0.0 → 1.0.1):** Bug fixes

---

## ⚠️ **Common Issues**

### **"Signing failed"**
- Certificates might have expired
- Re-download manual profiles in Xcode Settings → Accounts

### **"Upload failed"**
- Check internet connection
- Try uploading again (sometimes Apple servers are slow)

### **"Build not showing in TestFlight"**
- Wait longer - processing can take 30+ minutes sometimes
- Check spam folder for email
- Refresh App Store Connect page

### **"Testers not getting update"**
- Make sure build is added to the test group
- Testers must have TestFlight app installed
- Check tester email is correct

---

## 🎯 **Best Practices**

**1. Test locally first**
- Always test changes on simulator/web before uploading
- Saves time if there are obvious bugs

**2. Increment version numbers**
- Makes it easy to track which build testers have
- Version/build numbers must be higher than previous

**3. Add "What to Test" notes**
- Helps testers know what changed
- Example: "Fixed match creation bug, added RSVP button"

**4. Keep upload frequency reasonable**
- Don't upload every tiny change
- Batch related changes together
- Once or twice per day maximum during development

**5. Communicate with testers**
- Let them know when important updates are available
- Mention what to test specifically
- Thank them for feedback!

---

## 📝 **Update Checklist**

Before uploading:
- [ ] Changes tested locally
- [ ] Code committed to git
- [ ] Version number incremented
- [ ] Build successful in Xcode
- [ ] Archive validated (optional but recommended)

After uploading:
- [ ] Processing completed
- [ ] Build added to test group
- [ ] Testers notified (if needed)
- [ ] Ready to collect feedback

---

## 🔄 **Typical Update Schedule During RSVP Development**

**Week 1-2:** Daily or every other day
- Rapid iteration on core features
- Frequent testing needed

**Week 3-4:** 2-3 times per week
- More stable, focused on polish
- Beta testers providing feedback

**Post-launch:** As needed
- Bug fixes
- New features
- User-requested improvements

---

## 💡 **Tips for Efficient Updates**

**Automate what you can:**
- Use consistent git commit messages
- Keep Mac build script ready: `git pull && npm install && npm run ios:build`
- Xcode keyboard shortcuts: Cmd+Shift+K (clean), Cmd+Shift+B (archive)

**Stay organized:**
- Track what's in each build (CHANGELOG.md)
- Note known issues in "What to Test"
- Keep testers informed of major changes

**Monitor feedback:**
- Check TestFlight feedback regularly
- Respond to tester comments
- Prioritize critical bugs

---

**Quick reference saved!** Use this guide whenever you need to push an update to TestFlight! 🚀



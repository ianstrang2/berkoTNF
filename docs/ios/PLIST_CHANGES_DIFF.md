# iOS Info.plist Changes - Unified Diff

**Date:** January 22, 2025  
**Status:** ✅ Applied - Ready to commit to Git

---

## 📝 **Files Changed**

### **1. NEW FILE: `ios/App/App/Info-Debug.plist`**

**Based on:** Original `Info.plist`  
**Change:** Replaced `NSAllowsArbitraryLoads` with localhost-only exception

```diff
+ Created new file: Info-Debug.plist
+ 
+ Key change at lines 64-76:
+ <key>NSAppTransportSecurity</key>
+ <dict>
+   <key>NSExceptionDomains</key>
+   <dict>
+     <key>localhost</key>
+     <dict>
+       <key>NSExceptionAllowsInsecureHTTPLoads</key>
+       <true/>
+       <key>NSIncludesSubdomains</key>
+       <true/>
+     </dict>
+   </dict>
+ </dict>
```

**Why:** Safer than arbitrary loads - only allows localhost HTTP.

---

### **2. NEW FILE: `ios/App/App/Info-Release.plist`**

**Based on:** Original `Info.plist`  
**Change:** Completely removed NSAppTransportSecurity section

```diff
+ Created new file: Info-Release.plist
+ 
+ Key change: NSAppTransportSecurity section REMOVED
+ 
- <key>NSAppTransportSecurity</key>
- <dict>
-   <key>NSAllowsArbitraryLoads</key>
-   <true/>
- </dict>
+
+ (No ATS section - full ATS protection)
```

**Why:** App Store compliant - no HTTP allowed.

---

### **3. MODIFIED: `ios/App/App.xcodeproj/project.pbxproj`**

#### **Change 1: Added file references (lines 29-31)**

```diff
  504EC3131FED79650016851F /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
+ 504EC3141FED79650016851F /* Info-Debug.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Info-Debug.plist"; sourceTree = "<group>"; };
+ 504EC3151FED79650016851F /* Info-Release.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = "Info-Release.plist"; sourceTree = "<group>"; };
  50B271D01FEDC1A000F3C39B /* public */ = {isa = PBXFileReference; lastKnownFileType = folder; path = public; sourceTree = "<group>"; };
```

**Why:** Registers new plist files with Xcode project.

---

#### **Change 2: Added to file group (lines 81-82)**

```diff
  504EC30E1FED79650016851F /* Assets.xcassets */,
  504EC3101FED79650016851F /* LaunchScreen.storyboard */,
  504EC3131FED79650016851F /* Info.plist */,
+ 504EC3141FED79650016851F /* Info-Debug.plist */,
+ 504EC3151FED79650016851F /* Info-Release.plist */,
  2FAD9762203C412B000D30F8 /* config.xml */,
  50B271D01FEDC1A000F3C39B /* public */,
```

**Why:** Makes files visible in Xcode project navigator.

---

#### **Change 3: Debug configuration (line 352)**

```diff
  504EC3171FED79650016851F /* Debug */ = {
    isa = XCBuildConfiguration;
    baseConfigurationReference = FC68EB0AF532CFC21C3344DD /* Pods-App.debug.xcconfig */;
    buildSettings = {
      ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
      CODE_SIGN_STYLE = Automatic;
      CURRENT_PROJECT_VERSION = 1;
-     INFOPLIST_FILE = App/Info.plist;
+     INFOPLIST_FILE = App/Info-Debug.plist;
      IPHONEOS_DEPLOYMENT_TARGET = 14.0;
      LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
      MARKETING_VERSION = 1.0;
```

**Why:** Debug builds use localhost-exception plist.

---

#### **Change 4: Release configuration (line 372)**

```diff
  504EC3181FED79650016851F /* Release */ = {
    isa = XCBuildConfiguration;
    baseConfigurationReference = AF51FD2D460BCFE21FA515B2 /* Pods-App.release.xcconfig */;
    buildSettings = {
      ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
      CODE_SIGN_STYLE = Automatic;
      CURRENT_PROJECT_VERSION = 1;
-     INFOPLIST_FILE = App/Info.plist;
+     INFOPLIST_FILE = App/Info-Release.plist;
      IPHONEOS_DEPLOYMENT_TARGET = 14.0;
      LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
      MARKETING_VERSION = 1.0;
```

**Why:** Release builds use ATS-compliant plist (no exceptions).

---

## ✅ **Validation**

### **Files to Commit:**
```bash
git status
# Should show:
#   new file:   ios/App/App/Info-Debug.plist
#   new file:   ios/App/App/Info-Release.plist
#   modified:   ios/App/App.xcodeproj/project.pbxproj
```

### **Verify Syntax:**
```bash
# Check Debug config
grep "INFOPLIST_FILE.*Debug" ios/App/App.xcodeproj/project.pbxproj
# Output: INFOPLIST_FILE = App/Info-Debug.plist;

# Check Release config
grep "INFOPLIST_FILE.*Release" ios/App/App.xcodeproj/project.pbxproj
# Output: INFOPLIST_FILE = App/Info-Release.plist;
```

### **Test on Mac (After Pull):**
```bash
cd ios/App/App
ls -la Info*.plist

# Should see:
# Info.plist (original, can keep for reference)
# Info-Debug.plist (localhost exception)
# Info-Release.plist (no exceptions)
```

---

## 🎯 **What This Achieves**

### **Before (Manual):**
```
1. Develop with NSAllowsArbitraryLoads ✅
2. Ready to submit
3. ⚠️ Edit Info.plist - remove ATS section
4. Archive
5. ⚠️ Edit Info.plist - add ATS section back
6. Continue development
```

**Risk:** Forget step 3 → Rejection  
**Risk:** Forget step 5 → Dev mode broken

### **After (Automatic):**
```
1. Develop normally ✅
2. Ready to submit
3. Archive (Release config uses ATS-safe plist automatically) ✅
4. Continue development (Debug config still uses localhost exception) ✅
```

**Risk:** None - configuration handled by Xcode!

---

## 🚀 **Commit & Deploy**

```bash
# On PC (where changes were made)
git add ios/App/App/Info-Debug.plist
git add ios/App/App/Info-Release.plist
git add ios/App/App.xcodeproj/project.pbxproj
git commit -m "feat(ios): Add configuration-specific Info.plist for ATS compliance

- Create Info-Debug.plist with localhost-only HTTP exception
- Create Info-Release.plist with full ATS protection (no exceptions)
- Update Xcode project to use correct plist per build configuration
- Debug builds allow http://localhost for live reload
- Release builds HTTPS only, App Store compliant

Fixes App Store rejection risk. No manual plist editing required."

git push origin main
```

```bash
# On Mac (pull and test)
git pull origin main

# Test debug build
npm run ios:dev
# ✅ Should work with localhost:3000

# Test release archive
npm run ios:build
# In Xcode: Product → Archive
# ✅ Should validate without ATS errors
```

---

## ✅ **Success Criteria**

- [x] Info-Debug.plist created with localhost exception
- [x] Info-Release.plist created without ATS exceptions
- [x] project.pbxproj updated with new file references
- [x] Debug configuration points to Info-Debug.plist
- [x] Release configuration points to Info-Release.plist
- [x] All changes ready to commit to Git
- [ ] Committed and pushed to main branch
- [ ] Pulled on Mac and tested

---

**Status:** ✅ Ready to commit and push!


# Capacitor 7 CLI Changes

**What changed between Capacitor 6 and 7 regarding live reload**

---

## 🔄 CLI Flag Changes

### Capacitor 6 (Old)
```bash
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

**Issues:**
- Required two separate flags
- `--external` was needed for physical devices
- Sometimes failed to auto-detect IP
- Manual `--host` override often needed

---

### Capacitor 7 (New)
```bash
npx cap run ios --dev
npx cap run android --dev
```

**Improvements:**
- ✅ Single `--dev` flag replaces both `--livereload` and `--external`
- ✅ Automatically detects dev server at `localhost:3000`
- ✅ Automatically uses machine's local IP for physical devices
- ✅ More reliable IP detection
- ✅ Simpler, cleaner syntax

---

## 📋 What Changed in Your Project

### Before (Capacitor 6 syntax)
```json
{
  "scripts": {
    "ios:dev": "npx cap run ios --livereload --external",
    "android:dev": "npx cap run android --livereload --external"
  }
}
```

### After (Capacitor 7 syntax)
```json
{
  "scripts": {
    "ios:dev": "npx cap run ios --dev",
    "android:dev": "npx cap run android --dev"
  }
}
```

---

## 🚀 How It Works Now

### Development Workflow

**Step 1: Start dev server**
```bash
npm run dev
```
This starts Next.js dev server at `http://localhost:3000`

**Step 2: Launch mobile app (in new terminal)**
```bash
npm run ios:dev
# OR
npm run android:dev
```

**What happens:**
1. Capacitor detects dev server running on port 3000
2. Automatically determines the correct URL:
   - **Simulator/Emulator:** `http://localhost:3000`
   - **Physical device:** `http://192.168.1.x:3000` (your machine's IP)
3. Launches app connected to dev server
4. Enables hot module reload (HMR)

---

## 🎯 Benefits

### 1. Automatic Server Detection
**Capacitor 7** scans for common dev server ports:
- 3000 (Next.js, Create React App)
- 4200 (Angular)
- 8080 (Vue)
- 8100 (Ionic)

No manual configuration needed!

### 2. Smart IP Resolution
- **Emulator:** Uses `localhost` (faster, no network needed)
- **Physical device:** Uses your WiFi IP (auto-detected)
- **Multiple interfaces:** Intelligently picks the right one

### 3. Better Error Messages
```bash
# Capacitor 6
Error: Could not connect to livereload server

# Capacitor 7
✖ Dev server not detected on localhost:3000
  Start your dev server first: npm run dev
```

---

## 🔧 Migration Impact

### Scripts Updated ✅
- `ios:dev` - Changed to use `--dev`
- `android:dev` - Changed to use `--dev`
- `ios:build` - No change (production builds unaffected)
- `android:build` - No change (production builds unaffected)
- `build:mobile` - No change (static export unaffected)

### Configuration Updated ✅
- `capacitor.config.ts` - Updated comments to reflect new syntax
- No `server` config needed (Capacitor 7 handles it automatically)

### Documentation Updated ✅
- `docs/CAPACITOR_BUILD_WORKFLOW.md` - Updated examples
- `docs/IOS_SETUP_CHECKLIST.md` - Updated testing scenarios
- `README_IOS_SETUP.md` - Updated quick start

---

## 📖 Usage Examples

### Basic Usage
```bash
# Start dev server (Terminal 1)
npm run dev

# Launch iOS with live reload (Terminal 2)
npm run ios:dev
```

### Targeting Specific Device
```bash
# List available devices
npx cap run ios --list

# Run on specific device
npx cap run ios --dev --target="iPhone 15 Pro"
```

### Targeting Physical Device
```bash
# Connect iPhone via USB
# Enable "Developer Mode" on device (Settings → Privacy & Security)
npx cap run ios --dev --target="Ian's iPhone"

# Capacitor 7 automatically uses WiFi IP for physical devices
```

---

## 🆚 Comparison Table

| Feature | Capacitor 6 | Capacitor 7 |
|---------|-------------|-------------|
| **Live reload flag** | `--livereload --external` | `--dev` |
| **Server detection** | Manual or env var | Automatic |
| **IP detection** | Often required `--host` | Automatic |
| **Emulator vs device** | Same config | Smart routing |
| **Error messages** | Generic | Helpful |
| **Port scanning** | Port 3000 only | Multiple ports |

---

## ⚠️ Breaking Changes

### Removed Flags (No longer work in Capacitor 7)
- `--livereload` ❌ (use `--dev` instead)
- `--external` ❌ (included in `--dev`)
- `--host` ⚠️ (usually not needed, but still available as override)
- `--port` ⚠️ (auto-detected, but still available as override)

### Behavior Changes
1. **Dev server must be running first**
   - Capacitor 7 detects existing server, doesn't start it
   - Cap 6 would wait indefinitely; Cap 7 gives clear error

2. **No `server` config in capacitor.config.ts**
   - Cap 6: Often needed hardcoded `server.url`
   - Cap 7: Automatically detects, config only for overrides

---

## 🔍 Troubleshooting

### "Dev server not detected"

**Cause:** Dev server not running on port 3000

**Fix:**
```bash
# Check if dev server is running
lsof -i :3000

# If not, start it
npm run dev

# Then try again
npm run ios:dev
```

---

### Physical device can't connect

**Cause:** Firewall blocking incoming connections

**Fix:**
```bash
# macOS: Allow incoming connections for Node
# System Settings → Network → Firewall → Options
# Add Node.js and allow incoming connections

# Or disable firewall temporarily
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

---

### Wrong IP detected

**Cause:** Multiple network interfaces (WiFi + Ethernet + VPN)

**Fix (rare, only if needed):**
```bash
# Override with specific IP
npx cap run ios --dev --host=192.168.1.100
```

---

## 📚 Official Capacitor 7 Resources

- **Migration Guide:** https://capacitorjs.com/docs/updating/7-0
- **CLI Reference:** https://capacitorjs.com/docs/cli/run
- **Release Notes:** https://github.com/ionic-team/capacitor/releases/tag/7.0.0

---

## ✅ Summary

**What you need to know:**
1. ✅ `--livereload --external` → `--dev` (single flag)
2. ✅ Capacitor auto-detects dev server (no config needed)
3. ✅ Start `npm run dev` BEFORE running `npm run ios:dev`
4. ✅ Your scripts are now updated for Capacitor 7
5. ✅ Production builds unaffected (no changes needed)

**Your workflow:**
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Mobile app
npm run ios:dev      # or npm run android:dev
```

That's it! Simpler and more reliable than Capacitor 6.


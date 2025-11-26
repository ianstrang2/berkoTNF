# Architecture Decision Record - November 26, 2025

## ✅ **Decision: One Codebase, One Standard Environment Variable**

### **What Changed:**

**Previously (Inconsistent):**
- Mixed references to `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL`
- Plan for separate `capo-marketing` repository
- Confusion about domain structure

**Now (Standardized):**
- ✅ **One codebase** (Next.js) for everything
- ✅ **One environment variable**: `NEXT_PUBLIC_APP_URL`
- ✅ **One deployment** domain: `app.caposport.com`
- ✅ Clear architecture documentation

---

## 🏗️ **Current Architecture**

```
ONE CODEBASE (Next.js)
└── Vercel Deployment

DOMAINS:
├── app.caposport.com → The app (admin, player, API)
└── caposport.com → Marketing pages (same codebase, future: may separate)

ENVIRONMENT VARIABLES:
├── NEXT_PUBLIC_APP_URL=https://app.caposport.com (✅ Standard)
├── NEXT_PUBLIC_SUPABASE_URL=... (Supabase only)
└── NEXT_PUBLIC_SUPABASE_ANON_KEY=... (Supabase only)
```

---

## 📝 **Files Updated (November 26, 2025)**

### **Code Files (7 files):**
1. `src/app/api/admin/upcoming-matches/[id]/complete/route.ts`
2. `src/app/api/admin/join-requests/approve/route.ts`
3. `src/app/api/admin/system-health/route.ts` 
4. `src/app/api/admin/debug-revalidation/route.ts`
5. `src/app/api/admin/upcoming-matches/route.ts`
6. `src/app/api/matches/history/route.ts`
7. `capacitor.config.ts` (already correct)

**Change:** `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_APP_URL`

### **Documentation Files (5 files):**
1. `docs/PLAN_marketing_sandbox_guides.md` - Archived as outdated
2. `docs/MOBILE_SPEC.md` - Updated env var references
3. `docs/SPEC_auth.md` - Updated env var references
4. `docs/MOBILE_SECURITY_AUDIT.md` - Updated env var references
5. `docs/SPEC_match-control-centre.md` - Updated env var references

---

## 🎯 **Why This Matters**

**For Future AI Agents:**
- Clear, consistent naming prevents confusion
- No ambiguity about which environment variable to use
- No outdated "separate repo" plans to mislead development

**For Developers:**
- One variable to set (`NEXT_PUBLIC_APP_URL`)
- Clear architecture (one codebase, one deployment)
- Easy to onboard new team members

**For Deployment:**
- Vercel: Set `NEXT_PUBLIC_APP_URL=https://app.caposport.com`
- Render: Set `NEXT_PUBLIC_APP_URL=https://app.caposport.com`
- Local: Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` (in `.env.local`)

---

## 🚫 **Deprecated Patterns**

**Don't use:**
- ❌ `NEXT_PUBLIC_SITE_URL` (old variable name)
- ❌ References to `capo-marketing` repo (doesn't exist)
- ❌ "Separate marketing deployment" architecture (not implemented)

**Do use:**
- ✅ `NEXT_PUBLIC_APP_URL` (standard variable)
- ✅ `app.caposport.com` for the main app
- ✅ `docs/MOBILE_ARCHITECTURE.md` for current architecture

---

## 📚 **Key Documentation References**

**Current Architecture:**
- `docs/MOBILE_ARCHITECTURE.md` - Webview wrapper architecture
- `docs/MOBILE_SPEC.md` - Mobile technical details
- `docs/MOBILE_USER_GUIDE.md` - Commands and workflows

**Coding Standards:**
- `.cursor/rules/code-generation.mdc` - Project coding standards

**Historical (Archived):**
- `docs/PLAN_marketing_sandbox_guides.md` - Outdated plan (archived)

---

## ✅ **Verification Checklist**

Use this to verify the architecture is correct:

- [ ] All code uses `NEXT_PUBLIC_APP_URL` (not `NEXT_PUBLIC_SITE_URL`)
- [ ] Vercel has `NEXT_PUBLIC_APP_URL=https://app.caposport.com`
- [ ] Render has `NEXT_PUBLIC_APP_URL=https://app.caposport.com`
- [ ] Capacitor config points to `https://app.caposport.com`
- [ ] Supabase Site URL is `https://app.caposport.com`
- [ ] No references to `capo-marketing` repo in active docs
- [ ] Mobile docs reflect webview wrapper architecture

---

**Last Updated:** November 26, 2025  
**Next Review:** When considering architectural changes


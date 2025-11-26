# ⚠️ ARCHIVED: Marketing + Docs + Sandbox Plan

**STATUS:** OUTDATED - NOT CURRENT ARCHITECTURE  
**Date Archived:** November 26, 2025  
**Reason:** This plan described a separate `capo-marketing` repository. We decided to keep one codebase instead.

---

## **Current Reality (November 2025)**

**One codebase, one deployment:**
- `caposport.com` → Marketing pages (home, pricing, blog) in main repo
- `app.caposport.com` → App (admin, player, API) in same repo
- One Vercel deployment serves both domains
- **No separate marketing repository**

**Why we changed:**
- Simpler to maintain
- No duplicate components
- Easier deploys
- Single codebase for solo dev

---

## **For Historical Reference Only**

The content below described a plan that was considered but not implemented. It remains for historical context only.

---

# Marketing + Docs + Sandbox Plan (Capo)

_Last updated: 2025-10-07_

This doc records the **decisions, reasoning, and exact steps** to add a separate **marketing + docs site**, **user onboarding flows**, and a **public view-only demo**, plus how help is shown inside the mobile app.

**⚠️ NOTE:** This "separate repo" architecture was not implemented. See current architecture in `docs/MOBILE_ARCHITECTURE.md`.

[Original content preserved below for reference...]

---

## ✅ Goals (Historical)

- Marketing/docs deploy **independently** from the app.
- One public set of docs + 30–60s videos (SEO + easy to edit).
- **In-app help** opens in a mobile-friendly **browser modal** (not tabs).
- Public **sandbox** (view-only demo).

---

_For current architecture, see:_
- `docs/MOBILE_ARCHITECTURE.md` - Current webview wrapper architecture
- `docs/MOBILE_SPEC.md` - Mobile app technical details
- `.cursor/rules/code-generation.mdc` - Coding standards

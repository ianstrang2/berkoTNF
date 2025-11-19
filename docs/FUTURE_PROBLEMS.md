# Future Technical Debt & Scaling Challenges

This document tracks potential problems and limitations that may need to be addressed as BerkoTNF scales. These are not current blockers but should be monitored and planned for.

---

## **Payment Authorization Timing**
**Problem**: How long can we hold payment auth for confirmed bookings?  
**Current**: Payment auth on confirmation only (no pending holds in simplified version)  
**Constraint**: Stripe auth holds expire after 7 days (plenty of time)  
**Future**: May need immediate auth for high-demand matches  
**Priority**: Medium (affects payment user experience when billing is added)  

---

## **Regulatory Compliance**
**Problem**: GDPR, data protection, youth player safeguarding  
**Current**: Basic privacy controls  
**Future**: Full compliance framework, audit trails, data retention  
**Priority**: High (legal requirement in many jurisdictions)  
**Solution Ideas**: Privacy dashboard, consent management, audit logging  

## **Performance: Bundle Size Optimization**

**Problem**: Large JavaScript bundles slowing down initial page load
- Current: ~3.5 MB of JS (main-app.js: 2 MB, page.js: 745 KB, layout.js: 765 KB)
- Total page weight: 4.8 MB transferred, 20.1 MB resources
- Load time: 1.6s (decent, but could be better)

**When to prioritize**:
- Bounce rates increase
- Users complain about slow loading
- Scaling up (bandwidth costs multiply)
- Mobile traffic grows
- Competing on UX becomes critical

**Solution approach**:
1. Implement code splitting and lazy loading for non-critical routes
2. Use dynamic imports for heavy components/libraries
3. Analyze bundle with webpack-bundle-analyzer to find bloat
4. Consider moving large dependencies to CDN or loading on-demand

**Expected outcome**: 
- Reduce initial bundle by 50-70% (target: 1-1.2 MB)
- Load time under 1 second
- Better mobile experience and SEO (Core Web Vitals)

**Cursor prompt to use**:
> "The bundles are 3.5 MB of JS. Can you implement code splitting and lazy loading for routes that aren't immediately needed? Focus on the biggest wins first - main-app.js is 2 MB. Show me before/after bundle sizes."

**Effort estimate**: 1-2 hours implementation + 30 mins testing

---

## **Multi-Club Player Support**

**Problem**: Players who play for multiple clubs (e.g., Sunday League + Thursday League) cannot easily switch between clubs in the app

**Current State**:
- Database allows phone number in multiple tenants (no constraint)
- Phone authentication returns first matching club only
- Player must use separate invite links to access each club
- `/api/auth/link-by-phone` returns single club, not all clubs
- No club switcher UI in player profile

**When to prioritize**:
- First user reports playing for multiple clubs and needing to switch
- Community feedback requests this feature
- Competitive apps offer this functionality

**Impact if not addressed**:
- Minor UX friction for multi-club players (small minority)
- Workaround exists (use different invite links)
- Not a blocker for growth

**Solution approach**:
1. Update `/api/auth/check-phone` to return ALL matching clubs (not just first)
2. Update `/api/auth/link-by-phone` to return `clubs: [{ tenant_id, name, is_admin }]`
3. Add club selector UI to player profile (reuse admin role switching pattern from Section E2 in SPEC_auth.md)
4. Store current active club in localStorage
5. Add "Switch Club" menu item if `clubs.length > 1`
6. Update tenant context on switch (same logic as superadmin tenant switching)

**Expected outcome**:
- Player sees all their clubs in profile menu
- Can switch between clubs with one tap
- Stats, matches, RSVPs update to selected club
- Seamless experience like admin role switching

**Cursor prompt to use**:
> "A player is registered in multiple clubs (different tenant_ids). Update the auth flow to return all matching clubs when they log in, and add a club switcher UI in the player profile menu. Reuse the existing admin role switching pattern from /auth/login (lines 103-107) and the superadmin tenant switching logic."

**Effort estimate**: 2-3 hours implementation + 1 hour testing

**Priority**: Low (edge case, workaround exists, wait for user demand)

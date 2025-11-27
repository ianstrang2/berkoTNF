# Homepage Rebuild - Implementation Summary

**Date:** November 27, 2025  
**Status:** ✅ Complete - Ready for image assets

---

## What Was Done

### 1. SEO Consolidation ✅

**Moved all SEO from client-side to server-side in `layout.tsx`:**

- ✅ Title: "Capo – Football Organiser App for 5-a-side & 7-a-side | Stats, AI Team Balancing, RSVPs & Match Payments"
- ✅ Meta description (comprehensive, includes all key SEO phrases)
- ✅ Keywords (extensive list from spec)
- ✅ Canonical URL
- ✅ Open Graph tags (title, description, image, URL)
- ✅ Twitter Card metadata
- ✅ FAQ JSON-LD structured data (8 questions from spec)

**Removed from `page.tsx`:**
- ❌ Client-side `useEffect` SEO manipulation (no longer needed)
- ❌ Dynamic meta tag creation via JavaScript

---

## 2. New Marketing Components ✅

All components created in `src/app/marketing/components/`:

### Core Sections

1. **Hero.component.tsx** - Two-column layout with text + dual phone mockups
2. **ForPlayers.component.tsx** - Carousel with 4 screens + feature bullets
3. **ForOrganisers.component.tsx** - Replaces old ForCaptains, updated copy
4. **FairTeams.component.tsx** - Redesigned to match spec
5. **MatchControl.component.tsx** - Combines Match Control Centre + Week Timeline
6. **Comparison.component.tsx** - Capo vs WhatsApp vs Spond table (desktop + mobile responsive)
7. **OriginStory.component.tsx** - Story text + image placeholder
8. **SocialProof.component.tsx** - 3 testimonial cards (placeholder quotes from spec)
9. **FAQ.component.tsx** - Accordion with 11 questions from spec

### Kept Existing

- **MarketingNav.component.tsx** (unchanged)
- **FinalCTA.component.tsx** (unchanged)
- **Footer.component.tsx** (unchanged)
- **ComingSoonModal.component.tsx** (unchanged)

---

## 3. Page Structure ✅

Updated `src/app/page.tsx` with clean, linear structure:

```
Hero
↓
ForPlayers
↓
ForOrganisers
↓
FairTeams
↓
MatchControl (includes Week Timeline)
↓
Comparison
↓
OriginStory
↓
SocialProof
↓
FAQ
↓
FinalCTA
↓
Footer
```

---

## What You Need To Do: Image Assets

All placeholder images are marked with clear dimensions. Here's your shopping list:

### Phone Mockups (9:16 aspect ratio - 800×1400px or 720×1280px)

**Hero Section:**
- `/images/hero-phone-stats.png` - Stats/profile screen
- `/images/hero-phone-teams.png` - Team balance screen

**ForPlayers Section (Carousel - 4 screens):**
- `/images/player-ai-profile.png` - AI profile screen
- `/images/player-stats.png` - Stats & form graphs
- `/images/player-streaks.png` - Streaks/badges screen
- `/images/player-match-report.png` - Match report

**ForOrganisers Section:**
- `/images/organiser-dashboard.png` - RSVP/payments dashboard

**FairTeams Section:**
- `/images/team-balance.png` - Balanced teams screen

**MatchControl Section:**
- `/images/match-control.png` - Match control centre screen

### Wider Screenshots (16:9 or 4:3 - 1440×900px or 1280×720px)

**OriginStory Section:**
- `/images/origin-story-spreadsheet.png` - Your old spreadsheet or "before/after" graphic

### Social Media

**Open Graph Image:**
- `/images/og-image.jpg` - 1200×630px for social sharing

---

## Image Alt Text Reference

All images include proper SEO alt text. Examples:

- "football stats app for casual 5-a-side and 7-a-side players – Capo profile screen"
- "AI team balancer for small-sided football – balanced 5-a-side teams in Capo"
- "football organiser app with RSVPs, dropouts and waiting list – Capo organiser dashboard"

*(Full alt text is already in the components - just drop in the images)*

---

## Testing Checklist

### Visual Testing
- [ ] Replace all placeholder images with real assets
- [ ] Test on mobile (phone mockups should look good stacked)
- [ ] Test comparison table on mobile (switches to card layout)
- [ ] Test FAQ accordion (smooth expand/collapse)
- [ ] Test player carousel (4 screens cycle smoothly)
- [ ] Test week timeline (horizontal on desktop, vertical on mobile)

### SEO Verification
- [ ] View page source, confirm meta tags are server-rendered (no client-side JS)
- [ ] Test Open Graph tags with [OpenGraph.xyz](https://www.opengraph.xyz/) or similar
- [ ] Search Console: verify FAQ schema is detected
- [ ] Canonical URL resolves correctly

### Content Review
- [ ] Review all copy against spec (minor edits if needed)
- [ ] Replace placeholder testimonials with real quotes (when available)
- [ ] Update FAQ if any answers need adjustment

---

## Responsive Breakpoints

All sections use Tailwind responsive design:

- **Mobile:** Default (< 768px)
- **Tablet:** `md:` (768px+)
- **Desktop:** `lg:` (1024px+)

Key responsive features:
- Hero: Stacks on mobile, side-by-side on desktop
- Comparison table: Switches to cards on mobile (hidden table on small screens)
- Week Timeline: Vertical on mobile, horizontal on desktop
- All text sizes scale with `sm:`, `md:`, `lg:` variants

---

## FAQ Schema (JSON-LD)

FAQ structured data is now in `layout.tsx` and includes 8 questions:

1. Do all my players have to download the app?
2. Is Capo free?
3. Is Capo only for 5-a-side?
4. How is Capo better than WhatsApp?
5. Does Capo balance teams fairly?
6. Can I track goals, assists and streaks?
7. Can Capo handle match payments automatically?
8. Can I use Capo to track a casual football league?

Google should pick these up as rich FAQ results in search.

---

## Notes for Future Updates

### Placeholder Content To Replace Later:
1. **Testimonials** - Currently using placeholder quotes from spec
2. **Origin Story Image** - Needs your actual spreadsheet screenshot

### Easy Tweaks:
- **Hero CTA Button** - Currently shows "ComingSoonModal", wire to real app download when ready
- **Testimonial Cards** - Same structure, just swap quote/author/group text
- **FAQ Questions** - Add/remove in `FAQ.component.tsx` (will need to sync with JSON-LD in `layout.tsx`)

---

## Files Modified/Created

### Modified:
- `src/app/layout.tsx` - Added comprehensive metadata + FAQ schema
- `src/app/page.tsx` - Removed client SEO, updated component structure

### Created:
- `src/app/marketing/components/Hero.component.tsx`
- `src/app/marketing/components/ForPlayers.component.tsx`
- `src/app/marketing/components/ForOrganisers.component.tsx`
- `src/app/marketing/components/FairTeams.component.tsx`
- `src/app/marketing/components/MatchControl.component.tsx`
- `src/app/marketing/components/Comparison.component.tsx`
- `src/app/marketing/components/OriginStory.component.tsx`
- `src/app/marketing/components/SocialProof.component.tsx`
- `src/app/marketing/components/FAQ.component.tsx`

### Can Delete (if you want):
- `src/app/marketing/components/ForCaptains.component.tsx` - Replaced by ForOrganisers
- `src/app/marketing/components/RealLife.component.tsx` - Replaced by MatchControl
- `src/app/marketing/components/HowItWorks.component.tsx` - Replaced by MatchControl
- `src/app/marketing/components/ImageCarousel.component.tsx` - No longer used (carousel built into ForPlayers)

---

## Quick Start: Adding Images

1. **Create directory:**
   ```bash
   mkdir public/images
   ```

2. **Drop in your images** using the exact filenames above

3. **Refresh homepage** - placeholders will be replaced with your assets

4. **Iterate:** Adjust sizing/cropping as needed

---

**Questions or adjustments needed?** Let me know!


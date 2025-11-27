# Homepage Image Asset Checklist

Quick reference for all image placeholders used in the homepage rebuild.

---

## Phone Mockups (Portrait - 9:16 aspect ratio)

**Recommended size:** 800×1400px or 720×1280px

- [ ] `/images/hero-phone-stats.png` - Hero section (main phone, right side)
- [ ] `/images/hero-phone-teams.png` - Hero section (secondary phone, left side)
- [ ] `/images/player-ai-profile.png` - ForPlayers carousel (slide 1)
- [ ] `/images/player-stats.png` - ForPlayers carousel (slide 2)
- [ ] `/images/player-streaks.png` - ForPlayers carousel (slide 3)
- [ ] `/images/player-match-report.png` - ForPlayers carousel (slide 4)
- [ ] `/images/organiser-dashboard.png` - ForOrganisers section
- [ ] `/images/team-balance.png` - FairTeams section
- [ ] `/images/match-control.png` - MatchControl section

**Total: 9 phone mockups**

---

## Wider Screenshots (Landscape - 16:9 or 4:3 aspect ratio)

**Recommended size:** 1440×900px or 1280×720px

- [ ] `/images/origin-story-spreadsheet.png` - OriginStory section (your old spreadsheet or "before/after" graphic)

**Total: 1 wide image**

---

## Social Media

**Fixed size:** 1200×630px

- [ ] `/images/og-image.jpg` - Open Graph image for social sharing (Facebook, Twitter, LinkedIn, etc.)

**Total: 1 OG image**

---

## Grand Total: 11 Images

**Directory:** `public/images/`

**Pro Tip:** Export from Figma/Sketch at 2x resolution for retina displays, then:
- Phone mockups: 1600×2800 → resize to 800×1400
- Wide images: 2880×1800 → resize to 1440×900
- OG image: 2400×1260 → resize to 1200×630

---

## Quick Commands

**Create directory:**
```bash
mkdir -p public/images
```

**Check what's missing:**
```bash
ls public/images/
```

**Expected output when complete:**
```
hero-phone-stats.png
hero-phone-teams.png
player-ai-profile.png
player-stats.png
player-streaks.png
player-match-report.png
organiser-dashboard.png
team-balance.png
match-control.png
origin-story-spreadsheet.png
og-image.jpg
```

---

**All images have proper alt text already coded** - just drop them in and you're done!


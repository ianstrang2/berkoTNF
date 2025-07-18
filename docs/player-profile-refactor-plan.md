Player Profile Screen Refactor Plan - UPDATED WITH STREAKS
Overview
This document outlines the refactor of the existing player profile screen to incorporate power rating visualizations and enhance data presentation. Based on review of the actual app implementation, this plan focuses on replacing specific sections while maintaining the overall page structure and Soft UI styling.

**Key addition in this update**: Reintegrate streak data (from existing stat cards and SQL aggregates) as a new compact section with comparative sliders, preserving valuable insights.

## Current State Analysis
✅ **Existing Structure** (keep as-is):
- Page layout with name and club badge header
- Performance Overview chart with metric switching (Games, Goals, MPG, PPG, Points)  
- Match Performance dots visualization
- Overall Soft UI styling with purple/pink gradients

🔄 **Sections to Replace**:
- **Top Stats Cards**: Replace 9 individual stat cards (including the 5 streak cards) with power rating visualizations + new streaks section
- **Bottom Tables**: Convert teammate tables to scatter plot visualization
- **Minor Chart Enhancement**: Consider adding league average reference lines

## Tech Stack (Confirmed)
- **Frontend**: Next.js 14 App Router, TypeScript, React
- **Styling**: Tailwind CSS with custom Soft UI theme (purple/pink gradients)
- **Charts**: Recharts (already integrated)
- **Data**: Supabase with Prisma, `aggregated_player_power_ratings` & `aggregated_player_profile_stats`
- **UI Components**: Extensive existing ui-kit with Card, StatsCard, Chart, NavPills, etc.

## Refactor Sections

### Section 1: Power Rating Header (Replace Top Stats Cards)
**Current**: 9 individual StatsCard components in a grid
**New**: Hero section with player summary and power rating visualizations

**Layout**: 
```
┌─────────────────────────────────────────────────┐
│  Player Name + Club Badge (keep existing)      │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │   Power     │  │    Goal Threat Slider       │ │
│  │   Rating    │  │    (0-100% scale)          │ │
│  │   Gauge     │  ├─────────────────────────────┤ │
│  │  (0-100%)   │  │  Defensive Shield Slider    │ │
│  │             │  │    (0-100% scale)          │ │
│  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Components**:
1. **Power Rating Gauge**: Semi-circular gauge component
   - Scale: 0-100% (normalize database rating values)
   - Colors: Purple/pink gradient for active portion, light gray for background
   - Center text: "85%" with "Power Rating" label below
   - Soft UI styling: white background, `shadow-soft-xl`, `rounded-2xl`

2. **Goal Threat Slider**: Horizontal progress bar using reusable PowerSlider
   - Scale: 0-100% (normalize `goal_threat` values against league min/max)
   - Visual: Purple/pink gradient fill, gray background
   - League average marker: Dashed vertical line
   - Label: "Goal Threat: 73% (Above Average)"

3. **Defensive Shield Slider**: Similar to goal threat using PowerSlider
   - Scale: 0-100% (normalize `defensive_shield` values)
   - Label: "Defensive Shield: 67% (Above Average)"

### Section 2: Streaks (New Section - Preserve from Existing Stat Cards)
**Current**: 5 streak-related StatsCards (win, undefeated, losing, winless, attendance)
**New**: Compact section with comparative sliders for all-time longest streaks (positive/negative groups)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Streaks (All-Time Longest)                    │
├──────────────────────────┬──────────────────────┤
│  Positive Streaks        │  Negative Streaks    │
│  ┌─────────────────────┐ │ ┌───────────────────┐ │
│  │ Attendance: 67 games│ │ │ Losing: 3 games   │ │
│  │ [Slider 0-100%]     │ │ │ [Slider 0-100%]   │ │
│  │ (All-time record)   │ │ │ (2023-12 to 24-01)│ │
│  ├─────────────────────┤ │ ├───────────────────┤ │
│  │ Win: 7 games        │ │ │ Winless: 13 games │ │
│  │ [Slider 0-100%]     │ │ │ [Slider 0-100%]   │ │
│  │ (2014-07 to 14-09) │ │ │ (2024-03 to 24-07)│ │
│  ├─────────────────────┤ │ └───────────────────┘ │
│  │ Unbeaten: 13 games  │ │                      │ │
│  │ [Slider 0-100%]     │ │                      │ │
│  │ (2014-08 to 14-08) │ │                      │ │
│  └─────────────────────┘ │                      │ │
└──────────────────────────┴──────────────────────┘
```

**Components**:
- Two columns (or accordions on mobile): Positive (green accents), Negative (red/gray accents)
- **PowerSlider components** for each streak:
  - Scale: 0-100% (normalize against league min/max for each streak type)
  - League average marker: Dashed vertical line
  - **Dates displayed subtly** below slider label: "Longest Win: 7 games" + "(2014-07-15 to 2014-09-10)"
  - Tooltips: "All-time longest compared to league average"
- **Data**: From `aggregated_player_profile_stats` (win_streak, win_streak_dates, undefeated_streak, undefeated_streak_dates, losing_streak, losing_streak_dates, winless_streak, winless_streak_dates, attendance_streak)
- **Styling**: Soft UI card, purple header, `shadow-soft-xl`, `rounded-2xl`

### Section 3: Performance Overview Chart (Minor Enhancement)
**Current**: Line/bar chart with NavPills switching between metrics
**Enhancement**: 
- Add league average reference line (dashed gray line)
- **Add Power Rating as DEFAULT metric** (new first option in NavPills)
- Aggregate power rating per year via: `SELECT DATE_PART('year', updated_at) as year, AVG(rating_numeric) as avg_rating FROM aggregated_player_power_ratings WHERE player_id = ? GROUP BY year ORDER BY year`
- Alternative: Use yearly fantasy_points from existing JSON as proxy if power rating history unavailable

**Status**: Keep existing implementation, add power rating data and minor UI enhancements

### Section 4: Match Performance Dots (Keep As-Is)
**Status**: Already well-implemented, no changes needed

### Section 5: Teammate Chemistry Scatter Plot (Replace Tables)
**Current**: Three side-by-side tables (Most Played With, Best Chemistry, Worst Chemistry)
**New**: Single scatter plot visualization

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Teammate Chemistry (Min 5 games played)       │
│  ┌─────────────────────────────────────────────┐ │
│  │           ^                                 │ │
│  │    High   │  ●     ● Best Chemistry        │ │
│  │    Perf   │     ●                          │ │
│  │           │  ●                             │ │
│  │  ────────●┼●●●●──── Avg Performance        │ │
│  │           │   ●  ●                         │ │
│  │    Low    │      ●  ● Worst Chemistry      │ │
│  │    Perf   │                                │ │
│  │           └────────────────────────────────> │ │
│  │              Games Played Together          │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Implementation**:
- **Chart Type**: Recharts ScatterChart
- **X-axis**: Games played together (from `teammate_frequency_top5`)
- **Y-axis**: Average fantasy points together (from `teammate_performance_high/low_top5`)
- **Points**: Colored dots (green=best, red=worst, blue=most frequent)
- **Tooltips**: "With [Name]: [X] games, [Y] avg FP"
- **Nice-to-Have**: Click dots to navigate to teammate profile (using player_id from JSON)
- **Styling**: Same Soft UI card as other sections

## Implementation Steps

### Phase 1: Reusable PowerSlider Component (FOUNDATIONAL)
```typescript
// Create foundational component: PowerSlider.component.tsx
// Handles all horizontal sliders with:
// - 0-100% normalization
// - League average markers (dashed line)
// - Purple/pink gradient fills
// - Subtle date/context display
// - Consistent Soft UI styling
// Will be used for: Goal Threat, Defensive Shield, and all 5 Streaks
```

### Phase 2: Power Rating Gauge Component
```typescript
// Create new component: PowerRatingGauge.component.tsx
// Use Recharts PieChart or custom SVG to create semi-circular gauge
// Integrate with existing Card component styling
```

### Phase 3: Replace Top Section and Add Streaks
```typescript
// Modify PlayerProfile.component.tsx
// Replace the stats cards grid with new power rating + streaks sections
// Update data fetching to include power ratings
// Implement streaks section using PowerSlider components
```

### Phase 4: Scatter Plot Component
```typescript
// Create: TeammateChemistryChart.component.tsx
// Use Recharts ScatterChart
// Replace the three-table layout
// Add click navigation if straightforward (via existing routing)
```

### Phase 5: Minor Chart Enhancement
```typescript
// Add league average reference line to existing Chart.component.tsx
// Requires additional API call for league averages
```

## Data Fetching & Normalization

**Power Ratings**:
```typescript
// Add to existing API call in PlayerProfile.component.tsx
const { data: powerRatings } = await supabase
  .from('aggregated_player_power_ratings')
  .select('rating_numeric, goal_threat_numeric, defensive_shield_numeric') // Updated field names
  .eq('player_id', id)
  .single();

// Normalize to 0-100 scale
const normalizeRating = (rating: number, min: number, max: number) => {
  return Math.round(((rating - min) / (max - min)) * 100);
};
```

**Streaks Data**:
```typescript
// Already in existing profile query (from aggregated_player_profile_stats)
// Add normalization: Fetch league min/max/avg for each streak type
// Display dates subtly: "Longest Win: 7 games (2014-07-15 to 2014-09-10)"
// Handle edge cases: If min==max for any metric, show "Insufficient league data" or default to 50%
```

**Performance Chart Power Rating**:
```typescript
// For Section 3 enhancement: Add Power Rating as default metric
// Aggregate power rating per year via new query:
// SELECT DATE_PART('year', updated_at) as year, AVG(rating_numeric) as avg_rating
// FROM aggregated_player_power_ratings 
// WHERE player_id = ? GROUP BY year ORDER BY year
// Alternative: Use yearly fantasy_points from existing JSON as proxy if power rating history unavailable
```

## Styling Guidelines

**Maintain Existing Patterns**:
- White backgrounds with `shadow-soft-xl`
- Purple/pink gradients: `bg-gradient-to-tl from-purple-700 to-pink-500`
- Rounded corners: `rounded-2xl`
- Consistent padding and spacing
- Soft UI icons and typography

**New Component Styling**:
- **PowerSlider**: Horizontal bars with subtle shadows, league markers
- **Gauge**: Clean semi-circle with gradient fill
- **Scatter plot**: Minimal grid lines, clear point differentiation
- **Dates**: Subtle gray text, smaller font, positioned below main labels

## File Changes Required

1. **New Components**:
   - `src/components/player/PowerSlider.component.tsx` (FOUNDATIONAL - reusable)
   - `src/components/player/PowerRatingGauge.component.tsx`
   - `src/components/player/TeammateChemistryChart.component.tsx`

2. **Modified Files**:
   - `src/components/player/PlayerProfile.component.tsx` (main refactor, add streaks)
   - `src/app/api/playerprofile/route.ts` (add power ratings data)

3. **Enhanced Files**:
   - `src/components/ui-kit/Chart.component.tsx` (league average line support)

This refactor maintains the solid existing foundation while adding the missing power rating visualizations, preserving streak data in a visual format with dates for context, and enhancing the teammate analysis with a more intuitive scatter plot interface.

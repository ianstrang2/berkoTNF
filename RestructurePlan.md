# Codebase Restructuring Plan

## Current Folder Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── TeamAlgorithm.tsx
│   │   ├── PlayerFormModal.tsx
│   │   ├── PlayerManager.tsx
│   │   ├── PlayerRatings.tsx
│   │   ├── DraggablePlayerSlot.tsx
│   │   ├── index.ts
│   │   ├── TeamTemplates.tsx
│   │   ├── TeamAlgorithm_backup.md
│   │   ├── PlayerSlot.tsx
│   │   ├── AttributeGuide.tsx
│   │   ├── MatchManager.tsx
│   │   ├── AppSetup/
│   │   ├── AppSetup.tsx
│   │   ├── AppConfig.tsx
│   │   ├── AdminNavbar.tsx
│   │   └── AdminPanel.tsx
│   ├── matchday/
│   │   ├── Matchday.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   ├── ui-kit/
│   │   ├── Table.tsx
│   │   ├── Tabs.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── Card.tsx
│   │   ├── ConfirmationDialog.tsx
│   │   ├── Button.tsx
│   │   └── index.ts
│   ├── stats/
│   │   ├── AllTimeStats.tsx
│   │   ├── OverallSeasonPerformance.tsx
│   │   ├── CurrentHalfSeason.tsx
│   │   └── index.ts
│   ├── records/
│   │   ├── HonourRoll.tsx
│   │   └── index.ts
│   ├── player/
│   │   ├── PlayerProfile.tsx
│   │   └── index.ts
│   ├── match-report/
│   │   ├── MatchReport.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   └── index.ts
│   └── navigation/
│       ├── BottomNav.tsx
│       ├── SideNav.tsx
│       └── NavItem.tsx
├── pages/
│   ├── admin/
│   │   └── app-setup.tsx
│   └── index.tsx
├── services/
│   └── TeamBalanceService.ts
├── lib/
│   ├── utils.ts
│   ├── apiCache.ts
│   └── prisma.ts
├── hooks/
│   ├── useStats.ts
│   └── useAuth.ts
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── globals.css
│   ├── favicon.ico
│   ├── season/
│   │   ├── page.tsx
│   │   └── comparison/
│   ├── report/
│   │   ├── page.tsx
│   │   └── [id]/
│   ├── records/
│   │   ├── page.tsx
│   │   ├── players/
│   │   ├── hall-of-fame/
│   │   └── all-time/
│   ├── more/
│   │   ├── page.tsx
│   │   ├── players/
│   │   ├── hall-of-fame/
│   │   └── all-time/
│   ├── matchday/
│   │   └── page.tsx
│   ├── api/
│   │   ├── matchReport/
│   │   ├── stats/
│   │   ├── maintenance/
│   │   ├── honourroll/
│   │   ├── allTimeStats/
│   │   ├── admin/
│   │   ├── playerprofile/
│   │   ├── players/
│   │   └── matches/
│   └── admin/
│       ├── page.tsx
│       ├── setup/
│       ├── ratings/
│       ├── players/
│       ├── next-match/
│       └── matches/
├── contexts/
└── types/
```

## Proposed Folder Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── team/
│   │   │   ├── TeamAlgorithm.component.tsx
│   │   │   ├── TeamTemplates.component.tsx
│   │   │   └── DraggablePlayerSlot.component.tsx
│   │   ├── player/
│   │   │   ├── PlayerFormModal.component.tsx
│   │   │   ├── PlayerManager.component.tsx
│   │   │   ├── PlayerRatings.component.tsx
│   │   │   └── PlayerSlot.component.tsx
│   │   ├── layout/
│   │   │   ├── AdminNavbar.component.tsx
│   │   │   └── AdminPanel.component.tsx
│   │   └── config/
│   │       ├── AppSetup.tsx
│   │       └── AppConfig.tsx
│   ├── ui-kit/
│   │   ├── Table.component.tsx
│   │   ├── Tabs.component.tsx
│   │   ├── ErrorBoundary.component.tsx
│   │   ├── ConfirmationModal.component.tsx
│   │   ├── Card.component.tsx
│   │   ├── ConfirmationDialog.component.tsx
│   │   ├── Button.component.tsx
│   │   └── index.ts
│   ├── navigation/
│   │   ├── BottomNav.component.tsx
│   │   ├── SideNav.component.tsx
│   │   └── NavItem.component.tsx
│   ├── shared/
│   ├── stats/
│   │   ├── AllTimeStats.component.tsx
│   │   ├── OverallSeasonPerformance.component.tsx
│   │   ├── CurrentHalfSeason.component.tsx
│   │   └── index.ts
│   ├── records/
│   │   ├── HonourRoll.component.tsx
│   │   └── index.ts
│   ├── player/
│   │   ├── PlayerProfile.component.tsx
│   │   └── index.ts
│   ├── match-report/
│   │   ├── MatchReport.component.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── MainLayout.component.tsx
│   │   ├── AdminLayout.component.tsx
│   │   └── index.ts
├── pages/
│   ├── admin/
│   │   ├── dashboard.tsx
│   │   ├── players.tsx
│   │   ├── teams.tsx
│   │   ├── assessments.tsx
│   │   ├── balance-algorithm.tsx
│   │   └── app-setup.tsx
│   ├── index.tsx
├── services/
│   └── TeamBalanceService.ts
├── lib/
│   ├── utils.ts
│   ├── apiCache.ts
│   └── prisma.ts
├── hooks/
│   ├── useStats.ts
│   └── useAuth.ts
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── globals.css
│   ├── favicon.ico
│   ├── season/
│   │   ├── page.tsx
│   │   └── comparison/
│   ├── report/
│   │   ├── page.tsx
│   │   └── [id]/
│   ├── records/
│   │   ├── page.tsx
│   │   ├── players/
│   │   ├── hall-of-fame/
│   │   └── all-time/
│   ├── more/
│   │   ├── page.tsx
│   │   ├── players/
│   │   ├── hall-of-fame/
│   │   └── all-time/
│   ├── matchday/
│   │   └── page.tsx
│   ├── api/
│   │   ├── matchReport/
│   │   ├── stats/
│   │   ├── maintenance/
│   │   ├── honourroll/
│   │   ├── allTimeStats/
│   │   ├── admin/
│   │   ├── playerprofile/
│   │   ├── players/
│   │   └── matches/
│   └── admin/
│       ├── page.tsx
│       ├── setup/
│       ├── ratings/
│       ├── players/
│       ├── next-match/
│       └── matches/
├── contexts/
└── types/
```

## Steps for Restructuring

1. **Rename Files**: Use consistent naming conventions for components and utilities.
2. **Move Files**: Organize files into feature-based folders as suggested.
3. **Update Imports**: Adjust import paths in files to reflect the new structure.
4. **Execute Commands**: Use terminal commands to rename and move files.

## Example Commands

- Rename and move `TeamAlgorithm.tsx`:
  ```bash
  mv src/components/admin/TeamAlgorithm.tsx src/components/admin/team/TeamAlgorithm.component.tsx
  ```

- Move `PlayerFormModal.tsx`:
  ```bash
  mv src/components/admin/PlayerFormModal.tsx src/components/admin/player/PlayerFormModal.component.tsx
  ```

- Update import paths in files to reflect the new structure. 
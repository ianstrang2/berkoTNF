# Match Control Centre - State & Flow Diagrams

**Last Updated:** December 2, 2025  
**Status:** ✅ IMPLEMENTED  
**Related:** `SPEC_match-control-centre.md`

## Overview

This document contains Mermaid diagrams for the Match Control Centre flow, featuring:
- 3-step UI process (Pool → Teams → Done)
- 4 database states (Draft → PoolLocked → TeamsBalanced → Completed)
- Explicit save model for team changes (`teams_saved_at`)
- Player visibility gated on save status
- RSVP compatibility

---

## 1. Main State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Create Match
    
    Draft --> PoolLocked: Lock & Balance
    PoolLocked --> Draft: Unlock Pool
    PoolLocked --> TeamsBalanced: Enter Result
    TeamsBalanced --> Completed: Save Result
    Completed --> TeamsBalanced: Undo Completion
    Completed --> [*]: Archive/Delete
    
    state Draft {
        [*] --> BuildingPool
        BuildingPool --> BuildingPool: Add/Remove Players
        BuildingPool --> [*]: Pool Ready (8-22 players)
    }
    
    state PoolLocked {
        [*] --> TeamsUnsaved
        TeamsUnsaved --> TeamsSaved: Save Teams
        TeamsSaved --> TeamsModified: Drag/Drop or Re-Balance
        TeamsModified --> TeamsSaved: Save Changes
        TeamsModified --> TeamsSaved: Discard Changes
        TeamsSaved --> [*]: Ready for Result Entry
        note right of TeamsUnsaved: teams_saved_at = NULL
        note right of TeamsSaved: teams_saved_at = timestamp
    }
    
    state TeamsBalanced {
        [*] --> EnteringScores
        EnteringScores --> EnteringScores: Add goals / Toggle no-shows
    }
    
    state Completed {
        [*] --> MatchFinished
        MatchFinished --> StatsUpdated: Trigger Stats Job
    }
```

---

## 2. Admin Flow (Detailed)

```mermaid
flowchart TD
    subgraph POOL["Step 1: Pool (Draft State) - Status: BUILDING"]
        P1[Create Match] --> P2[Add Players to Pool]
        P2 --> P3{Pool Size?}
        P3 -->|"< 8"| P4[Blocked: Need more players]
        P4 --> P2
        P3 -->|"8-22"| P5[Pool Ready]
        P3 -->|"> 22"| P6[Blocked: Too many players]
        P6 --> P2
        P5 --> P7[Click: Lock & Balance]
        P7 --> P8[Modal: Choose Balance Method]
        P8 -->|Ability| P9{Even teams & not 4v4?}
        P9 -->|Yes| P10[Balance by Ability]
        P9 -->|No| P11[Method Blocked - greyed out]
        P8 -->|Performance| P12[Balance by Performance]
        P8 -->|Random| P13[Random Assignment]
        P10 --> T1
        P12 --> T1
        P13 --> T1
        P11 --> P8
    end
    
    subgraph TEAMS["Step 2: Teams (PoolLocked State) - Status: ARRANGING / TEAMS SET"]
        T1[View Balanced Teams] --> T2{teams_saved_at?}
        T2 -->|NULL| T3["Status: ARRANGING<br/>Players see: 'Teams being finalised...'"]
        T2 -->|Set| T4["Status: TEAMS SET<br/>Players see: Full teams"]
        T3 --> T5[Admin reviews teams]
        T4 --> T5
        T5 --> T6{Action?}
        T6 -->|Save first time| T7[Click: Save Teams]
        T6 -->|Drag/Drop| T8[Move players between teams]
        T6 -->|Re-Balance| T9[Click: Re-Balance button]
        T7 --> T10["teams_saved_at = NOW()<br/>Green flash: ✓ Saved!"]
        T10 --> T11[CTA changes to: Enter Result]
        T8 --> T12[Local state updated only]
        T12 --> T13["Discard button appears (gradient)"]
        T13 --> T14{What next?}
        T14 -->|Save| T15[Click: Save Changes]
        T14 -->|Discard| T16[Click: Discard]
        T14 -->|More changes| T8
        T15 --> T10
        T16 --> T17[Reset to last saved state]
        T17 --> T11
        T9 --> T18[Choose new balance method]
        T18 --> T12
        T11 --> T19{Ready?}
        T19 -->|Enter scores| T20[Click: Enter Result]
        T19 -->|Need pool changes| T21[Menu: Unlock Pool]
        T21 --> P2
    end
    
    subgraph RESULT["Step 3: Done (TeamsBalanced/Completed) - Status: RESULT / COMPLETE"]
        T20 --> R1["State = TeamsBalanced<br/>Score bar shows: Orange vs Green"]
        R1 --> R2[Add goals per player]
        R2 --> R3[Mark no-shows if any]
        R3 --> R4{Playing counts even?}
        R4 -->|No| R5["⚠️ Uneven: X vs Y"]
        R4 -->|Yes| R6[Ready to save]
        R5 --> R6
        R6 --> R7[Click: Save Result]
        R7 --> R8["State = Completed<br/>Trigger stats update job"]
        R8 --> R9[Match Complete ✓]
    end
```

---

## 3. Player View Logic

```mermaid
flowchart TD
    PV1[Player opens /player/upcoming] --> PV2{Match exists?}
    PV2 -->|No| PV3[No upcoming matches]
    PV2 -->|Yes| PV4{Match state?}
    
    PV4 -->|Draft| PV5["Status: BUILDING<br/>'Match on [date]'<br/>No team info"]
    
    PV4 -->|PoolLocked| PV6{teams_saved_at?}
    PV6 -->|NULL| PV7["Status: BUILDING<br/>'Match on [date]'<br/>'Teams being finalised...'<br/>No team info"]
    PV6 -->|Set| PV8["Status: TEAMS SET<br/>'Match on [date]'<br/>Your team: Orange/Green<br/>Full team lists"]
    
    PV4 -->|TeamsBalanced| PV9["Status: READY<br/>'Match on [date]'<br/>Your team: Orange/Green<br/>Full team lists"]
    
    PV4 -->|Completed| PV10["Status: COMPLETE<br/>'Match on [date]'<br/>Result: X - Y<br/>Your team: Orange/Green"]
```

---

## 4. Data Model

```mermaid
erDiagram
    upcoming_matches {
        int upcoming_match_id PK
        string tenant_id FK
        date match_date
        string state "Draft|PoolLocked|TeamsBalanced|Completed"
        int team_size
        int actual_size_a
        int actual_size_b
        boolean is_balanced
        timestamp teams_saved_at "NULL = unsaved, timestamp = visible to players"
        int state_version "Optimistic locking"
        timestamp created_at
        timestamp updated_at
    }
    
    upcoming_match_players {
        int id PK
        int upcoming_match_id FK
        int player_id FK
        string tenant_id FK
        string team "Unassigned|A|B"
        int slot_number
    }
    
    upcoming_matches ||--o{ upcoming_match_players : contains
```

---

## 5. Save Flow (Teams)

```mermaid
sequenceDiagram
    participant Admin
    participant UI as React State
    participant API
    participant DB
    participant Players as Player App
    
    Note over Admin,Players: Initial Balance (on Lock & Balance)
    Admin->>API: Lock & Balance (method)
    API->>DB: Create team assignments
    API->>DB: state='PoolLocked', is_balanced=true, teams_saved_at=NULL
    API-->>Admin: Success - show Set Teams screen
    Admin->>UI: View teams (local state = DB state)
    Players->>DB: Check teams
    DB-->>Players: teams_saved_at=NULL
    Players->>Players: Show "Teams being finalised..."
    
    Note over Admin,Players: First Save
    Admin->>UI: Click "Save Teams"
    UI->>API: POST /save-teams
    API->>DB: teams_saved_at = NOW()
    API-->>UI: Success
    UI-->>Admin: Green flash "✓ Saved!" (1.5s)
    UI-->>Admin: CTA changes to "Enter Result"
    Players->>DB: Check teams
    DB-->>Players: teams_saved_at = timestamp
    Players->>Players: Show actual teams
    
    Note over Admin,Players: Modifications (local only)
    Admin->>UI: Drag player to other team
    UI->>UI: Update local state only (not DB)
    UI-->>Admin: Discard button appears (gradient)
    Players->>DB: Check teams
    DB-->>Players: Return last saved (unchanged)
    
    Note over Admin,Players: Save Changes
    Admin->>UI: Click "Save Changes"
    UI->>API: POST /save-teams (with new assignments)
    API->>DB: Update team assignments
    API->>DB: teams_saved_at = NOW()
    API-->>UI: Success
    UI-->>Admin: Green flash "✓ Saved!"
    Players->>DB: Check teams
    DB-->>Players: Return new teams
    
    Note over Admin,Players: Discard Changes
    Admin->>UI: Click "Discard"
    UI->>UI: Reset local state to last saved from DB
    UI-->>Admin: Discard button disappears
```

---

## 6. Edge Case Handling

```mermaid
flowchart TD
    subgraph EC1["App Close Scenarios"]
        E1A[Close during Pool] --> E1B[Pool preserved in DB]
        E1C[Close after Lock & Balance] --> E1D["Teams in DB, state=PoolLocked<br/>teams_saved_at=NULL<br/>Players see: 'Teams being finalised...'"]
        E1E[Close with unsaved local changes] --> E1F["Last saved teams preserved<br/>Local changes lost<br/>On reopen: shows last saved state"]
    end
    
    subgraph EC2["Conflict Handling"]
        E2A[Admin A saves] --> E2B[state_version++]
        E2C[Admin B tries to save] --> E2D{Version match?}
        E2D -->|No| E2E[409 Conflict - Refresh required]
        E2D -->|Yes| E2F[Save succeeds]
    end
    
    subgraph EC3["Unlock Pool with Unsaved Changes"]
        E3A[Admin has unsaved local changes] --> E3B[Clicks: Unlock Pool menu]
        E3B --> E3C["Unlock returns to Draft state<br/>All team assignments cleared<br/>Pool players preserved"]
    end
    
    subgraph EC4["Re-Balance Clears Unsaved"]
        E4A[Admin has unsaved local changes] --> E4B[Clicks: Re-Balance]
        E4B --> E4C["New balance applied<br/>Previous local changes overwritten<br/>New state becomes 'unsaved'"]
    end
```

---

## 7. RSVP Integration (Future)

```mermaid
flowchart TD
    subgraph RSVP["RSVP Flow"]
        R1[Admin creates match with RSVP] --> R2[Invitations sent to players]
        R2 --> R3[Players RSVP: Yes/No/Maybe]
        R3 --> R4{Pool complete?}
        R4 -->|No| R5[Wait for more RSVPs]
        R5 --> R3
        R4 -->|Yes| R6[Auto-balance triggered]
        R6 --> R7[Auto-save teams]
        R7 --> R8["teams_saved_at = NOW()<br/>Notify all players of teams"]
        R8 --> R9[Admin can still modify]
        R9 --> R10{Changes made?}
        R10 -->|Yes| R11[Save to update & re-notify affected]
        R10 -->|No| R12[Wait for match]
    end
    
    subgraph RSVPChange["RSVP Changes After Teams Set"]
        RC1[Player withdraws RSVP] --> RC2[Admin notified]
        RC2 --> RC3{Find replacement?}
        RC3 -->|Yes| RC4[Add to pool via Unlock]
        RC3 -->|No| RC5[Re-balance with fewer players]
        RC4 --> RC6[Re-lock & Re-balance]
        RC5 --> RC6
        RC6 --> RC7[Save & notify affected players]
    end
```

---

## 8. Stepper Visualization

```mermaid
flowchart LR
    subgraph Step1["① Pool"]
        S1[Select Players]
    end
    
    subgraph Step2["② Teams"]
        S2[Set Teams]
    end
    
    subgraph Step3["③ Done"]
        S3[Enter Result]
    end
    
    Step1 -->|Lock & Balance| Step2
    Step2 -->|Enter Result / Save Result| Step3
    
    style Step1 fill:#f5f5f5,stroke:#9ca3af
    style Step2 fill:#f5f5f5,stroke:#9ca3af
    style Step3 fill:#f5f5f5,stroke:#9ca3af
```

**Step States by DB State:**
| DB State | Step 1 (Pool) | Step 2 (Teams) | Step 3 (Done) |
|----------|---------------|----------------|---------------|
| Draft | ⚫ Active (dark grey outline) | ○ Pending (light grey) | ○ Pending (light grey) |
| PoolLocked | ✓ Complete (light grey) | ⚫ Active (dark grey outline) | ○ Pending (light grey) |
| TeamsBalanced | ✓ Complete (light grey) | ✓ Complete (light grey) | ⚫ Active (dark grey outline) |
| Completed | ✓ Complete (light grey) | ✓ Complete (light grey) | ✓ Complete (light grey) |

**Styling Notes:**
- Neutral grey colours throughout (non-distracting)
- Active: Dark grey outline with dark grey number
- Completed: Light grey outline with grey checkmark
- Pending: Light grey outline with grey number
- No purple/pink gradient (reserve for CTAs)

---

## 9. Notification Matrix (Future)

| Event | Who Gets Notified | Message |
|-------|-------------------|---------|
| First Save | All players in match | "Teams for [date] are set! You're on [Team]" |
| Save after changes | Affected players only | "Your team has changed to [Team]" |
| Match reminder (24h) | All players | "Reminder: Match tomorrow at [time]. You're on [Team]" |
| Match completed | All players | "Match result: [Score]. [Winner] wins!" |
| RSVP invitation | Invited players | "You're invited to [date] match. RSVP now!" |
| RSVP deadline reminder | Non-responders | "RSVP deadline approaching for [date] match" |

---

## Summary

### Key Design Decisions

1. **4 DB States, 3 UI Steps**: 
   - DB: Draft → PoolLocked → TeamsBalanced → Completed
   - UI: Pool (1) → Teams (2) → Done (3)

2. **Explicit Save Model**: 
   - Lock & Balance creates team assignments in DB
   - `teams_saved_at = NULL` means players see "Teams being finalised..."
   - Admin clicks "Save Teams" to set `teams_saved_at = NOW()`
   - Players only see teams when `teams_saved_at` is set

3. **Working vs Saved**: 
   - Lock & Balance writes to DB (persisted on app close)
   - Drag/drop and Re-Balance update React state only (lost on app close)
   - "Save Teams" / "Save Changes" commits modifications to DB
   - "Discard" resets to last saved state

4. **Player Visibility**: Gated by `teams_saved_at` timestamp
   - NULL → "Teams being finalised..."
   - Set → Full team lists visible

5. **RSVP Compatibility**: 
   - Future: Auto-balance triggers auto-save (no manual action)
   - Notifications tied to save events

6. **Flexibility**: 
   - Admin can modify teams until match is completed
   - Clear save points with visual feedback (green flash)
   - No-show tracking with uneven team warnings

### Implementation Status ✅ COMPLETE

- [x] Add `teams_saved_at` column to `upcoming_matches`
- [x] Lock & Balance in single action with balance method modal
- [x] BalanceTeamsPane with local state tracking
- [x] Save Teams / Save Changes / Discard buttons
- [x] Green "✓ Saved!" flash feedback (1.5s)
- [x] Player view checks `teams_saved_at`
- [x] 3-step stepper with neutral grey styling
- [x] CompleteMatchForm with tap-to-toggle teams
- [x] No-show handling with uneven team warnings
- [x] Tornado charts for Ability/Performance only (not Random)


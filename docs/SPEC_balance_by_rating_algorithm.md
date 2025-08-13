# BerkoTNF - Balance by Rating Algorithm Specification

**Version:** 1.1  
**Date:** January 2025  
**Author:** System Documentation

---

## 1.0 Overview

This document provides a definitive, forensic-level specification for the **Balance by Rating** team balancing algorithm. Its purpose is to serve as the single source of truth for all current and future implementations, ensuring the logic is preserved perfectly.

The algorithm's primary goal is to create the most balanced teams possible, not just by overall team strength, but by ensuring that players are placed in the positions where they will be most effective and that the teams are structurally balanced at a positional level.

**IMPORTANT RESTRICTION (January 2025):** This algorithm is disabled for uneven teams (including 4v4 matches) to preserve the existing algorithm integrity. For uneven team configurations, use the Performance or Random balancing methods instead.

## 2.0 Core Principles

1.  **Data Authority:** The server is the single source of truth. The algorithm must only use data fetched directly from the database during its execution.
2.  **Dynamic & Agnostic:** The logic must be completely agnostic to team size and player attributes. All calculations must be based on the `team_size` and positional templates (`team_size_templates`) defined in the database for the specific match being balanced.
3.  **Positional Integrity:** A player's suitability for a position is paramount. The algorithm must ensure players are sorted into positional draft pools and assigned to slots corresponding to those positions.

---

## 3.0 Algorithm Phases

The balancing process is executed in five distinct phases.

### **Phase 1: Authoritative Data Gathering**

This phase collects all necessary data from the database. It is critical that this happens at the moment of execution to avoid using stale data.

1.  **Fetch Match Details:** Using the `matchId`, retrieve the specific `upcoming_matches` record to get the official `team_size`.
2.  **Fetch Confirmed Player Pool:** Query the `upcoming_match_players` table to get the definitive list of `player_id`s for the given `matchId`. This is the authoritative list of players for the match.
3.  **Fetch Player Attributes:** Using the list of `player_id`s from the previous step, fetch the full records for each player from the `players` table to get their attributes (e.g., `goalscoring`, `defender`, `teamwork`).
4.  **Fetch Balancing Weights:** Retrieve the complete set of attribute weights from the `team_balance_weights` table. These are the user-configured percentages that define the importance of each attribute for each position.
5.  **Fetch Positional Template:** Query the `team_size_templates` table to get the specific template for the match's `team_size`. This defines the number of defenders, midfielders, and attackers per team.

### **Phase 2: Player Suitability Scoring**

In this phase, the algorithm determines how good each player is at *every* position, creating a holistic view of their abilities.

1.  Iterate through every player in the confirmed pool.
2.  For each player, calculate three distinct, weighted suitability scores:
    *   **Defender Score:** Calculated by applying the "defense" weights from the database to the player's attributes.
    *   **Midfielder Score:** Calculated using the "midfield" weights.
    *   **Attacker Score:** Calculated using the "attack" weights.
3.  The result is an enriched list of player objects, each now containing their original stats plus these three new suitability scores.

### **Phase 3: Positional Draft Pool Assembly**

This is the crucial sorting phase that guarantees positional integrity. It creates three distinct, non-overlapping pools of players based on their raw attribute values.

1.  **Select the Defender Pool:**
    *   Take the full list of all 18 players.
    *   Sort this list from highest to lowest based *only* on their raw **defender** attribute value from the players table.
    *   Select the top `X` players, where `X` is the total number of defensive slots for both teams combined (e.g., `defenders_per_team * 2`). This group becomes the **Defender Pool**.

2.  **Select the Attacker Pool:**
    *   Take the *remaining* players who were *not* selected for the Defender Pool.
    *   Sort this new, smaller list from highest to lowest based *only* on their raw **goalscoring** attribute value from the players table.
    *   Select the top `Y` players, where `Y` is the total number of attacking slots. This group becomes the **Attacker Pool**.

3.  **Select the Midfielder Pool:**
    *   The players who remain after the Defender and Attacker pools have been filled automatically constitute the **Midfielder Pool**. They are not subjected to a final sort.

This sequential, prioritized selection process ensures the best defenders (by raw defender attribute) are assigned to defense, the best attackers (by raw goalscoring attribute) to attack, and the rest to midfield.

### **Phase 4: Brute-Force Combination Search**

This is the core computational phase where the algorithm finds the single most balanced team possible using the configured weighted calculations.

1.  Using a `combinations` helper function, the algorithm generates every possible unique grouping of players for **Team A**, drawing the correct number of players for each position *exclusively from the corresponding positional draft pool*.
2.  For each generated combination of Team A, the remaining players from the draft pools automatically form Team B.
3.  The algorithm then calls the `calculateBalanceScore` function for this `(Team A, Team B)` pair.
4.  **`calculateBalanceScore` Function:**
    *   This function does **not** use simple team-wide averages.
    *   It first separates Team A and Team B into their respective positional units (defenders, midfielders, attackers) based on their assigned slots.
    *   It then calculates the weighted average for **each positional unit separately** using the configured weights from the `team_balance_weights` table. For example, for defenders it might calculate: `(stamina_pace * 0.40) + (control * 0.40) + (goalscoring * 0.00) + (resilience * 0.10) + (teamwork * 0.10)`.
    *   It then compares the weighted stats of Team A's defenders to Team B's defenders, Team A's midfielders to Team B's midfielders, and so on.
    *   These differences are summed to produce a single, precise balance score. A lower score is better.
5.  This score is compared to the best score found so far. If the new score is better, the current team combination is stored as the new "best."
6.  This process repeats until every possible combination has been evaluated, guaranteeing a mathematically optimal result.

### **Phase 5: Atomically Saving the Final Team**

Once the single best team combination has been identified, it must be saved to the database in a safe, atomic transaction.

1.  The algorithm initiates a `prisma.$transaction`.
2.  **Step 1: Delete Old Assignments:** It first issues a `deleteMany` command to completely remove all existing records from `upcoming_match_players` for the given `matchId`. This ensures a clean state.
3.  **Step 2: Create New Assignments:** It then issues a `createMany` command to insert the new, balanced team assignments from the `bestSlots` array found in Phase 4. Each record must include the `player_id`, `team` ('A' or 'B'), and the correct, positionally-aware `slot_number`.
4.  **Step 3: Update Match State:** Finally, it updates the master `upcoming_matches` record to set the `is_balanced` flag to `true`.

This transactional approach guarantees that the team update succeeds completely or fails completely, preventing any partial or corrupt data from being saved.

---

_End of Specification._ 
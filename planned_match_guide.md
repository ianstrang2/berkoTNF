# Team Balancing Algorithm Documentation

This document provides a comprehensive explanation of the team balancing algorithm in PlayerPath, detailing the exact process for player position assignment, team distribution, and team balancing.

## Player Attributes

Each player has six core attributes rated from 1-5:

- `defender`: Rating for defensive skills and positioning
- `goalscoring`: Rating for attacking ability and finishing
- `stamina_pace`: Rating for physical attributes (speed, endurance)
- `control`: Rating for technical ball control and passing
- `teamwork`: Rating for cooperation and tactical awareness
- `resilience`: Rating for mental strength and adaptability

## Slot System

The slot system provides a consistent mapping of players to positions:

- Each player is assigned a specific slot number based on their team and position
- Slots 1 to team_size (e.g., 1-9 for 9v9) belong to Team A
- Slots (team_size+1) to (team_size*2) (e.g., 10-18 for 9v9) belong to Team B
- Slots within each team are grouped by position (defenders, midfielders, attackers)

### Slot Assignment Map (Example for 9v9)

- **Team A**:
  - Defenders: slots 1-3
  - Midfielders: slots 4-7
  - Attackers: slots 8-9

- **Team B**:
  - Defenders: slots 10-12
  - Midfielders: slots 13-16
  - Attackers: slots 17-18

## Algorithm Overview

The algorithm consists of two distinct phases:
1. **Position Assignment Phase**: Allocates players to position groups based on raw attributes
2. **Team Balancing Phase**: Optimizes team balance while maintaining players' assigned positions

## Phase 1: Position Assignment

Players are assigned to positions following this strict order:

1. **Defenders First**
2. **Attackers Second**
3. **Midfielders Last (Remaining Players)**

### Defender Selection Process

1. **Selection Criteria**:
   - Sort ALL players by their **raw** `defender` attribute value (highest to lowest)
   - In case of ties (players with exactly equal defender values):
     - First tiebreaker: `control` value
     - Second tiebreaker: `stamina_pace` value
     - Third tiebreaker: random selection if still tied

2. **Selection Count**:
   - Select exactly N players, where N equals the total number of defender positions needed
   - For example, with 3 defenders per team in 9v9 format, select top 6 players

3. **Team Distribution**:
   - Distribute selected defenders alternately between teams using a "draft pick" approach
   - Team A receives players ranked #1, #3, #5, etc.
   - Team B receives players ranked #2, #4, #6, etc.

4. **Slot Assignment**:
   - Team A defenders are assigned slots 1 through X (where X is the number of defenders per team)
   - Team B defenders are assigned slots (team_size+1) through (team_size+X)
   - For 9v9 format (team_size=9): Team A gets slots 1-3, Team B gets slots 10-12

### Attacker Selection Process

1. **Selection Criteria**:
   - From REMAINING players (excluding those already assigned as defenders), sort by raw `goalscoring` attribute (highest to lowest)
   - In case of ties (players with exactly equal goalscoring values):
     - First tiebreaker: `stamina_pace` value
     - Second tiebreaker: `control` value
     - Third tiebreaker: random selection if still tied

2. **Selection Count**:
   - Select exactly M players, where M equals the total number of attacker positions needed
   - For example, with 2 attackers per team in 9v9 format, select top 4 players

3. **Team Distribution**:
   - Distribute selected attackers alternately between teams using a "draft pick" approach
   - Team A receives players ranked #1, #3, etc.
   - Team B receives players ranked #2, #4, etc.

4. **Slot Assignment**:
   - Team A attackers are assigned to the highest slot numbers in Team A range
   - Team B attackers are assigned to the highest slot numbers in Team B range
   - For 9v9 format: Team A gets slots 8-9, Team B gets slots 17-18

### Midfielder Assignment Process

1. **Selection Criteria**:
   - All REMAINING players (after defender and attacker assignment) are automatically assigned as midfielders
   - These players are sorted by raw `control` attribute (highest to lowest)
   - In case of ties (players with exactly equal control values):
     - First tiebreaker: `stamina_pace` value
     - Second tiebreaker: `teamwork` value
     - Third tiebreaker: random selection if still tied

2. **Team Distribution**:
   - Distribute midfielders alternately between teams using a "draft pick" approach
   - Team A receives players ranked #1, #3, #5, etc.
   - Team B receives players ranked #2, #4, #6, etc.

3. **Slot Assignment**:
   - Team A midfielders are assigned slots between defenders and attackers (in Team A range)
   - Team B midfielders are assigned slots between defenders and attackers (in Team B range)
   - For 9v9 format: Team A gets slots 4-7, Team B gets slots 13-16

## Phase 2: Team Balancing

After the initial position assignment, the algorithm optimizes team balance through player swaps within position groups.

### Balance Score Composition

The total balance score is a weighted sum of five key components:

1. **Defense Position Group Difference** (≈26.7% of total score by default)
   - The absolute difference between Team A and Team B's defensive capabilities
   - Based on the weighted attributes of players in defender positions

2. **Midfield Position Group Difference** (≈26.7% of total score by default)
   - The absolute difference between Team A and Team B's midfield capabilities
   - Based on the weighted attributes of players in midfielder positions

3. **Attack Position Group Difference** (≈26.7% of total score by default)
   - The absolute difference between Team A and Team B's attacking capabilities
   - Based on the weighted attributes of players in attacker positions

4. **Resilience Difference** (10% of total score by default)
   - The absolute difference between Team A and Team B's average resilience rating
   - Considers all players on each team, not just specific positions

5. **Teamwork Difference** (10% of total score by default)
   - The absolute difference between Team A and Team B's average teamwork rating
   - Considers all players on each team, not just specific positions

### Balance Score Calculation

1. **Position Group Scores**:
   Each position group (defense, midfield, attack) is evaluated using a weighted combination of attributes as configured in the admin section:

   - **Defense Evaluation**:
     - Defenders' `stamina_pace` attribute × admin-configured weight (recommended: 0.34)
     - Defenders' `control` attribute × admin-configured weight (recommended: 0.33)
     - Defenders' `goalscoring` attribute × admin-configured weight (recommended: 0.33)
     - Note: The `defender` attribute is used ONLY for initial position assignment, not for team balancing

   - **Midfield Evaluation**:
     - Midfielders' `control` attribute × admin-configured weight (default: 0.33)
     - Midfielders' `stamina_pace` attribute × admin-configured weight (default: 0.33)
     - Midfielders' `goalscoring` attribute × admin-configured weight (default: 0.34)
     - Note: `teamwork` is a team-wide metric, not used for position-specific midfield evaluation

   - **Attack Evaluation**:
     - Attackers' `goalscoring` attribute × admin-configured weight (default: 0.5)
     - Attackers' `stamina_pace` attribute × admin-configured weight (default: 0.25)
     - Attackers' `control` attribute × admin-configured weight (default: 0.25)

2. **Team-Wide Factors**:
   - Team average `resilience` × admin-configured weight (default: 0.1)
   - Team average `teamwork` × admin-configured weight (default: 0.1)

3. **Calculation Method**:
   - For each position group, calculate the weighted average for Team A and Team B
   - Calculate the absolute difference between Team A and Team B for each position group
   - Weight these differences based on admin-configured importance
   - Calculate weighted absolute differences for resilience and teamwork
   - Sum all weighted differences to produce a single "balance score"
   - A lower score indicates better-balanced teams

### Importance of Teamwork and Resilience

Teamwork and resilience play a critical role in the team balancing algorithm:

1. **Teamwork Factor (10% by default)**:
   - Represents how well players collaborate with teammates
   - A high teamwork value indicates players who make those around them better
   - Balanced teamwork ensures neither team has a significant advantage in on-field coordination
   - Adjusted through the admin interface with the `team.teamwork` weight setting
   - Increasing this weight will prioritize more evenly balanced teamwork between teams

2. **Resilience Factor (10% by default)**:
   - Represents mental fortitude and ability to perform under pressure
   - A high resilience value indicates players who maintain performance when losing or in difficult situations
   - Balanced resilience ensures neither team is significantly more mentally strong than the other
   - Adjusted through the admin interface with the `team.resilience` weight setting
   - Increasing this weight will prioritize more evenly balanced mental strength between teams

3. **Impact on Final Team Composition**:
   - With default weights (10% each), teamwork and resilience have a noticeable but not dominant effect
   - Increasing these weights (e.g., to 0.2 each) would give them 40% of the total influence on team balancing
   - This would make the algorithm prioritize balanced team-wide characteristics more than position-specific balancing
   - Coaches can adjust these values based on the importance they place on these mental/social factors versus technical skill

### Balancing Process

1. **Multiple Iterations**:
   - The algorithm makes up to 8,400 attempts to find the optimal balance
   - Each attempt starts with the initial position assignments (defenders, attackers, midfielders)
   - Player distribution between teams is varied to find the minimum balance score

2. **Swap Rules**:
   - Only players within the same position group can be swapped between teams
   - Defenders can only be swapped with defenders
   - Midfielders can only be swapped with midfielders
   - Attackers can only be swapped with attackers

3. **Termination Conditions**:
   - The algorithm stops when it reaches 8,400 iterations
   - Early termination if it finds a very good balance score (< 0.05)
   - The configuration with the lowest balance score is selected

4. **Result Application**:
   - The player-to-slot assignments from the best iteration are saved to the database
   - The match is marked as "balanced" once the optimal distribution is found

## Example Walkthrough (9v9 Format)

### Step 1: Initial Team Setup
- Template defines: 3 defenders, 4 midfielders, 2 attackers per team
- Total slots: 18 (slots 1-9 for Team A, slots 10-18 for Team B)

### Step 2: Position Assignment Phase

1. **Defender Assignment**:
   - Sort all available players by their raw defender attribute
   - Select the top 6 players (for the 6 defender positions)
   - Assign to teams: #1, #3, #5 to Team A (slots 1-3), #2, #4, #6 to Team B (slots 10-12)

2. **Attacker Assignment**:
   - From remaining players, sort by raw goalscoring attribute
   - Select the top 4 players (for the 4 attacker positions)
   - Assign to teams: #1, #3 to Team A (slots 8-9), #2, #4 to Team B (slots 17-18)

3. **Midfielder Assignment**:
   - All remaining players become midfielders
   - Sort these players by raw control attribute
   - Assign to teams: #1, #3, #5, #7 to Team A (slots 4-7), #2, #4, #6, #8 to Team B (slots 13-16)

### Step 3: Team Balancing Phase

1. **Initial Balance Calculation**:
   - Calculate team scores based on weighted attributes:
     - Team A Defense Score = weighted average of Team A defenders' attributes
     - Team B Defense Score = weighted average of Team B defenders' attributes
     - Similarly for midfield and attack scores
     - Calculate team-wide resilience and teamwork averages
   - Determine initial balance score (sum of weighted differences)

2. **Iterative Optimization**:
   - Try up to 8,400 different distributions of players between teams
   - For each iteration:
     - Keep players in their assigned positions (defenders stay as defenders, etc.)
     - Vary which specific players are on Team A vs. Team B
     - Calculate new balance score
     - Keep track of the best (lowest) score and its player distribution

3. **Final Assignment**:
   - Apply the player distribution with the lowest balance score
   - Update database with final player-to-slot assignments
   - Mark match as balanced

## Implementation Details

- Algorithm implementation: `src/app/api/admin/balance-planned-match/route.ts`
- Weights configuration: Admin section under "Balance Algorithm Setup"
- Default weights: Stored in `team_balance_weights` table in database
- Fallback mechanism: Basic balancing exists in the frontend as a contingency

## Troubleshooting

If player positions or team balance appear incorrect:

1. **Position Assignment Issues**:
   - Verify player attributes in database are correct
   - Check if position counts in team template match expected values
   - Ensure defenders are being selected based on raw defender attribute
   - Ensure attackers are being selected based on raw goalscoring attribute

2. **Team Balance Issues**:
   - Check balance algorithm weights in admin section
   - Verify weights are properly being applied during balance calculation
   - Ensure swap logic only exchanges players within same position groups

3. **Slot Assignment Issues**:
   - Verify slot calculations match the documented mapping
   - Confirm slot_number values are correctly assigned in the database
   - Check for duplicate slot assignments

4. **Diagnostic Logs**:
   - For debugging, check these console log patterns:
     - `Using position distribution: X defenders, Y midfielders, Z attackers per team`
     - `Selected top N defenders/attackers/midfielders`
     - `Balance attempt X/Y (best score: Z)`
     - `Best balance score: X with Y players assigned` 
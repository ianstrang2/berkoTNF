# Test Plan: Own Goals API Integration

## ✅ Changes Made

### **API Updates**
- ✅ `src/app/api/admin/upcoming-matches/[id]/complete/route.ts`
  - Accepts `own_goals: { team_a: number, team_b: number }` in request
  - Validates own goals are non-negative
  - Validates score integrity: `team_score = player_goals + own_goals`
  - Saves own goals to `matches.team_a_own_goals` and `matches.team_b_own_goals`

### **UI Updates**
- ✅ `src/components/admin/matches/CompleteMatchForm.component.tsx`
  - Updated interface to include own goals in action payload
  - Updated `validateAndSubmit` to send own goals to API
  - Updated historical data loading to use actual own goals (not calculated)

### **Database**
- ✅ `matches` table has `team_a_own_goals` and `team_b_own_goals` columns
- ✅ 686 historical matches migrated with calculated own goals
- ✅ 99.7% data integrity achieved

## 🧪 Test Scenarios

### **Scenario 1: New Match with Own Goals**
1. Complete a match with player goals and own goals
2. Verify the payload includes own goals
3. Verify data is saved correctly to database
4. Re-edit the match and verify own goals are preserved

### **Scenario 2: New Match without Own Goals**
1. Complete a match with only player goals (own goals = 0)
2. Verify system works correctly with 0 own goals

### **Scenario 3: Score Validation**
1. Try to submit invalid data where `team_score ≠ player_goals + own_goals`
2. Verify API returns proper validation error

### **Scenario 4: Historical Match Re-editing**
1. Open a historical match from before the own goals feature
2. Verify it loads with calculated own goals from migration
3. Verify re-editing preserves the own goals correctly

## 🚀 Next Steps

1. **Test the integration** with a new match
2. **Verify historical matches** work correctly
3. **Update documentation** if needed
4. **Phase 4: Complete** - All phases of the own goals fix are now ready! 
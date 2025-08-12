// Team formation template derivation for uneven teams
// Based on the uneven teams plan specifications

type Formation = { def: number; mid: number; att: number };

interface TeamSizeTemplate {
  team_size: number;
  defenders: number;
  midfielders: number;
  attackers: number;
}

export function deriveTemplate(teamSize: number, isSimplifiedMatch?: boolean): Formation {
  // Explicit 4v4 handling - all midfielders only for simplified 4v4 matches
  if (teamSize === 4 && isSimplifiedMatch) return { def: 0, mid: 4, att: 0 };
  
  // Get nearest base template (from database or hardcoded)
  const baseTemplate = getNearestTemplate(teamSize);
  const total = baseTemplate.def + baseTemplate.mid + baseTemplate.att;
  
  if (total === teamSize) return baseTemplate;

  const weights = [
    { k: 'def', v: baseTemplate.def },
    { k: 'mid', v: baseTemplate.mid },
    { k: 'att', v: baseTemplate.att },
  ].sort((a, b) => b.v - a.v); // largest first

  let result: Formation = { ...baseTemplate };
  
  // Scale up: add to largest positions first (favoring MID, then DEF)
  while ((result.def + result.mid + result.att) < teamSize) {
    const pick = weights[0].k === 'mid' ? 'mid' : weights[0].k;
    result[pick as keyof Formation]++;
    // Re-sort based on current result values (not stale v)
    weights.sort((a, b) => (result[b.k as keyof Formation] - result[a.k as keyof Formation]));
  }
  
  // Scale down: remove from smallest positions (favoring ATT first)
  while ((result.def + result.mid + result.att) > teamSize) {
    const order = ['att', 'def', 'mid'];
    for (const k of order) {
      if (result[k as keyof Formation] > 1) { 
        result[k as keyof Formation]--; 
        break; 
      }
    }
  }
  
  return result;
}

function getNearestTemplate(teamSize: number): Formation {
  // Enhanced base templates with proper bounds
  if (teamSize <= 6) return { def: 2, mid: teamSize - 3, att: 1 };
  if (teamSize <= 8) return { def: 2, mid: teamSize - 4, att: 2 };
  if (teamSize === 9) return { def: 3, mid: 4, att: 2 };
  if (teamSize === 10) return { def: 4, mid: 3, att: 3 }; // 4-3-3 style
  if (teamSize >= 11) return { def: 4, mid: 4, att: 3 }; // 4-4-3 style (explicitly capped at 11)
  return { def: 3, mid: 3, att: 2 }; // fallback
}

// Convert Formation to TeamTemplate format for BalanceTeamsPane
export function formationToTemplate(formation: Formation): TeamSizeTemplate {
  return {
    team_size: formation.def + formation.mid + formation.att,
    defenders: formation.def,
    midfielders: formation.mid,
    attackers: formation.att
  };
}
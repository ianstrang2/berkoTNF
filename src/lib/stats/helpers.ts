import { Prisma } from '@prisma/client';
import { AppConfig } from '../config'; // Assuming AppConfig is the standard config type

// --- Interfaces (Potentially shared) ---

// Interface for the structure used in ranking calculations
export interface AllTimePlayerStats {
    player_id: number;
    games_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals: number;
    win_percentage: Prisma.Decimal;
    minutes_per_goal: Prisma.Decimal | null;
    heavy_wins: number;
    heavy_win_percentage: Prisma.Decimal;
    heavy_losses: number;
    heavy_loss_percentage: Prisma.Decimal;
    clean_sheets: number;
    clean_sheet_percentage: Prisma.Decimal;
    fantasy_points: number;
    points_per_game: Prisma.Decimal;
}

// Generic interface for a ranked entry (e.g., for Hall of Fame)
export interface RankedEntry {
    player_id: number;
    value: Prisma.Decimal | number; // Allow number for easier sorting before Decimal conversion
    rank: number;
}

// --- Fantasy Point Calculation ---

// Extracted fantasy point calculation logic
export function calculateFantasyPointsForMatch(
    pm: { result: string | null; heavy_win: boolean | null; team: string | null; clean_sheet: boolean | null; heavy_loss: boolean | null; },
    config: AppConfig
): number {
    // Default values will be handled by config fetching logic later
    const win_points = (config.fantasy_win_points ?? 20) as number;
    const draw_points = (config.fantasy_draw_points ?? 10) as number;
    const loss_points = (config.fantasy_loss_points ?? -10) as number;
    const heavy_win_points = (config.fantasy_heavy_win_points ?? 30) as number;
    const clean_sheet_win_points = (config.fantasy_clean_sheet_win_points ?? 30) as number;
    const heavy_clean_sheet_win_points = (config.fantasy_heavy_clean_sheet_win_points ?? 40) as number;
    const clean_sheet_draw_points = (config.fantasy_clean_sheet_draw_points ?? 20) as number;
    const heavy_loss_points = (config.fantasy_heavy_loss_points ?? -20) as number;

    const isWin = pm.result === 'win';
    const isDraw = pm.result === 'draw';
    const isLoss = pm.result === 'loss';
    const isHeavyWin = pm.heavy_win ?? false;
    const isCleanSheet = pm.clean_sheet ?? false;
    const isHeavyLoss = pm.heavy_loss ?? false;

    if (isWin && isHeavyWin && isCleanSheet) return heavy_clean_sheet_win_points;
    if (isWin && isHeavyWin) return heavy_win_points;
    if (isWin && isCleanSheet) return clean_sheet_win_points;
    if (isWin) return win_points;
    if (isDraw && isCleanSheet) return clean_sheet_draw_points;
    if (isDraw) return draw_points;
    if (isLoss && isHeavyLoss) return heavy_loss_points;
    if (isLoss) return loss_points;
    return 0;
}


// --- Ranking Logic ---

/**
 * Ranks players based on a specific metric, applying eligibility criteria.
 * NOTE: This will be updated in Step 2/4 to use config values.
 */
export function getTopRanked(
    stats: AllTimePlayerStats[],
    metric: keyof AllTimePlayerStats,
    config: AppConfig, // Pass config for limits/thresholds
): RankedEntry[] {

    // Step 2/4: Get values from config with fallbacks and warnings
    let minGamesForEligibility = 50; // Default
    if (typeof config.games_required_for_hof === 'number') {
        minGamesForEligibility = config.games_required_for_hof;
    } else if (config.games_required_for_hof !== undefined) {
        console.warn(`Invalid config.games_required_for_hof (${config.games_required_for_hof}), using default ${minGamesForEligibility}.`);
    } else {
        console.warn(`Missing config.games_required_for_hof, using default ${minGamesForEligibility}.`);
    }

    let rankingLimit = 10; // Default
    if (typeof config.hall_of_fame_limit === 'number') {
        rankingLimit = config.hall_of_fame_limit;
    } else if (config.hall_of_fame_limit !== undefined) {
        console.warn(`Invalid config.hall_of_fame_limit (${config.hall_of_fame_limit}), using default ${rankingLimit}.`);
    } else {
        console.warn(`Missing config.hall_of_fame_limit, using default ${rankingLimit}.`);
    }

    // Step 4: Apply minimum games filter *before* sorting/ranking for ALL categories
    const eligibleStats = stats.filter(s => s.games_played >= minGamesForEligibility);

    eligibleStats.sort((a, b) => {
         const valA = a[metric];
         const valB = b[metric];

         // Handle nulls (e.g., minutes_per_goal) - sort nulls last
         if (valA === null && valB !== null) return 1;
         if (valA !== null && valB === null) return -1;
         if (valA === null && valB === null) return 0;

         // Handle Prisma.Decimal comparison
         if (valA instanceof Prisma.Decimal && valB instanceof Prisma.Decimal) {
             return valB.comparedTo(valA); // descending
         }
         // Handle number comparison (should cover most cases after null check)
         if (typeof valA === 'number' && typeof valB === 'number') {
             return valB - valA; // descending
         }

         console.warn(`Unexpected types for sorting metric '${String(metric)}':`, valA, valB);
         return 0; // Fallback if types are unexpected
     });

    const ranked: RankedEntry[] = [];
    let rank = 1;
    let countAtRank = 0; // How many players share the current rank

    for (let i = 0; i < eligibleStats.length; i++) {
         const currentStat = eligibleStats[i];
         const currentValue = currentStat[metric];

         if (currentValue === null) continue; // Skip null values

         // Determine rank based on the previous entry
         if (i > 0) {
             const prevValue = eligibleStats[i - 1][metric];
             let areTied = false;
             if (currentValue instanceof Prisma.Decimal && prevValue instanceof Prisma.Decimal) {
                 areTied = currentValue.comparedTo(prevValue) === 0;
             } else {
                 areTied = currentValue === prevValue;
             }

             if (!areTied) {
                 // If not tied with the previous, the new rank is the previous rank + count of players at that previous rank
                 rank = rank + countAtRank;
                 countAtRank = 1; // Reset count for the new rank
             } else {
                 countAtRank++; // Increment count for the current rank
             }
         } else {
             // First player is always rank 1
             rank = 1;
             countAtRank = 1;
         }

         // Add to results if rank is within the limit
         if (rank <= rankingLimit) {
             // Ensure value is Prisma.Decimal or number as appropriate for the interface
             const valueToStore: Prisma.Decimal | number = currentValue instanceof Prisma.Decimal
                 ? currentValue
                 : typeof currentValue === 'number'
                     ? currentValue
                     // Safely convert to string or default to '0' before Prisma.Decimal
                     : new Prisma.Decimal((currentValue as any)?.toString?.() ?? '0');

             ranked.push({
                 player_id: currentStat.player_id,
                 value: valueToStore,
                 rank
             });
         } else {
             // Optimization: If the current rank exceeds the limit, no subsequent player can be included
             break;
         }
    }
    return ranked;
} 
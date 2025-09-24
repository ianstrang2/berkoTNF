-- sql/export_individual_player_for_profile.sql
-- Smart export function: League context + individual player data only
-- Optimized for single-player profile generation with comparative insights

CREATE OR REPLACE FUNCTION export_individual_player_for_profile(
    target_player_id INT,
    recent_days_threshold INT DEFAULT 7,
    target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
    player_last_match_date DATE;
BEGIN
    -- Get player's last match date for action logic (tenant-scoped)
    SELECT MAX(m.match_date) INTO player_last_match_date
    FROM player_matches pm 
    JOIN matches m ON pm.match_id = m.match_id 
    WHERE pm.player_id = target_player_id AND pm.tenant_id = target_tenant_id AND m.tenant_id = target_tenant_id;

    SELECT jsonb_build_object(
        'league_context', jsonb_build_object(
            'total_games', (SELECT COUNT(*) FROM matches WHERE tenant_id = target_tenant_id),
            'total_players', (SELECT COUNT(*) FROM players WHERE is_ringer = FALSE AND tenant_id = target_tenant_id),
            'total_seasons', (
                SELECT COUNT(DISTINCT EXTRACT(YEAR FROM match_date)) 
                FROM matches 
                WHERE match_date IS NOT NULL AND tenant_id = target_tenant_id
            ),
            'date_range', jsonb_build_object(
                'start_date', (SELECT MIN(match_date) FROM matches WHERE tenant_id = target_tenant_id),
                'end_date', (SELECT MAX(match_date) FROM matches WHERE tenant_id = target_tenant_id)
            ),
            'league_age_years', (SELECT EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) FROM matches WHERE tenant_id = target_tenant_id),
            'max_games_played', (SELECT MAX(games_played) FROM aggregated_player_profile_stats WHERE tenant_id = target_tenant_id),
            'avg_games_per_year', (
                SELECT CASE WHEN EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) > 0 
                THEN (SELECT COUNT(*) FROM matches WHERE tenant_id = target_tenant_id) / EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date)))
                ELSE (SELECT COUNT(*) FROM matches WHERE tenant_id = target_tenant_id) END FROM matches WHERE tenant_id = target_tenant_id
            ),
            'league_records', (SELECT to_jsonb(ar.*) FROM aggregated_records ar WHERE tenant_id = target_tenant_id LIMIT 1),
            'season_honours', (SELECT jsonb_agg(to_jsonb(ash.*)) FROM aggregated_season_honours ash LIMIT 10)
        ),
        'target_player', (
            SELECT jsonb_build_object(
                'basic_info', jsonb_build_object(
                    'player_id', p.player_id,
                    'name', p.name,
                    'is_retired', p.is_retired,
                    'is_ringer', p.is_ringer,
                    'join_date', p.join_date,
                    'selected_club', p.selected_club,
                    'last_match_date', player_last_match_date,
                    'action_type', CASE 
                        WHEN NOT p.is_retired AND p.profile_text IS NULL THEN 'generate_new'
                        WHEN NOT p.is_retired AND p.profile_text IS NOT NULL 
                             AND player_last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_existing'
                        WHEN p.is_retired AND p.profile_text IS NULL THEN 'generate_retro'
                        WHEN p.is_retired AND p.profile_text IS NOT NULL 
                             AND player_last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_retro'
                        ELSE 'ignore'
                    END
                ),
                'profile_stats', to_jsonb(pps.*),
                'all_time_stats', to_jsonb(ats.*),
                'half_season_stats', to_jsonb(ahs.*),
                'season_stats', (
                    SELECT jsonb_agg(to_jsonb(ass.*))
                    FROM (
                        SELECT ass.*
                        FROM aggregated_season_stats ass
                        WHERE ass.player_id = p.player_id
                        ORDER BY ass.season_start_date DESC
                        LIMIT 10  -- More seasons for individual analysis
                    ) ass
                ),
                'hall_of_fame_entries', (
                    SELECT jsonb_agg(to_jsonb(hof.*))
                    FROM aggregated_hall_of_fame hof
                    WHERE hof.player_id = p.player_id
                ),
                'match_streaks', to_jsonb(ams.*),
                'performance_ratings', to_jsonb(apr.*),
                'power_ratings', to_jsonb(appr.*),
                'recent_performance', to_jsonb(arp.*),
                'match_reports', (
                    SELECT jsonb_agg(to_jsonb(amr.*))
                    FROM (
                        SELECT amr.*
                        FROM aggregated_match_report amr
                        JOIN player_matches pm ON amr.match_id = pm.match_id
                        WHERE pm.player_id = p.player_id
                        ORDER BY amr.match_date DESC
                        LIMIT 5
                    ) amr
                ),
                'personal_bests', (
                    SELECT jsonb_agg(to_jsonb(apb.*))
                    FROM aggregated_personal_bests apb
                    JOIN player_matches pm ON apb.match_id = pm.match_id
                    WHERE pm.player_id = p.player_id
                    LIMIT 10  -- More context for individual analysis
                )
            )
            FROM players p
            LEFT JOIN aggregated_player_profile_stats pps ON p.player_id = pps.player_id AND pps.tenant_id = target_tenant_id
            LEFT JOIN aggregated_all_time_stats ats ON p.player_id = ats.player_id AND ats.tenant_id = target_tenant_id
            LEFT JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id AND ahs.tenant_id = target_tenant_id
            LEFT JOIN aggregated_match_streaks ams ON p.player_id = ams.player_id AND ams.tenant_id = target_tenant_id
            LEFT JOIN aggregated_performance_ratings apr ON p.player_id = apr.player_id AND apr.tenant_id = target_tenant_id
            LEFT JOIN aggregated_player_power_ratings appr ON p.player_id = appr.player_id AND appr.tenant_id = target_tenant_id
            LEFT JOIN aggregated_recent_performance arp ON p.player_id = arp.player_id AND arp.tenant_id = target_tenant_id
            WHERE p.player_id = target_player_id AND p.tenant_id = target_tenant_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;
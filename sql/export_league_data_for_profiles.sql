-- sql/export_league_data_for_profiles.sql
-- Enhanced data export function for LLM player profile generation
-- Features: bulk context, dynamic league inference, token optimization, pagination

CREATE OR REPLACE FUNCTION export_league_data_for_profiles(
    recent_days_threshold INT DEFAULT 7,
    p_offset INT DEFAULT 0,
    p_limit INT DEFAULT 50,
    p_league_id INT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'league_context', jsonb_build_object(
            'total_games', (SELECT COUNT(*) FROM matches),
            'total_players', (SELECT COUNT(*) FROM players WHERE is_ringer = FALSE),
            'total_seasons', (
                SELECT COUNT(DISTINCT EXTRACT(YEAR FROM match_date)) 
                FROM matches 
                WHERE match_date IS NOT NULL
            ),
            'date_range', jsonb_build_object(
                'start_date', (SELECT MIN(match_date) FROM matches),
                'end_date', (SELECT MAX(match_date) FROM matches)
            ),
            'league_age_years', (SELECT EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) FROM matches),
            'max_games_played', (SELECT MAX(games_played) FROM aggregated_player_profile_stats),
            'avg_games_per_year', (
                SELECT CASE WHEN EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date))) > 0 
                THEN (SELECT COUNT(*) FROM matches) / EXTRACT(YEAR FROM AGE(MAX(match_date), MIN(match_date)))
                ELSE (SELECT COUNT(*) FROM matches) END FROM matches
            ),
            'league_records', (SELECT to_jsonb(ar.*) FROM aggregated_records ar LIMIT 1),
            'season_honours', (SELECT jsonb_agg(to_jsonb(ash.*)) FROM aggregated_season_honours ash LIMIT 10)
        ),
        'all_players', (
            SELECT jsonb_object_agg(
                p.name,
                jsonb_build_object(
                    'basic_info', jsonb_build_object(
                        'player_id', p.player_id,
                        'name', p.name,
                        'is_retired', p.is_retired,
                        'is_ringer', p.is_ringer,
                        'join_date', p.join_date,
                        'selected_club', p.selected_club,
                        'last_match_date', (
                            SELECT MAX(m.match_date) 
                            FROM player_matches pm 
                            JOIN matches m ON pm.match_id = m.match_id 
                            WHERE pm.player_id = p.player_id
                        )
                    ),
                    'profile_stats', to_jsonb(pps.*),
                    'all_time_stats', to_jsonb(ats.*),
                    'half_season_stats', to_jsonb(ahs.*),
                    'season_stats', (
                        SELECT jsonb_agg(to_jsonb(ass.*))
                        FROM aggregated_season_stats ass
                        WHERE ass.player_id = p.player_id
                        LIMIT 5
                    ),
                    'hall_of_fame_entries', (
                        SELECT jsonb_agg(to_jsonb(hof.*))
                        FROM aggregated_hall_of_fame hof
                        WHERE hof.player_id = p.player_id
                        LIMIT 5
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
                        LIMIT 5
                    )
                )
            )
            FROM players p
            LEFT JOIN aggregated_player_profile_stats pps ON p.player_id = pps.player_id
            LEFT JOIN aggregated_all_time_stats ats ON p.player_id = ats.player_id
            LEFT JOIN aggregated_half_season_stats ahs ON p.player_id = ahs.player_id
            LEFT JOIN aggregated_match_streaks ams ON p.player_id = ams.player_id
            LEFT JOIN aggregated_performance_ratings apr ON p.player_id = apr.player_id
            LEFT JOIN aggregated_player_power_ratings appr ON p.player_id = appr.player_id
            LEFT JOIN aggregated_recent_performance arp ON p.player_id = arp.player_id
            WHERE p.is_ringer = FALSE
            AND pps.games_played >= 5
            OFFSET p_offset LIMIT p_limit
        ),
        'target_players', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', p.name,
                    'player_id', p.player_id,
                    'action_type', CASE 
                        WHEN NOT p.is_retired AND p.profile_text IS NULL THEN 'generate_new'
                        WHEN NOT p.is_retired AND p.profile_text IS NOT NULL 
                             AND player_last_match.last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_existing'
                        WHEN p.is_retired AND p.profile_text IS NULL THEN 'generate_retro'
                        WHEN p.is_retired AND p.profile_text IS NOT NULL 
                             AND player_last_match.last_match_date >= NOW() - INTERVAL '1 day' * recent_days_threshold THEN 'replace_retro'
                        ELSE 'ignore'
                    END,
                    'last_match_date', player_last_match.last_match_date,
                    'games_played', aps.games_played
                )
            )
            FROM players p
            LEFT JOIN aggregated_player_profile_stats aps ON p.player_id = aps.player_id
            LEFT JOIN (
                SELECT 
                    pm.player_id,
                    MAX(m.match_date) as last_match_date
                FROM player_matches pm
                JOIN matches m ON pm.match_id = m.match_id
                GROUP BY pm.player_id
            ) player_last_match ON p.player_id = player_last_match.player_id
            WHERE p.is_ringer = FALSE
            AND aps.games_played >= 5
            OFFSET p_offset LIMIT p_limit
        )
    ) INTO result;
    
    RETURN result;
END;
$$;
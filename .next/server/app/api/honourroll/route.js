(()=>{var e={};e.id=404,e.ids=[404],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},5490:(e,a,s)=>{"use strict";s.r(a),s.d(a,{patchFetch:()=>d,routeModule:()=>l,serverHooks:()=>i,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>R});var t={};s.r(t),s.d(t,{GET:()=>p});var r=s(2706),m=s(8203),n=s(5994),E=s(9187),o=s(5600);let _=e=>JSON.parse(JSON.stringify(e,(e,a)=>"bigint"==typeof a?Number(a):a));async function p(){try{console.log("Starting honour roll data fetch...");let e=await o.z.$queryRaw`
      WITH yearly_stats AS (
        SELECT 
          p.name,
          EXTRACT(YEAR FROM m.match_date) as year,
          SUM(CASE 
            WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 40
            WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
            WHEN pm.result = 'win' AND 
                ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
            THEN 30
            WHEN pm.result = 'win' THEN 20
            WHEN pm.result = 'draw' THEN 10
            WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
            WHEN pm.result = 'loss' THEN -10
            ELSE 0 END) as points,
          COUNT(*) as games_played
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false  -- Exclude ringers
        GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
        HAVING COUNT(*) >= 10
      )
      SELECT 
        year::integer,
        jsonb_build_object(
          'winner', (SELECT name FROM yearly_stats ys2 WHERE ys2.year = ys1.year ORDER BY points DESC LIMIT 1),
          'winner_points', (SELECT points FROM yearly_stats ys2 WHERE ys2.year = ys1.year ORDER BY points DESC LIMIT 1),
          'runners_up', (
            SELECT json_agg(json_build_object('name', name, 'points', points))
            FROM (
              SELECT name, points 
              FROM yearly_stats ys2 
              WHERE ys2.year = ys1.year 
              ORDER BY points DESC 
              OFFSET 1 LIMIT 2
            ) runners
          )
        ) as winners
      FROM yearly_stats ys1
      GROUP BY year
      ORDER BY year DESC`;console.log("seasonWinners data:",e);let a=await o.z.$queryRaw`
      WITH season_goals AS (
        SELECT 
          p.name,
          EXTRACT(YEAR FROM m.match_date) as year,
          SUM(pm.goals) as goals
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false  -- Exclude ringers
        GROUP BY p.name, EXTRACT(YEAR FROM m.match_date)
        HAVING SUM(pm.goals) > 0
      )
      SELECT 
        year::integer,
        jsonb_build_object(
          'winner', (SELECT name FROM season_goals sg2 WHERE sg2.year = sg1.year ORDER BY goals DESC LIMIT 1),
          'winner_goals', (SELECT goals FROM season_goals sg2 WHERE sg2.year = sg1.year ORDER BY goals DESC LIMIT 1),
          'runners_up', (
            SELECT json_agg(json_build_object('name', name, 'goals', goals))
            FROM (
              SELECT name, goals 
              FROM season_goals sg2 
              WHERE sg2.year = sg1.year 
              ORDER BY goals DESC 
              OFFSET 1 LIMIT 2
            ) runners
          )
        ) as scorers
      FROM season_goals sg1
      GROUP BY year
      ORDER BY year DESC`;console.log("topScorers data:",a);let s=await o.z.$queryRaw`
      WITH 
        game_goals AS (
          SELECT 
            p.name,
            m.match_date,
            pm.goals,
            m.team_a_score,
            m.team_b_score,
            pm.team,
            ROW_NUMBER() OVER (ORDER BY pm.goals DESC) as rn
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE pm.goals > 0 AND p.is_ringer = false  -- Exclude ringers
        ),
        consecutive_goals AS (
          WITH player_matches_with_gaps AS (
            SELECT 
              p.name,
              m.match_date,
              pm.goals,
              CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END as scored,
              LAG(CASE WHEN pm.goals > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY p.player_id ORDER BY m.match_date) as prev_scored
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false  -- Exclude ringers
            ORDER BY p.player_id, m.match_date
          ),
          streaks AS (
            SELECT 
              name,
              match_date,
              CASE 
                WHEN scored = 1 AND (prev_scored = 0 OR prev_scored IS NULL) 
                THEN 1 
                ELSE 0 
              END as streak_start,
              scored
            FROM player_matches_with_gaps
          ),
          numbered_streaks AS (
            SELECT 
              name,
              match_date,
              scored,
              SUM(streak_start) OVER (ORDER BY name, match_date) as streak_group
            FROM streaks
            WHERE scored = 1
          )
          SELECT 
            name,
            COUNT(*) as streak,
            MIN(match_date) as streak_start,
            MAX(match_date) as streak_end
          FROM numbered_streaks
          GROUP BY name, streak_group
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        streaks AS (
          WITH numbered_matches AS (
            SELECT 
              p.name,
              m.match_date,
              pm.result,
              ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as match_num
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false  -- Exclude ringers
          ),
          win_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'win'
          ),
          loss_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name, result ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'loss'
          ),
          no_win_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'win'
          ),
          undefeated_gaps AS (
            SELECT 
              name,
              match_date,
              result,
              match_num,
              match_num - ROW_NUMBER() OVER (PARTITION BY name ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'loss'
          )
          SELECT 
            type,
            name,
            COUNT(*) as streak,
            MIN(match_date) as streak_start,
            MAX(match_date) as streak_end
          FROM (
            SELECT 'Win Streak' as type, name, match_date, match_num, grp FROM win_gaps
            UNION ALL
            SELECT 'Loss Streak' as type, name, match_date, match_num, grp FROM loss_gaps
            UNION ALL
            SELECT 'No Win Streak' as type, name, match_date, match_num, grp FROM no_win_gaps
            UNION ALL
            SELECT 'Undefeated Streak' as type, name, match_date, match_num, grp FROM undefeated_gaps
          ) all_streaks
          GROUP BY type, name, grp
          HAVING COUNT(*) >= 3
        )
      SELECT 
        jsonb_build_object(
          'most_goals_in_game', (
            SELECT jsonb_build_object(
              'name', name,
              'goals', goals,
              'date', match_date::text,
              'score', CASE 
                WHEN team = 'A' THEN team_a_score || '-' || team_b_score
                ELSE team_b_score || '-' || team_a_score
              END
            )
            FROM game_goals
            WHERE rn = 1
          ),
          'streaks', (
            SELECT jsonb_object_agg(
              type,
              jsonb_build_object(
                'name', name,
                'streak', streak,
                'start_date', streak_start::text,
                'end_date', streak_end::text
              )
            )
            FROM (
              SELECT DISTINCT ON (type)
                type, name, streak, streak_start, streak_end
              FROM streaks
              ORDER BY type, streak DESC
            ) s
          ),
          'consecutive_goals', (
            SELECT jsonb_build_object(
              'name', name,
              'streak', streak,
              'start_date', streak_start::text,
              'end_date', streak_end::text
            )
            FROM consecutive_goals
          )
        ) as records`;console.log("records data:",s);let t={data:{seasonWinners:_(e),topScorers:_(a),records:_(s)}};return console.log("Final response:",t),E.NextResponse.json(t)}catch(e){return console.error("Database Error:",e),E.NextResponse.json({error:"Failed to fetch honour roll data",details:e},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:m.RouteKind.APP_ROUTE,page:"/api/honourroll/route",pathname:"/api/honourroll",filename:"route",bundlePath:"app/api/honourroll/route"},resolvedPagePath:"C:\\Users\\Ian\\BerkoTNF\\src\\app\\api\\honourroll\\route.ts",nextConfigOutput:"",userland:t}),{workAsyncStorage:c,workUnitAsyncStorage:R,serverHooks:i}=l;function d(){return(0,n.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:R})}},6487:()=>{},8335:()=>{},5600:(e,a,s)=>{"use strict";s.d(a,{z:()=>r});let t=require("@prisma/client"),r=global.prisma||new t.PrismaClient({log:["query"]})}};var a=require("../../../webpack-runtime.js");a.C(e);var s=e=>a(a.s=e),t=a.X(0,[638,452],()=>s(5490));module.exports=t})();
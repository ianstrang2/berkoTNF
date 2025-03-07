(()=>{var e={};e.id=932,e.ids=[932],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},6464:(e,a,t)=>{"use strict";t.r(a),t.d(a,{patchFetch:()=>E,routeModule:()=>l,serverHooks:()=>u,workAsyncStorage:()=>i,workUnitAsyncStorage:()=>o});var s={};t.r(s),t.d(s,{GET:()=>m});var r=t(2706),p=t(8203),_=t(5994),n=t(9187),d=t(5600);async function m(e){try{console.log("Fetching player profile...");let{searchParams:a}=new URL(e.url),t=a.get("id");if(!t)return console.error("Error: No ID provided in request"),n.NextResponse.json({error:"No ID provided"},{status:400});let s=parseInt(t,10);console.log("Fetching profile for ID:",s);let r=await d.z.$queryRaw`
      WITH 
        player_stats AS (
          SELECT 
            p.player_id,
            p.name,
            COUNT(pm.match_id) as games_played,
            SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) as fantasy_points,
            MAX(pm.goals) as most_goals,
            (
              SELECT m2.match_date::text
              FROM player_matches pm2
              JOIN matches m2 ON pm2.match_id = m2.match_id
              WHERE pm2.player_id = p.player_id AND pm2.goals = (
                SELECT MAX(pm3.goals)
                FROM player_matches pm3
                WHERE pm3.player_id = p.player_id
              )
              LIMIT 1
            ) as most_goals_date
          FROM players p
          LEFT JOIN player_matches pm ON p.player_id = pm.player_id
          WHERE p.player_id = ${s}
          GROUP BY p.player_id, p.name
        ),
        streaks AS (
          WITH numbered_matches AS (
            SELECT 
              pm.player_id,
              m.match_date,
              pm.result,
              ROW_NUMBER() OVER (PARTITION BY pm.player_id ORDER BY m.match_date) as match_num
            FROM player_matches pm
            JOIN matches m ON pm.match_id = m.match_id
            WHERE pm.player_id = ${s}
          ),
          win_gaps AS (
            SELECT 
              player_id,
              match_date,
              match_num,
              match_num - ROW_NUMBER() OVER (ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result = 'win'
          ),
          undefeated_gaps AS (
            SELECT 
              player_id,
              match_date,
              match_num,
              match_num - ROW_NUMBER() OVER (ORDER BY match_date) as grp
            FROM numbered_matches
            WHERE result != 'loss'
          ),
          win_streak AS (
            SELECT 
              player_id,
              COUNT(*) as streak,
              MIN(match_date) as start_date,
              MAX(match_date) as end_date
            FROM win_gaps
            GROUP BY player_id, grp
          ),
          undefeated_streak AS (
            SELECT 
              player_id,
              COUNT(*) as streak,
              MIN(match_date) as start_date,
              MAX(match_date) as end_date
            FROM undefeated_gaps
            GROUP BY player_id, grp
          )
          SELECT 
            ws.player_id,
            MAX(ws.streak) as win_streak,
            MIN(ws.start_date)::text as win_streak_start,
            MAX(ws.end_date)::text as win_streak_end,
            MAX(us.streak) as undefeated_streak,
            MIN(us.start_date)::text as undefeated_streak_start,
            MAX(us.end_date)::text as undefeated_streak_end
          FROM win_streak ws
          CROSS JOIN undefeated_streak us
          WHERE ws.player_id = us.player_id
          GROUP BY ws.player_id
        ),
        yearly_stats AS (
          SELECT 
            pm.player_id,
            EXTRACT(YEAR FROM m.match_date)::integer as year,
            COUNT(*) as games_played,
            SUM(pm.goals) as goals_scored,
            SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) as fantasy_points,
            ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0), 1) as minutes_per_goal,
            ROUND(SUM(
              CASE 
                WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                WHEN pm.result = 'win' THEN 20
                WHEN pm.result = 'draw' THEN 10
                WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                WHEN pm.result = 'loss' THEN -10
                ELSE 0 END
            ) / COUNT(*), 1) as points_per_game
          FROM player_matches pm
          JOIN matches m ON pm.match_id = m.match_id
          WHERE pm.player_id = ${s}
          GROUP BY pm.player_id, EXTRACT(YEAR FROM m.match_date)
          ORDER BY year DESC
        )
      SELECT 
        ps.*, 
        s.win_streak, 
        s.win_streak_start, 
        s.win_streak_end, 
        s.undefeated_streak, 
        s.undefeated_streak_start, 
        s.undefeated_streak_end,
        (
          SELECT json_agg(ys.*)
          FROM yearly_stats ys
        ) as yearly_stats
      FROM player_stats ps
      LEFT JOIN streaks s ON ps.player_id = s.player_id;
    `;if(!r||0===r.length)return console.warn("Player not found for ID:",s),n.NextResponse.json({error:"Player not found"},{status:404});let p={...r[0],games_played:Number(r[0].games_played),fantasy_points:Number(r[0].fantasy_points),most_goals:Number(r[0].most_goals),win_streak:Number(r[0].win_streak),undefeated_streak:Number(r[0].undefeated_streak),yearly_stats:r[0].yearly_stats?.map(e=>({year:Number(e.year),games_played:Number(e.games_played),goals_scored:Number(e.goals_scored),fantasy_points:Number(e.fantasy_points),minutes_per_goal:Number(e.minutes_per_goal)||"N/A",points_per_game:Number(e.points_per_game)||"N/A"})),win_streak_dates:`${r[0].win_streak_start} to ${r[0].win_streak_end}`,undefeated_streak_dates:`${r[0].undefeated_streak_start} to ${r[0].undefeated_streak_end}`};return n.NextResponse.json({profile:p})}catch(e){return console.error("Database Error:",e),n.NextResponse.json({error:"Failed to fetch player profile",details:e instanceof Error?e.message:"Unknown error occurred"},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:p.RouteKind.APP_ROUTE,page:"/api/playerprofile/route",pathname:"/api/playerprofile",filename:"route",bundlePath:"app/api/playerprofile/route"},resolvedPagePath:"C:\\Users\\Ian\\BerkoTNF\\src\\app\\api\\playerprofile\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:i,workUnitAsyncStorage:o,serverHooks:u}=l;function E(){return(0,_.patchFetch)({workAsyncStorage:i,workUnitAsyncStorage:o})}},6487:()=>{},8335:()=>{},5600:(e,a,t)=>{"use strict";t.d(a,{z:()=>r});let s=require("@prisma/client"),r=global.prisma||new s.PrismaClient({log:["query"]})}};var a=require("../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),s=a.X(0,[638,452],()=>t(6464));module.exports=s})();
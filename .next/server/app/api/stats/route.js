(()=>{var e={};e.id=967,e.ids=[967],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},2702:(e,a,t)=>{"use strict";t.r(a),t.d(a,{patchFetch:()=>u,routeModule:()=>N,serverHooks:()=>d,workAsyncStorage:()=>_,workUnitAsyncStorage:()=>E});var s={};t.r(s),t.d(s,{POST:()=>i});var r=t(2706),m=t(8203),p=t(5994),o=t(9187),l=t(5600);let n=e=>JSON.parse(JSON.stringify(e,(e,a)=>"bigint"==typeof a?Number(a):a));async function i(e){console.log("API route hit");try{let a=await e.json();if(console.log("Received request body:",a),!a||!a.startDate||!a.endDate)return console.error("Invalid request body:",a),o.NextResponse.json({error:"Invalid request body - missing dates"},{status:400});let{startDate:t,endDate:s}=a;console.log("About to execute queries with dates:",t,s);let r=await l.z.$queryRaw`
    SELECT 
      p.name,
      COUNT(*) as games_played,
      COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
      COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
      SUM(pm.goals) as goals,
      COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
      COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
      COUNT(CASE 
        WHEN (pm.team = 'A' AND m.team_b_score = 0) OR 
             (pm.team = 'B' AND m.team_a_score = 0) 
        THEN 1 
      END) as clean_sheets,
      CAST(
        (COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / NULLIF(COUNT(*), 0)) 
        AS DECIMAL(5,1)
      ) as win_percentage,
      SUM(
        CASE 
          WHEN pm.result = 'win' AND pm.heavy_win = true AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 40  -- Heavy Win + Clean Sheet
          WHEN pm.result = 'win' AND pm.heavy_win = true 
          THEN 30  -- Heavy Win
          WHEN pm.result = 'win' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 30  -- Win + Clean Sheet
          WHEN pm.result = 'win' 
          THEN 20  -- Win
          WHEN pm.result = 'draw' AND 
               ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
          THEN 20  -- Draw + Clean Sheet
          WHEN pm.result = 'draw' 
          THEN 10  -- Draw
          WHEN pm.result = 'loss' AND pm.heavy_loss = true 
          THEN -20 -- Heavy Loss
          WHEN pm.result = 'loss' 
          THEN -10 -- Loss
          ELSE 0
        END
      ) as fantasy_points
    FROM players p
    JOIN player_matches pm ON p.player_id = pm.player_id
    JOIN matches m ON pm.match_id = m.match_id
    WHERE m.match_date >= ${t}::date
    AND m.match_date <= ${s}::date
    AND p.is_ringer = 'NO'
    GROUP BY p.name
    ORDER BY fantasy_points DESC
  `;console.log("Season stats query completed");let m=await l.z.$queryRaw`
    WITH player_totals AS (
      SELECT 
        p.player_id,
        p.name,
        SUM(pm.goals) as total_goals,
        ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0)) as minutes_per_goal
      FROM players p
      JOIN player_matches pm ON p.player_id = pm.player_id
      JOIN matches m ON pm.match_id = m.match_id
      WHERE m.match_date >= ${t}::date
      AND m.match_date <= ${s}::date
      AND p.is_ringer = 'NO'
      GROUP BY p.player_id, p.name
      HAVING SUM(pm.goals) > 0
    ),
    recent_games AS (
      SELECT 
        p.player_id,
        pm.goals,
        ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date ASC) as game_number
      FROM players p
      JOIN player_matches pm ON p.player_id = pm.player_id
      JOIN matches m ON pm.match_id = m.match_id
      WHERE m.match_date >= ${t}::date
      AND m.match_date <= ${s}::date
      AND p.is_ringer = 'NO'
    )
    SELECT 
      pt.*,
      STRING_AGG(
        CASE 
          WHEN rg.goals = 0 THEN ''
          ELSE rg.goals::text 
        END,
        ',' ORDER BY game_number
      ) as last_five_games,
      MAX(rg.goals) as max_goals_in_game
    FROM player_totals pt
    LEFT JOIN recent_games rg ON pt.player_id = rg.player_id AND rg.game_number <= 5
    GROUP BY pt.player_id, pt.name, pt.total_goals, pt.minutes_per_goal
    ORDER BY pt.total_goals DESC, pt.minutes_per_goal ASC
  `;console.log("Goal stats query completed");let p=await l.z.$queryRaw`
      WITH recent_games AS (
        SELECT 
          p.player_id,
          p.name,
          m.match_date,
          CASE 
            WHEN pm.result = 'win' AND pm.heavy_win = true THEN 'HW'
            WHEN pm.result = 'win' THEN 'W'
            WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN 'HL'
            WHEN pm.result = 'loss' THEN 'L'
            ELSE 'D'
          END as result,
          ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date ASC) as game_number
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date >= ${t}::date
        AND m.match_date <= ${s}::date
        AND p.is_ringer = 'NO'
      )
      SELECT 
        name,
        STRING_AGG(result, ', ' ORDER BY game_number) as last_5_games
      FROM recent_games
      WHERE game_number <= 5
      GROUP BY player_id, name
      ORDER BY name
    `;console.log("Form data query completed");let i={data:{seasonStats:n(r),goalStats:n(m),formData:n(p)}};return console.log("About to send response:",i),o.NextResponse.json(i)}catch(e){return console.error("Detailed error:",{message:e.message,stack:e.stack,name:e.name}),o.NextResponse.json({error:"Failed to fetch stats",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}let N=new r.AppRouteRouteModule({definition:{kind:m.RouteKind.APP_ROUTE,page:"/api/stats/route",pathname:"/api/stats",filename:"route",bundlePath:"app/api/stats/route"},resolvedPagePath:"C:\\Users\\Ian\\BerkoTNF\\src\\app\\api\\stats\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:_,workUnitAsyncStorage:E,serverHooks:d}=N;function u(){return(0,p.patchFetch)({workAsyncStorage:_,workUnitAsyncStorage:E})}},6487:()=>{},8335:()=>{},5600:(e,a,t)=>{"use strict";t.d(a,{z:()=>r});let s=require("@prisma/client"),r=global.prisma||new s.PrismaClient({log:["query"]})}};var a=require("../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),s=a.X(0,[638,452],()=>t(2702));module.exports=s})();
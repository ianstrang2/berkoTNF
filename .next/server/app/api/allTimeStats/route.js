(()=>{var e={};e.id=213,e.ids=[213],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},6398:(e,t,s)=>{"use strict";s.r(t),s.d(t,{patchFetch:()=>A,routeModule:()=>l,serverHooks:()=>_,workAsyncStorage:()=>E,workUnitAsyncStorage:()=>u});var a={};s.r(a),s.d(a,{GET:()=>n});var r=s(2706),p=s(8203),m=s(5994),N=s(9187),i=s(5600);let o=e=>JSON.parse(JSON.stringify(e,(e,t)=>"bigint"==typeof t?Number(t):t));async function n(e){try{console.log("DATABASE_URL:",process.env.DATABASE_URL),console.log("Prisma Client Initialized:",i.z);let e=await i.z.$queryRaw`
      WITH player_stats AS (
        SELECT 
          p.name,
          p.is_retired,
          COUNT(*) as games_played,
          COUNT(CASE WHEN pm.result = 'win' THEN 1 END) as wins,
          COUNT(CASE WHEN pm.result = 'draw' THEN 1 END) as draws,
          COUNT(CASE WHEN pm.result = 'loss' THEN 1 END) as losses,
          SUM(pm.goals) as goals,
          CAST(COUNT(CASE WHEN pm.result = 'win' THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as win_percentage,
          ROUND(COUNT(*) * 60.0 / NULLIF(SUM(pm.goals), 0), 1) as minutes_per_goal,
          COUNT(CASE WHEN pm.heavy_win = true THEN 1 END) as heavy_wins,
          CAST(COUNT(CASE WHEN pm.heavy_win = true THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as heavy_win_percentage,
          COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END) as heavy_losses,
          CAST(COUNT(CASE WHEN pm.heavy_loss = true THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as heavy_loss_percentage,
          COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END) as clean_sheets,
          CAST(COUNT(CASE WHEN (pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0) THEN 1 END)::float * 100 / COUNT(*) AS DECIMAL(5,1)) as clean_sheet_percentage,
          SUM(
            CASE 
              WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                   ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
              THEN 40
              WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
              WHEN pm.result = 'win' AND 
                   ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
              THEN 30
              WHEN pm.result = 'win' THEN 20
              WHEN pm.result = 'draw' AND 
                   ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
              THEN 20
              WHEN pm.result = 'draw' THEN 10
              WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
              WHEN pm.result = 'loss' THEN -10
              ELSE 0
            END
          ) as fantasy_points
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        GROUP BY p.name, p.is_retired
        HAVING COUNT(*) >= 50
      )
      SELECT 
        *,
        ROUND(fantasy_points::numeric / games_played, 1) as points_per_game
      FROM player_stats
      ORDER BY fantasy_points DESC
    `;return N.NextResponse.json({data:o(e)})}catch(e){return console.error("Database Error:",e),N.NextResponse.json({error:"Failed to fetch stats"},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:p.RouteKind.APP_ROUTE,page:"/api/allTimeStats/route",pathname:"/api/allTimeStats",filename:"route",bundlePath:"app/api/allTimeStats/route"},resolvedPagePath:"C:\\Users\\Ian\\BerkoTNF\\src\\app\\api\\allTimeStats\\route.ts",nextConfigOutput:"",userland:a}),{workAsyncStorage:E,workUnitAsyncStorage:u,serverHooks:_}=l;function A(){return(0,m.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:u})}},6487:()=>{},8335:()=>{},5600:(e,t,s)=>{"use strict";s.d(t,{z:()=>r});let a=require("@prisma/client"),r=global.prisma||new a.PrismaClient({log:["query"]})}};var t=require("../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[638,452],()=>s(6398));module.exports=a})();
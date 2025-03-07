"use strict";(()=>{var e={};e.id=255,e.ids=[255],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4128:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>A,patchFetch:()=>T,requestAsyncStorage:()=>E,routeModule:()=>l,serverHooks:()=>u,staticGenerationAsyncStorage:()=>_});var s={};t.r(s),t.d(s,{GET:()=>n});var r=t(9303),m=t(8716),p=t(670),N=t(7070),o=t(728);let i=e=>JSON.parse(JSON.stringify(e,(e,a)=>"bigint"==typeof a?Number(a):a));async function n(e){try{console.log("DATABASE_URL:",process.env.DATABASE_URL),console.log("Prisma Client Initialized:",o._);let e=await o._.$queryRaw`
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
    `;return N.NextResponse.json({data:i(e)})}catch(e){return console.error("Database Error:",e),N.NextResponse.json({error:"Failed to fetch stats"},{status:500})}}let l=new r.AppRouteRouteModule({definition:{kind:m.x.APP_ROUTE,page:"/api/allTimeStats/route",pathname:"/api/allTimeStats",filename:"route",bundlePath:"app/api/allTimeStats/route"},resolvedPagePath:"C:\\Users\\Ian\\BerkoTNF\\src\\app\\api\\allTimeStats\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:E,staticGenerationAsyncStorage:_,serverHooks:u}=l,A="/api/allTimeStats/route";function T(){return(0,p.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:_})}},728:(e,a,t)=>{t.d(a,{_:()=>r});let s=require("@prisma/client"),r=global.prisma||new s.PrismaClient({log:["query"]})}};var a=require("../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),s=a.X(0,[948,972],()=>t(4128));module.exports=s})();
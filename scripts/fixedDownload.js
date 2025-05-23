const fs = require('fs');
const path = require('path');
const https = require('https');

// Create directories
const logoDir = path.join(__dirname, '../public/club-logos');
const dataDir = path.join(__dirname, '../data');

if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Fixed script using league IDs instead of names
async function downloadAllFootballLogosFixed() {
  // Load existing clubs if they exist
  const clubsPath = path.join(dataDir, 'clubs.json');
  let clubs = [];
  if (fs.existsSync(clubsPath)) {
    clubs = JSON.parse(fs.readFileSync(clubsPath, 'utf8'));
    console.log(`📋 Starting with ${clubs.length} existing clubs`);
  }

  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  try {
    // Step 1: Get all leagues
    console.log('🔍 Getting all football leagues...');
    const leaguesResponse = await fetch('https://www.thesportsdb.com/api/v1/json/3/all_leagues.php');
    const leaguesData = await leaguesResponse.json();
    
    // Filter for football/soccer leagues
    const footballLeagues = leaguesData.leagues.filter(league => 
      league.strSport === 'Soccer'
    );
    
    console.log(`Found ${footballLeagues.length} football leagues`);
    
    // Step 2: Process each league using the working API endpoint
    for (const league of footballLeagues) {
      try {
        console.log(`\n⚽ Processing: ${league.strLeague}...`);
        
        // Use search_all_teams with league name (this gets the correct current teams)
        const teamsResponse = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league.strLeague)}`
        );
        const teamsData = await teamsResponse.json();
        
        if (teamsData.teams && Array.isArray(teamsData.teams)) {
          console.log(`  Found ${teamsData.teams.length} teams`);
          
          for (const team of teamsData.teams) {
            if (team.strBadge) {
              // Check if we already have this team
              const existingTeam = clubs.find(club => club.id === team.idTeam);
              if (existingTeam) {
                totalSkipped++;
                continue;
              }
              
              const filename = `${team.idTeam}.png`;
              const filepath = path.join(logoDir, filename);
              
              // Skip if file already exists
              if (fs.existsSync(filepath)) {
                totalSkipped++;
                continue;
              }
              
              try {
                console.log(`    Downloading ${team.strTeam}...`);
                await downloadImage(team.strBadge, filepath);
                totalDownloaded++;
                
                clubs.push({
                  id: team.idTeam,
                  name: team.strTeam,
                  filename: filename,
                  search: team.strTeam.toLowerCase(),
                  league: league.strLeague,
                  country: team.strCountry || league.strCountry || 'Unknown'
                });
                
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 100));
                
              } catch (err) {
                totalFailed++;
                console.log(`    ❌ Failed to download ${team.strTeam}: ${err.message}`);
              }
            }
          }
          
          // Show progress
          console.log(`  ✅ Processed ${league.strLeague}: +${teamsData.teams.length} teams`);
          
        } else {
          console.log(`  ⚠️  No teams found for ${league.strLeague}`);
        }
        
        // Longer delay between leagues to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.log(`  ❌ Error processing ${league.strLeague}: ${err.message}`);
      }
    }

  } catch (err) {
    console.log(`💥 Fatal error: ${err.message}`);
  }

  // Save the clubs data
  fs.writeFileSync(clubsPath, JSON.stringify(clubs, null, 2));

  console.log(`\n🎉 DOWNLOAD COMPLETE!`);
  console.log(`✅ Downloaded: ${totalDownloaded} new logos`);
  console.log(`⏭️  Skipped: ${totalSkipped} existing`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Total clubs: ${clubs.length}`);
  
  // Verify we got the big clubs
  const chelsea = clubs.find(club => club.name.toLowerCase().includes('chelsea'));
  const tottenham = clubs.find(club => 
    club.name.toLowerCase().includes('tottenham') || 
    club.name.toLowerCase().includes('spurs')
  );
  
  console.log(`\n🔍 Verification:`);
  console.log(`Chelsea: ${chelsea ? '✅ ' + chelsea.name : '❌ Missing'}`);
  console.log(`Tottenham: ${tottenham ? '✅ ' + tottenham.name : '❌ Missing'}`);
}

downloadAllFootballLogosFixed();
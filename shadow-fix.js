// shadow-fix.js
// Script to standardize shadow usage across the codebase
const fs = require('fs');
const path = require('path');

// Shadow mapping - old to new
const shadowMapping = {
  'shadow-card': 'shadow',       // Use standard shadow for cards
  'shadow-elevated': 'shadow-lg', // Use shadow-lg for elevated elements
};

// Files to exclude
const excludeDirs = ['node_modules', '.git', '.next', 'build', 'dist'];

// Component fixes - specific patterns to replace
const componentFixes = [
  {
    // Fix Card components with shadow-card or shadow-elevated
    pattern: /<Card[^>]*?(className="[^"]*?)(shadow-card|shadow-elevated)([^"]*")[^>]*?>/g,
    replace: (match, prefix, shadow, suffix) => {
      return match.replace(`${prefix}${shadow}${suffix}`, `${prefix}${shadowMapping[shadow]}${suffix}`);
    }
  },
  {
    // Fix div with className containing shadow-card
    pattern: /<div[^>]*?(className="[^"]*?)(shadow-card)([^"]*")[^>]*?>/g,
    replace: (match, prefix, shadow, suffix) => {
      return match.replace(`${prefix}${shadow}${suffix}`, `${prefix}shadow${suffix}`);
    }
  },
  {
    // Fix div with className containing shadow-elevated
    pattern: /<div[^>]*?(className="[^"]*?)(shadow-elevated)([^"]*")[^>]*?>/g,
    replace: (match, prefix, shadow, suffix) => {
      return match.replace(`${prefix}${shadow}${suffix}`, `${prefix}shadow-lg${suffix}`);
    }
  }
];

// Function to fix a file
function fixFile(filePath) {
  try {
    // Skip non-relevant files
    if (!/\.(js|jsx|ts|tsx)$/.test(filePath)) {
      return { filePath, modified: false, message: 'Skipped non-relevant file' };
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply component fixes
    componentFixes.forEach(fix => {
      content = content.replace(fix.pattern, fix.replace);
    });
    
    // Check if file was modified
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { filePath, modified: true, message: 'Modified' };
    }
    
    return { filePath, modified: false, message: 'No changes needed' };
  } catch (error) {
    return { filePath, modified: false, message: `Error: ${error.message}` };
  }
}

// Function to traverse directory
function traverseDirectory(directory) {
  let results = [];
  
  try {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      // Skip excluded directories
      if (excludeDirs.includes(item)) {
        continue;
      }
      
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Recursively process subdirectories
        results = results.concat(traverseDirectory(itemPath));
      } else {
        // Fix file
        results.push(fixFile(itemPath));
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error traversing directory ${directory}:`, error.message);
    return results;
  }
}

// Main function
async function main() {
  console.log('Starting shadow standardization...');
  
  // Get all results
  const results = traverseDirectory('./src');
  
  // Filter for modified files
  const modifiedFiles = results.filter(r => r.modified);
  
  console.log(`Shadow standardization complete!`);
  console.log(`Total files processed: ${results.length}`);
  console.log(`Files modified: ${modifiedFiles.length}`);
  
  // Log modified files
  if (modifiedFiles.length > 0) {
    console.log('\nModified files:');
    modifiedFiles.forEach(file => {
      console.log(`- ${file.filePath}`);
    });
  }
}

// Run the script
main().catch(error => {
  console.error('Error running standardization:', error);
}); 
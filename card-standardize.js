// card-standardize.js
// Script to standardize Card component styling across the codebase
const fs = require('fs');
const path = require('path');

// Files to exclude
const excludeDirs = ['node_modules', '.git', '.next', 'build', 'dist'];

// Component patterns to update
const componentPatterns = [
  // Pattern for Card components without shadow classes
  {
    pattern: /<Card(?!\s[^>]*?(shadow|shadow-sm|shadow-md|shadow-lg|shadow-xl|shadow-2xl|shadow-card|shadow-elevated))[^>]*?className="([^"]*?)"/g,
    replace: (match, className) => {
      // Add shadow class if it doesn't have one
      return match.replace(`className="${className}"`, `className="${className} shadow"`);
    }
  },
  // Pattern for divs with card class but no shadow
  {
    pattern: /<div[^>]*?className="([^"]*?)card([^"]*?)(?!(.*?shadow))[^>]*?"/g,
    replace: (match, prefix, suffix) => {
      // Add shadow class if it doesn't already have a shadow
      return match.replace(`className="${prefix}card${suffix}"`, `className="${prefix}card${suffix} shadow"`);
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
    componentPatterns.forEach(fix => {
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
  console.log('Starting Card component standardization...');
  
  // Get all results
  const results = traverseDirectory('./src');
  
  // Filter for modified files
  const modifiedFiles = results.filter(r => r.modified);
  
  console.log(`Card standardization complete!`);
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
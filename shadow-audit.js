// shadow-audit.js
// Script to audit shadow usage across the codebase and find inconsistencies
const fs = require('fs');
const path = require('path');

// Shadow patterns to search for
const shadowPatterns = [
  'shadow-',
  'shadow"',
  'shadow ',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl',
  'shadow-card',
  'shadow-elevated',
];

// Component patterns to identify Card components
const componentPatterns = [
  '<Card',
  '<div className="card',
  '<div className=".*?card',
  'className=".*?shadow'
];

// Files to exclude
const excludeDirs = ['node_modules', '.git', '.next', 'build', 'dist'];

// Output file
const outputFile = 'shadow-audit-results.txt';
let outputData = '# Shadow Usage Audit Results\n\n';

// Function to process a file
function processFile(filePath) {
  const fileResults = [];
  
  try {
    // Skip non-relevant files
    if (!/\.(js|jsx|ts|tsx)$/.test(filePath)) {
      return fileResults;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Scan for shadow patterns
    lines.forEach((line, lineNum) => {
      // Check for shadow classes
      shadowPatterns.forEach(pattern => {
        if (line.includes(pattern)) {
          fileResults.push({
            file: filePath,
            line: lineNum + 1,
            content: line.trim(),
            pattern: pattern
          });
        }
      });
      
      // Check for Card components
      componentPatterns.forEach(pattern => {
        if (new RegExp(pattern).test(line)) {
          // Only add if it hasn't been added by a shadow pattern
          const alreadyAdded = fileResults.some(result => 
            result.file === filePath && result.line === lineNum + 1
          );
          
          if (!alreadyAdded) {
            fileResults.push({
              file: filePath,
              line: lineNum + 1,
              content: line.trim(),
              pattern: 'Card Component'
            });
          }
        }
      });
    });
    
    return fileResults;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return fileResults;
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
        // Process file
        results = results.concat(processFile(itemPath));
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
  console.log('Starting shadow usage audit...');
  
  // Get all shadow usages
  const results = traverseDirectory('./src');
  
  // Group by file
  const fileGroups = {};
  results.forEach(result => {
    if (!fileGroups[result.file]) {
      fileGroups[result.file] = [];
    }
    fileGroups[result.file].push(result);
  });
  
  // Create report
  outputData += `Total files with shadow usage: ${Object.keys(fileGroups).length}\n\n`;
  
  // Add findings for each file
  Object.keys(fileGroups).sort().forEach(file => {
    outputData += `## ${file}\n\n`;
    
    const fileResults = fileGroups[file];
    fileResults.sort((a, b) => a.line - b.line);
    
    fileResults.forEach(result => {
      outputData += `Line ${result.line} (${result.pattern}):\n\`\`\`\n${result.content}\n\`\`\`\n\n`;
    });
    
    outputData += '\n';
  });
  
  // Summary at the end
  outputData += '## Summary of Shadow Patterns\n\n';
  
  // Count occurrences of each pattern
  const patternCounts = {};
  shadowPatterns.forEach(pattern => {
    patternCounts[pattern] = results.filter(r => r.pattern === pattern).length;
  });
  
  // Add Card component count
  patternCounts['Card Component'] = results.filter(r => r.pattern === 'Card Component').length;
  
  // Display counts
  Object.keys(patternCounts).sort().forEach(pattern => {
    if (patternCounts[pattern] > 0) {
      outputData += `- \`${pattern}\`: ${patternCounts[pattern]} occurrences\n`;
    }
  });
  
  // Write to file
  fs.writeFileSync(outputFile, outputData);
  
  console.log(`Audit complete! Results written to ${outputFile}`);
}

// Run the script
main().catch(error => {
  console.error('Error running audit:', error);
}); 
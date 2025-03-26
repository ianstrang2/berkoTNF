// update-styling.js
// A script to systematically update styling classes across the project
const fs = require('fs');
const path = require('path');

// Define mapping of old classes to new classes
const classMapping = {
  // Text colors
  'text-gray-50': 'text-neutral-50',
  'text-gray-100': 'text-neutral-100',
  'text-gray-200': 'text-neutral-200',
  'text-gray-300': 'text-neutral-300',
  'text-gray-400': 'text-neutral-400',
  'text-gray-500': 'text-neutral-500',
  'text-gray-600': 'text-neutral-600',
  'text-gray-700': 'text-neutral-700',
  'text-gray-800': 'text-neutral-800',
  'text-gray-900': 'text-neutral-900',
  
  // Background colors
  'bg-gray-50': 'bg-neutral-50',
  'bg-gray-100': 'bg-neutral-100',
  'bg-gray-200': 'bg-neutral-200',
  'bg-gray-300': 'bg-neutral-300',
  'bg-gray-400': 'bg-neutral-400',
  'bg-gray-500': 'bg-neutral-500',
  'bg-gray-600': 'bg-neutral-600',
  'bg-gray-700': 'bg-neutral-700',
  'bg-gray-800': 'bg-neutral-800',
  'bg-gray-900': 'bg-neutral-900',
  
  // Border colors
  'border-gray-50': 'border-neutral-50',
  'border-gray-100': 'border-neutral-100',
  'border-gray-200': 'border-neutral-200',
  'border-gray-300': 'border-neutral-300',
  'border-gray-400': 'border-neutral-400',
  'border-gray-500': 'border-neutral-500',
  'border-gray-600': 'border-neutral-600',
  'border-gray-700': 'border-neutral-700',
  'border-gray-800': 'border-neutral-800',
  'border-gray-900': 'border-neutral-900',
  
  // Fix shadow naming to avoid circular dependencies
  'shadow-card': 'shadow',
  'shadow-elevated': 'shadow-lg'
};

// Function to update classes in a string
function updateClasses(classString, context = '') {
  if (!classString) return classString;
  
  // Handle template literals or complex expressions differently
  if (classString.includes('${')) {
    console.log('Dynamic class expression found (skipping):', classString);
    return classString; // Skip dynamic class expressions for manual review
  }
  
  // Split the class string into individual classes
  const classes = classString.split(/\s+/);
  
  // Replace each class that needs replacing
  const updatedClasses = classes.map(cls => {
    // Direct mapping
    if (classMapping[cls]) return classMapping[cls];
    return cls;
  });
  
  // Join back into a single string
  return updatedClasses.join(' ');
}

// Process each file recursively
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (file !== 'node_modules' && file !== '.git') {
        processDirectory(filePath);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      processFile(filePath);
    } else if (/\.css$/.test(file)) {
      processCssFile(filePath); 
    }
  });
}

// Process a regular JS/TS file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    
    // Find and replace className attributes
    const classNameRegex = /className=(?:"|'|{`|{")([^'"}]*?)(?:"|'|`}|"})/g;
    updatedContent = updatedContent.replace(classNameRegex, (match, classString) => {
      const updatedClassString = updateClasses(classString);
      // Preserve the exact format of the original className
      return match.replace(classString, updatedClassString);
    });
    
    // Only write if changes were made
    if (content !== updatedContent) {
      console.log(`Updated file: ${filePath}`);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Process CSS files including Tailwind classes
function processCssFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    
    // Find and replace in Tailwind's apply directives
    const applyRegex = /@apply\s+([^;]+);/g;
    updatedContent = updatedContent.replace(applyRegex, (match, classString) => {
      const updatedClassString = updateClasses(classString);
      return `@apply ${updatedClassString};`;
    });
    
    // Only write if changes were made
    if (content !== updatedContent) {
      console.log(`Updated CSS file: ${filePath}`);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
  } catch (error) {
    console.error(`Error processing CSS file ${filePath}:`, error);
  }
}

// Start processing from the src directory
const startTime = new Date();
console.log('Starting style update...');
processDirectory('./src');

const endTime = new Date();
const duration = (endTime - startTime) / 1000; // in seconds
console.log(`Style update complete in ${duration} seconds!`); 
const parser = require('@babel/parser');

/**
 * Enhanced validation utilities for semantic minification
 */

function validateOptimization(originalCode, optimizedCode, options) {
  const issues = [];
  const warnings = [];
  
  const originalSize = originalCode.length;
  const optimizedSize = optimizedCode.length;
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  
  if (reduction > options.safety.maxOptimizationPercentage) {
    issues.push(`Too aggressive: ${reduction.toFixed(2)}% (max: ${options.safety.maxOptimizationPercentage}%)`);
  }
  
  for (const pattern of options.safety.preserveCriticalPatterns) {
    const regex = new RegExp(pattern, 'g');
    if (!regex.test(optimizedCode)) {
      warnings.push(`Critical pattern missing: ${pattern}`);
    }
  }
  
  try {
    parser.parse(optimizedCode, { sourceType: 'module', plugins: ['jsx'] });
  } catch (parseError) {
    issues.push(`Invalid JS: ${parseError.message}`);
  }
  
  if (reduction < 1) {
    warnings.push('Low optimization - check config');
  }
  
  if (optimizedSize > originalSize) {
    issues.push('Optimized larger than original - failed');
  }
  
  return { valid: issues.length === 0, issues, warnings, reduction, originalSize, optimizedSize };
}

function validateBundle(originalCode, output, manifest) {
  const issues = [];
  const originalSize = originalCode.length;
  const optimizedSize = output.length;
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  
  if (reduction > 40) {
    issues.push(`Too aggressive: ${reduction.toFixed(2)}% (max: 40%)`);
  }
  
  const manifestSize = JSON.stringify(manifest).length;
  if (manifestSize > 15 * 1024 * 1024) {
    issues.push(`Manifest too large: ${(manifestSize / 1024).toFixed(2)} KB (max: 15MB)`);
  }
  
  const criticalPatterns = [/React\./, /useState\(/, /useEffect\(/, /useRef\(/, /THREE\./, /window\./, /document\./];
  
  for (const pattern of criticalPatterns) {
    if (!pattern.test(output)) {
      issues.push(`Missing pattern: ${pattern.source}`);
    }
  }
  
  try {
    parser.parse(output, { sourceType: 'module', plugins: ['jsx'] });
  } catch (parseError) {
    issues.push(`Invalid JS: ${parseError.message}`);
  }
  
  return { issues, reduction };
}

function calculateStats(originalSize, optimizedSize, totalOptimizations, processingTime) {
  const reduction = ((originalSize - optimizedSize) / originalSize) * 100;
  const savings = originalSize - optimizedSize;
  
  return {
    originalSize, optimizedSize,
    reduction: parseFloat(reduction.toFixed(2)),
    savings, savingsKB: parseFloat((savings / 1024).toFixed(2)),
    totalOptimizations, processingTime,
    averageOptimizationTime: totalOptimizations > 0 ? processingTime / totalOptimizations : 0
  };
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatProcessingTime(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(2)}s`;
  return `${(milliseconds / 60000).toFixed(2)}m`;
}

function createBackup(filePath, suffix = '.backup') {
  const fs = require('fs');
  const backupPath = filePath + suffix;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function restoreFromBackup(originalPath, backupPath) {
  const fs = require('fs');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, originalPath);
    return true;
  }
  return false;
}

function fileExists(filePath) {
  const fs = require('fs');
  return fs.existsSync(filePath);
}

function getFileSize(filePath) {
  const fs = require('fs');
  return fs.statSync(filePath).size;
}

function readFile(filePath) {
  const fs = require('fs');
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Read failed ${filePath}: ${error.message}`);
  }
}

function writeFile(filePath, content) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    throw new Error(`Write failed ${filePath}: ${error.message}`);
  }
}

function findMainBundle(buildDir) {
  const fs = require('fs');
  const path = require('path');
  
  const staticJsDir = path.join(buildDir, 'static/js');
  
  if (!fs.existsSync(staticJsDir)) {
    throw new Error(`Build dir not found: ${staticJsDir}`);
  }
  
  const files = fs.readdirSync(staticJsDir);
  const excludes = ['stripped', 'enhanced', 'production', 'aggressive', 'selective', 'ultra-deep', 'max-aggression'];
  const mainBundle = files.find(file => 
    file.startsWith('main.') && file.endsWith('.js') && 
    !excludes.some(ex => file.includes(ex))
  );
  
  if (!mainBundle) {
    throw new Error('Main bundle not found in build/static/js');
  }
  
  return path.join(staticJsDir, mainBundle);
}

function generateOutputPath(inputPath, suffix) {
  const path = require('path');
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  
  return path.join(dir, `${base}${suffix}${ext}`);
}

function generateManifestPath(buildDir, manifestName) {
  const path = require('path');
  return path.join(buildDir, `${manifestName}.json`);
}

module.exports = {
  validateOptimization, validateBundle, calculateStats,
  formatFileSize, formatProcessingTime,
  createBackup, restoreFromBackup, fileExists, getFileSize,
  readFile, writeFile, findMainBundle,
  generateOutputPath, generateManifestPath
};

#!/usr/bin/env node

/**
 * Universal React Bundle Optimizer
 * 
 * Apply semantic minification to ANY React repo. Auto-detects build structure.
 * 
 * Usage: node universal-optimizer.js [options]
 * 
 * Options:
 *   --strategy <name>     max-aggression, enhanced, ultra-deep
 *   --build-dir <path>    Custom build dir
 *   --output-dir <path>   Custom output dir
 *   --config <path>       Custom config file
 *   --help               Show help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { runMaximumAggressionStripper } = require('./maximum-aggression-stripper');
const { runEnhancedMaximumAggressionStripper } = require('./enhanced-max-aggression-stripper');

const STRATEGIES = {
  'max-aggression': {
    name: 'Maximum Aggression',
    description: 'Best performer: 14.37% reduction',
    function: runMaximumAggressionStripper,
    recommended: true
  },
  'enhanced': {
    name: 'Enhanced Maximum Aggression',
    description: 'Advanced: up to 40% reduction',
    function: runEnhancedMaximumAggressionStripper,
    recommended: false
  },
  'ultra-deep': {
    name: 'Ultra-Deep',
    description: 'Deep: 9.63% reduction',
    function: null,
    recommended: false
  }
};

const DEFAULT_CONFIG = {
  strategy: 'max-aggression',
  buildDir: null,
  outputDir: null,
  createBackup: true,
  validateOutput: true,
  generateReport: true,
  preserveOriginal: true
};

class UniversalOptimizer {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.results = {
      strategy: null,
      originalSize: 0,
      optimizedSize: 0,
      reduction: 0,
      processingTime: 0,
      files: [],
      manifest: null,
      errors: [],
      warnings: []
    };
  }

  async optimize() {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Universal React Bundle Optimizer Starting...');
      console.log('================================================\n');
      
      this.validateConfig();
      
      const buildDir = await this.detectBuildDirectory();
      console.log(`📁 Build dir: ${buildDir}`);
      
      this.validateBuildDirectory(buildDir);
      
      const strategy = this.selectStrategy();
      console.log(`🎯 Strategy: ${strategy.name}`);
      console.log(`📝 ${strategy.description}`);
      
      console.log('\n🔧 Starting optimization...');
      const result = await this.runOptimization(strategy, buildDir);
      
      this.processResults(result, strategy, Date.now() - startTime);
      
      if (this.config.generateReport) {
        this.generateReport();
      }
      
      console.log('\n✅ Optimization completed!');
      return this.results;
      
    } catch (error) {
      this.results.errors.push(error.message);
      console.error('\n❌ Optimization failed:', error.message);
      throw error;
    }
  }

  validateConfig() {
    if (!STRATEGIES[this.config.strategy]) {
      throw new Error(`Invalid strategy: ${this.config.strategy}. Available: ${Object.keys(STRATEGIES).join(', ')}`);
    }
    
    if (this.config.buildDir && !fs.existsSync(this.config.buildDir)) {
      throw new Error(`Build dir missing: ${this.config.buildDir}`);
    }
  }

  async detectBuildDirectory() {
    if (this.config.buildDir) {
      return this.config.buildDir;
    }
    
    const paths = ['build', 'dist', 'out', 'public', 'build/static/js', 'dist/static/js', 'out/static/js'];
    
    for (const buildPath of paths) {
      if (fs.existsSync(buildPath)) {
        const jsFiles = this.findJSFiles(buildPath);
        if (jsFiles.length > 0) {
          return buildPath;
        }
      }
    }
    
    throw new Error('Build dir not found. Use --build-dir');
  }

  findJSFiles(dir) {
    const files = [];
    
    const traverse = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.js') && !item.includes('node_modules')) {
          files.push(fullPath);
        }
      }
    };
    
    traverse(dir);
    return files;
  }

  validateBuildDirectory(buildDir) {
    const jsFiles = this.findJSFiles(buildDir);
    
    if (jsFiles.length === 0) {
      throw new Error(`No JS files in build dir: ${buildDir}`);
    }
    
    const mainBundles = jsFiles.filter(file => {
      const basename = path.basename(file);
      return basename.startsWith('main.') || basename.startsWith('app.') || basename.startsWith('index.');
    });
    
    if (mainBundles.length === 0) {
      this.results.warnings.push('No main bundles detected. Optimization may not work.');
    }
    
    console.log(`📦 Found ${jsFiles.length} JS files`);
    console.log(`🎯 Found ${mainBundles.length} main bundles`);
  }

  selectStrategy() {
    const strategy = STRATEGIES[this.config.strategy];
    
    if (!strategy.function) {
      throw new Error(`Strategy ${this.config.strategy} not implemented`);
    }
    
    return strategy;
  }

  async runOptimization(strategy, buildDir) {
    try {
      const result = await strategy.function(buildDir);
      
      if (!result.success) {
        throw new Error(result.error || 'Optimization failed');
      }
      
      return result;
    } catch (error) {
      throw new Error(`${strategy.name} failed: ${error.message}`);
    }
  }

  processResults(result, strategy, processingTime) {
    this.results.strategy = strategy.name;
    this.results.originalSize = result.originalSize;
    this.results.optimizedSize = result.optimizedSize;
    this.results.reduction = result.reduction;
    this.results.processingTime = processingTime;
    this.results.files = [
      { type: 'optimized', path: result.optimizedBundlePath, size: result.optimizedSize },
      { type: 'manifest', path: result.manifestPath, size: result.manifestSize }
    ];
    
    if (result.backupPath) {
      this.results.files.push({ type: 'backup', path: result.backupPath, size: result.originalSize });
    }
    
    this.results.manifest = result.manifestPath;
  }

  generateReport() {
    const reportPath = path.join(process.cwd(), 'optimization-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      strategy: this.results.strategy,
      results: {
        originalSize: this.results.originalSize,
        optimizedSize: this.results.optimizedSize,
        reduction: this.results.reduction,
        processingTime: this.results.processingTime,
        savings: this.results.originalSize - this.results.optimizedSize
      },
      files: this.results.files,
      errors: this.results.errors,
      warnings: this.results.warnings
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Report: ${reportPath}`);
  }

  static showHelp() {
    console.log(`
🚀 Universal React Bundle Optimizer

Usage: node universal-optimizer.js [options]

Options:
  --strategy <name>     Optimization strategy
  --build-dir <path>    Build dir path
  --output-dir <path>   Output dir path
  --config <path>       Config file
  --help               Help

Strategies:
${Object.entries(STRATEGIES).map(([key, strategy]) => 
  `  ${key.padEnd(20)} ${strategy.name}${strategy.recommended ? ' (rec)' : ''}`
).join('\n')}

Examples:
  node universal-optimizer.js
  node universal-optimizer.js --strategy max-aggression
  node universal-optimizer.js --build-dir ./dist
`);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
        UniversalOptimizer.showHelp();
        process.exit(0);
        break;
        
      case '--strategy':
        options.strategy = args[++i];
        break;
        
      case '--build-dir':
        options.buildDir = args[++i];
        break;
        
      case '--output-dir':
        options.outputDir = args[++i];
        break;
        
      case '--config':
        const configPath = args[++i];
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          Object.assign(options, config);
        } else {
                  console.error(`Config not found: ${configPath}`);
        process.exit(1);
        }
        break;
        
      default:
        console.error(`Unknown option: ${arg}`);
        UniversalOptimizer.showHelp();
        process.exit(1);
    }
  }
  
  try {
    const optimizer = new UniversalOptimizer(options);
    const results = await optimizer.optimize();
    
    console.log('\n🎉 Summary:');
    console.log(`   Strategy: ${results.strategy}`);
    console.log(`   Original: ${(results.originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimized: ${(results.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Reduction: ${results.reduction.toFixed(2)}%`);
    console.log(`   Time: ${(results.processingTime / 1000).toFixed(2)}s`);
    
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { UniversalOptimizer };

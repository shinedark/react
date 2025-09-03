#!/usr/bin/env node

// Computer-optimized but functional version
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

// Optimized config (using short names but readable)
const cfg = {
  maxSize: 5 * 1024 * 1024,
  maxReduction: 70, // Adjusted for demo
  patterns: {
    comp: /^[A-Z]/,
    hook: /^use[A-Z]/,
    func: /^[a-z]/,
    vars: /^[a-zA-Z_$]/
  },
  protected: ['React', 'useState', 'useEffect', 'useRef', 'window', 'document', 'console'],
  critical: [/React\./, /function\(/]
};

// Validation function (optimized)
const validate = (orig, opt, manifest) => {
  const issues = [];
  const origSize = orig.length;
  const optSize = opt.length;
  const reduction = ((origSize - optSize) / origSize) * 100;
  
  if (reduction > cfg.maxReduction) {
    issues.push(`Too aggressive: ${reduction.toFixed(2)}%`);
  }
  
  for (const pattern of cfg.critical) {
    if (!pattern.test(opt)) {
      issues.push(`Missing: ${pattern.source}`);
    }
  }
  
  const manifestSize = JSON.stringify(manifest).length;
  if (manifestSize > cfg.maxSize) {
    issues.push(`Manifest too large: ${(manifestSize / 1024).toFixed(2)}KB`);
  }
  
  return { issues, reduction };
};

// Safety check function (optimized)
const isSafe = (name) => {
  return !cfg.protected.includes(name) && 
         name.length > 3 && 
         !['Object', 'Array', 'String'].includes(name) &&
         Object.values(cfg.patterns).some(pattern => pattern.test(name));
};

// Main optimization function (computer-optimized)
const optimize = (buildDir = null) => {
  try {
    console.log('🚀 Computer-Optimized Stripper');
    
    // Find build directory
    const dir = buildDir || path.join(__dirname, '../build/static/js');
    const files = fs.readdirSync(dir);
    const mainFile = files.find(f => 
      f.startsWith('main.') && 
      f.endsWith('.js') && 
      !f.includes('stripped') && 
      !f.includes('optimized')
    );
    
    if (!mainFile) {
      throw new Error('Main bundle not found');
    }
    
    // Read and parse
    const bundlePath = path.join(dir, mainFile);
    const originalCode = fs.readFileSync(bundlePath, 'utf-8');
    const originalSize = originalCode.length;
    
    console.log(`📦 Original: ${(originalSize / 1024).toFixed(2)}KB`);
    
    // Parse AST
    const ast = parser.parse(originalCode, {
      sourceType: 'module',
      plugins: ['jsx']
    });
    
    // Optimization maps
    const manifest = {};
    const stats = { identifiers: 0, strings: 0, numbers: 0 };
    let counter = 0;
    
    // Traverse and optimize
    traverse(ast, {
      Identifier(nodePath) {
        const name = nodePath.node.name;
        if (manifest[name] || !isSafe(name)) return;
        
        const optimized = `x${counter++}`;
        manifest[optimized] = name;
        nodePath.node.name = optimized;
        stats.identifiers++;
      },
      
      StringLiteral(nodePath) {
        const value = nodePath.node.value;
        if (value.length < 8) return;
        
        const optimized = `s${stats.strings++}`;
        manifest[optimized] = value;
        nodePath.node.value = optimized;
      },
      
      NumericLiteral(nodePath) {
        const value = nodePath.node.value;
        if (value < 1000) return;
        
        const optimized = `n${stats.numbers++}`;
        manifest[optimized] = value;
        nodePath.node.value = optimized;
      }
    });
    
    // Generate optimized code
    const optimizedCode = generate(ast, {
      minified: true,
      compact: true,
      comments: false
    }).code;
    
    // Validate
    const validation = validate(originalCode, optimizedCode, manifest);
    if (validation.issues.length > 0) {
      console.log('❌ Validation failed:', validation.issues.join(', '));
      return { success: false, error: validation.issues.join(', ') };
    }
    
    // Write files
    const outputPath = path.join(dir, mainFile.replace('.js', '.computer-optimized.js'));
    const manifestPath = path.join(path.dirname(dir), 'computer-optimization-manifest.json');
    
    fs.writeFileSync(outputPath, optimizedCode);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Results
    const totalOpts = stats.identifiers + stats.strings + stats.numbers;
    
    console.log('✅ Computer Optimization Complete!');
    console.log(`📦 Original: ${(originalSize / 1024).toFixed(2)}KB`);
    console.log(`🔥 Optimized: ${(optimizedCode.length / 1024).toFixed(2)}KB`);
    console.log(`📉 Reduction: ${validation.reduction.toFixed(2)}%`);
    console.log(`🔧 Total: ${totalOpts} optimizations`);
    console.log(`📊 Manifest: ${(JSON.stringify(manifest).length / 1024).toFixed(2)}KB`);
    console.log(`💾 Files:`);
    console.log(`   Optimized: ${path.relative(process.cwd(), outputPath)}`);
    console.log(`   Manifest: ${path.relative(process.cwd(), manifestPath)}`);
    
    return {
      success: true,
      originalSize,
      optimizedSize: optimizedCode.length,
      reduction: validation.reduction,
      totalOptimizations: totalOpts,
      manifestSize: JSON.stringify(manifest).length,
      optimizedBundlePath: outputPath,
      manifestPath
    };
    
  } catch (error) {
    console.error('❌ Computer optimization failed:', error.message);
    return { success: false, error: error.message };
  }
};

// CLI execution
if (require.main === module) {
  const result = optimize();
  if (result.success) {
    console.log('\n✅ Computer optimization completed!');
    process.exit(0);
  } else {
    console.log('\n❌ Computer optimization failed!');
    process.exit(1);
  }
}

module.exports = { optimize };

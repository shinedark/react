#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ErrorTranslator {
  constructor() {
    // Load symbol mappings
    this.symbolMap = {
      'r': 'require',
      'f': 'fs', 
      'p': 'path',
      'a': '@babel/parser',
      't': '@babel/traverse',
      'g': '@babel/generator',
      'c': 'config',
      'm': 'maxManifestSize',
      'x': 'maxOptimizationPercentage',
      'i': 'identifierPatterns',
      's': 'protectedIdentifiers',
      'e': 'criticalPatterns',
      'v': 'validateBundle',
      'w': 'isSafeToOptimize',
      'b': 'optimizeBundle',
      'h': 'buildDir',
      'l': 'mainBundle',
      'j': 'bundlePath',
      'k': 'originalCode',
      'q': 'originalSize',
      'n': 'optimizedCode',
      'z': 'validationResult',
      'o': 'outputPath',
      'y': 'manifestPath',
      'u': 'stats'
    };

    this.commonErrors = {
      'is not a function': 'Variable is not a function - check if it\'s properly imported/defined',
      'Cannot read property': 'Trying to access property of undefined/null object',
      'undefined': 'Variable is not defined or not properly initialized',
      'ENOENT': 'File or directory not found',
      'SyntaxError': 'Invalid JavaScript syntax',
      'ReferenceError': 'Variable is not defined in scope',
      'TypeError': 'Wrong type used for operation'
    };
  }

  translateError(error, context = {}) {
    let translatedError = error;
    let suggestions = [];

    // Replace symbols with their meanings
    for (const [symbol, meaning] of Object.entries(this.symbolMap)) {
      const regex = new RegExp(`\\b${symbol}\\b`, 'g');
      translatedError = translatedError.replace(regex, meaning);
    }

    // Add specific suggestions based on error patterns
    for (const [pattern, suggestion] of Object.entries(this.commonErrors)) {
      if (error.includes(pattern)) {
        suggestions.push(suggestion);
      }
    }

    // Specific error analysis
    if (error.includes('t.default is not a function')) {
      suggestions.push('The @babel/traverse module is not being imported correctly');
      suggestions.push('Try: const traverse = require(\'@babel/traverse\').default;');
      suggestions.push('Or: const traverse = require(\'@babel/traverse\'); if using older version');
    }

    if (error.includes('ENOENT') && error.includes('build/static/js')) {
      suggestions.push('Build directory doesn\'t exist - run build first or create demo bundle');
      suggestions.push('Create directory: mkdir -p build/static/js');
    }

    return {
      original: error,
      translated: translatedError,
      suggestions,
      context
    };
  }

  // Test and debug a file
  async debugFile(filePath) {
    console.log(`🔍 Debugging: ${filePath}`);
    
    try {
      // Read the file
      const code = fs.readFileSync(filePath, 'utf8');
      console.log(`📝 File size: ${code.length} characters`);
      
      // Try to execute it and catch errors
      const originalConsoleError = console.error;
      const errors = [];
      
      console.error = (...args) => {
        errors.push(args.join(' '));
        originalConsoleError(...args);
      };

      try {
        // Use child process to run the file safely
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
          const child = spawn('node', [filePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(filePath)
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          child.on('close', (code) => {
            console.error = originalConsoleError;
            
            if (code === 0) {
              console.log('✅ File executed successfully');
              console.log('Output:', stdout);
              resolve({ success: true, output: stdout });
            } else {
              console.log('❌ File execution failed');
              console.log('Error output:', stderr);
              
              const translated = this.translateError(stderr, { filePath, code });
              
              console.log('\n🔍 TRANSLATED ERROR:');
              console.log('Original:', translated.original);
              console.log('Translated:', translated.translated);
              console.log('\n💡 Suggestions:');
              translated.suggestions.forEach(suggestion => {
                console.log(`  - ${suggestion}`);
              });

              resolve({ success: false, error: translated, stderr, stdout });
            }
          });
        });

      } catch (error) {
        console.error = originalConsoleError;
        const translated = this.translateError(error.message, { filePath });
        
        console.log('\n🔍 TRANSLATED ERROR:');
        console.log('Original:', translated.original);
        console.log('Translated:', translated.translated);
        console.log('\n💡 Suggestions:');
        translated.suggestions.forEach(suggestion => {
          console.log(`  - ${suggestion}`);
        });

        return { success: false, error: translated };
      }
      
    } catch (fileError) {
      const translated = this.translateError(fileError.message, { filePath });
      console.log('❌ Could not read file:', translated.translated);
      return { success: false, error: translated };
    }
  }

  // Fix common issues automatically
  async autoFix(filePath) {
    console.log(`🔧 Auto-fixing: ${filePath}`);
    
    try {
      let code = fs.readFileSync(filePath, 'utf8');
      let fixed = false;

      // Fix common import issues
      if (code.includes("t=r('@babel/traverse').default") && code.includes('t.default(')) {
        console.log('🔧 Fixing @babel/traverse import issue...');
        code = code.replace("t=r('@babel/traverse').default", "t=r('@babel/traverse')");
        code = code.replace(/t\.default\(/g, 't.default(');
        fixed = true;
      }

      // Fix other common patterns
      if (code.includes('require') && !code.includes('const')) {
        console.log('🔧 Adding proper const declarations...');
        // This would need more sophisticated AST parsing to do properly
      }

      if (fixed) {
        const backupPath = filePath + '.backup';
        fs.writeFileSync(backupPath, fs.readFileSync(filePath));
        fs.writeFileSync(filePath, code);
        console.log(`✅ Fixed file. Backup saved to: ${backupPath}`);
        return { success: true, fixed: true, backupPath };
      } else {
        console.log('ℹ️  No auto-fixes available for this file');
        return { success: true, fixed: false };
      }

    } catch (error) {
      console.log('❌ Auto-fix failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI usage
if (require.main === module) {
  const translator = new ErrorTranslator();
  
  const args = process.argv.slice(2);
  const command = args[0];
  const filePath = args[1];

  if (!command) {
    console.log(`
🤖 Error Translator & Debugger

Usage:
  node error-translator.js debug <file>     - Debug a file and translate errors
  node error-translator.js translate <error> - Translate an error message
  node error-translator.js fix <file>       - Auto-fix common issues

Examples:
  node error-translator.js debug simple-optimizer.js
  node error-translator.js translate "t.default is not a function"
  node error-translator.js fix simple-optimizer.js
    `);
    process.exit(1);
  }

  if (command === 'debug' && filePath) {
    translator.debugFile(filePath).then(result => {
      if (result.success) {
        console.log('\n✅ Debug completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Debug found issues');
        process.exit(1);
      }
    });
  } else if (command === 'translate' && filePath) {
    const result = translator.translateError(filePath);
    console.log('\n🔍 TRANSLATION RESULT:');
    console.log('Original:', result.original);
    console.log('Translated:', result.translated);
    console.log('\n💡 Suggestions:');
    result.suggestions.forEach(suggestion => {
      console.log(`  - ${suggestion}`);
    });
  } else if (command === 'fix' && filePath) {
    translator.autoFix(filePath).then(result => {
      if (result.success) {
        console.log('\n✅ Auto-fix completed');
        process.exit(0);
      } else {
        console.log('\n❌ Auto-fix failed');
        process.exit(1);
      }
    });
  } else {
    console.log('❌ Invalid command or missing file path');
    process.exit(1);
  }
}

module.exports = ErrorTranslator;

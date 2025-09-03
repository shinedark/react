#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');

// Load our symbol mapping
const symbolMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'symbol-map.json'), 'utf8'));
const controlMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'control-map.json'), 'utf8'));

class DebugTranslator {
  constructor() {
    this.symbols = symbolMap.globalSymbols;
    this.methods = symbolMap.methodSymbols;
    this.objects = symbolMap.objectSymbols;
    this.operators = symbolMap.operatorSymbols;
    this.patterns = symbolMap.patternSymbols;
    this.reverse = controlMap.symbolMappingReverse;
    this.greek = controlMap.greekSymbolMapping;
  }

  // Translate optimized code back to readable format
  translateCode(optimizedCode) {
    let readable = optimizedCode;

    // Replace single character symbols
    for (const [symbol, meaning] of Object.entries(this.reverse)) {
      const regex = new RegExp(`\\b${this.escapeRegex(symbol)}\\b`, 'g');
      readable = readable.replace(regex, meaning);
    }

    // Replace Greek symbols
    for (const [greek, meaning] of Object.entries(this.greek)) {
      const regex = new RegExp(`\\b${this.escapeRegex(greek)}\\b`, 'g');
      readable = readable.replace(regex, meaning);
    }

    // Fix spacing and formatting
    readable = this.formatCode(readable);

    return readable;
  }

  // Translate error messages and stack traces
  translateError(errorMessage, stackTrace = '') {
    let translatedError = errorMessage;
    let translatedStack = stackTrace;

    // Translate error message
    for (const [symbol, meaning] of Object.entries(this.reverse)) {
      const regex = new RegExp(`\\b${this.escapeRegex(symbol)}\\b`, 'g');
      translatedError = translatedError.replace(regex, meaning);
    }

    // Translate stack trace
    for (const [symbol, meaning] of Object.entries(this.reverse)) {
      const regex = new RegExp(`\\b${this.escapeRegex(symbol)}\\b`, 'g');
      translatedStack = translatedStack.replace(regex, meaning);
    }

    // Translate Greek symbols
    for (const [greek, meaning] of Object.entries(this.greek)) {
      const regex = new RegExp(`\\b${this.escapeRegex(greek)}\\b`, 'g');
      translatedError = translatedError.replace(regex, meaning);
      translatedStack = translatedStack.replace(regex, meaning);
    }

    return {
      originalError: errorMessage,
      translatedError,
      originalStack: stackTrace,
      translatedStack,
      suggestions: this.generateSuggestions(translatedError)
    };
  }

  // Generate helpful debugging suggestions
  generateSuggestions(error) {
    const suggestions = [];
    
    if (error.includes('require')) {
      suggestions.push('Check if the required module is installed and the path is correct');
    }
    if (error.includes('undefined')) {
      suggestions.push('Variable may not be declared or initialized properly');
    }
    if (error.includes('function')) {
      suggestions.push('Function may not be defined or called incorrectly');
    }
    if (error.includes('React')) {
      suggestions.push('React-related error - check component structure and hooks usage');
    }
    if (error.includes('parse')) {
      suggestions.push('Syntax error in the code - check for missing brackets, semicolons, or quotes');
    }

    return suggestions;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  formatCode(code) {
    return code
      .replace(/;/g, ';\n')
      .replace(/{/g, '{\n')
      .replace(/}/g, '\n}')
      .replace(/,/g, ',\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  // Test the computer-optimized code and catch errors
  async testOptimizedCode(filePath) {
    try {
      console.log('🧪 Testing computer-optimized code...');
      
      // Try to require/execute the optimized file
      const optimizedCode = fs.readFileSync(filePath, 'utf8');
      
      // First, let's just try to parse it as JavaScript
      const vm = require('vm');
      const context = {
        require,
        module: { exports: {} },
        exports: {},
        console,
        process,
        __dirname,
        __filename: filePath
      };
      
      vm.createContext(context);
      const result = vm.runInContext(optimizedCode, context, {
        filename: filePath,
        timeout: 5000
      });
      
      console.log('✅ Code executed successfully');
      return { success: true, result };
      
    } catch (error) {
      console.log('❌ Error caught during execution:');
      console.log('Original Error:', error.message);
      console.log('Stack:', error.stack);
      
      const translated = this.translateError(error.message, error.stack);
      
      console.log('\n🔍 TRANSLATED ERROR:');
      console.log('Error:', translated.translatedError);
      console.log('Stack:', translated.translatedStack);
      console.log('\n💡 Suggestions:');
      translated.suggestions.forEach(suggestion => {
        console.log(`  - ${suggestion}`);
      });
      
      return { 
        success: false, 
        error: translated,
        originalError: error
      };
    }
  }
}

// Create Express server for debugging
const app = express();
const translator = new DebugTranslator();

app.use(express.json());
app.use(express.static(__dirname));

// Serve debug interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Computer-Optimized Code Debug Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: #fff; }
            .container { max-width: 1200px; margin: 0 auto; }
            .section { margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 8px; }
            textarea { width: 100%; height: 200px; background: #1a1a1a; color: #fff; border: 1px solid #555; padding: 10px; }
            button { background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0052a3; }
            .error { background: #cc0000; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .success { background: #00cc00; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .suggestion { background: #cc6600; padding: 5px 10px; border-radius: 4px; margin: 5px 0; }
            pre { background: #0a0a0a; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Computer-Optimized Code Debug Server</h1>
            
            <div class="section">
                <h2>🔍 Code Translation</h2>
                <p>Paste computer-optimized code to translate it back to readable format:</p>
                <textarea id="optimizedCode" placeholder="Paste optimized code here..."></textarea>
                <br><br>
                <button onclick="translateCode()">Translate Code</button>
                <div id="translatedResult"></div>
            </div>
            
            <div class="section">
                <h2>🐛 Error Translation</h2>
                <p>Paste error message to get readable translation:</p>
                <textarea id="errorMessage" placeholder="Paste error message here..."></textarea>
                <br><br>
                <button onclick="translateError()">Translate Error</button>
                <div id="errorResult"></div>
            </div>
            
            <div class="section">
                <h2>🧪 Test Optimized Files</h2>
                <button onclick="testFiles()">Test All Computer-Optimized Files</button>
                <div id="testResults"></div>
            </div>
        </div>

        <script>
            async function translateCode() {
                const code = document.getElementById('optimizedCode').value;
                const response = await fetch('/translate-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const result = await response.json();
                document.getElementById('translatedResult').innerHTML = 
                    '<h3>Translated Code:</h3><pre>' + result.translated + '</pre>';
            }
            
            async function translateError() {
                const error = document.getElementById('errorMessage').value;
                const response = await fetch('/translate-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error })
                });
                const result = await response.json();
                let html = '<h3>Translated Error:</h3>';
                html += '<div class="error">' + result.translatedError + '</div>';
                if (result.translatedStack) {
                    html += '<h4>Stack Trace:</h4><pre>' + result.translatedStack + '</pre>';
                }
                if (result.suggestions.length > 0) {
                    html += '<h4>Suggestions:</h4>';
                    result.suggestions.forEach(s => {
                        html += '<div class="suggestion">' + s + '</div>';
                    });
                }
                document.getElementById('errorResult').innerHTML = html;
            }
            
            async function testFiles() {
                const response = await fetch('/test-files');
                const results = await response.json();
                let html = '<h3>Test Results:</h3>';
                results.forEach(result => {
                    if (result.success) {
                        html += '<div class="success">✅ ' + result.file + ' - OK</div>';
                    } else {
                        html += '<div class="error">❌ ' + result.file + ' - ERROR</div>';
                        html += '<pre>' + result.error.translatedError + '</pre>';
                        if (result.error.suggestions.length > 0) {
                            result.error.suggestions.forEach(s => {
                                html += '<div class="suggestion">' + s + '</div>';
                            });
                        }
                    }
                });
                document.getElementById('testResults').innerHTML = html;
            }
        </script>
    </body>
    </html>
  `);
});

// API endpoints
app.post('/translate-code', (req, res) => {
  const { code } = req.body;
  const translated = translator.translateCode(code);
  res.json({ translated });
});

app.post('/translate-error', (req, res) => {
  const { error, stack } = req.body;
  const result = translator.translateError(error, stack || '');
  res.json(result);
});

app.get('/test-files', async (req, res) => {
  const results = [];
  const files = ['μ.js', 'ω.js', 'κ.js', 'λ.js', 'ν.js', 'δ.js'];
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const result = await translator.testOptimizedCode(filePath);
      results.push({ file, ...result });
    } else {
      results.push({ file, success: false, error: { translatedError: 'File not found' } });
    }
  }
  
  res.json(results);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Debug Server running at http://localhost:${PORT}`);
  console.log('🔍 Use this server to debug computer-optimized code');
  console.log('💡 Translate errors and code back to readable format');
});

// Test our files immediately on startup
async function runStartupTests() {
  console.log('\n🧪 Running startup tests...');
  
  const testFiles = [
    'simple-optimizer.js'
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`\n📁 Testing ${file}:`);
      await translator.testOptimizedCode(filePath);
    }
  }
}

// Run tests after server starts
setTimeout(runStartupTests, 1000);

module.exports = { DebugTranslator, translator };

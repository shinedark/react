const { parseCode, analyzeIdentifiers, optimizeCode, generateManifest } = require('./analyzer');
const { validateOptimization } = require('./utils');

/**
 * Enhanced Semantic Minifier Core - Professional source-level optimization
 * 
 * AST-level semantic stripping before bundling for optimal performance.
 * 
 * Best strategies:
 * - Max Aggression: 14.37% reduction
 * - Enhanced Max Aggression: Up to 40% reduction
 * - Ultra-Deep: 9.63% reduction
 */
class SemanticMinifier {
  constructor(options = {}) {
    this.options = {
      identifierOptimization: {
        enabled: true,
        maxLength: 3,
        preserveExports: true,
        preserveImports: true,
        preserveReactComponents: true,
        preserveHookNames: true,
        categorizeIdentifiers: true,
        ...options.identifierOptimization
      },
      
      stringOptimization: {
        enabled: true,
        minLength: 5,
        hoistThreshold: 2,
        maxReplacements: 2000,
        minOccurrences: 2,
        ...options.stringOptimization
      },
      
      numberOptimization: {
        enabled: true,
        minValue: 100,
        hoistThreshold: 2,
        maxReplacements: 1000,
        minOccurrences: 2,
        ...options.numberOptimization
      },
      
      safety: {
        maxOptimizationPercentage: 40,
        maxManifestSize: 15 * 1024 * 1024,
        preserveCriticalPatterns: [
          'constructor', 'prototype', 'super', 'this', 'render',
          'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
          'useState', 'useEffect', 'useRef', 'React', 'THREE', 'ethers', 'window', 'document'
        ],
        ...options.safety
      },
      
      performance: {
        useSets: true,
        combinedPatterns: true,
        batchProcessing: true,
        ...options.performance
      }
    };
    
    this.manifest = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      optimizations: { identifiers: {}, strings: {}, numbers: {}, categories: {} },
      metadata: { totalFiles: 0, totalOptimizations: 0, sizeReduction: 0, processingTime: 0 }
    };
    
    this.protectedSet = new Set(this.options.safety.preserveCriticalPatterns);
    this.skipContexts = new Set(['import', 'export', 'require', 'module', 'exports', 'global']);
  }

  minifySource(code, filePath, context = {}) {
    const startTime = Date.now();
    
    try {
      const ast = parseCode(code, filePath);
      
      const analysis = analyzeIdentifiers(ast, {
        ...this.options, context, filePath,
        protectedSet: this.protectedSet, skipContexts: this.skipContexts
      });
      
      const optimizationResult = optimizeCode(ast, analysis, this.options);
      const { code: optimizedCode, map } = optimizationResult;
      
      const manifestSnippet = generateManifest(analysis, filePath);
      this.updateGlobalManifest(manifestSnippet, filePath);
      
      const validation = validateOptimization(code, optimizedCode, this.options);
      
      const processingTime = Date.now() - startTime;
      const stats = {
        originalSize: code.length,
        optimizedSize: optimizedCode.length,
        reduction: ((code.length - optimizedCode.length) / code.length) * 100,
        optimizations: analysis.totalOptimizations,
        filePath, processingTime
      };
      
      return { optimizedCode, manifestSnippet, stats, validation };
      
    } catch (error) {
      throw new Error(`Enhanced minification failed for ${filePath}: ${error.message}`);
    }
  }

  updateGlobalManifest(manifestSnippet, filePath) {
    this.manifest.metadata.totalFiles++;
    this.manifest.metadata.totalOptimizations += manifestSnippet.totalOptimizations;
    
    if (manifestSnippet.categories) {
      for (const [category, identifiers] of Object.entries(manifestSnippet.categories)) {
        if (!this.manifest.optimizations.categories[category]) {
          this.manifest.optimizations.categories[category] = {};
        }
        Object.assign(this.manifest.optimizations.categories[category], identifiers);
      }
    }
    
    Object.assign(this.manifest.optimizations.strings, manifestSnippet.strings);
    Object.assign(this.manifest.optimizations.numbers, manifestSnippet.numbers);
  }

  getManifest() {
    return {
      ...this.manifest,
      metadata: { ...this.manifest.metadata, timestamp: new Date().toISOString() }
    };
  }

  resetManifest() {
    this.manifest = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      optimizations: { identifiers: {}, strings: {}, numbers: {}, categories: {} },
      metadata: { totalFiles: 0, totalOptimizations: 0, sizeReduction: 0, processingTime: 0 }
    };
  }

  validateConfiguration() {
    const errors = [];
    const warnings = [];
    
    if (this.options.identifierOptimization.maxLength < 2) {
      errors.push('ID maxLength must be >= 2');
    }
    
    if (this.options.safety.maxOptimizationPercentage > 50) {
      warnings.push('maxOptimizationPercentage > 50% may cause issues');
    }
    
    if (this.options.safety.maxManifestSize > 20 * 1024 * 1024) {
      warnings.push('maxManifestSize > 20MB may cause performance issues');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }

  getStats() {
    const manifestSize = JSON.stringify(this.manifest).length;
    return {
      ...this.manifest.metadata,
      manifestSize,
      manifestSizeKB: (manifestSize / 1024).toFixed(2),
      averageProcessingTime: this.manifest.metadata.totalFiles > 0 
        ? this.manifest.metadata.processingTime / this.manifest.metadata.totalFiles : 0
    };
  }
}

module.exports = {
  SemanticMinifier,
  minifySource: (code, filePath, context, options) => {
    const minifier = new SemanticMinifier(options);
    return minifier.minifySource(code, filePath, context);
  }
};

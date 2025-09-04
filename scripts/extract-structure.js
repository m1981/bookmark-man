#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import { fileURLToPath } from 'url';

function parseFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy']
    });
  } catch (error) {
    console.warn(`Failed to parse ${filePath}: ${error.message}`);
    return null;
  }
}

function getParamSignature(param) {
  if (!param) return '';
  if (param.type === 'Identifier') return param.name;
  if (param.type === 'AssignmentPattern') {
    const left = param.left.name || 'param';
    return `${left} = default`;
  }
  if (param.type === 'RestElement') return `...${param.argument.name}`;
  if (param.type === 'ObjectPattern') return '{}';
  if (param.type === 'ArrayPattern') return '[]';
  return 'param';
}

function extractClassMethods(classNode) {
  const methods = [];
  
  if (!classNode.body || !classNode.body.body) return methods;
  
  classNode.body.body.forEach(member => {
    // Handle both ClassMethod and MethodDefinition
    if (member.type === 'ClassMethod' || member.type === 'MethodDefinition') {
      const methodName = member.key.name || member.key.value || 'unknown';
      
      // For ClassMethod, params are directly on the member
      // For MethodDefinition, params are on member.value
      const params = member.params || member.value?.params || [];
      const paramSignatures = params.map(getParamSignature).join(', ');
      
      // For ClassMethod, async is directly on the member
      // For MethodDefinition, async is on member.value
      const async = member.async || member.value?.async ? 'async ' : '';
      const isStatic = member.static ? 'static ' : '';
      
      if (member.kind === 'constructor') {
        methods.push(`constructor(${paramSignatures})`);
      } else {
        methods.push(`${isStatic}${async}${methodName}(${paramSignatures})`);
      }
    }
  });
  
  return methods;
}

function extractExports(ast) {
  const exports = { functions: [], classes: [] };
  
  function traverseTopLevel(node) {
    if (!node || typeof node !== 'object') return;
    
    // Handle export declarations
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'ClassDeclaration') {
        const className = node.declaration.id?.name || 'DefaultClass';
        const methods = extractClassMethods(node.declaration);
        exports.classes.push({ name: className, methods });
      } else if (node.declaration.type === 'FunctionDeclaration') {
        const params = node.declaration.params.map(getParamSignature).join(', ');
        const async = node.declaration.async ? 'async ' : '';
        const name = node.declaration.id?.name || 'default';
        exports.functions.push(`${async}${name}(${params})`);
      }
    } else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.type === 'ClassDeclaration') {
        const className = node.declaration.id?.name;
        const methods = extractClassMethods(node.declaration);
        exports.classes.push({ name: className, methods });
      } else if (node.declaration?.type === 'FunctionDeclaration') {
        const params = node.declaration.params.map(getParamSignature).join(', ');
        const async = node.declaration.async ? 'async ' : '';
        const name = node.declaration.id?.name;
        exports.functions.push(`${async}${name}(${params})`);
      }
    } else if (node.type === 'ClassDeclaration') {
      const className = node.id?.name;
      if (className) {
        const methods = extractClassMethods(node);
        exports.classes.push({ name: className, methods });
      }
    } else if (node.type === 'FunctionDeclaration') {
      const params = node.params.map(getParamSignature).join(', ');
      const async = node.async ? 'async ' : '';
      const name = node.id?.name;
      if (name) {
        exports.functions.push(`${async}${name}(${params})`);
      }
    }
  }
  
  // Fix: Use ast.program.body instead of ast.body
  if (ast.program && ast.program.body && Array.isArray(ast.program.body)) {
    ast.program.body.forEach(traverseTopLevel);
  }
  
  return exports;
}

function scanDirectory(dir, extensions = ['.js', '.ts']) {
  const results = {};
  
  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) {
      return;
    }
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        const ast = parseFile(fullPath);
        if (ast) {
          const relativePath = path.relative(process.cwd(), fullPath);
          results[relativePath] = extractExports(ast);
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

function generateReport(results) {
  for (const [filePath, exports] of Object.entries(results)) {
    const hasExports = exports.functions.length || exports.classes.length;
    
    if (!hasExports) continue;
    
    console.log(filePath);
    
    exports.classes.forEach(cls => {
      console.log(`  ${cls.name}`);
      cls.methods.forEach(method => {
        console.log(`    ${method}`);
      });
    });
    
    exports.functions.forEach(func => {
      console.log(`  ${func}`);
    });
    
    console.log();
  }
}

// Main execution
const srcDir = path.join(process.cwd(), 'src');
const results = scanDirectory(srcDir);
generateReport(results);
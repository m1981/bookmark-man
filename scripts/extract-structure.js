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

function extractClassMethods(classNode, className) {
  console.log(`\n=== DEBUG: Extracting methods for class: ${className} ===`);

  const methods = [];

  if (!classNode.body || !classNode.body.body) {
    console.log(`No class body found for ${className}`);
    return methods;
  }

  classNode.body.body.forEach((member, index) => {
    console.log(`\nMember ${index}: ${member.type} - ${member.key?.name}`);

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
        const signature = `constructor(${paramSignatures})`;
        console.log(`  -> Adding constructor: ${signature}`);
        methods.push(signature);
      } else {
        const signature = `${isStatic}${async}${methodName}(${paramSignatures})`;
        console.log(`  -> Adding method: ${signature}`);
        methods.push(signature);
      }
    } else {
      console.log(`  -> Skipping ${member.type}`);
    }
  });

  console.log(`\nTotal methods found for ${className}: ${methods.length}`);
  console.log(`=== END DEBUG for ${className} ===\n`);

  return methods;
}

function extractFromNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}Node type: ${node.type}`);

  const result = { functions: [], classes: [] };

  if (node.type === 'ExportDefaultDeclaration') {
    console.log(`${indent}Found ExportDefaultDeclaration`);
    console.log(`${indent}Declaration type: ${node.declaration?.type}`);

    if (node.declaration.type === 'ClassDeclaration') {
      const className = node.declaration.id?.name || 'DefaultClass';
      console.log(`${indent}Found exported class: ${className}`);
      const methods = extractClassMethods(node.declaration, className);
      result.classes.push({ name: className, methods });
    } else if (node.declaration.type === 'FunctionDeclaration') {
      const params = node.declaration.params.map(getParamSignature).join(', ');
      const async = node.declaration.async ? 'async ' : '';
      const name = node.declaration.id?.name || 'default';
      const signature = `${async}${name}(${params})`;
      console.log(`${indent}Found exported function: ${signature}`);
      result.functions.push(signature);
    }
  } else if (node.type === 'ExportNamedDeclaration') {
    console.log(`${indent}Found ExportNamedDeclaration`);
    console.log(`${indent}Declaration type: ${node.declaration?.type}`);

    if (node.declaration?.type === 'ClassDeclaration') {
      const className = node.declaration.id?.name;
      console.log(`${indent}Found named exported class: ${className}`);
      const methods = extractClassMethods(node.declaration, className);
      result.classes.push({ name: className, methods });
    } else if (node.declaration?.type === 'FunctionDeclaration') {
      const params = node.declaration.params.map(getParamSignature).join(', ');
      const async = node.declaration.async ? 'async ' : '';
      const name = node.declaration.id?.name;
      const signature = `${async}${name}(${params})`;
      console.log(`${indent}Found named exported function: ${signature}`);
      result.functions.push(signature);
    }
  } else if (node.type === 'FunctionDeclaration') {
    const params = node.params.map(getParamSignature).join(', ');
    const async = node.async ? 'async ' : '';
    const name = node.id?.name;
    if (name) {
      const signature = `${async}${name}(${params})`;
      console.log(`${indent}Found function declaration: ${signature}`);
      result.functions.push(signature);
    }
  }

  return result;
}

function extractExports(ast, filePath) {
  console.log(`\n\n=== PROCESSING FILE: ${filePath} ===`);
  const exports = { functions: [], classes: [] };

  function traverse(node, depth = 0) {
    if (!node || typeof node !== 'object') return;

    const extracted = extractFromNode(node, depth);
    exports.functions.push(...extracted.functions);
    exports.classes.push(...extracted.classes);

    // Traverse children
    for (const key in node) {
      if (key === 'body' && Array.isArray(node[key])) {
        console.log(`${'  '.repeat(depth)}Traversing body array with ${node[key].length} items`);
        node[key].forEach((child, index) => {
          console.log(`${'  '.repeat(depth)}Body item ${index}:`);
          traverse(child, depth + 1);
        });
      } else if (Array.isArray(node[key])) {
        node[key].forEach(child => traverse(child, depth + 1));
      } else if (typeof node[key] === 'object') {
        traverse(node[key], depth + 1);
      }
    }
  }

  traverse(ast);

  console.log(`\nFINAL RESULTS for ${filePath}:`);
  console.log(`Classes found: ${exports.classes.length}`);
  console.log(`Functions found: ${exports.functions.length}`);
  exports.classes.forEach(cls => {
    console.log(`  Class: ${cls.name} with ${cls.methods.length} methods`);
  });
  console.log(`=== END PROCESSING ${filePath} ===\n\n`);

  return exports;
}

function scanDirectory(dir, extensions = ['.js', '.ts']) {
  const results = {};

  function scan(currentDir) {
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
          // Only process BookmarkRestructuringService for debugging
          if (relativePath.includes('BookmarkRestructuringService')) {
            results[relativePath] = extractExports(ast, relativePath);
          }
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
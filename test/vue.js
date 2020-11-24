const generate = require('@babel/generator');
const { readFileSync } = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse');
const t = require('@babel/types');
const prettier = require('prettier')

const oldEntry = readFileSync('./index.vue', 'utf-8');
const ast = parseContent(oldEntry);

function parseContent(code) {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'decorators-legacy', 'typescript', 'classProperties', 'dynamicImport'],
  });
}


console.log(ast);
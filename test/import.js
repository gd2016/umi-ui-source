const uppercamelcase = require('uppercamelcase');
const generate = require('@babel/generator');
const { findLastIndex } = require('lodash');
const { readFileSync } = require('fs');
const prettier = require('prettier')
const parser = require('@babel/parser');
const traverse = require('@babel/traverse');
const t = require('@babel/types');

const oldEntry = readFileSync('./import.tsx', 'utf-8');
const ast = parseContent(oldEntry);
console.dir(ast);
traverse.default(ast, {
  Program: {
    enter(path) {
      const { node } = path;
      let d = findExportDefaultDeclaration(node);
      // // support hoc
      while (t.isCallExpression(d)) {
        // eslint-disable-next-line
        d = d.arguments[0];
      }
      
      d = getIdentifierDeclaration(d, path);
      console.log(d);
      return 
      // // Support hoc again
      while (t.isCallExpression(d)) {
        // eslint-disable-next-line
        d = d.arguments[0];
      }
      const ret = getReturnNode(d, path);
      const id = uppercamelcase('ButtonBasic');
      addImport(node, id);

      addBlockToJSX({
        ...ret,
        id,
        newNode: null,
      });
      const newCode = generate.default(ast, {}).code;

      const fprmatCode = prettier.format(newCode, {
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
        parser: 'typescript',
      });
      return console.log(fprmatCode);
    },
  },
  CallExpression(path, state) {
    // console.log(path.node);
  },
  Identifier(path) {
    // console.log(path.node.name);
  }
});


function addImport(node, id) {
  const { body } = node;
  const lastImportSit = findLastIndex(body, item => t.isImportDeclaration(item));
  const newImport = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier(id))],
    t.stringLiteral('./ButtonBasic'),
  );
  body.splice(lastImportSit + 1, 0, newImport);
}

function addBlockToJSX({ newNode, node, replace, id }) {
  const index = 0;

  // Build new node
  if (!newNode) {
    newNode = t.jsxElement(t.jsxOpeningElement(t.jsxIdentifier(id), [], true), null, [], true);
  }
  if (haveChildren(node)) {
    // 是否最后插入
    // if (latest) {
    //   node.children.push(newNode);
    // } else {
    const insertIndex = findIndex(node.children, index, isJSXElement);
    node.children.splice(insertIndex, 0, newNode);
    // }
  } else {
    replace(
      t.jsxFragment(
        t.jsxOpeningFragment(),
        t.jsxClosingFragment(),
        index === 0 ? [newNode, node] : [node, newNode],
      ),
    );
  }
}

function parseContent(code) {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'decorators-legacy', 'typescript', 'classProperties', 'dynamicImport'],
  });
}


function findExportDefaultDeclaration(programNode) {
  for (const n of programNode.body) {
    if (t.isExportDefaultDeclaration(n)) {
      return n.declaration;
    }
  }
}


function getIdentifierDeclaration(node, path) {
  let identifierNode = node;
  // 处理 HOC 的情况，将 HOC 里的 Identifier 筛选出来
  if (
    t.isCallExpression(node) &&
    node.arguments?.length > 0 &&
    node.arguments.some(argument => t.isIdentifier(argument))
  ) {
    identifierNode = node.arguments.find(argument => t.isIdentifier(argument));
  }
  if (t.isIdentifier(identifierNode) && path.scope.hasBinding(identifierNode.name)) {
    let bindingNode = path.scope.getBinding(identifierNode.name).path.node;
    if (t.isVariableDeclarator(bindingNode)) {
      bindingNode = bindingNode.init;
    }
    return bindingNode;
  }
  return node;
}

function isReactCreateElement(node) {
  return (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: 'React' }) &&
    t.isIdentifier(node.callee.property, { name: 'createElement' })
  );
}

function isJSXElement(node) {
  return t.isJSXElement(node) || t.isJSXFragment(node) || isReactCreateElement(node);
}

function haveChildren(node) {
  if (t.isJSXElement(node) || t.isJSXFragment(node)) {
    return node.children && node.children.length;
  }
  return !!node.arguments[2];
}


function getReturnNode(node, path) {
  if (
    t.isArrowFunctionExpression(node) ||
    t.isFunctionDeclaration(node) ||
    t.isFunctionExpression(node)
  ) {
    return findReturnNode(node, path);
  }
  if (t.isClassDeclaration(node) || t.isClassExpression(node)) {
    const renderStatement = findRenderStatement(node.body);
    if (renderStatement) {
      return findReturnNode(renderStatement, path);
    }
  }
}

function findReturnNode(node, path) {
  if (isJSXElement(node.body)) {
    return {
      node: node.body,
      replace(newNode) {
        node.body = newNode;
      },
    };
  }
  if (t.isBlockStatement(node.body)) {
    for (const n of node.body.body) {
      if (t.isReturnStatement(n)) {
        return {
          node: n.argument,
          replace(newNode) {
            n.argument = newNode;
          },
        };
      }
    }
  }

  // if (t.isConditionalExpression(node.body)) {
  //   return getReturnNode({
  //     body: getIdentifierDeclaration(node.body.consequent, path),
  //   }, path);
  // }

  // throw new Error(`Find return statement failed, unsupported node type ${node.body.type}.`);
}

function findRenderStatement(node) {
  for (const n of node.body) {
    if (t.isClassMethod(n) && t.isIdentifier(n.key) && n.key.name === 'render') {
      return n;
    }
  }
  // throw new Error(`Find render statement failed`);
}

function findIndex(arr, index, fn) {
  if (index === 0) return 0;
  let foundCount = 0;

  for (const [i, item] of arr.entries()) {
    if (fn(item)) {
      foundCount += 1;
    }
    if (foundCount === index) {
      return i + 1;
    }
  }

  throw new Error(`Invalid find index params.`);
}

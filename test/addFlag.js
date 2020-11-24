const generate = require('@babel/generator');
const { readFileSync } = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse');
const t = require('@babel/types');
const prettier = require('prettier')

const oldEntry = readFileSync('./import.tsx', 'utf-8');
const ast = parseContent(oldEntry);

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
      // // Support hoc again
      while (t.isCallExpression(d)) {
        // eslint-disable-next-line
        d = d.arguments[0];
      }
      const ret = getReturnNode(d, path);
      if (ret) {
        const { node: retNode, replace } = ret;
        addUmiUIFlag(retNode, {
          filename: 'filename',
          replace,
        });
      }

      // TODO: check id exists
      // const attrs = [
      //   t.jsxAttribute(t.jsxIdentifier('filename'), t.stringLiteral(`test`)),
      //   t.jsxAttribute(t.jsxIdentifier('index'), t.stringLiteral(`12`)),
      // ];
      // ret.replace(t.jsxElement(
      //   t.jsxOpeningElement(t.jsxIdentifier('GUmiUIFlag'), attrs),
      //   t.jsxClosingElement(t.jsxIdentifier('GUmiUIFlag')),
      //   [],
      //   false,
      // ));
      // const attrs = [
      //   t.objectProperty(t.identifier('filename'), t.stringLiteral(`test`)),
      //   t.objectProperty(t.identifier('index'), t.stringLiteral(`123`)),
      // ];
      // ret.replace(
      //   t.callExpression(
      //     t.memberExpression(t.identifier('React'), t.identifier('createElement')),
      //     [
      //       t.identifier('GUmiUIFlag'),
      //       t.objectExpression(attrs),
      //       ...[t.stringLiteral('12')]
      //     ],
      //   )
      // )
      const newCode = generate.default(ast, {}).code;

      const formatCode = prettier.format(newCode, {
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 100,
        parser: 'typescript',
      });
      return console.log(formatCode);
    },
  },
  CallExpression(path, state) {
    // console.log(path.node);
  },
  Identifier(path) {
    // console.log(path.node.name);
  }
});

function addUmiUIFlag(node, { filename, replace }) {
  if (isJSXElement(node)) {
    if (isChildFunc(node)) {
      return;
    }
    if (haveChildren(node)) {
      if (t.isJSXElement(node) || t.isJSXFragment(node)) {
        let index = node.children.filter(n => isJSXElement(n)).length; // 2
        let i = node.children.length - 1; // 4
        while (i >= 0) {
          const child = node.children[i];
          if (isJSXElement(child) || i === 0) {
            addFlagToIndex(node.children, i === 0 ? i : i + 1, {
              index,
              filename,
              jsx: true,
            });
            index -= 1;
          }
          i -= 1;
        }
      } else {
        const args = node.arguments;
        let index = args.filter(n => isReactCreateElement(n)).length;
        let i = args.length - 1;
        while (i >= 1) {
          const arg = args[i];
          if (isReactCreateElement(arg) || i === 1) {
            addFlagToIndex(args, i + 1, {
              index,
              filename,
              jsx: false,
            });
            index -= 1;
          }
          i -= 1;
        }
      }
    }
  } else {
    // throw new Error(`Add umi ui flag failed, unsupported node type ${node.type}.`);
  }
}

function addFlagToIndex(nodes, i, { index, filename, jsx }) {
  nodes.splice(i, 0, buildGUmiUIFlag({ index, filename, jsx }));
}

function buildGUmiUIFlag(opts) {
  const { index, filename, jsx, inline, content } = opts;
  if (jsx) {
    const attrs = [
      t.jsxAttribute(t.jsxIdentifier('filename'), t.stringLiteral(`${filename}`)),
      t.jsxAttribute(t.jsxIdentifier('index'), t.stringLiteral(`${index}`)),
    ];
    if (inline) {
      attrs.push(t.jsxAttribute(t.jsxIdentifier('inline'), t.stringLiteral('true')));
    }
    return t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier('GUmiUIFlag'), attrs),
      t.jsxClosingElement(t.jsxIdentifier('GUmiUIFlag')),
      content ? [t.jsxText(content)] : [],
      false,
    );
  }
  const attrs = [
    t.objectProperty(t.identifier('filename'), t.stringLiteral(`${filename}`)),
    t.objectProperty(t.identifier('index'), t.stringLiteral(`${index}`)),
  ];
  if (inline) {
    attrs.push(t.objectProperty(t.identifier('inline'), t.stringLiteral('true')));
  }
  return t.callExpression(
    t.memberExpression(t.identifier('React'), t.identifier('createElement')),
    [
      t.identifier('GUmiUIFlag'),
      t.objectExpression(attrs),
      ...(content ? [t.stringLiteral(content)] : []),
    ],
  );
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
    node.arguments.length > 0 &&
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

/**
 * React child function
 * <Bar>
 *  {foo => <div />}
 * </Bar>
 *
 * or
 * React.createElement(Media, { query: "(max-width: 599px)" }, isMobile => {} })
 * @param node
 */
function isChildFunc(node) {
  return (
    (t.isJSXElement(node) && node.children.some(child => t.isJSXExpressionContainer(child))) ||
    (isReactCreateElement(node) && node.arguments.some(arg => t.isArrowFunctionExpression(arg)))
  );
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


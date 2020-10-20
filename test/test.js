const uppercamelcase = require('uppercamelcase');
const generate = require('@babel/generator');
const { join, basename } = require('path');
const { findLastIndex } = require('lodash');
const { readFileSync } = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse');
const t = require('@babel/types');

const oldEntry = readFileSync('./index.tsx', 'utf-8');
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
      // const id = uppercamelcase('ButtonBasic');
      // addImport(node, id);

      // addBlockToJSX({
      //   ...ret,
      //   id,
      //   newNode: null,
      // });
      // const newCode = generate.default(ast, {}).code;

      // return console.log(newCode);
    },
  },
  CallExpression(path, state) {
    // console.log(path.node);
  },
  Identifier(path) {
    // console.log(path.node.name);
  },
  AnyTypeAnnotation(path) {
    console.log(path.node);
  },
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

function findImportNodes(programNode) {
  return programNode.body.filter(n => t.isImportDeclaration(n));
}

function findImportWithSource(importNodes, source) {
  for (const importNode of importNodes) {
    if (importNode.source.value === source) {
      return importNode;
    }
  }
}

function findSpecifier(importNode, specifier) {
  for (const s of importNode.specifiers) {
    if (t.isImportDefaultSpecifier(specifier) && t.isImportDefaultSpecifier(s)) return true;
    // 这里没判断 specifier 类型，所以 name 会不存在
    if (specifier.imported?.name === s.imported?.name) {
      if (specifier.local?.name === s.local?.name) return true;
      throw new Error('specifier conflicts');
    }
  }
  return false;
}

function combineSpecifiers(newImportNode, originImportNode) {
  newImportNode.specifiers.forEach(specifier => {
    if (!findSpecifier(originImportNode, specifier)) {
      originImportNode.specifiers.push(specifier);
    }
  });
}

function getValidStylesName(path) {
  let name = 'styles';
  let count = 1;
  while (path.scope.hasBinding(name)) {
    name = `styles${count}`;
    count += 1;
  }
  return name;
}

function combineImportNodes(
  programNode,
  originImportNodes,
  newImportNodes,
  absolutePath,
  stylesName,
) {
  newImportNodes.forEach(newImportNode => {
    // replace stylesName
    // TODO: 自动生成新的 name，不仅仅是 styles
    if (stylesName !== 'styles' && newImportNode.source.value.charAt(0) === '.') {
      newImportNode.specifiers.forEach(specifier => {
        if (t.isImportDefaultSpecifier(specifier) && specifier.local.name === 'styles') {
          specifier.local.name = stylesName;
        }
      });
    }

    const importSource = newImportNode.source.value;
    if (importSource.charAt(0) === '.') {
      // /a/b/c.js -> b
      const dir = basename(join(absolutePath, '..'));
      newImportNode.source = t.stringLiteral(`./${join(dir, importSource)}`);
    }
    const originImportNode = findImportWithSource(originImportNodes, newImportNode.source.value);
    if (!originImportNode) {
      programNode.body.unshift(newImportNode);
    } else {
      combineSpecifiers(newImportNode, originImportNode);
    }
  });
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

function parseContent(code) {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'decorators-legacy', 'typescript', 'classProperties', 'dynamicImport'],
  });
}

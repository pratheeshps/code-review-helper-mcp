
import { parse } from "acorn";

function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isPascalCase(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function isConstantCase(name) {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

function collectPatternNames(pattern, names = []) {
  if (!pattern) return names;

  switch (pattern.type) {
    case "Identifier":
      names.push(pattern);
      break;

    case "RestElement":
      collectPatternNames(pattern.argument, names);
      break;

    case "AssignmentPattern":
      collectPatternNames(pattern.left, names);
      break;

    case "ArrayPattern":
      pattern.elements.forEach((element) => {
        collectPatternNames(element, names);
      });
      break;

    case "ObjectPattern":
      pattern.properties.forEach((property) => {
        if (property.type === "RestElement") {
          collectPatternNames(property.argument, names);
        } else {
          collectPatternNames(property.value, names);
        }
      });
      break;
  }

  return names;
}

export function checkNamingConventions(code) {
  const findings = [];
  const lines = code.split(/\r?\n/);

  let ast;

  try {
    ast = parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
  } catch (error) {
    return {
      language: "javascript",
      linesAnalyzed: lines.length,
      findingCount: 0,
      findings: [],
      error: `Unable to parse JavaScript: ${error.message}`,
    };
  }

  function checkName(identifier, type) {
    const name = identifier.name;

    if (name.startsWith("_") || name.startsWith("$")) return;

    const valid =
      type === "class"
        ? isPascalCase(name)
        : type === "constant"
          ? isConstantCase(name)
          : isCamelCase(name);

    if (valid) return;

    findings.push({
      line: identifier.loc.start.line,
      name,
      type: type === "constant" ? "variable" : type,
      rule:
        type === "class"
          ? "prefer-pascal-case"
          : type === "constant"
            ? "prefer-constant-case"
            : "prefer-camel-case",
      message:
        type === "class"
          ? `Class "${name}" should use PascalCase.`
          : type === "constant"
            ? `Module-level constant "${name}" should use CONSTANT_CASE.`
            : `${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" should use camelCase.`,
      code: lines[identifier.loc.start.line - 1].trim(),
    });
  }

  function visit(node, parent = null) {
    if (!node || typeof node !== "object") return;

    switch (node.type) {
      case "VariableDeclaration":
        for (const declaration of node.declarations) {
          for (const identifier of collectPatternNames(declaration.id)) {
            const isModuleLevelConst =
              node.kind === "const" &&
              parent?.type === "Program";

            const type =
              isModuleLevelConst && isConstantCase(identifier.name)
                ? "constant"
                : "variable";

            checkName(identifier, type);
          }
        }
        break;

      case "FunctionDeclaration":
        if (node.id) checkName(node.id, "function");
        break;

      case "ClassDeclaration":
        if (node.id) checkName(node.id, "class");
        break;
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach((child) => visit(child, node));
      } else if (value && typeof value === "object") {
        visit(value, node);
      }
    }
  }

  visit(ast);

  return {
    language: "javascript",
    linesAnalyzed: lines.length,
    findingCount: findings.length,
    findings,
  };
}

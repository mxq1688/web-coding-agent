/**
 * Code Parser - AST-like analysis for intelligent context extraction
 * Provides code understanding capabilities similar to Tree-sitter
 */

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'import' | 'export' | 'interface' | 'type';
  startLine: number;
  endLine: number;
  content: string;
  scope?: string;
}

export interface CodeContext {
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  language: string;
}

/**
 * Parse code to extract symbols and structure
 */
export class CodeParser {
  /**
   * Extract all symbols from code
   */
  static parse(code: string, language: string): CodeContext {
    const lines = code.split('\n');
    const symbols: CodeSymbol[] = [];
    const imports: string[] = [];
    const exports: string[] = [];
    const dependencies = new Set<string>();

    // Language-specific parsing
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'jsx':
      case 'typescript':
      case 'tsx':
        this.parseJavaScriptLike(lines, symbols, imports, exports, dependencies);
        break;
      case 'python':
        this.parsePython(lines, symbols, imports, exports, dependencies);
        break;
      case 'java':
        this.parseJava(lines, symbols, imports, exports, dependencies);
        break;
      default:
        this.parseGeneric(lines, symbols);
    }

    return {
      symbols,
      imports,
      exports,
      dependencies: Array.from(dependencies),
      language,
    };
  }

  /**
   * Parse JavaScript/TypeScript code
   */
  private static parseJavaScriptLike(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[],
    dependencies: Set<string>
  ) {
    const importRegex = /^\s*import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/;
    const exportRegex = /^\s*export\s+(default\s+)?(function|class|const|let|var|interface|type|enum)/;
    const functionRegex = /^\s*(export\s+)?(async\s+)?function\s+(\w+)/;
    const classRegex = /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/;
    const constRegex = /^\s*(export\s+)?const\s+(\w+)/;
    const interfaceRegex = /^\s*(export\s+)?interface\s+(\w+)/;
    const typeRegex = /^\s*(export\s+)?type\s+(\w+)/;

    let currentScope: string | undefined;
    let bracketDepth = 0;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Track bracket depth for scope
      bracketDepth += (line.match(/{/g) || []).length;
      bracketDepth -= (line.match(/}/g) || []).length;

      // Parse imports
      const importMatch = importRegex.exec(line);
      if (importMatch) {
        const importPath = importMatch[1];
        imports.push(importPath);
        dependencies.add(importPath);
      }

      // Parse exports
      if (exportRegex.test(line)) {
        exports.push(trimmed);
      }

      // Parse functions
      const functionMatch = functionRegex.exec(line);
      if (functionMatch) {
        const name = functionMatch[3];
        const startLine = index + 1;
        symbols.push({
          name,
          type: 'function',
          startLine,
          endLine: this.findBlockEnd(lines, index),
          content: line,
          scope: currentScope,
        });
      }

      // Parse classes
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        const name = classMatch[3];
        const startLine = index + 1;
        currentScope = name;
        symbols.push({
          name,
          type: 'class',
          startLine,
          endLine: this.findBlockEnd(lines, index),
          content: line,
        });
      }

      // Parse constants/variables
      const constMatch = constRegex.exec(line);
      if (constMatch) {
        const name = constMatch[2];
        symbols.push({
          name,
          type: 'variable',
          startLine: index + 1,
          endLine: index + 1,
          content: line,
          scope: currentScope,
        });
      }

      // Parse interfaces
      const interfaceMatch = interfaceRegex.exec(line);
      if (interfaceMatch) {
        const name = interfaceMatch[2];
        symbols.push({
          name,
          type: 'interface',
          startLine: index + 1,
          endLine: this.findBlockEnd(lines, index),
          content: line,
        });
      }

      // Parse types
      const typeMatch = typeRegex.exec(line);
      if (typeMatch) {
        const name = typeMatch[2];
        symbols.push({
          name,
          type: 'type',
          startLine: index + 1,
          endLine: index + 1,
          content: line,
        });
      }

      // Reset scope when exiting class
      if (bracketDepth === 0 && currentScope) {
        currentScope = undefined;
      }
    });
  }

  /**
   * Parse Python code
   */
  private static parsePython(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[],
    dependencies: Set<string>
  ) {
    const importRegex = /^\s*(from\s+([\w.]+)\s+)?import\s+([\w,\s*]+)/;
    const functionRegex = /^\s*def\s+(\w+)/;
    const classRegex = /^\s*class\s+(\w+)/;

    let currentScope: string | undefined;
    let indentLevel = 0;

    lines.forEach((line, index) => {
      const currentIndent = line.search(/\S/);

      // Track indent for scope
      if (currentIndent !== -1 && currentIndent <= indentLevel && currentScope) {
        currentScope = undefined;
      }

      // Parse imports
      const importMatch = importRegex.exec(line);
      if (importMatch) {
        const fromModule = importMatch[2];
        const importNames = importMatch[3];
        if (fromModule) {
          imports.push(`${fromModule}.${importNames}`);
          dependencies.add(fromModule);
        } else {
          imports.push(importNames);
          dependencies.add(importNames.split(',')[0].trim());
        }
      }

      // Parse functions
      const functionMatch = functionRegex.exec(line);
      if (functionMatch) {
        const name = functionMatch[1];
        indentLevel = currentIndent;
        symbols.push({
          name,
          type: 'function',
          startLine: index + 1,
          endLine: this.findPythonBlockEnd(lines, index),
          content: line,
          scope: currentScope,
        });
      }

      // Parse classes
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        const name = classMatch[1];
        currentScope = name;
        indentLevel = currentIndent;
        symbols.push({
          name,
          type: 'class',
          startLine: index + 1,
          endLine: this.findPythonBlockEnd(lines, index),
          content: line,
        });
      }
    });
  }

  /**
   * Parse Java code
   */
  private static parseJava(
    lines: string[],
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[],
    dependencies: Set<string>
  ) {
    const importRegex = /^\s*import\s+([\w.]+)/;
    const classRegex = /^\s*(public\s+)?(abstract\s+)?class\s+(\w+)/;
    const methodRegex = /^\s*(public|private|protected)\s+.*\s+(\w+)\s*\(/;

    lines.forEach((line, index) => {
      // Parse imports
      const importMatch = importRegex.exec(line);
      if (importMatch) {
        const importPath = importMatch[1];
        imports.push(importPath);
        dependencies.add(importPath.split('.')[0]);
      }

      // Parse classes
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        const name = classMatch[3];
        symbols.push({
          name,
          type: 'class',
          startLine: index + 1,
          endLine: this.findBlockEnd(lines, index),
          content: line,
        });
      }

      // Parse methods
      const methodMatch = methodRegex.exec(line);
      if (methodMatch) {
        const name = methodMatch[2];
        symbols.push({
          name,
          type: 'function',
          startLine: index + 1,
          endLine: this.findBlockEnd(lines, index),
          content: line,
        });
      }
    });
  }

  /**
   * Generic parser for unknown languages
   */
  private static parseGeneric(lines: string[], symbols: CodeSymbol[]) {
    // Basic pattern matching for common structures
    const functionPatterns = [
      /function\s+(\w+)/,
      /def\s+(\w+)/,
      /fn\s+(\w+)/,
    ];

    lines.forEach((line, index) => {
      for (const pattern of functionPatterns) {
        const match = pattern.exec(line);
        if (match) {
          symbols.push({
            name: match[1],
            type: 'function',
            startLine: index + 1,
            endLine: index + 1,
            content: line,
          });
          break;
        }
      }
    });
  }

  /**
   * Find the end of a code block (for languages with braces)
   */
  private static findBlockEnd(lines: string[], startIndex: number): number {
    let bracketCount = 0;
    let foundStart = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const openBrackets = (line.match(/{/g) || []).length;
      const closeBrackets = (line.match(/}/g) || []).length;

      bracketCount += openBrackets - closeBrackets;

      if (openBrackets > 0) foundStart = true;
      if (foundStart && bracketCount === 0) {
        return i + 1;
      }
    }

    return lines.length;
  }

  /**
   * Find the end of a Python block (indent-based)
   */
  private static findPythonBlockEnd(lines: string[], startIndex: number): number {
    const startIndent = lines[startIndex].search(/\S/);

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      const currentIndent = line.search(/\S/);
      if (currentIndent <= startIndent) {
        return i;
      }
    }

    return lines.length;
  }

  /**
   * Extract relevant context around a specific line
   */
  static extractContext(
    code: string,
    targetLine: number,
    language: string,
    contextLines: number = 20
  ): string {
    const context = this.parse(code, language);
    const lines = code.split('\n');

    // Find symbols that contain or are near the target line
    const relevantSymbols = context.symbols.filter(
      (symbol) =>
        symbol.startLine <= targetLine + contextLines &&
        symbol.endLine >= targetLine - contextLines
    );

    // Build context string
    let contextStr = '// Code Context:\n';
    contextStr += `// Imports: ${context.imports.join(', ')}\n`;
    contextStr += `// Symbols: ${relevantSymbols.map((s) => `${s.type} ${s.name}`).join(', ')}\n\n`;

    // Add relevant code sections
    relevantSymbols.forEach((symbol) => {
      const startLine = Math.max(0, symbol.startLine - 1);
      const endLine = Math.min(lines.length, symbol.endLine);
      const symbolCode = lines.slice(startLine, endLine).join('\n');
      contextStr += `\n// ${symbol.type} ${symbol.name}:\n${symbolCode}\n`;
    });

    return contextStr;
  }
}

/**
 * Multi-File Manager - Handle modifications across multiple files
 * Provides dependency analysis and coordinated file updates
 */

import { CodeContext } from './codeParser';

export interface FileEdit {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  edits: {
    id: string;
    startLine: number;
    endLine: number;
    oldCode: string;
    newCode: string;
    description: string;
  }[];
}

export interface MultiFileChange {
  files: FileEdit[];
  summary: string;
  dependencies: string[];
}

/**
 * Manages modifications across multiple files
 */
export class MultiFileManager {
  /**
   * Analyze dependencies between files
   */
  static analyzeDependencies(
    fileContexts: Map<string, CodeContext>
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    fileContexts.forEach((context, filePath) => {
      const fileDeps: string[] = [];

      // Extract dependencies from imports
      context.dependencies.forEach((dep) => {
        // Try to resolve relative imports to actual file paths
        if (dep.startsWith('.')) {
          // Relative import - resolve against current file
          const resolved = this.resolveRelativePath(filePath, dep);
          if (resolved) fileDeps.push(resolved);
        } else {
          // External dependency
          fileDeps.push(dep);
        }
      });

      dependencies.set(filePath, fileDeps);
    });

    return dependencies;
  }

  /**
   * Resolve relative import path
   */
  private static resolveRelativePath(fromPath: string, relativePath: string): string | null {
    const fromParts = fromPath.split('/');
    fromParts.pop(); // Remove filename

    const relParts = relativePath.split('/');

    // Handle ../ and ./
    for (const part of relParts) {
      if (part === '..') {
        fromParts.pop();
      } else if (part !== '.') {
        fromParts.push(part);
      }
    }

    return fromParts.join('/');
  }

  /**
   * Find files that might be affected by changes to a symbol
   */
  static findAffectedFiles(
    targetFile: string,
    symbolName: string,
    fileContexts: Map<string, CodeContext>
  ): string[] {
    const affected: string[] = [];

    fileContexts.forEach((context, filePath) => {
      if (filePath === targetFile) return;

      // Check if this file imports from the target file
      const imports = context.imports;

      // Check if any import references the target file or symbol
      const hasReference = imports.some(
        (imp) => imp.includes(symbolName) || imp.includes(targetFile)
      );

      if (hasReference) {
        affected.push(filePath);
      }
    });

    return affected;
  }

  /**
   * Validate that multi-file changes maintain consistency
   */
  static validateChanges(changes: MultiFileChange): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for conflicting edits within same file
    changes.files.forEach((fileEdit) => {
      const lineRanges = fileEdit.edits.map((edit) => ({
        start: edit.startLine,
        end: edit.endLine,
      }));

      // Check for overlapping ranges
      for (let i = 0; i < lineRanges.length; i++) {
        for (let j = i + 1; j < lineRanges.length; j++) {
          const range1 = lineRanges[i];
          const range2 = lineRanges[j];

          if (this.rangesOverlap(range1, range2)) {
            errors.push(
              `Conflicting edits in ${fileEdit.filePath}: lines ${range1.start}-${range1.end} and ${range2.start}-${range2.end}`
            );
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if two line ranges overlap
   */
  private static rangesOverlap(
    range1: { start: number; end: number },
    range2: { start: number; end: number }
  ): boolean {
    return (
      (range1.start >= range2.start && range1.start <= range2.end) ||
      (range1.end >= range2.start && range1.end <= range2.end) ||
      (range2.start >= range1.start && range2.start <= range1.end) ||
      (range2.end >= range1.start && range2.end <= range1.end)
    );
  }

  /**
   * Apply edits to a file
   */
  static applyEdits(originalContent: string, edits: FileEdit['edits']): string {
    const lines = originalContent.split('\n');

    // Sort edits by line number (descending) to avoid offset issues
    const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);

    for (const edit of sortedEdits) {
      const newLines = edit.newCode.split('\n');
      lines.splice(edit.startLine - 1, edit.endLine - edit.startLine + 1, ...newLines);
    }

    return lines.join('\n');
  }

  /**
   * Create a preview of multi-file changes
   */
  static createPreview(changes: MultiFileChange): string {
    let preview = `# Multi-File Changes\n\n`;
    preview += `**Summary:** ${changes.summary}\n\n`;

    if (changes.dependencies.length > 0) {
      preview += `**Dependencies:** ${changes.dependencies.join(', ')}\n\n`;
    }

    preview += `## Files to be modified (${changes.files.length}):\n\n`;

    changes.files.forEach((file, index) => {
      preview += `### ${index + 1}. ${file.filePath}\n\n`;
      preview += `**Changes:** ${file.edits.length} edit(s)\n\n`;

      file.edits.forEach((edit, editIndex) => {
        preview += `#### Edit ${editIndex + 1}: ${edit.description}\n`;
        preview += `Lines ${edit.startLine}-${edit.endLine}\n\n`;
        preview += `\`\`\`diff\n`;
        preview += `- ${edit.oldCode.split('\n').join('\n- ')}\n`;
        preview += `+ ${edit.newCode.split('\n').join('\n+ ')}\n`;
        preview += `\`\`\`\n\n`;
      });
    });

    return preview;
  }

  /**
   * Build AI prompt for multi-file editing
   */
  static buildMultiFilePrompt(
    instruction: string,
    files: Map<string, string>,
    fileContexts: Map<string, CodeContext>
  ): string {
    let prompt = `You are modifying multiple files in a codebase. Analyze dependencies and make coordinated changes.\n\n`;

    prompt += `## INSTRUCTION:\n${instruction}\n\n`;

    // Add file contexts
    prompt += `## PROJECT FILES:\n\n`;
    files.forEach((content, path) => {
      const context = fileContexts.get(path);
      prompt += `### File: ${path}\n`;
      if (context) {
        prompt += `**Symbols:** ${context.symbols.map((s) => `${s.type} ${s.name}`).join(', ')}\n`;
        prompt += `**Imports:** ${context.imports.join(', ')}\n`;
      }
      prompt += `\n\`\`\`\n${content}\n\`\`\`\n\n`;
    });

    // Add dependency info
    const deps = this.analyzeDependencies(fileContexts);
    prompt += `## DEPENDENCIES:\n`;
    deps.forEach((fileDeps, file) => {
      if (fileDeps.length > 0) {
        prompt += `- ${file}: ${fileDeps.join(', ')}\n`;
      }
    });

    prompt += `\n## RESPONSE FORMAT:\n\n`;
    prompt += `Respond with JSON:\n`;
    prompt += `\`\`\`json\n{
  "summary": "Overall description of changes",
  "files": [
    {
      "filePath": "path/to/file",
      "edits": [
        {
          "startLine": 10,
          "endLine": 15,
          "oldCode": "code to replace",
          "newCode": "replacement code",
          "description": "what this edit does"
        }
      ]
    }
  ]
}\n\`\`\`\n\n`;

    prompt += `Make coordinated changes across files, maintaining consistency of imports, types, and function signatures.`;

    return prompt;
  }
}

/**
 * AI Prompt Builder - Optimized prompts for code editing
 * Generates structured prompts with rich context for better AI responses
 */

import { CodeParser } from './codeParser';
import { PendingEdit } from '@/types/editor.types';

export interface EditRequest {
  instruction: string;
  code: string;
  fileName: string;
  cursorPosition?: { line: number; column: number };
  selectedText?: string;
}

export interface EditResponse {
  fileName: string;
  description?: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  oldCode: string;
  newCode: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface UnifiedDiff {
  fileName: string;
  hunks: DiffHunk[];
  description: string;
}

/**
 * Build optimized prompts for AI code editing
 */
export class AIPromptBuilder {
  /**
   * Build a comprehensive prompt with context
   */
  static buildEditPrompt(request: EditRequest): string {
    const { instruction, code, fileName, cursorPosition, selectedText } = request;

    // Extract language from filename
    const language = this.getLanguage(fileName);

    // Parse code to get context
    const context = CodeParser.parse(code, language);

    // Build the prompt
    let prompt = `You are an expert code editor assistant. Your task is to modify code according to user instructions.

## CRITICAL REQUIREMENTS:

1. **Output Format**: You MUST respond with a valid JSON object containing a unified diff format
2. **Precision**: Make ONLY the necessary changes - don't rewrite entire files
3. **Context Awareness**: Consider imports, dependencies, and code structure
4. **Safety**: Preserve functionality, don't introduce bugs

## CODE CONTEXT:

**File**: ${fileName}
**Language**: ${language}
**Imports**: ${context.imports.length > 0 ? context.imports.join(', ') : 'None'}
**Dependencies**: ${context.dependencies.length > 0 ? context.dependencies.join(', ') : 'None'}
**Symbols Found**: ${context.symbols.length} (${context.symbols.map(s => `${s.type} ${s.name}`).slice(0, 5).join(', ')}${context.symbols.length > 5 ? '...' : ''})
`;

    // Add cursor/selection context
    if (cursorPosition) {
      prompt += `\n**Cursor Position**: Line ${cursorPosition.line}, Column ${cursorPosition.column}`;
    }

    if (selectedText) {
      prompt += `\n\n**Selected Code**:\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
    }

    // Add relevant code context
    if (cursorPosition) {
      const contextCode = CodeParser.extractContext(code, cursorPosition.line, language, 15);
      prompt += `\n\n**Surrounding Context**:\n${contextCode}\n`;
    }

    // Add the full code
    prompt += `\n## CURRENT CODE:\n\n\`\`\`${language}\n${code}\n\`\`\`\n`;

    // Add user instruction
    prompt += `\n## USER INSTRUCTION:\n\n${instruction}\n`;

    // Add output format specification
    prompt += `\n## OUTPUT FORMAT:

Respond with a JSON object in this EXACT format:

\`\`\`json
{
  "edits": [
    {
      "fileName": "${fileName}",
      "description": "Brief description of this change",
      "oldStart": <start_line_number>,
      "oldLines": <number_of_lines_to_replace>,
      "newStart": <start_line_number>,
      "newLines": <number_of_new_lines>,
      "oldCode": "<exact_code_to_replace>",
      "newCode": "<replacement_code>"
    }
  ],
  "summary": "Overall summary of all changes"
}
\`\`\`

## IMPORTANT RULES:

1. **oldCode** must match EXACTLY (including whitespace) from the current code
2. **newCode** contains the replacement
3. Line numbers are 1-indexed
4. Multiple edits can be specified in the array
5. Keep changes minimal and focused
6. Preserve existing code style and conventions
7. Don't include unchanged code in oldCode/newCode

## EXAMPLE:

If changing line 10 from \`const x = 1;\` to \`const x = 2;\`:

\`\`\`json
{
  "edits": [
    {
      "fileName": "${fileName}",
      "description": "Update x value from 1 to 2",
      "oldStart": 10,
      "oldLines": 1,
      "newStart": 10,
      "newLines": 1,
      "oldCode": "const x = 1;",
      "newCode": "const x = 2;"
    }
  ],
  "summary": "Updated constant value"
}
\`\`\`

Now, please analyze the code and provide the necessary edits in the specified JSON format.
`;

    return prompt;
  }

  /**
   * Parse AI response to extract structured edits
   */
  static parseAIResponse(response: string): UnifiedDiff[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      if (!parsed.edits || !Array.isArray(parsed.edits)) {
        throw new Error('Invalid response format: missing edits array');
      }

      // Convert to UnifiedDiff format
      return parsed.edits.map((edit: EditResponse) => ({
        fileName: edit.fileName,
        description: edit.description || 'Code modification',
        hunks: [
          {
            oldStart: edit.oldStart,
            oldLines: edit.oldLines,
            newStart: edit.newStart,
            newLines: edit.newLines,
            lines: this.createDiffLines(edit.oldCode, edit.newCode),
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Invalid AI response format: ${error}`);
    }
  }

  /**
   * Create unified diff lines from old and new code
   */
  private static createDiffLines(oldCode: string, newCode: string): string[] {
    const lines: string[] = [];
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    // Add removed lines
    oldLines.forEach((line) => {
      lines.push(`-${line}`);
    });

    // Add added lines
    newLines.forEach((line) => {
      lines.push(`+${line}`);
    });

    return lines;
  }

  /**
   * Apply unified diff to code
   */
  static applyDiff(code: string, diff: UnifiedDiff): string {
    const lines = code.split('\n');
    const result = [...lines];

    // Apply each hunk (in reverse order to maintain line numbers)
    const sortedHunks = [...diff.hunks].sort((a, b) => b.oldStart - a.oldStart);

    for (const hunk of sortedHunks) {
      const { oldStart, oldLines, lines: diffLines } = hunk;

      // Extract new lines (those starting with +)
      const newLines = diffLines
        .filter((line) => line.startsWith('+'))
        .map((line) => line.substring(1));

      // Remove old lines and insert new lines
      result.splice(oldStart - 1, oldLines, ...newLines);
    }

    return result.join('\n');
  }

  /**
   * Convert UnifiedDiff to PendingEdit format
   */
  static diffToPendingEdits(diffs: UnifiedDiff[]): PendingEdit[] {
    return diffs.flatMap((diff) =>
      diff.hunks.map((hunk, index) => ({
        id: `${diff.fileName}-${hunk.oldStart}-${Date.now()}-${index}`,
        fileName: diff.fileName,
        description: diff.description,
        startLine: hunk.oldStart,
        endLine: hunk.oldStart + hunk.oldLines - 1,
        startColumn: 1,
        endColumn: 999,
        oldCode: hunk.lines.filter((l) => l.startsWith('-')).map((l) => l.substring(1)).join('\n'),
        newCode: hunk.lines.filter((l) => l.startsWith('+')).map((l) => l.substring(1)).join('\n'),
      }))
    );
  }

  /**
   * Create modified code preview from pending edits
   */
  static createPreview(originalCode: string, pendingEdits: PendingEdit[]): string {
    let code = originalCode;

    // Sort edits by line number (descending) to maintain line numbers
    const sortedEdits = [...pendingEdits].sort(
      (a, b) => b.startLine - a.startLine
    );

    for (const edit of sortedEdits) {
      const lines = code.split('\n');
      const startIdx = edit.startLine - 1;
      const endIdx = edit.endLine;
      const newLines = edit.newCode.split('\n');

      lines.splice(startIdx, endIdx - startIdx, ...newLines);
      code = lines.join('\n');
    }

    return code;
  }

  /**
   * Get language from filename
   */
  private static getLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  /**
   * Build prompt for explaining code
   */
  static buildExplainPrompt(code: string, fileName: string): string {
    const language = this.getLanguage(fileName);
    const context = CodeParser.parse(code, language);

    return `Explain the following ${language} code in detail:

**File**: ${fileName}
**Symbols**: ${context.symbols.map((s) => `${s.type} ${s.name}`).join(', ')}

\`\`\`${language}\n${code}\n\`\`\`

Provide:
1. Overall purpose and functionality
2. Key components and their roles
3. Important algorithms or patterns used
4. Potential issues or improvements
`;
  }

  /**
   * Build prompt for optimizing code
   */
  static buildOptimizePrompt(code: string, fileName: string): string {
    const language = this.getLanguage(fileName);

    return `Optimize the following ${language} code for performance, readability, and best practices:

**File**: ${fileName}

\`\`\`${language}\n${code}\n\`\`\`

Provide optimized code with:
1. Performance improvements
2. Better code structure
3. Modern ${language} patterns
4. Comments explaining key changes

Use the same JSON format as code editing with precise diffs.
`;
  }
}

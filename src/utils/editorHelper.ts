import * as monaco from 'monaco-editor';
import { TextEdit, PendingEdit } from '@/types/editor.types';

/**
 * Apply a single text edit to Monaco Editor
 */
export function applyEdit(
  editor: monaco.editor.IStandaloneCodeEditor,
  edit: TextEdit
): boolean {
  try {
    const model = editor.getModel();
    if (!model) return false;

    // Verify the old text matches (for safety)
    const currentText = model.getValueInRange(
      new monaco.Range(
        edit.startLine,
        edit.startColumn || 1,
        edit.endLine,
        edit.endColumn || model.getLineMaxColumn(edit.endLine)
      )
    );

    if (edit.oldText && currentText.trim() !== edit.oldText.trim()) {
      console.warn('Text mismatch at edit location:', {
        expected: edit.oldText,
        actual: currentText
      });
      // Try fuzzy match or fail gracefully
      return false;
    }

    // Execute the edit
    editor.executeEdits('ai-cursor-edit', [
      {
        range: new monaco.Range(
          edit.startLine,
          edit.startColumn || 1,
          edit.endLine,
          edit.endColumn || model.getLineMaxColumn(edit.endLine)
        ),
        text: edit.newText,
        forceMoveMarkers: true
      }
    ]);

    return true;
  } catch (error) {
    console.error('Failed to apply edit:', error);
    return false;
  }
}

/**
 * Apply multiple edits in sequence
 */
export function applyEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: TextEdit[]
): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  // Sort edits by line number (descending) to avoid offset issues
  const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine);

  for (const edit of sortedEdits) {
    if (applyEdit(editor, edit)) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Highlight pending edits with decorations
 */
export function highlightEdits(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: PendingEdit[]
): string[] {
  const decorations = edits.map(edit => ({
    range: new monaco.Range(
      edit.startLine,
      edit.startColumn || 1,
      edit.endLine,
      edit.endColumn || editor.getModel()?.getLineMaxColumn(edit.endLine) || 1
    ),
    options: {
      className: 'ai-suggestion-highlight',
      isWholeLine: false,
      glyphMarginClassName: 'ai-suggestion-glyph',
      minimap: {
        color: '#3b82f6',
        position: monaco.editor.MinimapPosition.Inline
      },
      overviewRuler: {
        color: '#3b82f6',
        position: monaco.editor.OverviewRulerLane.Full
      }
    }
  }));

  return editor.deltaDecorations([], decorations);
}

/**
 * Clear all decoration highlights
 */
export function clearHighlights(
  editor: monaco.editor.IStandaloneCodeEditor,
  decorationIds: string[]
): void {
  editor.deltaDecorations(decorationIds, []);
}

/**
 * Parse unified diff format to TextEdit array
 */
export function parseUnifiedDiff(diffText: string, content: string): TextEdit[] {
  const edits: TextEdit[] = [];
  
  // Match @@ -startLine,count +startLine,count @@ pattern
  const hunkRegex = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;
  const chunks = diffText.split(hunkRegex);
  
  for (let i = 1; i < chunks.length; i += 5) {
    const oldStart = parseInt(chunks[i]);
    const oldCount = parseInt(chunks[i + 1] || '1');
    const diffContent = chunks[i + 4];
    
    const oldLines: string[] = [];
    const newLines: string[] = [];
    
    diffContent.split('\n').forEach(line => {
      if (line.startsWith('-')) {
        oldLines.push(line.substring(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.substring(1));
      }
    });
    
    if (oldLines.length > 0 || newLines.length > 0) {
      edits.push({
        startLine: oldStart,
        endLine: oldStart + oldCount - 1,
        oldText: oldLines.join('\n'),
        newText: newLines.join('\n')
      });
    }
  }
  
  return edits;
}

/**
 * Parse SEARCH/REPLACE blocks to TextEdit array
 */
export function parseSearchReplace(text: string, content: string): TextEdit[] {
  const edits: TextEdit[] = [];
  const pattern = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  const lines = content.split('\n');
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const searchText = match[1].trim();
    const replaceText = match[2].trim();
    
    // Find the search text in content
    const searchLines = searchText.split('\n');
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      let found = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (i + j >= lines.length || lines[i + j].trim() !== searchLines[j].trim()) {
          found = false;
          break;
        }
      }
      if (found) {
        startLine = i + 1; // 1-indexed
        break;
      }
    }
    
    if (startLine > 0) {
      edits.push({
        startLine,
        endLine: startLine + searchLines.length - 1,
        oldText: searchText,
        newText: replaceText
      });
    }
  }
  
  return edits;
}

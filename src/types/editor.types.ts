// Editor types for Cursor-style incremental edits

export interface TextEdit {
  startLine: number;      // 1-indexed line number
  endLine: number;        // 1-indexed line number (inclusive)
  startColumn?: number;   // Optional column position (1-indexed)
  endColumn?: number;     // Optional column position (1-indexed)
  oldText: string;        // Original text for verification
  newText: string;        // New text to replace with
  context?: string;       // Surrounding context for fuzzy matching
}

export interface AIEditResponse {
  success: boolean;
  message: string;
  edits?: TextEdit[];     // Array of incremental edits
  fullCode?: string;      // Fallback: complete code for simple cases
}

export interface PendingEdit extends TextEdit {
  id: string;             // Unique identifier for this edit
  applied: boolean;       // Whether user has applied this edit
  rejected: boolean;      // Whether user has rejected this edit
}

export interface EditorState {
  pendingEdits: PendingEdit[];
  currentFile: string | null;
  isPreviewMode: boolean;
}

"use client";

import { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { PendingEdit } from "@/types/editor.types";
import { Check, X, CheckCheck, XCircle } from "lucide-react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  onExplainCode?: (code: string) => void;
  onOptimizeCode?: (code: string) => void;
  onEditCode?: (code: string) => void;
  pendingEdits?: PendingEdit[];
  onAcceptEdit?: (editId: string) => void;
  onRejectEdit?: (editId: string) => void;
  onAcceptAllEdits?: () => void;
  onRejectAllEdits?: () => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  onSelectionChange?: (text: string) => void;
}

export default function MonacoEditor({ 
  value, 
  onChange, 
  fileName, 
  onExplainCode, 
  onOptimizeCode, 
  onEditCode,
  pendingEdits = [],
  onAcceptEdit,
  onRejectEdit,
  onAcceptAllEdits,
  onRejectAllEdits,
  onCursorChange,
  onSelectionChange
}: MonacoEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Apply decorations for pending edits
  useEffect(() => {
    if (!editorRef.current || !pendingEdits || pendingEdits.length === 0) {
      // Clear decorations if no pending edits
      if (decorationsRef.current.length > 0) {
        editorRef.current?.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      setIsPreviewMode(false);
      return;
    }

    setIsPreviewMode(true);

    const editor = editorRef.current;
    const monaco = (window as any).monaco;

    if (!monaco) return;

    // Create decorations for each pending edit
    const newDecorations = pendingEdits.map(edit => ({
      range: new monaco.Range(
        edit.startLine,
        edit.startColumn || 1,
        edit.endLine,
        edit.endColumn || 999
      ),
      options: {
        isWholeLine: false,
        className: 'pending-edit-decoration',
        glyphMarginClassName: 'pending-edit-glyph',
        glyphMarginHoverMessage: { value: '🤖 AI 建议修改' },
        hoverMessage: {
          value: `**AI 修改建议**\n\n${edit.description || '点击接受或拒绝此修改'}`
        },
        inlineClassName: 'pending-edit-inline',
        minimap: {
          color: '#4ade80',
          position: monaco.editor.MinimapPosition.Inline
        }
      }
    }));

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [pendingEdits]);

  // Detect language from file extension
  const getLanguage = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sql: "sql",
      sh: "shell",
    };
    return languageMap[ext || ""] || "plaintext";
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;

    // Add AI context menu actions
    if (onExplainCode) {
      editor.addAction({
        id: 'ai-explain-code',
        label: '🤖 AI 解释代码',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 1,
        run: (ed: editor.IStandaloneCodeEditor) => {
          const selection = ed.getSelection();
          const model = ed.getModel();
          const selectedText = model ? model.getValueInRange(selection!) : '';
          if (selectedText) {
            onExplainCode(selectedText);
          } else {
            // If no selection, use entire file content
            onExplainCode(ed.getValue());
          }
        },
      });
    }

    if (onOptimizeCode) {
      editor.addAction({
        id: 'ai-optimize-code',
        label: '✨ AI 优化代码',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 2,
        run: (ed: editor.IStandaloneCodeEditor) => {
          const selection = ed.getSelection();
          const model = ed.getModel();
          const selectedText = model ? model.getValueInRange(selection!) : '';
          if (selectedText) {
            onOptimizeCode(selectedText);
          } else {
            // If no selection, use entire file content
            onOptimizeCode(ed.getValue());
          }
        },
      });
    }

    if (onEditCode) {
      editor.addAction({
        id: 'ai-edit-code',
        label: '✏️ AI 编辑代码',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 3,
        run: (ed: editor.IStandaloneCodeEditor) => {
          const selection = ed.getSelection();
          const model = ed.getModel();
          const selectedText = model ? model.getValueInRange(selection!) : '';
          if (selectedText) {
            onEditCode(selectedText);
          } else {
            // If no selection, use entire file content
            onEditCode(ed.getValue());
          }
        },
      });
    }

    // Track cursor position changes
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e: editor.ICursorPositionChangedEvent) => {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });
    }

    // Track selection changes
    if (onSelectionChange) {
      editor.onDidChangeCursorSelection((e: editor.ICursorSelectionChangedEvent) => {
        const model = editor.getModel();
        if (model) {
          const selectedText = model.getValueInRange(e.selection);
          onSelectionChange(selectedText);
        }
      });
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Preview Mode Control Bar */}
      {isPreviewMode && pendingEdits && pendingEdits.length > 0 && (
        <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border-b border-green-500/30 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-400">
                预览模式
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {pendingEdits.length} 个 AI 修改建议
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Individual edit controls - shown when hovering over decorations */}
            {pendingEdits.map((edit) => (
              <div key={edit.id} className="flex items-center gap-1">
                <button
                  onClick={() => onAcceptEdit?.(edit.id)}
                  className="p-1.5 hover:bg-green-500/20 rounded transition-colors group"
                  title="接受此修改"
                >
                  <Check className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                </button>
                <button
                  onClick={() => onRejectEdit?.(edit.id)}
                  className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
                  title="拒绝此修改"
                >
                  <X className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                </button>
              </div>
            ))}
            
            {/* Batch controls */}
            <div className="ml-2 pl-2 border-l border-gray-600 flex items-center gap-2">
              <button
                onClick={onAcceptAllEdits}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                全部接受
              </button>
              <button
                onClick={onRejectAllEdits}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                全部拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(fileName)}
          theme="vs-dark"
          value={value}
          onChange={(value) => onChange(value || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            readOnly: isPreviewMode, // Make read-only in preview mode
          }}
        />
      </div>

      {/* Custom CSS for decorations */}
      <style jsx global>{`
        .pending-edit-decoration {
          background-color: rgba(74, 222, 128, 0.15);
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
        .pending-edit-inline {
          background-color: rgba(74, 222, 128, 0.1);
        }
        .pending-edit-glyph {
          background-color: rgba(74, 222, 128, 0.8);
          width: 4px !important;
          margin-left: 3px;
        }
      `}</style>
    </div>
  );
}

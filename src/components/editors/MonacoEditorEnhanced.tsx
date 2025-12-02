"use client";

import { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { PendingEdit } from "@/types/editor.types";
import { highlightEdits, clearHighlights } from "@/utils/editorHelper";
import * as monaco from 'monaco-editor';

interface MonacoEditorEnhancedProps {
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
}

export default function MonacoEditorEnhanced({
  value,
  onChange,
  fileName,
  onExplainCode,
  onOptimizeCode,
  onEditCode,
  pendingEdits = [],
}: MonacoEditorEnhancedProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const [decorationIds, setDecorationIds] = useState<string[]>([]);

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

  // Update decorations when pendingEdits change
  useEffect(() => {
    if (!editorRef.current || pendingEdits.length === 0) {
      if (decorationIds.length > 0 && editorRef.current) {
        clearHighlights(editorRef.current, decorationIds);
        setDecorationIds([]);
      }
      return;
    }

    // Clear old decorations
    if (decorationIds.length > 0) {
      clearHighlights(editorRef.current, decorationIds);
    }

    // Add new decorations
    const newDecorationIds = highlightEdits(editorRef.current, pendingEdits);
    setDecorationIds(newDecorationIds);
  }, [pendingEdits]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Add custom CSS for AI suggestions
    const style = document.createElement('style');
    style.innerHTML = `
      .ai-suggestion-highlight {
        background-color: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.5);
      }
      .ai-suggestion-glyph {
        background-color: #3b82f6;
        width: 4px !important;
        margin-left: 3px;
      }
    `;
    document.head.appendChild(style);

    // Add keyboard shortcuts for accept/reject
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      if (onAcceptAllEdits && pendingEdits.length > 0) {
        onAcceptAllEdits();
      }
    });

    editor.addCommand(monacoInstance.KeyCode.Escape, () => {
      if (onRejectAllEdits && pendingEdits.length > 0) {
        onRejectAllEdits();
      }
    });

    // Add AI context menu actions
    if (onExplainCode) {
      editor.addAction({
        id: 'ai-explain-code',
        label: '🤖 AI 解释代码',
        contextMenuGroupId: 'ai',
        contextMenuOrder: 1,
        run: (ed) => {
          const selection = ed.getSelection();
          if (!selection) return;
          const selectedText = ed.getModel()?.getValueInRange(selection);
          if (selectedText) {
            onExplainCode(selectedText);
          } else {
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
        run: (ed) => {
          const selection = ed.getSelection();
          if (!selection) return;
          const selectedText = ed.getModel()?.getValueInRange(selection);
          if (selectedText) {
            onOptimizeCode(selectedText);
          } else {
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
        run: (ed) => {
          const selection = ed.getSelection();
          if (!selection) return;
          const selectedText = ed.getModel()?.getValueInRange(selection);
          if (selectedText) {
            onEditCode(selectedText);
          } else {
            onEditCode(ed.getValue());
          }
        },
      });
    }

    // Add accept/reject actions if there are pending edits
    if (onAcceptAllEdits) {
      editor.addAction({
        id: 'ai-accept-all',
        label: '✅ 接受所有 AI 修改 (Ctrl+Enter)',
        contextMenuGroupId: 'ai-edits',
        contextMenuOrder: 1,
        run: () => {
          onAcceptAllEdits();
        },
      });
    }

    if (onRejectAllEdits) {
      editor.addAction({
        id: 'ai-reject-all',
        label: '❌ 拒绝所有 AI 修改 (Esc)',
        contextMenuGroupId: 'ai-edits',
        contextMenuOrder: 2,
        run: () => {
          onRejectAllEdits();
        },
      });
    }
  };

  return (
    <div className="relative h-full">
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
          glyphMargin: true,
          readOnly: pendingEdits.length > 0, // Read-only when there are pending edits
        }}
      />
      
      {/* Floating action bar for pending edits */}
      {pendingEdits.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-blue-500 rounded-lg shadow-2xl p-3 flex items-center gap-3 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>{pendingEdits.length} 个 AI 修改建议</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onAcceptAllEdits}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors flex items-center gap-1"
              title="Ctrl+Enter"
            >
              <span>✓</span>
              <span>接受全部</span>
            </button>
            <button
              onClick={onRejectAllEdits}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors flex items-center gap-1"
              title="Esc"
            >
              <span>✕</span>
              <span>拒绝全部</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

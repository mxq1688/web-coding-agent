"use client";

import { useRef } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Check, X, ChevronDown } from "lucide-react";
import { PendingEdit } from "@/types/editor.types";
import type { editor } from "monaco-editor";

interface MonacoDiffViewerProps {
  original: string;
  modified: string;
  fileName: string;
  pendingEdits?: PendingEdit[];
  onAcceptEdit?: (editId: string) => void;
  onRejectEdit?: (editId: string) => void;
  onAcceptAllEdits?: () => void;
  onRejectAllEdits?: () => void;
}

export default function MonacoDiffViewer({
  original,
  modified,
  fileName,
  pendingEdits = [],
  onAcceptEdit,
  onRejectEdit,
  onAcceptAllEdits,
  onRejectAllEdits,
}: MonacoDiffViewerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diffEditorRef = useRef<any>(null);

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

  const handleEditorDidMount = (editor: editor.IStandaloneDiffEditor, monaco: typeof import('monaco-editor')) => {
    diffEditorRef.current = editor;

    // Configure diff editor options
    editor.updateOptions({
      renderSideBySide: true,
      enableSplitViewResizing: true,
      renderIndicators: true,
      renderMarginRevertIcon: true,
      ignoreTrimWhitespace: false,
    });

    // Add navigation actions
    editor.addAction({
      id: "navigate-next-change",
      label: "下一个修改",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.F5],
      run: (ed: editor.IStandaloneDiffEditor) => {
        ed.getActions().find((a: editor.IEditorAction) => a.id === "editor.action.diffReview.next")?.run();
      },
    });

    editor.addAction({
      id: "navigate-prev-change",
      label: "上一个修改",
      keybindings: [monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.F5],
      run: (ed: editor.IStandaloneDiffEditor) => {
        ed.getActions().find((a: editor.IEditorAction) => a.id === "editor.action.diffReview.prev")?.run();
      },
    });
  };

  // Navigate to specific change
  const navigateToEdit = (edit: PendingEdit) => {
    if (!diffEditorRef.current) return;

    const modifiedEditor = diffEditorRef.current.getModifiedEditor();
    if (modifiedEditor) {
      modifiedEditor.revealLineInCenter(edit.startLine);
      modifiedEditor.setPosition({
        lineNumber: edit.startLine,
        column: edit.startColumn || 1,
      });
      modifiedEditor.focus();
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Control Bar */}
      {pendingEdits.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-b border-blue-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-400">
                代码对比视图
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {pendingEdits.length} 个修改块
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Navigation hints */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-800 rounded border border-gray-700">Alt+F5</kbd>
              <span>下一个</span>
            </div>

            {/* Batch controls */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-600">
              <button
                onClick={onAcceptAllEdits}
                className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                接受全部
              </button>
              <button
                onClick={onRejectAllEdits}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                拒绝全部
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Edit Controls */}
      {pendingEdits.length > 0 && (
        <div className="bg-gray-900/50 border-b border-gray-700 px-4 py-2 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {pendingEdits.map((edit, index) => (
              <div
                key={edit.id}
                className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded group cursor-pointer"
                onClick={() => navigateToEdit(edit)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xs text-gray-500 font-mono w-8">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      L{edit.startLine}-{edit.endLine}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-600" />
                  </div>
                  <span className="text-xs text-gray-300 truncate flex-1">
                    {edit.description || "代码修改"}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptEdit?.(edit.id);
                    }}
                    className="p-1.5 hover:bg-green-500/20 rounded transition-colors"
                    title="接受此修改"
                  >
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectEdit?.(edit.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                    title="拒绝此修改"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff Editor */}
      <div className="flex-1">
        <DiffEditor
          height="100%"
          language={getLanguage(fileName)}
          theme="vs-dark"
          original={original}
          modified={modified}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            readOnly: false,
            renderSideBySide: true,
            enableSplitViewResizing: true,
            renderIndicators: true,
            ignoreTrimWhitespace: false,
          }}
        />
      </div>

      {/* Custom CSS for better diff visualization */}
      <style jsx global>{`
        .monaco-diff-editor .insert-sign,
        .monaco-diff-editor .delete-sign {
          opacity: 0.8;
        }
        .monaco-diff-editor .char-insert {
          background-color: rgba(74, 222, 128, 0.25) !important;
        }
        .monaco-diff-editor .char-delete {
          background-color: rgba(248, 113, 113, 0.25) !important;
        }
        .monaco-diff-editor .line-insert {
          background-color: rgba(74, 222, 128, 0.15) !important;
        }
        .monaco-diff-editor .line-delete {
          background-color: rgba(248, 113, 113, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

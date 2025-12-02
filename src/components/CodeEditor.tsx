"use client";

import { useState, useEffect } from "react";
import { Save, ChevronDown, GitCompare } from "lucide-react";
import dynamic from "next/dynamic";
import { PendingEdit } from "@/types/editor.types";

// Dynamically import editors to avoid SSR issues
const MonacoEditor = dynamic(() => import("./editors/MonacoEditor"), { ssr: false });
const CodeMirrorEditor = dynamic(() => import("./editors/CodeMirrorEditor"), { ssr: false });
const AceEditorComponent = dynamic(() => import("./editors/AceEditor"), { ssr: false });
const SplitDiffViewer = dynamic(() => import("./editors/SplitDiffViewer"), { ssr: false });

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
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

type EditorType = "monaco" | "codemirror" | "ace";

const editorOptions = [
  { value: "monaco" as EditorType, label: "Monaco Editor", description: "VSCode 核心引擎" },
  { value: "codemirror" as EditorType, label: "CodeMirror", description: "轻量级高性能" },
  { value: "ace" as EditorType, label: "Ace Editor", description: "经典 Web 编辑器" },
];

export default function CodeEditor({ 
  value, 
  onChange, 
  onSave, 
  fileName, 
  onExplainCode, 
  onOptimizeCode, 
  onEditCode,
  pendingEdits,
  onAcceptEdit,
  onRejectEdit,
  onAcceptAllEdits,
  onRejectAllEdits,
  onCursorChange,
  onSelectionChange
}: CodeEditorProps) {
  const [selectedEditor, setSelectedEditor] = useState<EditorType>("monaco");
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [originalValue, setOriginalValue] = useState(value); // 保存原始内容用于 diff
  const [isDiffMode, setIsDiffMode] = useState(false);
  
  // Git Diff 相关状态
  const [diffSource, setDiffSource] = useState<'local' | 'git'>('local');
  const [gitOriginalValue, setGitOriginalValue] = useState<string>('');
  const [isLoadingGit, setIsLoadingGit] = useState(false);

  // Sync external value changes and save as original
  useEffect(() => {
    setCurrentValue(value);
    setOriginalValue(value); // 每次加载新文件时保存原始版本
    setIsDiffMode(false); // 重置 diff 模式
  }, [value]);

  const handleChange = (newValue: string) => {
    setCurrentValue(newValue);
    onChange(newValue);
  };

  const fetchGitContent = async () => {
    console.log('[DEBUG] fetchGitContent called for:', fileName);
    if (!fileName) return;
    
    setIsLoadingGit(true);
    try {
      const url = `/api/files/content?path=${encodeURIComponent(fileName)}&type=git`;
      console.log('[DEBUG] Fetching git content from:', url);
      const response = await fetch(url);
      console.log('[DEBUG] Git content response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Git content length:', data.content?.length);
        setGitOriginalValue(data.content || '');
      } else {
        console.error('[DEBUG] Failed to fetch git content, status:', response.status);
        setGitOriginalValue('');
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching git content:', error);
    } finally {
      setIsLoadingGit(false);
    }
  };

  console.log('[DEBUG] CodeEditor Render: isDiffMode=', isDiffMode, 'diffSource=', diffSource);

  const handleSave = () => {
    onSave(currentValue);
    // 保存后更新原始版本为当前版本（新的基准）
    setOriginalValue(currentValue);
    // 保持 diff 模式，让用户可以看到"已保存，无变化"的状态
    // 用户可以手动退出 diff 模式
  };

  const toggleDiffMode = () => {
    console.log('[DEBUG] Toggle Diff Mode');
    console.log('[DEBUG] Current isDiffMode:', isDiffMode);
    console.log('[DEBUG] originalValue length:', originalValue.length);
    console.log('[DEBUG] currentValue length:', currentValue.length);
    console.log('[DEBUG] Are they equal?', originalValue === currentValue);
    setIsDiffMode(!isDiffMode);
  };

  // Add keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentValue]);

  const renderEditor = () => {
    // Diff 模式：使用 GitHub 风格的 Unified Diff Viewer
    if (isDiffMode) {
      return (
        <SplitDiffViewer
          original={diffSource === 'git' ? gitOriginalValue : originalValue}
          modified={currentValue}
          fileName={fileName}
        />
      );
    }

    // 普通编辑模式
    const commonProps = {
      value: currentValue,
      onChange: handleChange,
      fileName,
      onExplainCode,
      onOptimizeCode,
      onEditCode,
      pendingEdits,
      onAcceptEdit,
      onRejectEdit,
      onAcceptAllEdits,
      onRejectAllEdits,
      onCursorChange,
      onSelectionChange,
    };

    switch (selectedEditor) {
      case "monaco":
        return <MonacoEditor {...commonProps} />;
      case "codemirror":
        return <CodeMirrorEditor {...commonProps} />;
      case "ace":
        return <AceEditorComponent {...commonProps} />;
      default:
        return <MonacoEditor {...commonProps} />;
    }
  };

  // 检查是否有未保存的修改
  const hasChanges = currentValue !== originalValue;

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* File Name */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">📄</span>
            <span className="text-sm text-gray-200">{fileName}</span>
            {hasChanges && (
              <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">未保存</span>
            )}
          </div>

          {/* Editor Selector - 只在非 Diff 模式下显示 */}
          {!isDiffMode && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="
                  flex items-center gap-2 px-3 py-1.5
                  bg-gray-700 hover:bg-gray-600
                  text-gray-200 text-sm rounded
                  transition-colors border border-gray-600
                "
              >
                <span>{editorOptions.find(opt => opt.value === selectedEditor)?.label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  />
                  
                  {/* Dropdown content */}
                  <div className="
                    absolute top-full left-0 mt-1 z-20
                    bg-gray-800 rounded-lg shadow-xl
                    border border-gray-700
                    min-w-[240px]
                  ">
                    {editorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedEditor(option.value);
                          setShowDropdown(false);
                        }}
                        className={
                          `w-full px-4 py-3 text-left transition-colors
                          hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg
                          ${selectedEditor === option.value ? "bg-gray-700" : ""}`
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-200">
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {option.description}
                            </div>
                          </div>
                          {selectedEditor === option.value && (
                            <span className="text-blue-400 text-lg">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Diff Source Toggle - 仅在 Diff 模式下显示 */}
          {isDiffMode && (
            <div className="flex bg-gray-700 rounded p-0.5 mr-2">
              <button
                onClick={() => setDiffSource('local')}
                className={`px-3 py-1 text-xs rounded transition-colors ${diffSource === 'local' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
              >
                本地对比
              </button>
              <button
                onClick={() => {
                  setDiffSource('git');
                  if (!gitOriginalValue) fetchGitContent();
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${diffSource === 'git' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
              >
                {isLoadingGit ? '加载中...' : 'Git 对比'}
              </button>
            </div>
          )}

          {/* Diff Mode Toggle - 始终可点击 */}
          <button
            onClick={toggleDiffMode}
            className={
              `flex items-center gap-2 px-3 py-1.5
              text-sm rounded transition-colors border
              ${isDiffMode 
                ? "bg-green-600 hover:bg-green-700 text-white border-green-500" 
                : "bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
              }`
            }
          >
            <GitCompare className="w-4 h-4" />
            {isDiffMode ? "退出 Diff" : "查看 Diff"}
            {!hasChanges && !isDiffMode && (
              <span className="text-xs text-gray-400">(无修改)</span>
            )}
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="
            flex items-center gap-2 px-3 py-1.5
            bg-blue-600 hover:bg-blue-700
            disabled:bg-gray-600 disabled:cursor-not-allowed
            text-white text-sm rounded
            transition-colors
          "
        >
          <Save className="w-4 h-4" />
          Save (Ctrl+S)
        </button>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-hidden">
        {renderEditor()}
      </div>
    </div>
  );
}

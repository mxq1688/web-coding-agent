"use client";

import { useState, useEffect } from "react";
import { Save, ChevronDown, GitCompare } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import editors to avoid SSR issues
const MonacoEditor = dynamic(() => import("./editors/MonacoEditor"), { ssr: false });
const CodeMirrorEditor = dynamic(() => import("./editors/CodeMirrorEditor"), { ssr: false });
const AceEditorComponent = dynamic(() => import("./editors/AceEditor"), { ssr: false });
const MonacoDiffEditor = dynamic(() => import("./editors/MonacoDiffEditor"), { ssr: false });

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  fileName: string;
}

type EditorType = "monaco" | "codemirror" | "ace";

const editorOptions = [
  { value: "monaco" as EditorType, label: "Monaco Editor", description: "VSCode 核心引擎" },
  { value: "codemirror" as EditorType, label: "CodeMirror", description: "轻量级高性能" },
  { value: "ace" as EditorType, label: "Ace Editor", description: "经典 Web 编辑器" },
];

export default function CodeEditor({ value, onChange, onSave, fileName }: CodeEditorProps) {
  const [selectedEditor, setSelectedEditor] = useState<EditorType>("monaco");
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [originalValue, setOriginalValue] = useState(value); // 保存原始内容用于 diff
  const [isDiffMode, setIsDiffMode] = useState(false);

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

  const handleSave = () => {
    onSave(currentValue);
    // 保存后更新原始版本
    setOriginalValue(currentValue);
    setIsDiffMode(false);
  };

  const toggleDiffMode = () => {
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
    // Diff 模式：只使用 Monaco 的 Diff Editor
    if (isDiffMode) {
      return (
        <MonacoDiffEditor
          original={originalValue}
          modified={currentValue}
          fileName={fileName}
          readOnly={false}
          onModifiedChange={handleChange}
        />
      );
    }

    // 普通编辑模式
    const commonProps = {
      value: currentValue,
      onChange: handleChange,
      fileName,
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

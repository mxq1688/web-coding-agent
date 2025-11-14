"use client";

import { useEffect, useRef } from "react";
import { DiffEditor } from "@monaco-editor/react";

interface MonacoDiffEditorProps {
  original: string;  // 原始内容（旧版本）
  modified: string;  // 修改后的内容（新版本）
  fileName: string;
  readOnly?: boolean;
  onModifiedChange?: (value: string) => void;
}

export default function MonacoDiffEditor({
  original,
  modified,
  fileName,
  readOnly = false,
  onModifiedChange,
}: MonacoDiffEditorProps) {
  const diffEditorRef = useRef<any>(null);

  // 检测语言
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

  const handleEditorDidMount = (editor: any) => {
    diffEditorRef.current = editor;

    // 监听修改后的内容变化
    if (onModifiedChange) {
      const modifiedEditor = editor.getModifiedEditor();
      modifiedEditor.onDidChangeModelContent(() => {
        const value = modifiedEditor.getValue();
        onModifiedChange(value);
      });
    }
  };

  return (
    <DiffEditor
      height="100%"
      language={getLanguage(fileName)}
      theme="vs-dark"
      original={original}
      modified={modified}
      onMount={handleEditorDidMount}
      options={{
        readOnly: readOnly,
        renderSideBySide: true,  // 并排显示
        fontSize: 14,
        minimap: { enabled: false },  // Diff 视图通常不需要 minimap
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        enableSplitViewResizing: true,  // 允许调整左右视图大小
        renderIndicators: true,  // 显示 +/- 指示器
        ignoreTrimWhitespace: false,  // 不忽略空白字符差异
      }}
    />
  );
}

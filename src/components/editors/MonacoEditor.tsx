"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
}

export default function MonacoEditor({ value, onChange, fileName }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

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

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
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
      }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Save } from "lucide-react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  fileName: string;
}

export default function CodeEditor({ value, onChange, onSave, fileName }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);
  const editorInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Load Monaco Editor dynamically
    const loadMonaco = async () => {
      if (typeof window === "undefined") return;

      // Load Monaco from CDN
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js";
      script.async = true;
      script.onload = () => {
        const require = (window as any).require;
        require.config({
          paths: {
            vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
          },
        });

        require(["vs/editor/editor.main"], () => {
          if (editorRef.current && !(window as any).monaco) {
            (window as any).monaco = require("vs/editor/editor.main");
          }
          monacoRef.current = (window as any).monaco;
          initEditor();
        });
      };
      document.body.appendChild(script);
    };

    const initEditor = () => {
      if (!monacoRef.current || !editorRef.current) return;

      // Dispose previous editor instance
      if (editorInstanceRef.current) {
        editorInstanceRef.current.dispose();
      }

      // Detect language from file extension
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
      const language = languageMap[ext || ""] || "plaintext";

      // Create editor
      editorInstanceRef.current = monacoRef.current.editor.create(editorRef.current, {
        value: value,
        language: language,
        theme: "vs-dark",
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: "on",
      });

      // Listen to content changes
      editorInstanceRef.current.onDidChangeModelContent(() => {
        const newValue = editorInstanceRef.current.getValue();
        onChange(newValue);
      });

      // Add Ctrl+S / Cmd+S save shortcut
      editorInstanceRef.current.addCommand(
        monacoRef.current.KeyMod.CtrlCmd | monacoRef.current.KeyCode.KeyS,
        () => {
          onSave(editorInstanceRef.current.getValue());
        }
      );
    };

    if (!(window as any).monaco) {
      loadMonaco();
    } else {
      monacoRef.current = (window as any).monaco;
      initEditor();
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.dispose();
      }
    };
  }, [fileName]);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorInstanceRef.current && editorInstanceRef.current.getValue() !== value) {
      editorInstanceRef.current.setValue(value);
    }
  }, [value]);

  const handleSave = () => {
    if (editorInstanceRef.current) {
      onSave(editorInstanceRef.current.getValue());
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">📄</span>
          <span className="text-sm text-gray-200">{fileName}</span>
        </div>
        <button
          onClick={handleSave}
          className="
            flex items-center gap-2 px-3 py-1.5
            bg-blue-600 hover:bg-blue-700
            text-white text-sm rounded
            transition-colors
          "
        >
          <Save className="w-4 h-4" />
          Save (Ctrl+S)
        </button>
      </div>

      {/* Monaco Editor Container */}
      <div ref={editorRef} className="flex-1" />
    </div>
  );
}

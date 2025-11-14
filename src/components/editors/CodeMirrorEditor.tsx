"use client";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
}

export default function CodeMirrorEditor({ value, onChange, fileName }: CodeMirrorEditorProps) {
  // Detect language extension from file name
  const getLanguageExtension = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    
    switch (ext) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return [javascript({ jsx: true, typescript: ext === "ts" || ext === "tsx" })];
      case "py":
        return [python()];
      case "html":
        return [html()];
      case "css":
        return [css()];
      case "json":
        return [json()];
      default:
        return [];
    }
  };

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      extensions={getLanguageExtension(fileName)}
      onChange={(value) => onChange(value)}
      style={{ height: "100%" }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        searchKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
    />
  );
}

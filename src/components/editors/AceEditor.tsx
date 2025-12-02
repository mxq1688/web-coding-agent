"use client";

import AceEditor from "react-ace";

// Import Ace modes and themes
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

interface AceEditorComponentProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  onExplainCode?: (code: string) => void;
  onOptimizeCode?: (code: string) => void;
  onEditCode?: (code: string) => void;
}

export default function AceEditorComponent({ value, onChange, fileName, onExplainCode, onOptimizeCode, onEditCode }: AceEditorComponentProps) {
  // Detect mode from file extension
  const getMode = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const modeMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sql: "sql",
      sh: "sh",
    };
    return modeMap[ext || ""] || "text";
  };

  return (
    <AceEditor
      mode={getMode(fileName)}
      theme="monokai"
      value={value}
      onChange={onChange}
      name="ace-editor"
      width="100%"
      height="100%"
      fontSize={14}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={true}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
        useWorker: false,
      }}
      editorProps={{ $blockScrolling: true }}
    />
  );
}

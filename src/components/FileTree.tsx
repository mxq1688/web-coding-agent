"use client";

import { useState } from "react";
import { FileNode } from "@/types/file.types";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";

interface FileTreeProps {
  files: FileNode[];
  onSelect: (path: string) => void;
  selectedFile: string | null;
  level?: number;
}

export default function FileTree({ files, onSelect, selectedFile, level = 0 }: FileTreeProps) {
  // Auto-expand all directories by default
  const getAllDirectoryPaths = (nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (items: FileNode[]) => {
      items.forEach(item => {
        if (item.type === 'directory') {
          paths.push(item.path);
          if (item.children) {
            traverse(item.children);
          }
        }
      });
    };
    traverse(nodes);
    return paths;
  };

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(getAllDirectoryPaths(files)));

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expanded.has(node.path) ? (
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-400" />
      );
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="select-none">
      {files.map((node) => (
        <div key={node.path}>
          <div
            className={`
              flex items-center gap-1 py-1 px-2 cursor-pointer rounded
              hover:bg-gray-100 transition-colors
              ${selectedFile === node.path ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}
            `}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'directory') {
                toggleExpand(node.path);
              } else {
                onSelect(node.path);
              }
            }}
          >
            {node.type === 'directory' && (
              <span className="flex-shrink-0">
                {expanded.has(node.path) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
            {getFileIcon(node)}
            <span className="text-sm truncate">{node.name}</span>
          </div>

          {node.type === 'directory' && expanded.has(node.path) && node.children && (
            <FileTree
              files={node.children}
              onSelect={onSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

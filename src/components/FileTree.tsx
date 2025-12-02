"use client";

import { useState } from "react";
import { FileNode } from "@/types/file.types";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, FileText, FolderPlus, Edit3, Trash2, Copy } from "lucide-react";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";

interface FileTreeProps {
  files: FileNode[];
  onSelect: (path: string) => void;
  selectedFile: string | null;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onRename?: (path: string) => void;
  onDelete?: (path: string) => void;
  level?: number;
}

export default function FileTree({ 
  files, 
  onSelect, 
  selectedFile, 
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  level = 0 
}: FileTreeProps) {
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const getContextMenuItems = (node: FileNode): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (node.type === 'directory') {
      items.push({
        label: '新建文件',
        icon: <FileText className="w-4 h-4" />,
        onClick: () => onCreateFile?.(node.path),
      });
      items.push({
        label: '新建文件夹',
        icon: <FolderPlus className="w-4 h-4" />,
        onClick: () => onCreateFolder?.(node.path),
      });
      items.push({ label: '', icon: null, onClick: () => {}, divider: true });
    }

    items.push({
      label: '重命名',
      icon: <Edit3 className="w-4 h-4" />,
      onClick: () => onRename?.(node.path),
    });

    items.push({
      label: '复制路径',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => {
        navigator.clipboard.writeText(node.path);
      },
    });

    items.push({ label: '', icon: null, onClick: () => {}, divider: true });

    items.push({
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => onDelete?.(node.path),
      danger: true,
    });

    return items;
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
    <>
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
              onContextMenu={(e) => handleContextMenu(e, node)}
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
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onRename={onRename}
                onDelete={onDelete}
                level={level + 1}
              />
            )}
          </div>
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.node)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

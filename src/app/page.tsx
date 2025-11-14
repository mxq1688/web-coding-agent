"use client";

import { useState, useEffect } from "react";
import FileTree from "@/components/FileTree";
import CodeEditor from "@/components/CodeEditor";
import { FileNode } from "@/types/file.types";
import { saveDirectoryHandle, loadDirectoryHandle, verifyPermission } from "@/utils/storage";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileHandles, setFileHandles] = useState<Map<string, FileSystemFileHandle>>(new Map());

  // Auto-restore last opened directory on mount
  useEffect(() => {
    const restoreDirectory = async () => {
      try {
        const savedHandle = await loadDirectoryHandle();
        if (!savedHandle) return;

        // Verify we still have permission
        const hasPermission = await verifyPermission(savedHandle, 'readwrite');
        if (!hasPermission) {
          console.log('Permission denied for saved directory');
          return;
        }

        // Restore the directory
        setLoading(true);
        setDirHandle(savedHandle);
        const handles = new Map<string, FileSystemFileHandle>();
        const fileTree = await buildFileTree(savedHandle, '', handles);
        setFileHandles(handles);
        setFiles(fileTree);
      } catch (error) {
        console.error('Failed to restore directory:', error);
      } finally {
        setLoading(false);
      }
    };

    restoreDirectory();
  }, []);

  const isTextFile = (name: string): boolean => {
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs',
      '.html', '.css', '.scss', '.xml', '.yaml', '.yml',
      '.sh', '.bash', '.sql', '.php', '.rb', '.swift',
      '.kt', '.scala', '.r', '.m', '.h', '.vue', '.svelte'
    ];
    return textExtensions.some(ext => name.toLowerCase().endsWith(ext));
  };

  const buildFileTree = async (
    dirHandle: FileSystemDirectoryHandle,
    parentPath: string = "",
    handles: Map<string, FileSystemFileHandle>
  ): Promise<FileNode[]> => {

    const nodes: FileNode[] = [];

    try {
      for await (const entry of dirHandle.values()) {
        const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') {
          continue;
        }

        if (entry.kind === 'directory') {
          const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
          const children = await buildFileTree(subDirHandle, fullPath, handles);
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children,
          });
        } else if (entry.kind === 'file' && isTextFile(entry.name)) {
          const fileHandle = await dirHandle.getFileHandle(entry.name);
          handles.set(fullPath, fileHandle);
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }

      // Sort: directories first, then files
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    return nodes;
  };

  const loadProject = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('您的浏览器不支持文件系统访问 API。请使用 Chrome、Edge 或其他现代浏览器。');
      return;
    }

    setLoading(true);
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });

      setDirHandle(dirHandle);
      const handles = new Map<string, FileSystemFileHandle>();
      const fileTree = await buildFileTree(dirHandle, '', handles);
      setFileHandles(handles);
      setFiles(fileTree);
      
      // Save directory handle for future sessions
      await saveDirectoryHandle(dirHandle);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        alert('加载项目失败：' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    const handle = fileHandles.get(path);
    if (!handle) {
      alert('无法找到文件句柄');
      return;
    }

    try {
      setFileHandle(handle);
      const file = await handle.getFile();
      const content = await file.text();
      setFileContent(content);
    } catch (error: any) {
      alert('读取文件失败：' + error.message);
    }
  };

  const handleSave = async (content: string) => {
    if (!fileHandle) {
      alert('没有选中的文件');
      return;
    }

    try {
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      alert('文件保存成功！');
    } catch (error: any) {
      alert('保存文件失败：' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">💻 Code Editor</h1>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
              {dirHandle ? `📂 ${dirHandle.name}` : '点击按钮选择本地项目文件夹'}
            </div>
            <button
              onClick={loadProject}
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors whitespace-nowrap"
            >
              {loading ? '加载中...' : '选择文件夹'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">文件浏览器</h2>
            {files.length > 0 ? (
              <FileTree files={files} onSelect={handleFileSelect} selectedFile={selectedFile} />
            ) : (
              <p className="text-sm text-gray-400">尚未加载项目</p>
            )}
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 bg-gray-900">
          {selectedFile ? (
            <CodeEditor
              value={fileContent}
              onChange={setFileContent}
              onSave={handleSave}
              fileName={selectedFile}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">📂 未选择文件</p>
                <p className="text-sm">点击"选择文件夹"加载项目，然后选择文件开始编辑</p>
                <p className="text-xs mt-4 text-gray-500">支持 Chrome、Edge 等现代浏览器</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

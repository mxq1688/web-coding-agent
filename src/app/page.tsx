"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import FileTree from "@/components/FileTree";
import CodeEditor from "@/components/CodeEditor";
import AIChat from "@/components/AIChat";
import { FileNode } from "@/types/file.types";
import { PendingEdit } from "@/types/editor.types";
import { saveDirectoryHandle, loadDirectoryHandle, verifyPermission } from "@/utils/storage";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileHandles, setFileHandles] = useState<Map<string, FileSystemFileHandle>>(new Map());
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAction, setAiAction] = useState<'chat' | 'explain' | 'optimize' | 'generate' | 'fix' | 'edit'>('chat');
  const [aiCode, setAiCode] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  
  // History tracking for undo functionality
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Pending edits for Cursor-style preview
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const editorRef = useRef<unknown>(null);
  
  // Editor context for AI
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | undefined>();
  const [selectedText, setSelectedText] = useState<string | undefined>();

  // Auto-restore last opened directory on mount
  useEffect(() => {
    const restoreDirectory = async () => {
      try {
        const savedHandle = await loadDirectoryHandle();
        if (!savedHandle) return;

        // Verify we still have permission
        const hasPermission = await verifyPermission(savedHandle, "readwrite");
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

  // Refresh function with optional silent mode for auto-polling
  const handleRefresh = useCallback(async (silent: boolean = false) => {
    if (!dirHandle) {
      if (!silent) toast.error('请先打开一个项目');
      return;
    }

    // Only show loading state for manual refresh
    if (!silent) setLoading(true);
    
    try {
      const handles = new Map<string, FileSystemFileHandle>();
      const fileTree = await buildFileTree(dirHandle, '', handles);
      setFileHandles(handles);
      setFiles(fileTree);
      if (!silent) toast.success('项目已刷新！');
    } catch (error) {
      if (!silent) {
        toast.error('刷新项目失败：' + (error as Error).message);
      } else {
        console.error('Auto-refresh failed:', error);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dirHandle, loading]);

  // Auto-refresh on tab/window focus
  useEffect(() => {
    if (!dirHandle) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh(true);
      }
    };

    const handleFocus = () => {
      handleRefresh(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dirHandle]);

  // Polling refresh (every 5 seconds when tab is visible)
  useEffect(() => {
    if (!dirHandle) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh(true);
      }
    }, 5000); // 5 seconds

    return () => clearInterval(intervalId);
  }, [dirHandle]);

  // Keyboard shortcuts for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex >= 0 && historyIndex < contentHistory.length) {
          const previousContent = contentHistory[historyIndex];
          setFileContent(previousContent);
          setHistoryIndex(historyIndex - 1);
          toast.success('已撤销到上一个版本');
        } else {
          toast.info('没有更多历史记录可以撤销');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, contentHistory]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const entry of (dirHandle as any).values()) {
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
      toast.error('您的浏览器不支持文件系统访问 API。请使用 Chrome、Edge 或其他现代浏览器。');
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('加载项目失败：' + (error as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    const handle = fileHandles.get(path);
    if (!handle) {
      toast.error('无法找到文件句柄');
      return;
    }

    try {
      setFileHandle(handle);
      const file = await handle.getFile();
      const content = await file.text();
      setFileContent(content);
    } catch (error) {
      toast.error('读取文件失败：' + (error as Error).message);
    }
  };

  const handleSave = async (content: string) => {
    if (!fileHandle) {
      toast.error('没有选中的文件');
      return;
    }

    try {
      // 检查写入权限
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const permission = await (fileHandle as any).queryPermission({ mode: 'readwrite' });
      
      // 如果没有权限，请求权限
      if (permission !== 'granted') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPermission = await (fileHandle as any).requestPermission({ mode: 'readwrite' });
        if (newPermission !== 'granted') {
          toast.error('需要文件写入权限才能保存');
          return;
        }
      }

      // 有权限后写入文件
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      toast.success('文件保存成功！');
    } catch (error) {
      toast.error('保存文件失败：' + (error as Error).message);
    }
  };

  const handleCreateFile = async (parentPath: string) => {
    if (!dirHandle) {
      toast.error('请先打开一个项目');
      return;
    }

    const fileName = prompt('输入文件名：');
    if (!fileName) return;

    try {
      // Navigate to parent directory
      const pathParts = parentPath.split('/').filter(p => p);
      let currentDir = dirHandle;
      
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part);
      }

      // Create new file
      const newFileHandle = await currentDir.getFileHandle(fileName, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write('');
      await writable.close();

      toast.success(`文件 "${fileName}" 创建成功！`);
      await handleRefresh(true);
    } catch (error) {
      toast.error('创建文件失败：' + (error as Error).message);
    }
  };

  const handleCreateFolder = async (parentPath: string) => {
    if (!dirHandle) {
      toast.error('请先打开一个项目');
      return;
    }

    const folderName = prompt('输入文件夹名：');
    if (!folderName) return;

    try {
      // Navigate to parent directory
      const pathParts = parentPath.split('/').filter(p => p);
      let currentDir = dirHandle;
      
      for (const part of pathParts) {
        currentDir = await currentDir.getDirectoryHandle(part);
      }

      // Create new folder
      await currentDir.getDirectoryHandle(folderName, { create: true });

      toast.success(`文件夹 "${folderName}" 创建成功！`);
      await handleRefresh(true);
    } catch (error) {
      toast.error('创建文件夹失败：' + (error as Error).message);
    }
  };

  const handleRename = async (path: string) => {
    if (!dirHandle) {
      toast.error('请先打开一个项目');
      return;
    }

    const pathParts = path.split('/').filter(p => p);
    const oldName = pathParts[pathParts.length - 1];
    const newName = prompt('输入新名称：', oldName);
    
    if (!newName || newName === oldName) return;

    try {
      // Get parent directory
      let currentDir = dirHandle;
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(pathParts[i]);
      }

      // Check if it's a file or directory
      const handle = fileHandles.get(path);
      
      if (handle) {
        // It's a file - read content, create new file, delete old
        const file = await handle.getFile();
        const content = await file.text();
        
        const newFileHandle = await currentDir.getFileHandle(newName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        await currentDir.removeEntry(oldName);
      } else {
        // It's a directory - this is more complex, for now show error
        toast.error('暂不支持重命名文件夹');
        return;
      }

      toast.success(`重命名成功！`);
      
      // If renamed file was selected, clear selection
      if (selectedFile === path) {
        setSelectedFile(null);
        setFileContent('');
      }
      
      await handleRefresh(true);
    } catch (error) {
      toast.error('重命名失败：' + (error as Error).message);
    }
  };

  const handleDelete = async (path: string) => {
    if (!dirHandle) {
      toast.error('请先打开一个项目');
      return;
    }

    const pathParts = path.split('/').filter(p => p);
    const name = pathParts[pathParts.length - 1];
    
    const confirmed = confirm(`确定要删除 "${name}" 吗？此操作无法撤销！`);
    if (!confirmed) return;

    try {
      // Get parent directory
      let currentDir = dirHandle;
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(pathParts[i]);
      }

      // Delete the entry
      await currentDir.removeEntry(name, { recursive: true });

      toast.success(`"${name}" 已删除！`);
      
      // If deleted file was selected, clear selection
      if (selectedFile === path || selectedFile?.startsWith(path + '/')) {
        setSelectedFile(null);
        setFileContent('');
      }
      
      await handleRefresh(true);
    } catch (error) {
      toast.error('删除失败：' + (error as Error).message);
    }
  };

  // AI Helper Functions
  const handleAIExplain = (code: string) => {
    setAiAction('explain');
    setAiCode(code);
    setAiPrompt('');
    setShowAIPanel(true);
  };

  const handleAIOptimize = (code: string) => {
    setAiAction('optimize');
    setAiCode(code);
    setAiPrompt('');
    setShowAIPanel(true);
  };

  const handleAIEdit = (code: string) => {
    setAiAction('edit');
    setAiCode(code);
    setAiPrompt(''); // User will provide edit instructions in the AI panel
    setShowAIPanel(true);
  };

  const handleAIGenerate = () => {
    setAiAction('generate');
    setAiCode('');
    setAiPrompt('');
    setShowAIPanel(true);
  };

  const handleAIChat = () => {
    setAiAction('chat');
    setAiCode('');
    setAiPrompt('');
    setShowAIPanel(true);
  };

  // Handle structured edits from AI
  const handleApplyEdits = (edits: PendingEdit[]) => {
    setPendingEdits(edits);
    toast.success(`收到 ${edits.length} 个 AI 修改建议，请在编辑器中预览`);
  };

  const handleAcceptEdit = (editId: string) => {
    setPendingEdits(prev => prev.filter(e => e.id !== editId));
  };

  const handleRejectEdit = (editId: string) => {
    setPendingEdits(prev => prev.filter(e => e.id !== editId));
  };

  const handleAcceptAllEdits = useCallback(() => {
    if (!editorRef.current || pendingEdits.length === 0) return;

    // Apply all edits using editor helper
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    try {
      // Sort edits by line number (descending) to avoid offset issues
      const sortedEdits = [...pendingEdits].sort((a, b) => b.startLine - a.startLine);

      // Create Monaco edit operations
      const editOperations = sortedEdits.map(edit => ({
        range: new (window as any).monaco.Range(
          edit.startLine,
          edit.startColumn || 1,
          edit.endLine,
          edit.endColumn || model.getLineMaxColumn(edit.endLine)
        ),
        text: edit.newText,
        forceMoveMarkers: true
      }));

      // Execute all edits in one operation
      editor.executeEdits('ai-cursor-edit', editOperations);

      // Update file content
      const newContent = model.getValue();
      setFileContent(newContent);

      // Clear pending edits
      setPendingEdits([]);
      toast.success('已应用所有 AI 修改');
    } catch (error) {
      console.error('Failed to apply edits:', error);
      toast.error('应用修改失败');
    }
  }, [pendingEdits]);

  const handleRejectAllEdits = useCallback(() => {
    setPendingEdits([]);
    toast.info('已拒绝所有 AI 修改');
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💻 Code Editor</h1>
          <div className="flex gap-2">
            <button
              onClick={handleAIChat}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>🤖</span>
              <span>AI 助手</span>
            </button>
            <button
              onClick={handleAIGenerate}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>✨</span>
              <span>生成代码</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Tree Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            {/* Project Selection */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="mb-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 truncate" title={dirHandle?.name}>
                {dirHandle ? `📂 ${dirHandle.name}` : '未选择项目'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={loadProject}
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? '加载中...' : '选择文件夹'}
                </button>
                {dirHandle && (
                  <button
                    onClick={() => handleRefresh()}
                    disabled={loading}
                    className="px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                    title="重新扫描项目目录"
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">文件浏览器</h2>
            {files.length > 0 ? (
              <div 
                className="flex-1 overflow-auto"
                onContextMenu={(e) => {
                  e.preventDefault();
                  const menu = document.createElement('div');
                  menu.className = 'fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[180px]';
                  menu.style.left = `${e.clientX}px`;
                  menu.style.top = `${e.clientY}px`;
                  
                  const items = [
                    { label: '新建文件', icon: '📄', action: () => handleCreateFile('') },
                    { label: '新建文件夹', icon: '📁', action: () => handleCreateFolder('') }
                  ];
                  
                  items.forEach(item => {
                    const btn = document.createElement('button');
                    btn.className = 'w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left';
                    btn.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
                    btn.onclick = () => {
                      item.action();
                      document.body.removeChild(menu);
                    };
                    menu.appendChild(btn);
                  });
                  
                  document.body.appendChild(menu);
                  
                  const closeMenu = (e: MouseEvent) => {
                    if (!menu.contains(e.target as Node)) {
                      document.body.removeChild(menu);
                      document.removeEventListener('mousedown', closeMenu);
                    }
                  };
                  
                  setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
                }}
              >
                <FileTree 
                  files={files} 
                  onSelect={handleFileSelect} 
                  selectedFile={selectedFile}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              </div>
            ) : dirHandle ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400 mb-3">项目为空，开始创建文件吧！</p>
                <button
                  onClick={() => handleCreateFile('')}
                  className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📄</span>
                  <span>新建文件</span>
                </button>
                <button
                  onClick={() => handleCreateFolder('')}
                  className="w-full px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📁</span>
                  <span>新建文件夹</span>
                </button>
              </div>
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
              onExplainCode={handleAIExplain}
              onOptimizeCode={handleAIOptimize}
              onEditCode={handleAIEdit}
              pendingEdits={pendingEdits}
              onAcceptEdit={handleAcceptEdit}
              onRejectEdit={handleRejectEdit}
              onAcceptAllEdits={handleAcceptAllEdits}
              onRejectAllEdits={handleRejectAllEdits}
              onCursorChange={setCursorPosition}
              onSelectionChange={setSelectedText}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">📂 未选择文件</p>
                <p className="text-sm">点击&ldquo;选择文件夹&rdquo;加载项目，然后选择文件开始编辑</p>
                <p className="text-xs mt-4 text-gray-500">支持 Chrome、Edge 等现代浏览器</p>
              </div>
            </div>
          )}
        </main>

        {/* AI Panel */}
        {showAIPanel && (
          <aside className="w-96 flex-shrink-0">
            <AIChat
              onClose={() => setShowAIPanel(false)}
              initialPrompt={aiPrompt}
              action={aiAction}
              code={aiCode}
              fileName={selectedFile || 'untitled.txt'}
              cursorPosition={cursorPosition}
              selectedText={selectedText}
              onApplyCode={(code) => {
                if (selectedFile) {
                  // Save current content to history before applying new code
                  const newHistory = contentHistory.slice(0, historyIndex + 1);
                  newHistory.push(fileContent);
                  setContentHistory(newHistory);
                  setHistoryIndex(newHistory.length - 1);
                  
                  setFileContent(code);
                  toast.success('代码已应用到编辑器！可使用 Ctrl+Z 撤销');
                } else {
                  toast.error('请先选择一个文件');
                }
              }}
              onApplyEdits={handleApplyEdits}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

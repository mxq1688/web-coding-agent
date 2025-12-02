"use client";

import { useMemo } from "react";
import { diffLines, Change } from "diff";

interface SplitDiffViewerProps {
  original: string;
  modified: string;
  fileName: string;
}

interface DiffLine {
  type: 'add' | 'delete' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export default function SplitDiffViewer({
  original,
  modified,
}: SplitDiffViewerProps) {
  const { leftLines, rightLines, isEmpty, isGitEmpty } = useMemo(() => {
    try {
      // 检查原始内容是否为空（可能是 Git 未提交或加载失败）
      if (!original || original.trim() === '') {
        return { leftLines: [], rightLines: [], isEmpty: false, isGitEmpty: true };
      }
      
      const changes = diffLines(original, modified);
      
      // 检查是否有变更
      const hasChanges = changes.some(change => change.added || change.removed);
      if (!hasChanges) {
        return { leftLines: [], rightLines: [], isEmpty: true, isGitEmpty: false };
      }

      const left: DiffLine[] = [];
      const right: DiffLine[] = [];
      let oldLineNum = 1;
      let newLineNum = 1;

      changes.forEach((change: Change) => {
        const lines = change.value.split('\n');
        // 移除最后一个空行（split 产生的）
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }

        if (change.removed) {
          // 删除的行：只在左侧显示（红色）
          lines.forEach(line => {
            left.push({
              type: 'delete',
              oldLineNumber: oldLineNum++,
              content: line,
            });
            // 右侧占位（空行）
            right.push({
              type: 'delete',
              content: '',
            });
          });
        } else if (change.added) {
          // 添加的行：只在右侧显示（绿色）
          lines.forEach(line => {
            // 左侧占位（空行）
            left.push({
              type: 'add',
              content: '',
            });
            right.push({
              type: 'add',
              newLineNumber: newLineNum++,
              content: line,
            });
          });
        } else {
          // 未修改的行：两侧都显示
          lines.forEach(line => {
            left.push({
              type: 'normal',
              oldLineNumber: oldLineNum++,
              content: line,
            });
            right.push({
              type: 'normal',
              newLineNumber: newLineNum++,
              content: line,
            });
          });
        }
      });

      return { leftLines: left, rightLines: right, isEmpty: false, isGitEmpty: false };
    } catch (error) {
      console.error("Failed to generate diff:", error);
      return { leftLines: [], rightLines: [], isEmpty: false, isGitEmpty: false };
    }
  }, [original, modified]);

  // 处理 Git 内容为空的情况
  if (isGitEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-orange-400 gap-3">
        <div className="text-6xl">⚠️</div>
        <div className="text-xl font-semibold">Git 版本不可用</div>
        <div className="text-sm text-gray-400 text-center max-w-md">
          <p>可能的原因：</p>
          <ul className="mt-2 text-left list-disc list-inside space-y-1">
            <li>该文件尚未提交到 Git 仓库</li>
            <li>Git 仓库未初始化</li>
            <li>文件路径不在 Git 管理范围内</li>
          </ul>
          <p className="mt-3 text-blue-400">请先提交文件到 Git，或使用&quot;本地对比&quot;查看修改</p>
        </div>
      </div>
    );
  }

  // 处理空 diff（无变更）
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <div className="text-6xl">✓</div>
        <div className="text-lg">文件无修改</div>
        <div className="text-sm">当前内容与原始版本相同</div>
      </div>
    );
  }

  return (
    <div className="split-diff-container bg-gray-900 h-full overflow-auto">
      <style jsx global>{`
        .split-diff-container {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .split-diff-wrapper {
          display: flex;
          width: 100%;
        }
        
        .split-diff-side {
          flex: 1;
          min-width: 0;
        }
        
        .split-diff-line {
          display: flex;
          min-height: 20px;
        }
        
        .split-diff-gutter {
          background: #252526;
          color: #858585;
          min-width: 50px;
          text-align: right;
          padding: 0 8px;
          user-select: none;
          flex-shrink: 0;
          border-right: 1px solid #3e3e3e;
        }
        
        .split-diff-content {
          padding: 0 8px;
          white-space: pre;
          overflow-x: auto;
          flex: 1;
        }
        
        .split-diff-line-delete {
          background: #3d1a1a;
        }
        
        .split-diff-line-delete .split-diff-content {
          color: #f48771;
        }
        
        .split-diff-line-add {
          background: #1a3d2e;
        }
        
        .split-diff-line-add .split-diff-content {
          color: #4ec9b0;
        }
        
        .split-diff-line-normal {
          background: #1e1e1e;
        }
        
        .split-diff-line-normal .split-diff-content {
          color: #d4d4d4;
        }
        
        .split-diff-line-empty {
          background: #1e1e1e;
          opacity: 0.5;
        }
        
        .split-diff-divider {
          width: 1px;
          background: #3e3e3e;
          flex-shrink: 0;
        }
      `}</style>
      
      <div className="split-diff-wrapper">
        {/* 左侧：原始版本 */}
        <div className="split-diff-side">
          {leftLines.map((line, index) => {
            const lineClass = line.content === '' 
              ? 'split-diff-line-empty'
              : line.type === 'delete'
              ? 'split-diff-line-delete'
              : line.type === 'normal'
              ? 'split-diff-line-normal'
              : 'split-diff-line-empty';

            return (
              <div key={`left-${index}`} className={`split-diff-line ${lineClass}`}>
                <div className="split-diff-gutter">
                  {line.oldLineNumber || ''}
                </div>
                <div className="split-diff-content">
                  {line.content || ' '}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 中间分隔线 */}
        <div className="split-diff-divider"></div>
        
        {/* 右侧：修改后版本 */}
        <div className="split-diff-side">
          {rightLines.map((line, index) => {
            const lineClass = line.content === ''
              ? 'split-diff-line-empty'
              : line.type === 'add'
              ? 'split-diff-line-add'
              : line.type === 'normal'
              ? 'split-diff-line-normal'
              : 'split-diff-line-empty';

            return (
              <div key={`right-${index}`} className={`split-diff-line ${lineClass}`}>
                <div className="split-diff-gutter">
                  {line.newLineNumber || ''}
                </div>
                <div className="split-diff-content">
                  {line.content || ' '}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

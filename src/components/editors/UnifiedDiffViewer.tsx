"use client";

import { useMemo } from "react";
import { structuredPatch } from "diff";
import "react-diff-view/style/index.css";

interface UnifiedDiffViewerProps {
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

export default function UnifiedDiffViewer({
  original,
  modified,
  fileName,
}: UnifiedDiffViewerProps) {
  const diffData = useMemo(() => {
    try {
      // 使用 structuredPatch 获取结构化的 diff 数据
      const patch = structuredPatch(
        fileName,
        fileName,
        original,
        modified,
        "Original",
        "Modified"
      );

      console.log("[DEBUG] Structured patch:", patch);

      // 检查是否有变更
      if (!patch.hunks || patch.hunks.length === 0) {
        console.log("[DEBUG] No changes detected");
        return { lines: [], isEmpty: true, error: null };
      }

      // 将 hunks 转换为行数据
      const lines: DiffLine[] = [];
      let oldLineNum = 1;
      let newLineNum = 1;

      patch.hunks.forEach((hunk) => {
        // 添加 hunk 头部信息
        lines.push({
          type: 'normal',
          content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        });

        oldLineNum = hunk.oldStart;
        newLineNum = hunk.newStart;

        hunk.lines.forEach((line) => {
          const firstChar = line[0];
          const content = line.substring(1);

          if (firstChar === '-') {
            lines.push({
              type: 'delete',
              oldLineNumber: oldLineNum++,
              content,
            });
          } else if (firstChar === '+') {
            lines.push({
              type: 'add',
              newLineNumber: newLineNum++,
              content,
            });
          } else {
            lines.push({
              type: 'normal',
              oldLineNumber: oldLineNum++,
              newLineNumber: newLineNum++,
              content,
            });
          }
        });
      });

      console.log("[DEBUG] Processed lines:", lines.length);
      return { lines, isEmpty: false, error: null };
    } catch (error) {
      console.error("Failed to generate diff:", error);
      return { lines: [], isEmpty: false, error: String(error) };
    }
  }, [original, modified, fileName]);

  // 处理空 diff（无变更）
  if (diffData.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <div className="text-6xl">✓</div>
        <div className="text-lg">文件无修改</div>
        <div className="text-sm">当前内容与原始版本相同</div>
      </div>
    );
  }

  // 处理错误
  if (diffData.error) {
    return (
      <div className="h-full overflow-auto bg-gray-900 p-4">
        <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded">
          <div className="text-red-400 font-semibold mb-1">❌ Diff 生成失败</div>
          <div className="text-red-300/70 text-sm">错误: {diffData.error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-diff-container bg-gray-900 h-full overflow-auto">
      <style jsx global>{`
        .unified-diff-container {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .diff-line {
          display: flex;
          min-height: 20px;
        }
        
        .diff-gutter {
          background: #252526;
          color: #858585;
          min-width: 50px;
          text-align: right;
          padding: 0 8px;
          user-select: none;
          flex-shrink: 0;
        }
        
        .diff-gutter-old {
          border-right: 1px solid #3e3e3e;
        }
        
        .diff-gutter-new {
          border-right: 1px solid #3e3e3e;
        }
        
        .diff-code {
          padding: 0 8px;
          white-space: pre;
          overflow-x: auto;
          flex: 1;
        }
        
        .diff-line-add {
          background: #1a3d2e;
        }
        
        .diff-line-add .diff-code {
          color: #4ec9b0;
        }
        
        .diff-line-delete {
          background: #3d1a1a;
        }
        
        .diff-line-delete .diff-code {
          color: #f48771;
        }
        
        .diff-line-normal {
          background: #1e1e1e;
        }
        
        .diff-line-normal .diff-code {
          color: #d4d4d4;
        }
        
        .diff-line-header {
          background: #094771;
        }
        
        .diff-line-header .diff-code {
          color: #d4d4d4;
          font-weight: 500;
        }
      `}</style>
      
      {diffData.lines.map((line, index) => {
        const isHeader = line.content.startsWith('@@');
        const lineClass = isHeader
          ? 'diff-line-header'
          : line.type === 'add'
          ? 'diff-line-add'
          : line.type === 'delete'
          ? 'diff-line-delete'
          : 'diff-line-normal';

        return (
          <div key={index} className={`diff-line ${lineClass}`}>
            {!isHeader && (
              <>
                <div className="diff-gutter diff-gutter-old">
                  {line.oldLineNumber || ''}
                </div>
                <div className="diff-gutter diff-gutter-new">
                  {line.newLineNumber || ''}
                </div>
              </>
            )}
            <div className="diff-code">{line.content}</div>
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { Check, X } from 'lucide-react';

interface CodeChange {
  search: string;
  replace: string;
}

interface CodeDiffProps {
  changes: CodeChange[];
  onAccept: () => void;
  onReject: () => void;
}

export default function CodeDiff({ changes, onAccept, onReject }: CodeDiffProps) {
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden my-2">
      <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          📝 建议的代码修改 ({changes.length} 处)
        </span>
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1 text-sm"
            title="接受所有修改"
          >
            <Check className="w-4 h-4" />
            <span>接受</span>
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1 text-sm"
            title="拒绝修改"
          >
            <X className="w-4 h-4" />
            <span>拒绝</span>
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {changes.map((change, index) => (
          <div key={index} className="border-t border-gray-300 dark:border-gray-600">
            {/* Original Code (Red - to be removed) */}
            <div className="bg-red-50 dark:bg-red-900/20">
              <div className="px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30">
                - 删除
              </div>
              <pre className="px-3 py-2 text-sm text-red-800 dark:text-red-300 overflow-x-auto">
                <code>{change.search}</code>
              </pre>
            </div>
            
            {/* New Code (Green - to be added) */}
            <div className="bg-green-50 dark:bg-green-900/20">
              <div className="px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
                + 添加
              </div>
              <pre className="px-3 py-2 text-sm text-green-800 dark:text-green-300 overflow-x-auto">
                <code>{change.replace}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

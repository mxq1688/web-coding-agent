import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, Minimize2 } from 'lucide-react';
import CodeDiff from './CodeDiff';
import { TextEdit } from '@/types/editor.types';
import { AIPromptBuilder } from '@/lib/aiPromptBuilder';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeChanges?: CodeChange[];
  structuredEdits?: TextEdit[]; // New: structured edits from API
}

interface CodeChange {
  search: string;
  replace: string;
}

interface AIChatProps {
  onClose?: () => void;
  initialPrompt?: string;
  action?: 'chat' | 'explain' | 'optimize' | 'generate' | 'fix' | 'edit';
  code?: string;
  fileName?: string; // New: for better context
  cursorPosition?: { line: number; column: number }; // New: for context-aware editing
  selectedText?: string; // New: for targeted editing
  onApplyCode?: (code: string) => void;
  onApplyEdits?: (edits: TextEdit[]) => void; // New: callback for structured edits
}

export default function AIChat({ 
  onClose, 
  initialPrompt, 
  action = 'chat', 
  code, 
  fileName = 'untitled.txt',
  cursorPosition,
  selectedText,
  onApplyCode, 
  onApplyEdits 
}: AIChatProps) {
  // Parse SEARCH/REPLACE blocks from AI response
  const parseCodeChanges = (text: string): CodeChange[] => {
    const changes: CodeChange[] = [];
    const pattern = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      changes.push({
        search: match[1].trim(),
        replace: match[2].trim()
      });
    }
    
    return changes;
  };

  // Extract code blocks from markdown text
  const extractCode = (text: string): string | null => {
    // Match code blocks with ```language or just ```
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = text.match(codeBlockRegex);
    
    if (!matches || matches.length === 0) return null;
    
    // Get the last code block (usually the complete solution)
    const lastMatch = matches[matches.length - 1];
    // Remove the ``` markers and language identifier
    return lastMatch.replace(/```(?:\w+)?\n/, '').replace(/```$/, '').trim();
  };

  const handleApplyCode = (messageContent: string) => {
    const extractedCode = extractCode(messageContent);
    if (extractedCode && onApplyCode) {
      onApplyCode(extractedCode);
    }
  };

  // Apply code changes intelligently
  const applyCodeChanges = (changes: CodeChange[], originalCode: string): string => {
    let modifiedCode = originalCode;
    
    for (const change of changes) {
      // Find and replace the search pattern
      if (modifiedCode.includes(change.search)) {
        modifiedCode = modifiedCode.replace(change.search, change.replace);
      } else {
        console.warn('Search pattern not found:', change.search);
      }
    }
    
    return modifiedCode;
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPrompt && action !== 'chat') {
      handleSend();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !code) return;

    const userMessage: Message = {
      role: 'user',
      content: input || '请分析这段代码',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build optimized prompt based on action
      let enhancedPrompt = input;
      
      if (action === 'edit' && code) {
        // Use AIPromptBuilder for edit actions
        enhancedPrompt = AIPromptBuilder.buildEditPrompt({
          instruction: input,
          code,
          fileName,
          cursorPosition,
          selectedText,
        });
      } else if (action === 'explain' && code) {
        enhancedPrompt = AIPromptBuilder.buildExplainPrompt(code, fileName);
      } else if (action === 'optimize' && code) {
        enhancedPrompt = AIPromptBuilder.buildOptimizePrompt(code, fileName);
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          action,
          code,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Try to parse structured diff response
      let structuredEdits: TextEdit[] | undefined;
      let parsedContent = data.text;
      
      if (action === 'edit' || action === 'optimize') {
        try {
          // Try to parse AI response as structured diff
          const diffs = AIPromptBuilder.parseAIResponse(data.text);
          const pendingEdits = AIPromptBuilder.diffToPendingEdits(diffs);
          
          if (pendingEdits.length > 0) {
            structuredEdits = pendingEdits as TextEdit[];
            
            // Extract summary for display
            const jsonMatch = data.text.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1].trim());
              parsedContent = `✨ **代码修改建议**\n\n${parsed.summary || '已生成结构化编辑'}\n\n查看编辑器中的高亮显示，了解具体修改内容。`;
            }
          }
        } catch (parseError) {
          console.log('Could not parse as structured diff, falling back to text:', parseError);
          // Fall back to old behavior
          const codeChanges = parseCodeChanges(data.text);
          if (codeChanges.length > 0) {
            // Keep old code changes format
          }
        }
      }
      
      // Check if API returned structured edits directly
      if (!structuredEdits && data.edits) {
        structuredEdits = data.edits as TextEdit[];
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: parsedContent,
        timestamp: new Date(),
        codeChanges: undefined, // Deprecated in favor of structuredEdits
        structuredEdits: structuredEdits && structuredEdits.length > 0 ? structuredEdits : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // If we have structured edits and the callback is provided, trigger preview mode
      if (structuredEdits && structuredEdits.length > 0 && onApplyEdits) {
        // Ensure each edit has an ID
        const pendingEdits = structuredEdits.map((edit, index) => ({
          ...edit,
          id: edit.id || `edit-${Date.now()}-${index}`,
          applied: false,
          rejected: false
        }));
        onApplyEdits(pendingEdits);
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，调用 AI 服务时出错了。请稍后重试。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition-colors flex items-center gap-2"
        onClick={() => setIsMinimized(false)}
      >
        <Bot className="w-5 h-5" />
        <span>AI 助手</span>
        <span className="bg-white text-blue-500 rounded-full px-2 py-0.5 text-xs font-bold">
          {messages.length}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-500">
        <div className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5" />
          <h3 className="font-semibold">AI 编码助手</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors text-white"
            title="最小化"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors text-white"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <Bot className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">AI 编码助手</p>
            <p className="text-sm">我可以帮你：</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>💬 回答编程问题</li>
              <li>📝 生成代码</li>
              <li>🔍 解释代码逻辑</li>
              <li>✨ 优化代码</li>
              <li>🐛 修复错误</li>
            </ul>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
                
                {/* Show CodeDiff for messages with code changes */}
                {message.role === 'assistant' && message.codeChanges && message.codeChanges.length > 0 && onApplyCode && (
                  <CodeDiff
                    changes={message.codeChanges}
                    onAccept={() => {
                      const modifiedCode = applyCodeChanges(message.codeChanges!, code || '');
                      onApplyCode(modifiedCode);
                    }}
                    onReject={() => {
                      // Just dismiss, do nothing
                    }}
                  />
                )}
                
                {/* Show structured edits info */}
                {message.role === 'assistant' && message.structuredEdits && message.structuredEdits.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">{message.structuredEdits.length} 个增量编辑已发送到编辑器</span>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <div>💡 提示：</div>
                      <div className="ml-4 mt-1">
                        • 编辑器中已高亮显示修改位置<br/>
                        • 按 <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border rounded">Ctrl+Enter</kbd> 接受全部<br/>
                        • 按 <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border rounded">Esc</kbd> 拒绝全部
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                  {message.role === 'assistant' && !message.codeChanges && extractCode(message.content) && onApplyCode && (
                    <button
                      onClick={() => handleApplyCode(message.content)}
                      className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
                      title="将代码应用到编辑器"
                    >
                      <span>✨</span>
                      <span>应用到编辑器</span>
                    </button>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">AI 正在思考...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && !code)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

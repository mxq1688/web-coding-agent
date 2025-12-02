import { NextRequest, NextResponse } from 'next/server';
import { TextEdit } from '@/types/editor.types';

/**
 * Parse SEARCH/REPLACE blocks from AI response into structured edits
 */
function parseSearchReplaceBlocks(text: string, originalCode: string): TextEdit[] {
  const edits: TextEdit[] = [];
  const pattern = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  const lines = originalCode.split('\n');
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const searchText = match[1].trim();
    const replaceText = match[2].trim();
    
    // Find the search text in original code
    const searchLines = searchText.split('\n');
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      let found = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (i + j >= lines.length || lines[i + j].trim() !== searchLines[j].trim()) {
          found = false;
          break;
        }
      }
      if (found) {
        startLine = i + 1; // 1-indexed
        break;
      }
    }
    
    if (startLine > 0) {
      edits.push({
        startLine,
        endLine: startLine + searchLines.length - 1,
        oldText: searchText,
        newText: replaceText
      });
    }
  }
  
  return edits;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, action, code } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // 根据不同的 action 构建不同的提示词
    let fullPrompt = '';
    
    switch (action) {
      case 'chat':
        fullPrompt = prompt;
        break;
      case 'explain':
        fullPrompt = `请详细解释以下代码的功能和逻辑：\n\n${code}\n\n请用中文回答，包括：\n1. 代码的主要功能\n2. 关键逻辑说明\n3. 使用的技术和模式`;
        break;
      case 'optimize':
        fullPrompt = `请分析以下代码并提供优化建议：\n\n${code}\n\n请用中文回答，包括：\n1. 当前代码的问题\n2. 优化建议\n3. 优化后的代码示例`;
        break;
      case 'generate':
        fullPrompt = `请根据以下需求生成代码：\n\n${prompt}\n\n要求：\n1. 代码要完整可运行\n2. 包含必要的注释\n3. 遵循最佳实践`;
        break;
      case 'fix':
        fullPrompt = `请帮我修复以下代码中的错误：\n\n${code}\n\n${prompt ? `错误信息：${prompt}` : ''}\n\n请提供：\n1. 错误分析\n2. 修复后的代码\n3. 修复说明`;
        break;
      case 'edit':
        fullPrompt = `我需要修改以下代码：\n\n${code}\n\n修改需求：${prompt}\n\n请提供：\n1. 只输出需要修改的部分代码（使用 SEARCH/REPLACE 格式）\n2. 格式如下：\n<<<<<<< SEARCH\n[要替换的原始代码]\n=======\n[替换后的新代码]\n>>>>>>> REPLACE\n\n注意：\n- 只包含需要修改的代码块\n- 保持代码的缩进和格式\n- 可以有多个 SEARCH/REPLACE 块\n- SEARCH 块必须精确匹配原代码`;
        break;
      default:
        fullPrompt = prompt;
    }

    // 调用 Gemini API (使用免费层的 Gemini 2.5 Flash 模型)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to call Gemini API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法生成回复';

    // Parse structured edits for 'edit' action
    let edits = null;
    if (action === 'edit' && code) {
      edits = parseSearchReplaceBlocks(text, code);
    }

    return NextResponse.json({ 
      text,
      edits: edits && edits.length > 0 ? edits : undefined
    });
  } catch (error) {
    console.error('Error in Gemini API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

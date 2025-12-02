import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function isValidPath(targetPath: string): boolean {
  try {
    const resolved = path.resolve(targetPath);
    fs.accessSync(resolved, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function isTextFile(filePath: string): boolean {
  const textExtensions = [
    '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx',
    '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs',
    '.html', '.css', '.scss', '.xml', '.yaml', '.yml',
    '.sh', '.bash', '.sql', '.php', '.rb', '.swift',
    '.kt', '.scala', '.r', '.m', '.h', '.vue', '.svelte'
  ];
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.includes(ext);
}

// GET - Read file content
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');
  const type = searchParams.get('type'); // 'local' (default) or 'git'

  if (!filePath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  if (!isValidPath(filePath)) {
    return NextResponse.json({ error: 'Invalid or inaccessible file path' }, { status: 400 });
  }

  const resolved = path.resolve(filePath);
  
  // For Git version, we don't need to check if file exists locally (it might be deleted locally but exist in git)
  if (type !== 'git') {
    const stats = fs.statSync(resolved);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Path must be a file' }, { status: 400 });
    }
  }

  if (!isTextFile(resolved)) {
    return NextResponse.json({ error: 'Only text files can be edited' }, { status: 400 });
  }

  try {
    if (type === 'git') {
      try {
        // Convert absolute path to relative path for git command
        const workspaceRoot = process.cwd();
        const relativePath = path.relative(workspaceRoot, resolved);
        
        // Use git show HEAD:path to get content from latest commit
        const content = execSync(`git show HEAD:"${relativePath}"`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'] // Prevent output to console
        });
        return NextResponse.json({ content });
      } catch (error) {
        console.warn('Failed to read git content:', error);
        // If file is not in git (e.g. new file), return empty content or 404
        return NextResponse.json({ content: '', error: 'File not found in git' }, { status: 404 });
      }
    } else {
      const content = fs.readFileSync(resolved, 'utf-8');
      return NextResponse.json({ content });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

// POST - Write file content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Path and content are required' },
        { status: 400 }
      );
    }

    if (!isValidPath(filePath)) {
      return NextResponse.json({ error: 'Invalid or inaccessible file path' }, { status: 400 });
    }

    const resolved = path.resolve(filePath);

    if (!isTextFile(resolved)) {
      return NextResponse.json({ error: 'Only text files can be edited' }, { status: 400 });
    }

    // Write file with backup
    fs.writeFileSync(resolved, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
  }
}

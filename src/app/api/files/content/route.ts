import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

  if (!filePath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  if (!isValidPath(filePath)) {
    return NextResponse.json({ error: 'Invalid or inaccessible file path' }, { status: 400 });
  }

  const resolved = path.resolve(filePath);
  const stats = fs.statSync(resolved);

  if (!stats.isFile()) {
    return NextResponse.json({ error: 'Path must be a file' }, { status: 400 });
  }

  if (!isTextFile(resolved)) {
    return NextResponse.json({ error: 'Only text files can be edited' }, { status: 400 });
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
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

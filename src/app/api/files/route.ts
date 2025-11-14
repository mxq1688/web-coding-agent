import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { FileNode } from "@/types/file.types";

function isValidPath(targetPath: string): boolean {
  try {
    // Resolve to absolute path
    const resolved = path.resolve(targetPath);
    // Check if path exists and is accessible
    fs.accessSync(resolved, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function buildFileTree(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): FileNode[] {
  if (currentDepth >= maxDepth) return [];

  try {
    const items = fs.readdirSync(dirPath);
    const nodes: FileNode[] = [];

    for (const item of items) {
      // Skip hidden files and common ignore patterns
      if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__') {
        continue;
      }

      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        nodes.push({
          name: item,
          path: fullPath,
          type: 'directory',
          children: buildFileTree(fullPath, maxDepth, currentDepth + 1),
        });
      } else if (stats.isFile()) {
        nodes.push({
          name: item,
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

    return nodes;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetPath = searchParams.get('path');

  if (!targetPath) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  if (!isValidPath(targetPath)) {
    return NextResponse.json({ error: 'Invalid or inaccessible path' }, { status: 400 });
  }

  const resolved = path.resolve(targetPath);
  const stats = fs.statSync(resolved);

  if (!stats.isDirectory()) {
    return NextResponse.json({ error: 'Path must be a directory' }, { status: 400 });
  }

  const files = buildFileTree(resolved);

  return NextResponse.json({ files });
}

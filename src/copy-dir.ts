import fs from 'fs';
import path from 'path';

export type IOptions = {
  overwrite?: boolean
}

export function copyDir(src: string, dest: string, {
  overwrite = false
}: IOptions = {}) {
  if (!isDir(dest)) throw new Error(`Dest "${dest}" is not a directory`);
  if (!fs.existsSync(src)) throw new Error(`Src "${src}" not exist`);
  if (isFile(src) && (overwrite || !fs.existsSync(path.join(dest, path.basename(src))))) {
    fs.copyFileSync(src, path.join(dest, path.basename(src)));
    return;
  }

  const stack = [path.basename(src)];

  const srcParent = path.dirname(src);

  while (stack.length > 0) {
    const relativePath = stack.pop() as string;
    const absPathSrc = path.join(srcParent, relativePath);
    const absPathDest = path.join(dest, relativePath);
    if (isFile(absPathSrc)) {
      if (isFile(absPathDest) && !overwrite) continue;
      fs.copyFileSync(absPathSrc, absPathDest);
      continue;
    }
    // absPathSrc is dir
    !isDir(absPathDest) && fs.mkdirSync(absPathDest);
    const subDirs = fs.readdirSync(absPathSrc);
    stack.push(...subDirs.map(sub => path.join(relativePath, sub)));
    
  }
}

export function isDir(dest: string) {
  return fs.existsSync(dest) && fs.lstatSync(dest).isDirectory();
}

export function isFile(src: string) {
  return fs.existsSync(src) && fs.lstatSync(src).isFile();
}

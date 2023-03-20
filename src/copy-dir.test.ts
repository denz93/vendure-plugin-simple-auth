import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyDir, isDir, isFile } from './copy-dir';

  /* eslint-disable */
  vi.mock('fs', () => {
    const fakeFs = {default: {} as any, fileTable: {} as any};
    const fileTable: any = {
      "/parent": { 
        isDir: true, 
        isFile: false,
        children: ['c1', 'c2'],
      },
      "/parent/c1": {
        isDir: false,
        isFile: true,
        children: []
      },
      "/parent/c2": {
        isDir: true,
        isFile: false,
        children: ['c3.txt', 'c4']
      },
      "/parent/c2/c3.txt": {
        isDir: false,
        isFile: true,
        children: []
      },
      "/parent/c2/c4":{
        isDir: true,
        isFile: false,
        children: ['c5.txt'],
      },

      "/parent/c2/c4/c5.txt":{
        isDir: false,
        isFile: true,
        children: [],
      },

      "/parent2": {
        isDir: true,
        isFile: false,
        children: ["c2"],
      },
      "/parent2/c2": {
        isDir: true,
        isFile: false,
        children: ["c5.txt"],
      },
      "/parent2/c2/c5.txt": {
        isDir: false,
        isFile: true,
        children: [],
      }

    } as const;
    fakeFs.default = {
      existsSync: (src: string) => {
        return Object.keys(fakeFs.fileTable).includes(src)
      },
      lstatSync: (src: string) => ({
        isFile: () => fakeFs.fileTable[src].isFile,
        isDirectory: () => fakeFs.fileTable[src].isDir,
      }),
      copyFileSync: (src: string, dest: string) => {
        fakeFs.fileTable[dest] = fakeFs.fileTable[src];
        const dirDest = path.dirname(dest);
        fakeFs.fileTable[dirDest].children.push(path.basename(dest));
      },
      mkdirSync: (src: string) => {
        const dirname = path.dirname(src);
        const base = path.basename(src);
        !fakeFs.fileTable[dirname].children.includes(base) && fakeFs.fileTable[dirname].children.push(base);
        fakeFs.fileTable[src] = {
          isDir: true,
          isFile: false,
          children: [],
        };
      },
      readdirSync: (src: string)=> {
        return fakeFs.fileTable[src].children;
      },
      resetFileTable: () => {
        fakeFs.fileTable = JSON.parse(JSON.stringify(fileTable));
      }
    } as any;
    fakeFs.default.resetFileTable();
    return fakeFs;
  });

  describe('Test copyDir', () => {

    beforeEach(() => {
      (fs as any).resetFileTable(); 
    })

    it('should copy a file to a directory', () => {
      copyDir("/parent/c1", "/parent2");
      expect(fs.existsSync("/parent2/c1")).toBeTruthy(); 
      expect(fs.lstatSync("/parent2/c1").isFile()).toBeTruthy();
    })

    it('should copy a dicretory to a directory', () => {
      copyDir("/parent/c2", "/parent2");
      expect(isDir("/parent2/c2")).toBeTruthy(); 
      expect(isFile("/parent2/c2/c3.txt")).toBeTruthy(); 
      expect(isFile("/parent2/c2/c4/c5.txt")).toBeTruthy(); 
      expect(isFile("/parent2/c2/c5.txt")).toBeTruthy(); 
      expect(isDir("/parent2/c2/c4")).toBeTruthy(); 

    })
    
  });
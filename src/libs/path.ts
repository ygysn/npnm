import pathUtils from 'node:path';

export function isFilePathInDirectoryPath(filePath: string, dirPath: string): boolean {
  const absoluteFilePath = pathUtils.normalize(filePath);
  const absoluteDirectory = pathUtils.normalize(dirPath);
  const relativePath = pathUtils.relative(absoluteDirectory, absoluteFilePath);
  return !relativePath.startsWith('..') && !pathUtils.isAbsolute(relativePath);
}

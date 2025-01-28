import fsp from 'node:fs/promises'
import pathUtils from 'node:path'
import { isDirectory, isFile } from 'path-type'

export async function readFilesFromDirectory (path: string): Promise<string[]> {
  const filePaths = []
  const fileNames = await fsp.readdir(path)

  for (const filename of fileNames) {
    const filePath = pathUtils.join(path, filename)
    if (await isFile(filePath)) {
      filePaths.push(filePath)
    } else if (await isDirectory(filePath)) {
      filePaths.push(...(await readFilesFromDirectory(filePath)))
    }
  }

  return filePaths
}

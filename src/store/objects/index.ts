import type { Readable } from 'node:stream'
import fsp from 'node:fs/promises'
import pathUtils from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { isStream } from 'is-stream'
import { isFile } from 'path-type'
import { mkdirp } from 'mkdirp'
import { _addFilesFromTar, type AddFilesFromTarOptions } from './addFilesFromTarball'
import { getObjectHash, MIN_OBJECT_HASH_LENGTH } from './shared'
import { readFilesFromDirectory } from '@libs/fs'

export interface AddOptions {
  hardLink: boolean
  mode?: number | undefined
}

export type ObjectHashes = Array<{
  path: string
  hash: string
}>

export class ObjectsStore {
  private readonly _dirPath: string
  private readonly _tmpDirPath: string

  public constructor (storePath: string) {
    this._dirPath = storePath
    this._tmpDirPath = pathUtils.join(storePath, '.tmp')
  }

  public async init (): Promise<void> {
    await mkdirp(this._dirPath)
    await mkdirp(this._tmpDirPath)
  }

  public async getObjectPathFromHash (fileHash: string): Promise<string> {
    if (fileHash.length <= MIN_OBJECT_HASH_LENGTH) {
      throw new Error('')
    }

    // NOTE:
    // Objects are stored based on the hash of the object:
    //            64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c
    //            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //            ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
    // STORE_PATH/64/c88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c

    /* eslint-disable @typescript-eslint/no-magic-numbers -- Temporarily disable @typescript-eslint/no-magic-numbers as the code below can still be understood without creating new variables */
    const objectDirName = pathUtils.normalize(pathUtils.join(this._dirPath, fileHash.slice(0, 2)))
    const objectFileName = fileHash.slice(3)
    /* eslint-enable @typescript-eslint/no-magic-numbers -- Temporarily disable @typescript-eslint/no-magic-numbers as the code below can still be understood without creating new variables */

    await mkdirp(objectDirName)

    return pathUtils.normalize(pathUtils.join(objectDirName, objectFileName))
  }

  public async isObjectExists (objectHash: string): Promise<boolean> {
    const objectPath = await this.getObjectPathFromHash(objectHash)
    return await isFile(objectPath)
  }

  public async prune (): Promise<void> {
    const objectPaths = await readFilesFromDirectory(this._dirPath)
    for (const objectPath of objectPaths) {
      if ((await fsp.stat(objectPath)).nlink === 1) { // eslint-disable-line @typescript-eslint/no-magic-numbers -- .
        await fsp.rm(objectPath)
      }
    }
  }

  public async addFile (file: string | Readable, options?: AddOptions | null): Promise<string> {
    if (typeof file === 'string' && !(await isFile(file))) {
      throw new Error('aaa')
    }

    const filePath = isStream(file)
      ? await this._createTmpFileWithStream(file)
      : file
    const objectHash = await getObjectHash(filePath)
    if (objectHash === null) {
      throw new Error('')
    }

    const objectPath = await this.getObjectPathFromHash(objectHash)
    if (await this.isObjectExists(objectHash)) {
      return objectHash
    }

    if (options?.hardLink === true) {
      await fsp.link(filePath, objectPath)
    } else {
      const tmpObjectFile = this._createTmpFilePath()
      await fsp.copyFile(filePath, tmpObjectFile)
      await fsp.rename(tmpObjectFile, objectPath)
    }

    await fsp.chmod(filePath, options?.mode ?? 0o644) // eslint-disable-line @typescript-eslint/no-magic-numbers -- .
    return objectHash
  }

  public async addFiles (paths: string[], options?: AddOptions | null): Promise<ObjectHashes> {
    const objectHashes = []
    for (const path of paths) {
      objectHashes.push({
        path,
        hash: await this.addFile(path, options)
      })
    }

    return await Promise.all(objectHashes)
  }

  public async addFilesFromDir (path: string, options?: AddOptions | null): Promise<ObjectHashes> {
    const objectHashes = []
    const filePaths = await readFilesFromDirectory(path)
    for (const filePath of filePaths) {
      objectHashes.push({
        path: filePath,
        hash: await this.addFile(filePath, options)
      })
    }

    return objectHashes
  }

  public async addFilesFromTar (file: string | Readable, options?: AddFilesFromTarOptions | null): Promise<ObjectHashes> {
    const objectHashes = await _addFilesFromTar(this, file, options ?? null)
    if (objectHashes === null) {
      throw new Error('')
    }

    return objectHashes
  }

  private _createTmpFilePath (): string {
    const randomBytesSize = 8
    const tmpFilePath = pathUtils.join(this._tmpDirPath, crypto.randomBytes(randomBytesSize).toString('hex'))

    return tmpFilePath
  }

  private async _createTmpFileWithStream (stream: Readable): Promise<string> {
    const tmpFilePath = this._createTmpFilePath()

    if (await isFile(tmpFilePath)) {
      await fsp.rm(tmpFilePath)
    }

    stream.pipe(fs.createWriteStream(tmpFilePath))

    await new Promise((resolve, reject) => { // eslint-disable-line promise/avoid-new -- .
      stream.on('close', resolve)
      stream.on('error', reject)
    })

    return tmpFilePath
  }
}

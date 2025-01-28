import type { Readable } from 'node:stream'
import pathUtils from 'node:path'
import fs from 'node:fs'
import util from 'node:util'
import tar from 'tar-stream'
import { isFilePathInDirectoryPath } from '@libs/path'
import type { ObjectsStore, ObjectHashes } from '.'

export interface AddFilesFromTarOptions {
  basePath: string
}

export const _addFilesFromTar = util.promisify(function (
  store: ObjectsStore,
  file: string | Readable,
  options: AddFilesFromTarOptions | null,
  callback: (err: Error | null, result: ObjectHashes | null) => void
) {
  const basePath = options?.basePath
  const objectHashes: ObjectHashes = []
  const tarExtractStream = tar.extract()
  if (typeof file === 'string') {
    fs.createReadStream(file).pipe(tarExtractStream)
  } else {
    file.pipe(tarExtractStream)
  }

  tarExtractStream.on('entry', (headers, entry, next) => {
    if (
      pathUtils.isAbsolute(headers.name)
      || (basePath !== undefined && !isFilePathInDirectoryPath(headers.name, basePath))
    ) {
      return;
    }

    if (headers.type === 'file' || headers.type === 'contiguous-file') {
      store.addFile(entry, { hardLink: true, mode: headers.mode })
        .then((objectHash) => {
          objectHashes.push({
            path: headers.name,
            hash: objectHash,
          })
          next()
        })
        .catch((err: unknown) => {
          if (err instanceof Error) {
            callback(err, null)
          }
        })
    }
  })

  tarExtractStream.on('finish', () => {
    callback(null, objectHashes)
  })
})

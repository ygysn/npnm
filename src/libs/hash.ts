import type { Readable } from 'node:stream'
import util from 'node:util'
import fs from 'node:fs'
import crypto from 'node:crypto'

export async function hashFile (
  options: crypto.HashOptions,
  filePath: string,
  algorithm: string
): Promise<string | Buffer | null> {
  const fileStream = fs.createReadStream(filePath)
  return await hashStream(options, fileStream, algorithm)
}

export const hashStream = util.promisify(function (
  options: crypto.HashOptions,
  readableStream: Readable,
  algorithm: string,
  callback: (err: Error | null, result: string | Buffer | null) => void
) {
  const hashStream = crypto.createHash(algorithm, options)
  readableStream.pipe(hashStream)

  readableStream.on('end', () => {
    const hash = hashStream.read() as unknown
    if (typeof hash !== 'string' && !(hash instanceof Buffer) && hash !== null) {
      return
    }
    callback(null, hash)
  })

  readableStream.on('error', (err) => {
    callback(err, null)
  })

  hashStream.on('error', (err) => {
    callback(err, null)
  })
})

import type { Readable } from 'node:stream'
import { hashFile, hashStream } from '@utils/hash'

export const DEFAULT_HASH_ALGORITHM = 'sha256'
export const MIN_OBJECT_HASH_LENGTH = 32

export interface StoreState {
  dirPath: string
  tmpDirPath: string
}

export async function getObjectHash (file: string | Readable): Promise<string | null> {
  const objectHash = typeof file === 'string'
    ? await hashFile({ encoding: 'hex' }, file, DEFAULT_HASH_ALGORITHM)
    : await hashStream({ encoding: 'hex' }, file, DEFAULT_HASH_ALGORITHM)
  
  if (objectHash === null) {
    return null;
  }

  return objectHash.toString()
}

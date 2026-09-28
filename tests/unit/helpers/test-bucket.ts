import type { DocsBucket, DocsBucketListOptions, DocsBucketObject, DocsBucketObjectBody } from '../../../server/types/cloudflare'

interface StoredObject {
  data: Uint8Array<ArrayBuffer>
  contentType?: string
}

export interface TestBucket {
  bucket: DocsBucket
  getKeys: () => string[]
  read: (key: string) => StoredObject | undefined
}

const DEFAULT_LIST_LIMIT = 1000

const toBytes = async (value: ArrayBuffer | ArrayBufferView | Blob): Promise<Uint8Array<ArrayBuffer>> => {
  if (value instanceof Blob) {
    return new Uint8Array(await value.arrayBuffer())
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0))
  }
  return Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
}

const toObject = (key: string, { data, contentType }: StoredObject): DocsBucketObject => ({
  key,
  size: data.byteLength,
  httpEtag: `"${key}-${data.byteLength}"`,
  httpMetadata: { contentType },
})

export const createTestBucket = (): TestBucket => {
  let objects = new Map<string, StoredObject>()

  const bucket: DocsBucket = {
    get: async (key) => {
      const stored = objects.get(key)
      if (!stored) {
        return null
      }
      const body: DocsBucketObjectBody = {
        ...toObject(key, stored),
        body: new Blob([stored.data]).stream(),
        blob: async () => new Blob([stored.data], { type: stored.contentType }),
      }
      return body
    },
    put: async (key, value, options) => {
      const stored = { data: await toBytes(value), contentType: options?.httpMetadata?.contentType }
      objects = new Map([...objects, [key, stored]])
      return toObject(key, stored)
    },
    delete: async (keys) => {
      const deletedKeys = new Set(Array.isArray(keys) ? keys : [keys])
      objects = new Map([...objects].filter(([key]) => !deletedKeys.has(key)))
    },
    list: async ({ prefix = '', cursor, limit = DEFAULT_LIST_LIMIT }: DocsBucketListOptions = {}) => {
      const matchingKeys = [...objects.keys()].filter(key => key.startsWith(prefix)).sort()
      const start = cursor ? Number(cursor) : 0
      const pageKeys = matchingKeys.slice(start, start + limit)
      const nextStart = start + pageKeys.length
      const truncated = nextStart < matchingKeys.length
      return {
        objects: pageKeys.map(key => ({ key })),
        truncated,
        cursor: truncated ? String(nextStart) : undefined,
      }
    },
  }

  return {
    bucket,
    getKeys: () => [...objects.keys()].sort(),
    read: key => objects.get(key),
  }
}

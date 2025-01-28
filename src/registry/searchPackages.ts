import urlUtils from 'node:url'
import nodeFetch from 'node-fetch'
import { DEFAULT_REGISTRY, SEARCH_PACKAGES_ENDPOINT } from './consts'
import type { PackageMetadata } from './types'

const MIN_SEARCH_TEXT = 2
const MAX_SEARCH_TEXT = 64

export interface PackageSearchOptions {
  text: string
  size?: number
  from?: number
  quality?: number
  popularity?: number
  maintenance?: number
  registry?: string
}

export async function searchPackages(searchOptions: PackageSearchOptions): Promise<PackageMetadata[]> {
  if (searchOptions.text.length < MIN_SEARCH_TEXT || searchOptions.text.length > MAX_SEARCH_TEXT) {
    throw new Error('')
  }

  const searchUrl = new urlUtils.URL(searchOptions.registry ?? DEFAULT_REGISTRY)
  searchUrl.pathname = SEARCH_PACKAGES_ENDPOINT
  const searchParams: Array<keyof typeof searchOptions> = ['text', 'size', 'from', 'quality', 'popularity', 'maintenance']
  for (const searchParam of searchParams) {
    if (searchOptions[searchParam] !== undefined) {
      searchUrl.searchParams.set(searchParam, searchOptions[searchParam].toString())
    }
  }

  const searchResponse = await nodeFetch(searchUrl)

  /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any -- It is too complicated and troublesome to care about and assert the http response result type. */

  const searchResponseJson = await searchResponse.json() as any
  if (!searchResponse.ok) {
    throw new Error(searchResponseJson.error as string)
  }

  return searchResponseJson.objects.map((packageMetadata: any) => ({
    name: packageMetadata.package.name,
    version: packageMetadata.package.version,
    description: packageMetadata.package.description,
    license: packageMetadata.package.license,
    keywords: packageMetadata.package.keywords,
    publisher: packageMetadata.package.publisher,
    maintainers: packageMetadata.package.maintainers,
    dependents: packageMetadata.dependents,
    links: packageMetadata.package.links,
    score: {
      final: packageMetadata.score.final,
      ...packageMetadata.score.detail,
    },
    downloads: packageMetadata.downloads,
  })) as PackageMetadata[]

  /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-explicit-any */
}
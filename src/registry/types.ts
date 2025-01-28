export interface PackagePublisher {
  username: string
  email: string
}

export interface PackageMaintainer {
  username: string
  email: string
}

export interface PackageMetadata {
  name: string
  version: string
  description?: string
  license?: string
  keywords?: string[]
  publisher: PackagePublisher
  maintainers: PackageMaintainer[]
  dependents: number
  links?: {
    homepage?: string
    repository?: string
    bugs?: string
    npm?: string
  }
  score: {
    final: number
    quality: number
    popularity: number
    maintenance: number
  }
  downloads: {
    monthly: number
    weekly: number
  }
}

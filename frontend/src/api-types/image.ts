export interface ImageVariant {
  url: string
  width: number
  height: number
}

export interface Image {
  id: string
  title: string
  url: string
  created_at: string
  width: number
  height: number
  variants?: {
    small?: ImageVariant
    mid?: ImageVariant
  }
}

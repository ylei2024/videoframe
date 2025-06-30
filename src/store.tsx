import i18n from "./locales"
import { create } from "zustand"
import { Store } from "@tauri-apps/plugin-store"
import { getLocale } from "tauri-plugin-locale-api"

class VideoFrameStore {
  private store: Store | undefined

  constructor() {}

  public async load() {
    this.store = await Store.load("video_frame.json", {
      autoSave: true
    })
    await this.setLanguage()
  }

  public async setLanguage(value: string | undefined = undefined) {
    if (value === undefined) {
      value = await this.store?.get("language")
      value = value ? value : await getLocale()
    }
    i18n.changeLanguage(value)
    await this.store?.set("language", value)
  }
}

const store = new VideoFrameStore()

export interface Image {
  task_id: number
  filename: string
  base64: string
}
export interface ImageStore {
  images: Image[]
  set: (images: Image[]) => void
  extend: (append: Image[]) => void
  remove: (image: Image) => void
  clear: () => void
}
export const useImageStore = create<ImageStore>((_set, get) => ({
  images: [],
  set: (images: Image[]) => _set({ images }),
  extend: (append: Image[]) => {
    const prev = get().images
    const exist = new Set(prev.map((i) => `${i.task_id}-${i.filename}`))
    const new_images = [...prev]
    for (const image of append) {
      const key = `${image.task_id}-${image.filename}`
      if (!exist.has(key)) {
        new_images.push(image)
      }
    }
    const sorted = new_images.sort((a, b) => a.filename.localeCompare(b.filename))
    _set({ images: sorted })
  },
  remove: (image: Image) => {
    const prev = get().images
    const new_images = prev.filter((i) => i.task_id !== image.task_id || i.filename !== image.filename)
    _set({ images: new_images })
  },
  clear: () => _set({ images: [] })
}))

export default store

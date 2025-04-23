import i18n from "./locales"
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

export default store

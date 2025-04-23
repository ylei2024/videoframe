import { TFunction } from "i18next"
import { Menu } from "@tauri-apps/api/menu"
import { resolveResource } from "@tauri-apps/api/path"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { TrayIcon, TrayIconEvent, TrayIconOptions } from "@tauri-apps/api/tray"

const TRAY_ID = "videoframe.tray"

async function createTray(t: TFunction<"translation", undefined>) {
  console.log(TRAY_ID)
  const tray = await TrayIcon.getById(TRAY_ID)
  if (tray) {
    return tray
  }
  const menu = await Menu.new({
    items: [
      {
        id: "quit",
        text: t("tray.quit"),
        action: async () => {
          const appWindow = getCurrentWebviewWindow()
          await appWindow.close()
        }
      }
    ]
  })
  const options: TrayIconOptions = {
    id: TRAY_ID,
    menu,
    icon: await resolveResource("icons/icon.ico"),
    menuOnLeftClick: false,
    action: async (event: TrayIconEvent) => {
      if (event.type === "Click" && event.button === "Left") {
        const appWindow = getCurrentWebviewWindow()
        await appWindow.show()
        await appWindow.unminimize()
        await appWindow.setFocus()
      }
    }
  }
  return await TrayIcon.new(options)
}

export default createTray

import { TFunction } from "i18next"
import { Menu } from "@tauri-apps/api/menu"
import { resolveResource } from "@tauri-apps/api/path"
import { TrayIcon, TrayIconEvent, TrayIconOptions } from "@tauri-apps/api/tray"

const TRAY_ID = "videoframe.tray"

async function createTray(
  t: TFunction<"translation", undefined>,
  show: () => Promise<void>,
  close: () => Promise<void>,
) {
  const tray = await TrayIcon.getById(TRAY_ID)
  if (tray) {
    return tray
  }
  const menu = await Menu.new({
    items: [
      {
        id: "quit",
        text: t("tray.quit"),
        action: close
      }
    ]
  })
  const options: TrayIconOptions = {
    id: TRAY_ID,
    menu,
    icon: await resolveResource("icons/32x32.png"),
    menuOnLeftClick: false,
    action: async (event: TrayIconEvent) => {
      if (event.type === "Click" && event.button === "Left") {
        await show()
      }
    }
  }
  return await TrayIcon.new(options)
}

export default createTray

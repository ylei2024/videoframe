import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import "./styles.css"
import store from "./store"
import Top from "./layout/top"
import createTray from "./layout/tray"

function App() {
  const { t } = useTranslation()
  useEffect(() => {
    const init = async () => {
      await store.load()
      await createTray(t)
    }
    init()
  }, [])
  return (
    <main data-tauri-drag-region className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Top></Top>
    </main>
  )
}

export default App

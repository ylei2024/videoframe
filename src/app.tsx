import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import "./styles.css"
import store from "./store"
import Top from "./layout/top"
import Home from "./pages/home"
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
    <main data-tauri-drag-region className="bg-[rgb(17,17,17)] min-h-screen">
      <Top></Top>
      <Home></Home>
    </main>
  )
}

export default App

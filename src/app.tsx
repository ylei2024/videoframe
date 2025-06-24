import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"

import "./styles.css"
import store from "./store"
import Top from "./layout/top"
import Home from "./pages/home"
import ImageView from "./pages/view"
import createTray from "./layout/tray"

const app = getCurrentWebviewWindow()

const Main = () => {
  return (
    <main data-tauri-drag-region className="bg-[rgb(17,17,17)]">
      <Top app={app}></Top>
      <Home></Home>
    </main>
  )
}

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
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/view" element={<ImageView />} />
      </Routes>
    </Router>
  )
}

export default App

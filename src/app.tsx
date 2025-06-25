import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { getAllWebviewWindows, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"

import "./styles.css"
import store from "./store"
import Top from "./layout/top"
import Home from "./pages/home"
import ImageView from "./pages/view"
import createTray from "./layout/tray"

const app = getCurrentWebviewWindow()

const close = async () => {
  const windows = await getAllWebviewWindows()
  for (const window of windows) {
    if (window.label !== app.label) {
      await window.close()
    }
  }
  await app.close()
}

const show = async () => {
  await app.show()
  await app.unminimize()
  await app.setFocus()
}

const Main = () => {
  return (
    <main data-tauri-drag-region className="bg-[rgb(17,17,17)]">
      <Top
        hide={async () => {
          await app.hide()
        }}
        close={close}
      ></Top>
      <Home></Home>
    </main>
  )
}

function App() {
  const { t } = useTranslation()
  useEffect(() => {
    const init = async () => {
      await store.load()
      await createTray(t, show, close)
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

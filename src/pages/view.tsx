import { UnlistenFn } from "@tauri-apps/api/event"
import { useEffect, useRef, useState } from "react"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"

import Top from "../layout/top"
import { Image } from "../store"

const app = getCurrentWebviewWindow()

const ImageView = () => {
  const unlisten = useRef<UnlistenFn[]>([])
  const [index, setIndex] = useState<number>(0)
  const [images, setImages] = useState<Image[]>([])
  useEffect(() => {
    app
      .listen("send-images", (event) => {
        const { data } = event.payload as { data: Image[] }
        setImages(data)
      })
      .then((fn) => {
        unlisten.current = [...unlisten.current, fn]
      })
    app.listen("send-image-index", (event) => {
      console.log(event)
      const { data } = event.payload as { data: number }
      setIndex(data)
    }).then((fn) => {
      unlisten.current = [...unlisten.current, fn]
    })
    return () => {
      for (const fn of unlisten.current) {
        fn()
      }
    }
  }, [])
  return (
    <div className="bg-[rgb(17,17,17)]">
      <Top app={app}></Top>
      <div>{index < images.length ? <img src={images[index].base64}></img> : <></>}</div>
    </div>
  )
}

export default ImageView

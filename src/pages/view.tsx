import { useEffect, useRef, useState } from "react"
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos"
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"

import Top from "../layout/top"

const app = getCurrentWebviewWindow()

interface Image {
  index: number
  length: number
  base64: string
}
const ImageView = () => {
  const top_ref = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<Image | null>(null)
  useEffect(() => {
    const listen = async () => {
      await app.listen("view-send-image", (event) => {
        const data = event.payload as Image
        setImage(data)
      })
      const params = new URLSearchParams(window.location.search)
      const index = Number(params.get("index"))
      if (!isNaN(index)) {
        await app.emitTo("main", "view-request-image", index)
      }
    }
    listen()
  }, [])
  const click = async (offset: number) => {
    await app.emitTo("main", "view-request-image", image != null ? image.index + offset : 0)
  }
  return (
    <div className="bg-[rgb(17,17,17)] h-screen w-screen overflow-hidden">
      <div ref={top_ref}>
        <Top hide={async () => await app.hide()} close={async () => await app.hide()} />
      </div>
      <div className="relative group">
        <img src={image?.base64} alt="" className="w-full h-1/1 object-cover" />
        {image != null && image.index > 0 ? (
          <div
            onClick={async () => {
              click(-1)
            }}
            className="absolute top-1/2 left-4 transform -translate-y-1/2
               hidden group-hover:flex items-center justify-center
               w-10 h-10 rounded-full bg-black bg-opacity-60
               cursor-pointer transition-opacity duration-300 z-10"
          >
            <ArrowBackIosIcon style={{ fontSize: 20, color: "white" }} />
          </div>
        ) : (
          <></>
        )}
        {image != null && image.index < image.length - 1 ? (
          <div
            onClick={async () => {
              click(1)
            }}
            className="absolute top-1/2 right-4 transform -translate-y-1/2
               hidden group-hover:flex items-center justify-center
               w-10 h-10 rounded-full bg-black bg-opacity-60
               cursor-pointer transition-opacity duration-300 z-10"
          >
            <ArrowForwardIosIcon style={{ fontSize: 20, color: "white" }} />
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  )
}

export default ImageView

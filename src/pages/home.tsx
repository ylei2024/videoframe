import { useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded"

const Home = () => {
  const [filepath, setFilePath] = useState<string>("")
  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Video", extensions: ["mp4", "avi", "mkv"] }]
    })
    if (typeof selected === "string") {
      setFilePath(selected)
    }
  }
  return (
    <div className="flex items-center justify-center w-full text-gray-100 text-sm">
      <div className="rounded-lg h-9 w-122 bg-[rgb(41,40,40)] flex items-start">
        <input
          placeholder="视频路径"
          value={filepath}
          onChange={(e) => {
            setFilePath(e.target.value)
          }}
          className="pl-2 h-full w-100/122 flex items-center focus:outline-none focus:ring-0"
        />
        <div
          className="h-full w-2/122 flex justify-center items-center px-4 cursor-pointer"
          onClick={() => {
            setFilePath("")
          }}
        >
          {filepath && (
            <HighlightOffRoundedIcon
              sx={{
                fontSize: 18
              }}
            />
          )}
        </div>
        <div className="h-full w-0.5 flex items-center">
          <div className="h-3/5 w-full bg-gray-400"></div>
        </div>
        <div className="h-full w-20/122 flex items-center justify-center">
          <div
            className="m-1 rounded-lg  h-9/10 w-full flex items-center justify-center cursor-pointer hover:bg-[rgb(71,70,70)]"
            onClick={handleSelectFile}
          >
            选择视频
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

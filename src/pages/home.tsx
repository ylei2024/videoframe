import { useState } from "react"

import Button from "@mui/material/Button"
import { useTranslation } from "react-i18next"
import { open } from "@tauri-apps/plugin-dialog"
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const Home = () => {
  enum State {
    Running = "running",
    Stopping = "stopping",
    Run = "run"
  }
  const { t } = useTranslation()
  const [filepath, setFilePath] = useState<string>("")
  const [state, setState] = useState<State>(State.Run)
  const handleSelectFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Video", extensions: ["mp4", "avi", "mkv"] }]
    })
    if (typeof selected === "string") {
      setFilePath(selected)
    }
  }
  const click = async () => {
    if (state == State.Running) {
      setState(State.Stopping)
      await delay(10000)
    } else if (state == State.Run) {
      // 启动
      setState(State.Running)
      await delay(10000)
    }
    // 结束
    setState(State.Run)
  }
  return (
    <div className="flex flex-col gap-3">
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
              className="m-1 rounded-lg h-9/10 w-full flex items-center justify-center cursor-pointer hover:bg-[rgb(71,70,70)]"
              onClick={handleSelectFile}
            >
              选择视频
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-122 flex justify-end">
          <div className="cursor-pointer" onClick={click}>
            <Button
              sx={{
                color: "white",
                backgroundColor: "rgb(40,40,40)",
                "&.MuiButton-loading": {
                  color: "white",
                  backgroundColor: "rgb(40,40,40)"
                }
              }}
              size="small"
              loading={state == State.Running || state == State.Stopping}
              loadingPosition="end"
              variant="contained"
            >
              {state == State.Run ? t("home.run") : state == State.Running ? t("home.running") : t("home.stopping")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

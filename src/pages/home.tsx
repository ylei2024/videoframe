import { TFunction } from "i18next"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import Button from "@mui/material/Button"
import { useTranslation } from "react-i18next"
import { open } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded"
import { useState, useRef, Dispatch, SetStateAction, MutableRefObject } from "react"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface InputProps {
  t: TFunction<"translation", undefined>
  filepath: string
  setFilePath: Dispatch<SetStateAction<string>>
}
const Input = (props: InputProps) => {
  const { t, filepath, setFilePath } = props
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
      <div className="rounded-lg h-9 w-124 bg-[rgb(41,40,40)] flex items-start">
        <input
          placeholder={t("home.video_path")}
          value={filepath}
          onChange={(e) => {
            setFilePath(e.target.value)
          }}
          className="pl-2 h-full w-100/124 flex items-center focus:outline-none focus:ring-0"
        />
        <div
          className="h-full w-2/124 flex justify-center items-center px-4 cursor-pointer"
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
        <div className="h-full w-22/124 flex items-center justify-center">
          <Button
            onClick={handleSelectFile}
            sx={{
              color: "white",
              boxShadow: "none",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "rgb(40,40,40)",
                boxShadow:
                  "0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)"
              },
              "&.MuiButton-loading": {
                color: "white",
                backgroundColor: "rgb(40,40,40)"
              }
            }}
            size="small"
            loadingPosition="end"
            variant="contained"
          >
            {t("home.select_video")}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ControlProps {
  t: TFunction<"translation", undefined>
  ffmpeg: MutableRefObject<FFmpeg>
  filepath: string
}
const Control = (props: ControlProps) => {
  enum State {
    Run = "run",
    Running = "running",
    Stopping = "stopping"
  }
  const { t, ffmpeg, filepath } = props
  const [state, setState] = useState<State>(State.Run)
  const loadFFmpeg = async () => {
    if (!ffmpeg.current.loaded) {
      await ffmpeg.current.load({
        coreURL: await toBlobURL("./ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("./ffmpeg-core.wasm", "application/wasm"),
        workerURL: await toBlobURL("./ffmpeg-core.worker.js", "text/javascript")
      })
    }
  }
  const getVideoDuration = async (filepath: string) => {
    await loadFFmpeg()
    const filename = filepath.split(/[/\\]/).pop() || "video.mp4"
    await ffmpeg.current.writeFile(filename, await readFile(filepath))
    await ffmpeg.current.ffprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filename,
      "-o",
      "output.txt"
    ])
    const data = await ffmpeg.current.readFile("output.txt")
    const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data)
    console.log("视频时长", text)
    return parseFloat(text)
  }

  const click = async () => {
    if (state == State.Running) {
      // 停止
      setState(State.Stopping)
      await delay(10000)
    } else if (state == State.Run) {
      setState(State.Running)
      getVideoDuration(filepath)
    }
    setState(State.Run)
  }
  return (
    <div className="flex items-center justify-center">
      <div className="w-124 flex justify-end">
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
  )
}

const Home = () => {
  const { t } = useTranslation()
  const ffmpeg = useRef(new FFmpeg())
  const [filepath, setFilePath] = useState<string>("")
  return (
    <div className="font-sans flex flex-col gap-3">
      <Input {...{ t, filepath, setFilePath }}></Input>
      <Control {...{ t, ffmpeg, filepath }}></Control>
    </div>
  )
}

export default Home

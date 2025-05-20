import { TFunction } from "i18next"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import Button from "@mui/material/Button"
import Slider from "@mui/material/Slider"
import MuiInput from "@mui/material/Input"
import { useTranslation } from "react-i18next"
import { open } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import CircularProgress from "@mui/material/CircularProgress"
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded"
import { useState, useRef, Dispatch, SetStateAction, MutableRefObject, useEffect } from "react"

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
  const [duration, setDuration] = useState<number>(100)
  // position = h * 60 * 60 + m * 60 + s
  const [position, setPosition] = useState<number>(0)
  const [hour, setHour] = useState<string>("00")
  const [minute, setMinute] = useState<string>("00")
  const [second, setSecond] = useState<string>("00")
  // 标记是否正在解析视频时长
  const [parsing_vedio, setParsingVedio] = useState<boolean>(false)
  const changePosition = (value: string, type: string) => {
    if (type == "hour") {
      setHour(value)
    } else if (type == "minute") {
      setMinute(value)
    } else if (type == "second") {
      setSecond(value)
    }
    if (type == "position") {
      const number = parseInt(value)
      setPosition(number)
      const _hour = Math.floor(number / 3600)
      const _minute = Math.floor((number % 3600) / 60)
      const _second = number % 60
      setHour(_hour < 10 ? "0" + _hour : String(_hour))
      setMinute(_minute < 10 ? "0" + _minute : String(_minute))
      setSecond(_second < 10 ? "0" + _second : String(_second))
    } else {
      setPosition(parseInt(hour) * 60 * 60 + parseInt(minute) * 60 + parseInt(second))
    }
  }
  const loadFFmpeg = async () => {
    if (!ffmpeg.current.loaded) {
      await ffmpeg.current.load({
        coreURL: await toBlobURL("./ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL("./ffmpeg-core.wasm", "application/wasm"),
        workerURL: await toBlobURL("./ffmpeg-core.worker.js", "text/javascript")
      })
      // 创建存放数据的目录
      await ffmpeg.current.createDir("data")
    }
  }
  useEffect(() => {
    const run = async () => {
      setParsingVedio(true)
      await loadFFmpeg()
      console.log(await ffmpeg.current.listDir("/data"))
      ffmpeg.current.terminate()
      setDuration(await getVideoDuration(filepath))
      changePosition("0", "position")
      setParsingVedio(false)
    }
    run()
  }, [filepath])
  const getVideoDuration = async (filepath: string) => {
    if (!filepath) {
      return 0
    }
    await loadFFmpeg()
    const filename = filepath.split(/[/\\]/).pop() || "video.mp4"
    const target_path = "/data/" + filename
    await ffmpeg.current.writeFile(target_path, await readFile(filepath))
    await ffmpeg.current.ffprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      target_path,
      "-o",
      "output.txt"
    ])
    const data = await ffmpeg.current.readFile("output.txt")
    const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data)
    console.log("视频时长", text)
    return Math.trunc(parseFloat(text))
  }
  const click = async () => {
    if (state == State.Running) {
      // 停止
      setState(State.Stopping)
      await delay(10000)
    } else if (state == State.Run) {
      setState(State.Running)
    }
    setState(State.Run)
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="w-124 flex flex-row items-center gap-6">
        <div className="w-20/124 text-gray-100 text-sm flex items-center justify-center gap-0.5">
          <MuiInput
            size="small"
            value={hour}
            onBlur={() => {
              setHour(hour.length == 0 ? "00" : hour.length == 1 ? "0" + hour : hour)
            }}
            onChange={(e) => {
              changePosition(e.target.value.replace(/[^0-9]/g, ""), "hour")
            }}
            sx={{
              width: "1.2rem",
              height: "1.5rem",
              color: "white"
            }}
            inputProps={{
              type: "text",
              maxLength: 2,
              style: { textAlign: "center" }
            }}
          />
          <div className="h-full mb-1 text-center">:</div>
          <MuiInput
            size="small"
            value={minute}
            onBlur={() => {
              setMinute(minute.length == 0 ? "00" : minute.length == 1 ? "0" + minute : minute)
            }}
            onChange={(e) => {
              changePosition(e.target.value.replace(/[^0-9]/g, ""), "minute")
            }}
            sx={{
              width: "1.2rem",
              height: "1.5rem",
              color: "white"
            }}
            inputProps={{
              type: "text",
              maxLength: 2,
              style: { textAlign: "center" }
            }}
          />
          <div className="h-full mb-1 text-center">:</div>
          <MuiInput
            size="small"
            value={second}
            onBlur={() => {
              setSecond(second.length == 0 ? "00" : second.length == 1 ? "0" + second : second)
            }}
            onChange={(e) => {
              changePosition(e.target.value.replace(/[^0-9]/g, ""), "second")
            }}
            sx={{
              width: "1.2rem",
              height: "1.5rem",
              color: "white"
            }}
            inputProps={{
              type: "text",
              maxLength: 2,
              style: { textAlign: "center" }
            }}
          />
        </div>
        <div className="w-104/124">
          <Slider
            size="small"
            step={1}
            value={position}
            min={0}
            max={duration}
            onChange={(_, value) => changePosition(String(value), "position")}
          />
        </div>
        {parsing_vedio ? (
          <div className="h-full w-20/124 flex items-center justify-center">
            <CircularProgress size={20} />
          </div>
        ) : (
          <div className="w-20/124 text-gray-100 text-sm flex items-center justify-center gap-0.5">
            <MuiInput
              readOnly={true}
              value={String(Math.floor(duration / 3600)).padStart(2, "0")}
              size="small"
              sx={{
                width: "1.2rem",
                height: "1.5rem",
                color: "white"
              }}
              inputProps={{
                type: "text",
                maxLength: 2,
                style: { textAlign: "center", cursor: "default" },
                readOnly: true
              }}
            />
            <div className="h-full mb-1 text-center">:</div>
            <MuiInput
              readOnly={true}
              value={String(Math.floor((duration % 3600) / 60)).padStart(2, "0")}
              size="small"
              sx={{
                width: "1.2rem",
                height: "1.5rem",
                color: "white"
              }}
              inputProps={{
                type: "text",
                maxLength: 2,
                style: { textAlign: "center", cursor: "default" },
                readOnly: true
              }}
            />
            <div className="h-full mb-1 text-center">:</div>
            <MuiInput
              readOnly={true}
              value={String(duration % 60).padStart(2, "0")}
              size="small"
              sx={{
                width: "1.2rem",
                height: "1.5rem",
                color: "white"
              }}
              inputProps={{
                type: "text",
                maxLength: 2,
                style: { textAlign: "center", cursor: "default" },
                readOnly: true
              }}
            />
          </div>
        )}
      </div>
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
    <div className="font-sans flex flex-col gap-7">
      <Input {...{ t, filepath, setFilePath }}></Input>
      <Control {...{ t, ffmpeg, filepath }}></Control>
    </div>
  )
}

export default Home

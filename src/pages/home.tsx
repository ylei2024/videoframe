import { TFunction } from "i18next"
import { toBlobURL } from "@ffmpeg/util"
import Button from "@mui/material/Button"
import Slider from "@mui/material/Slider"
import MuiInput from "@mui/material/Input"
import { useTranslation } from "react-i18next"
import { open } from "@tauri-apps/plugin-dialog"
import { FFmpeg, FFFSType } from "@ffmpeg/ffmpeg"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import CircularProgress from "@mui/material/CircularProgress"
import { open as fsopen, readDir } from "@tauri-apps/plugin-fs"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import HighlightOffRoundedIcon from "@mui/icons-material/HighlightOffRounded"
import { useState, useRef, Dispatch, SetStateAction, MutableRefObject, useEffect, useCallback } from "react"

import { Image, useImageStore } from "../store"

const app = getCurrentWebviewWindow()

enum State {
  ready = "ready",
  saving = "saving",
  running = "running",
  stopping = "stopping"
}

async function load(ffmpeg: MutableRefObject<FFmpeg | null>) {
  if (ffmpeg.current === null || !ffmpeg.current?.loaded) {
    ffmpeg.current = new FFmpeg()
    await ffmpeg.current.load({
      coreURL: await toBlobURL("./ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL("./ffmpeg-core.wasm", "application/wasm"),
      workerURL: await toBlobURL("./ffmpeg-core.worker.js", "text/javascript")
    })
    await ffmpeg.current.createDir("/data")
    await ffmpeg.current.createDir("/output")
  }
}

interface Task {
  id: number
  ffmpeg: MutableRefObject<FFmpeg | null>
  filename: string
  ss: number
  interval: number
  controller: AbortController
  state: "running" | "completed" | "ready"
}
async function exec(task: Task, extendImages: (append: Image[]) => void) {
  const { id, ffmpeg, filename, ss, interval, controller } = task
  try {
    if (!ffmpeg.current) {
      await load(ffmpeg)
    }
    const target_path = "/data/" + filename
    const signal = controller.signal
    await ffmpeg.current?.exec(
      [
        "-skip_frame",
        "nokey",
        "-ss",
        String(ss),
        "-t",
        String(interval),
        "-i",
        target_path,
        "-vsync",
        "vfr",
        "output/%03d.png"
      ],
      undefined,
      { signal }
    )
    const output = (await ffmpeg.current?.listDir("output")) || []
    const append: Image[] = []
    for (const { name, isDir } of output) {
      if (!isDir) {
        const image_path = "/output/" + name
        const file = await ffmpeg.current?.readFile(image_path)
        if (file instanceof Uint8Array) {
          let binary = ""
          const len = file.byteLength
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(file[i])
          }
          append.push({
            task_id: id,
            filename: name,
            base64: `data:image/png;base64,${window.btoa(binary)}`
          })
        }
        await ffmpeg.current?.deleteFile(image_path)
      }
    }
    extendImages(append)
  } catch (e) {
    console.log(e)
  }
}

interface InputProps {
  t: TFunction<"translation", undefined>
  ffmpeg: MutableRefObject<FFmpeg | null>
  file: File | null
  setFile: Dispatch<SetStateAction<File | null>>
}
const Input = (props: InputProps) => {
  const { ffmpeg, t, file, setFile } = props
  const input_ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center justify-center h-1/10 min-h-9 w-full text-gray-100 text-sm">
      <div className="rounded-lg h-9 w-124 bg-[rgb(41,40,40)] flex items-start">
        <input
          ref={input_ref}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              setFile(e.target.files[0])
            }
          }}
        />
        <input
          readOnly={true}
          placeholder={t("home.video")}
          value={file ? file.name : ""}
          className="pl-2 h-full w-100/124 flex items-center focus:outline-none focus:ring-0"
        />
        <div
          className="h-full w-2/124 flex justify-center items-center px-4 cursor-pointer"
          onClick={async () => {
            if (file && ffmpeg.current?.loaded) {
              await ffmpeg.current?.unmount("/data")
            }
            setFile(null)
            if (input_ref.current) {
              input_ref.current.value = ""
              input_ref.current.files = null
            }
          }}
        >
          {file && (
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
            onClick={() => {
              input_ref.current?.click()
            }}
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
  ffmpeg: MutableRefObject<FFmpeg | null>
  file: File | null
  state: State
  setState: Dispatch<SetStateAction<State>>
  tasks: MutableRefObject<Task[]>
}
const Control = (props: ControlProps) => {
  const interval = 60 * 15
  const { t, ffmpeg, file, state, setState, tasks } = props
  const [error, setError] = useState<string>("")
  const [hour, setHour] = useState<string>("00")
  const [minute, setMinute] = useState<string>("00")
  const [second, setSecond] = useState<string>("00")
  const [duration, setDuration] = useState<number>(0)
  const [position, setPosition] = useState<number>(0)
  const [parsing_video, setParsingVideo] = useState<boolean>(false)
  const images = useImageStore((state) => state.images)
  const clearImages = useImageStore((state) => state.clear)
  const extendImages = useImageStore((state) => state.extend)
  const changePosition = (value: string, type: string) => {
    if (state == State.stopping || state == State.running) {
      return
    }
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
    clearImages()
    tasks.current = []
  }
  const stop = async () => {
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms))
    let task_id = null
    for (let i = 0; i < tasks.current.length; i++) {
      if (tasks.current[i].state === "running") {
        task_id = i
      }
    }
    if (task_id) {
      tasks.current[task_id].controller.abort()
      while (true) {
        if (state == State.ready) {
          break
        }
        await wait(1000)
      }
      tasks.current[task_id].state = "ready"
    }
  }
  useEffect(() => {
    const run = async () => {
      setParsingVideo(true)
      try {
        if (!file) {
          await ffmpeg.current?.unmount("/data")
          return
        }
        await load(ffmpeg)
        const target_path = "/data/" + file.name
        // https://github.com/ffmpegwasm/ffmpeg.wasm/issues/823
        await ffmpeg.current?.exec(["-i", "not-found"])
        await ffmpeg.current?.mount(FFFSType.WORKERFS, { files: [file] }, "/data")
        await ffmpeg.current?.ffprobe([
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
        const data = await ffmpeg.current?.readFile("output.txt")
        const text = typeof data === "string" ? data : new TextDecoder("utf-8").decode(data)
        setDuration(Math.trunc(parseFloat(text)))
      } catch (e) {
        ffmpeg.current = null
        await load(ffmpeg)
      } finally {
        setParsingVideo(false)
      }
    }
    run()
    return () => {
      stop().then(() => {})
      setDuration(0)
      changePosition("0", "position")
    }
  }, [file])
  const click = async () => {
    if (state == State.running) {
      setState(State.stopping)
      await stop()
    } else if (state == State.ready && file) {
      setState(State.running)
      if (tasks.current.length === 0) {
        let ss = parseInt(hour) * 60 * 60 + parseInt(minute) * 60 + parseInt(second)
        const next_tasks: Task[] = []
        let id = 0
        while (ss < duration) {
          const controller = new AbortController()
          const remaining = duration - ss
          next_tasks.push({
            id: id,
            ffmpeg: ffmpeg,
            filename: file.name,
            ss: ss,
            interval: remaining >= interval ? interval : remaining,
            controller: controller,
            state: "ready"
          })
          id += 1
          ss += interval
        }
        tasks.current = next_tasks
      }
      for (let i = 0; i < tasks.current.length; i++) {
        tasks.current[i].state = "running"
        await exec(tasks.current[i], extendImages)
        if (tasks.current[i].controller.signal.aborted) {
          tasks.current[i].state = "ready"
          tasks.current[i].controller = new AbortController()
          break
        } else {
          tasks.current[i].state = "completed"
        }
      }
    }
    if (state != State.stopping) {
      setState(State.ready)
    }
  }
  const save = async () => {
    if (state == State.running || state == State.stopping) {
      return
    }
    const folder = await open({
      directory: true,
      multiple: false,
      title: ""
    })
    if (folder === null) {
      return
    }
    setError("")
    const dirs = await readDir(folder)
    if (dirs.length > 0) {
      for (const dir of dirs) {
        if (dir.isFile && images.find((i) => i.filename === dir.name)) {
          setError(t("home.folder.tip") + `: ${dir.name}`)
          return
        }
      }
    }
    try {
      setState(State.saving)
      for (const image of images) {
        const path = folder + "\\" + image.filename
        const file = await fsopen(path, { write: true, create: true })
        const base64 = image.base64.split(",")[1]
        const binary = window.atob(base64)
        const array = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i)
        }
        await file.write(array)
      }
    } catch (e) {
      console.log("Error saving images:", e)
    } finally {
      setState(State.ready)
    }
  }
  return (
    <div className="h-1/10 min-h-9 flex flex-col items-center justify-center gap-2">
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
        {parsing_video ? (
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
      <div className="w-124 flex justify-end items-center gap-4">
        <div className="text-yellow-600 rounded-md font-semibold text-xs relative">
          <span>{error}</span>
        </div>
        <div className="cursor-pointer" onClick={save}>
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
            loading={state == State.saving}
            loadingPosition="end"
            variant="contained"
          >
            {t("home.save")}
          </Button>
        </div>
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
            loading={state == State.running || state == State.stopping}
            loadingPosition="end"
            variant="contained"
          >
            {state == State.ready ? t("home.run") : state == State.running ? t("home.running") : t("home.stopping")}
          </Button>
        </div>
      </div>
    </div>
  )
}

const ImagesBox = () => {
  const label = "view"
  const view = useRef<WebviewWindow | null>(null)
  const images = useImageStore((state) => state.images)
  const removeImage = useImageStore((state) => state.remove)
  const create_window = async (index: number) => {
    const position = await app.outerPosition()
    return new WebviewWindow(label, {
      url: "/view?index=" + index,
      x: position.x,
      y: position.y,
      minWidth: 800,
      minHeight: 500,
      decorations: false,
      dragDropEnabled: true
    })
  }
  const sendImage = useCallback(
    async (index: number) => {
      if (view.current && index >= 0 && index < images.length) {
        await app.emitTo(label, "view-send-image", {
          index: index,
          length: images.length,
          base64: images[index].base64
        })
        await view.current.show()
        await view.current.unminimize()
        await view.current.setFocus()
      }
    },
    [images]
  )
  useEffect(() => {
    const listen = async () => {
      await app.listen("view-request-image", async (event: { payload: number }) => {
        if (view.current) {
          await sendImage(event.payload)
        }
      })
    }
    listen()
  }, [sendImage])
  return (
    <div className="h-8/10 w-full scrollbar-none overflow-y-scroll flex items-center justify-center">
      <div className="w-7/8 h-full grid grid-cols-3 gap-4">
        {images.map((image, index) => {
          return (
            <div
              className="relative transition-transform duration-300 ease-in-out hover:scale-102 group cursor-pointer"
              key={`${image.task_id}-${image.filename}`}
            >
              <div
                onClick={() => {
                  removeImage(image)
                }}
                className="absolute top-0.5 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <HighlightOffRoundedIcon
                  sx={{
                    fontSize: 19,
                    color: "rgba(255, 255, 255, 1)",
                    backgroundColor: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "50%"
                  }}
                ></HighlightOffRoundedIcon>
              </div>
              <img
                src={image.base64}
                alt={image.filename}
                onClick={async () => {
                  if (view.current === null) {
                    view.current = await create_window(index)
                  } else {
                    await sendImage(index)
                  }
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Home = () => {
  const { t } = useTranslation()
  const tasks = useRef<Task[]>([])
  const ffmpeg = useRef<FFmpeg | null>()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<State>(State.ready)
  return (
    <div className="font-sans flex flex-col gap-7 w-full h-[calc(100vh-30px)]">
      <Input {...{ t, ffmpeg, file, setFile }}></Input>
      <Control {...{ t, ffmpeg, file, state, setState, tasks }}></Control>
      <ImagesBox></ImagesBox>
    </div>
  )
}

export default Home

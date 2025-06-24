import "../styles.css"
import { Button, ButtonGroup } from "@mui/material"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { CloseRounded, HorizontalRuleRounded } from "@mui/icons-material"

interface TopProps {
  app: WebviewWindow
}
function Top(props: TopProps) {
  return (
    <div data-tauri-drag-region className="flex justify-end h-[30px]">
      <ButtonGroup
        variant="text"
        sx={{
          zIndex: 1000,
          height: "100%",
          ".MuiButtonGroup-grouped": {
            borderRadius: "0px",
            borderRight: "0px"
          }
        }}
      >
        <Button
          size="small"
          sx={{
            "width": 15,
            "height": 25,
            ":hover": { bgcolor: "#242424" }
          }}
          onClick={() => props.app.hide()}
        >
          <HorizontalRuleRounded
            fontSize="small"
            sx={{
              color: "#ffffff"
            }}
          />
        </Button>
        <Button
          size="small"
          sx={{
            "width": 15,
            "height": 25,
            ":hover": { bgcolor: "#ff000090" }
          }}
          onClick={() => props.app.close()}
        >
          <CloseRounded
            fontSize="small"
            sx={{
              color: "#ffffff"
            }}
          />
        </Button>
      </ButtonGroup>
    </div>
  )
}

export default Top

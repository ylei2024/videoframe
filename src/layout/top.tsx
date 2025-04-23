import "../styles.css"
import { Button, ButtonGroup } from "@mui/material"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import { CloseRounded, HorizontalRuleRounded } from "@mui/icons-material"

const appWindow = getCurrentWebviewWindow()

function Top() {
  const minWidth = 40
  return (
    <div data-tauri-drag-region className="flex justify-end">
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
            minWidth,
            ":hover": { bgcolor: "#242424" }
          }}
          onClick={() => appWindow.hide()}
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
            minWidth,
            ":hover": { bgcolor: "#ff000090" }
          }}
          onClick={() => appWindow.close()}
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

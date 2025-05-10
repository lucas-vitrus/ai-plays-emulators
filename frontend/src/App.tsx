import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ConfigProvider,
  theme,
  Button,
  notification,
  Drawer,
  Space,
} from "antd";
import {
  CameraOutlined,
  MenuOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

import N64Emulator from "./environments/N64Emulator";
import type { N64EmulatorRef } from "./environments/N64Emulator";
import Console3D from "./components/Console3D";

import N64Controller from "./client/LocalControls";
import ServerLogsDisplay from "./components/ServerLogsDisplay";

// Assuming ServerLogMessage is primarily for display and can be defined here or imported
// If ./types/gun.ts has a conflicting definition, one needs to be chosen as canonical.
interface ServerLogMessage {
  id: string;
  message: string;
  timestamp: number;
  // 'type' can categorize the log, 'level' determines display style (e.g., color)
  type:
    | "info"
    | "error"
    | "warning"
    | "success"
    | "server"
    | "client_tx"
    | "client_rx_debug";
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
}

const { darkAlgorithm } = theme;

// N64 Control Map (condensed for brevity, ensure all mappings are correct)
const N64_CONTROL_MAP: { [key: string]: number } = {
  A: 88,
  B: 83,
  START: 13,
  DPAD_UP: 38,
  DPAD_DOWN: 40,
  DPAD_LEFT: 37,
  DPAD_RIGHT: 39,
  L_TRIG: 81,
  R_TRIG: 69,
  Z_TRIG: 9,
  C_UP: 75,
  C_DOWN: 73,
  C_LEFT: 74,
  C_RIGHT: 76,
  LEFT_STICK_X_PLUS: 72,
  LEFT_STICK_X_MINUS: 70,
  LEFT_STICK_Y_PLUS: 71,
  LEFT_STICK_Y_MINUS: 84,
  // Add other less common ones if needed, e.g. BUTTON_2, BUTTON_4 directly if used
};

const MAX_SERVER_LOGS = 200;
const WEBSOCKET_URL = "ws://localhost:3033/ws";

// Define props for the memoized emulator wrapper
interface MemoizedEmulatorDisplayProps {
  emulatorRef: React.RefObject<N64EmulatorRef | null>;
  onScreenshot: (base64Data: string, commandId?: string) => void;
}

// Create the memoized wrapper component for N64Emulator
const MemoizedEmulatorDisplay = React.memo<MemoizedEmulatorDisplayProps>(
  ({ emulatorRef, onScreenshot }) => {
    // This console.log will help us verify if this component re-renders unnecessarily.
    // Ideally, it should log very infrequently after initial mount.
    console.log("MemoizedEmulatorDisplay rendering/re-rendering");
    return (
      <div className="absolute top-[-100px] left-0 w-full h-full z-0">
        <N64Emulator ref={emulatorRef} onScreenshot={onScreenshot} />
      </div>
    );
  }
);
MemoizedEmulatorDisplay.displayName = "MemoizedEmulatorDisplay"; // For better debugging in React DevTools

function App() {
  const emulatorRef = useRef<N64EmulatorRef>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [serverLogs, setServerLogs] = useState<ServerLogMessage[]>([]);
  const [aiPlayerName, setAiPlayerName] = useState<string | null>(null);

  const addServerLog = useCallback(
    (
      message: string,
      type: ServerLogMessage["type"],
      level: ServerLogMessage["level"]
    ) => {
      setServerLogs((prevLogs) => {
        const newLog: ServerLogMessage = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          message,
          timestamp: Date.now(),
          type,
          level,
        };
        return [newLog, ...prevLogs].slice(0, MAX_SERVER_LOGS);
      });
    },
    []
  );

  const sendMessageToServer = useCallback(
    (messageObject: any) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const messageString = JSON.stringify(messageObject);

        if (
          messageObject.type === "SCREENSHOT_RESPONSE" &&
          messageObject.commandId
        ) {
          addServerLog(
            `[TX] Client: Sent Screenshot 📸 for commandId: ${messageObject.commandId}`,
            "client_tx",
            "DEBUG"
          );
        } else {
          addServerLog(`[TX] Client: ${messageString}`, "client_tx", "DEBUG");
        }

        wsRef.current.send(messageString);
      } else {
        const errorMsg = `[TX] Client (Error): Failed to send - WebSocket not open. Message: ${JSON.stringify(
          messageObject
        )}`;
        addServerLog(errorMsg, "error", "ERROR");
        notification.error({
          message: "WebSocket Not Connected",
          description: "Cannot send. Ensure server is running and refresh.",
        });
      }
    },
    [addServerLog]
  );

  const pressButton = useCallback(
    (
      player: number,
      controlNameInput: string,
      value: number,
      duration: number = 200
    ) => {
      const controlKey = controlNameInput.toUpperCase();
      const control = N64_CONTROL_MAP[controlKey];
      if (control === undefined) {
        const errorMsg = `App: Unknown control: ${controlKey} (original: ${controlNameInput})`;
        addServerLog(errorMsg, "error", "ERROR");
        notification.error({
          message: "Invalid Control",
          description: `Control "${controlKey}" not mapped.`,
        });
        return;
      }
      try {
        if (
          (window as any).EJS_emulator?.gameManager?.functions?.simulateInput
        ) {
          (window as any).EJS_emulator.gameManager.functions.simulateInput(
            player,
            control,
            value
          );
          if (value === 1 && duration > 0) {
            setTimeout(() => {
              try {
                (
                  window as any
                ).EJS_emulator.gameManager.functions.simulateInput(
                  player,
                  control,
                  0
                );
              } catch (e: any) {
                addServerLog(
                  `Error during button release simulation: ${e.message}`,
                  "error",
                  "ERROR"
                );
                console.error("Emulator release button error:", e);
              }
            }, duration);
          }
        } else {
          addServerLog(
            "Emulator or simulateInput not available for press.",
            "error",
            "ERROR"
          );
          notification.error({
            message: "Emulator Action Failed",
            description: "simulateInput unavailable for press.",
          });
        }
      } catch (e: any) {
        addServerLog(
          `Error during button press simulation: ${e.message}`,
          "error",
          "ERROR"
        );
        console.error("Emulator pressButton error:", e);
        notification.error({
          message: "Emulator Error",
          description: `Button press failed: ${e.message}`,
        });
      }
    },
    [addServerLog]
  );

  const requestScreenshotCapture = useCallback(
    (commandId: string) => {
      try {
        if (emulatorRef.current) {
          addServerLog(
            `App: Triggering screenshot for commandId: ${commandId}`,
            "client_rx_debug",
            "DEBUG"
          );
          emulatorRef.current.triggerScreenshot(commandId);
        } else {
          addServerLog(
            "N64Emulator ref not available for screenshot.",
            "warning",
            "WARN"
          );
          notification.warning({
            message: "Screenshot Unavailable",
            description: "Emulator ref missing.",
          });
        }
      } catch (e: any) {
        addServerLog(
          `Error during screenshot trigger: ${e.message}`,
          "error",
          "ERROR"
        );
        console.error("Emulator triggerScreenshot error:", e);
        notification.error({
          message: "Emulator Error",
          description: `Screenshot trigger failed: ${e.message}`,
        });
      }
    },
    [addServerLog]
  );

  const handleEmulatorScreenshot = useCallback(
    (base64Data: string, commandId?: string) => {
      if (!commandId) {
        addServerLog(
          "App: Screenshot from emulator missing commandId.",
          "error",
          "ERROR"
        );
        notification.error({
          message: "Screenshot Error",
          description: "Emulator screenshot missing commandId.",
        });
        return;
      }
      const responseMessage = {
        type: "SCREENSHOT_RESPONSE",
        commandId,
        data: base64Data,
      };
      sendMessageToServer(responseMessage);
      notification.success({
        message: "Screenshot Sent",
        description: `Screenshot for ${commandId} sent.`,
      });
    },
    [sendMessageToServer, addServerLog]
  );

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        addServerLog("WebSocket connected to server.", "success", "INFO");
        notification.success({
          message: "WebSocket Connected",
          description: "To game server.",
        });
      };

      ws.onmessage = (event) => {
        const rawMessage = event.data.toString();
        let messageForLog = `[RX] Server: ${rawMessage}`;
        let msgType: ServerLogMessage["type"] = "server";
        let msgLevel: ServerLogMessage["level"] = "INFO";

        try {
          const parsed = JSON.parse(rawMessage);
          messageForLog = `[RX] Server: ${JSON.stringify(parsed, null, 2)}`;

          switch (parsed.type) {
            case "REQUEST_SCREENSHOT":
              if (parsed.commandId) {
                requestScreenshotCapture(parsed.commandId);
                msgType = "server";
                msgLevel = "DEBUG";
              } else {
                messageForLog =
                  "[RX] (Error) Srv: REQUEST_SCREENSHOT missing commandId.";
                msgLevel = "ERROR";
              }
              break;
            case "PRESS_BUTTON":
              if (parsed.payload) {
                const { player, button, duration } = parsed.payload;
                pressButton(player, button, 1, duration || 200);
                msgType = "server";
                msgLevel = "DEBUG";
              } else {
                messageForLog =
                  "[RX] (Error) Srv: PRESS_BUTTON missing payload.";
                msgLevel = "ERROR";
              }
              break;
            case "PLAYER_INIT":
              if (parsed.payload?.playerName) {
                setAiPlayerName(parsed.payload.playerName);
                addServerLog(
                  parsed.payload.message ||
                    `AI Player '${parsed.payload.playerName}' initialized.`,
                  "success",
                  "INFO"
                );
                // notification.success({ message: "AI Player", description: parsed.payload.message });
              } else {
                messageForLog =
                  "[RX] (Error) Srv: PLAYER_INIT missing payload.playerName.";
                msgLevel = "ERROR";
              }
              return; // Handled specific logging above
            case "INFO":
              messageForLog = `[RX] Server Info: ${parsed.payload}`;
              msgType = "info";
              msgLevel = "INFO";
              break;
            case "WARN":
              messageForLog = `[RX] Server Warn: ${parsed.payload}`;
              msgType = "warning";
              msgLevel = "WARN";
              break;
            case "ERROR":
              messageForLog = `[RX] Server Error: ${parsed.payload}`;
              msgType = "error";
              msgLevel = "ERROR";
              break;
            default:
              messageForLog = `[RX] Server (Unknown Type): ${JSON.stringify(
                parsed,
                null,
                2
              )}`;
              msgLevel = "WARN";
              break;
          }
        } catch (e) {
          /* Not JSON, messageForLog is already rawMessage */
        }
        addServerLog(messageForLog, msgType, msgLevel);
      };

      ws.onerror = (error) => {
        addServerLog("WebSocket error. Check console.", "error", "ERROR");
        notification.error({
          message: "WebSocket Error",
          description: "Connection failed.",
        });
      };

      ws.onclose = (event) => {
        const reason = `Code: ${event.code}, Reason: ${event.reason || "N/A"}`;
        addServerLog(
          `WebSocket disconnected: ${reason}`,
          event.wasClean ? "info" : "warning",
          event.wasClean ? "INFO" : "WARN"
        );
        wsRef.current = null;
        setAiPlayerName(null);
      };
    };

    connectWebSocket();
    return () => {
      wsRef.current?.close();
    };
  }, [addServerLog, pressButton, requestScreenshotCapture]);

  const handleManualScreenshot = useCallback(() => {
    const manualCommandId = `manual-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    requestScreenshotCapture(manualCommandId);
  }, [requestScreenshotCapture]);

  const handleN64ControllerClick = useCallback(
    (key: string) => {
      pressButton(0, key, 1, 200);
    },
    [pressButton]
  );

  const showDrawer = useCallback(() => setDrawerVisible(true), []);

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm }}>
      <div
        style={{
          padding: "0px",
          backgroundColor: "#211293",
          color: "white",
          height: "100vh",
          width: "100vw",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Button
          type="text"
          className="opacity-30 hover:opacity-100"
          icon={<MenuOutlined style={{ color: "white", fontSize: "24px" }} />}
          onClick={showDrawer}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 1000,
          }}
        />
        <div className="absolute top-6 left-0 w-full flex justify-center items-center z-20">
          {aiPlayerName && (
            <h1 className="text-white text-3xl">
              AI Player: {aiPlayerName} Active
            </h1>
          )}
        </div>
        <ServerLogsDisplay logs={serverLogs} />
        <MemoizedEmulatorDisplay
          emulatorRef={emulatorRef}
          onScreenshot={handleEmulatorScreenshot}
        />
        <div className="absolute bottom-0 left-0 w-[100%] h-[30%] z-1">
          <Console3D />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-20">
          <Button
            type="default"
            icon={<CameraOutlined />}
            onClick={handleManualScreenshot}
          >
            Screenshot
          </Button>
          <N64Controller onClickButton={handleN64ControllerClick} />

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => sendMessageToServer({ type: "BEGIN_PLAY" })}
          >
            Start AI
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={() => sendMessageToServer({ type: "END_PLAY" })}
          >
            Stop AI
          </Button>
        </div>

        <div className="z-0 text-sm text-gray-400 absolute bottom-4 right-4 flex items-end justify-end gap-2">
          <div className="flex items-end justify-end gap-4">
            <p>
              Built on top of{" "}
              <a
                className="text-white"
                href="https://emulatorjs.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                EmulatorJS
              </a>
            </p>
            <p>
              N64 Model from{" "}
              <a
                className="text-white"
                href="https://sketchfab.com/3d-models/nintendo-64-816d53eca00e4f3192a8d23f62388472"
                target="_blank"
                rel="noopener noreferrer"
              >
                @ethanboor
              </a>
            </p>
          </div>
        </div>
      </div>
      {/* <Drawer title="Controls & Info" placement="left" onClose={onCloseDrawer} visible={drawerVisible}></Drawer> */}
    </ConfigProvider>
  );
}

export default App;

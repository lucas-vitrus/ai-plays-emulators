// --- Vitrus SDK Import ---
import Vitrus from "vitrus";

// --- React Imports ---
import React, { useRef, useState, useEffect } from "react";

// --- Ant Design Imports ---
import { ConfigProvider, theme } from "antd";

// --- Local Imports ---
import ShowCursor from "./components/ShowCursor";
import N64Emulator from "./environments/N64Emulator";
import type { N64EmulatorRef } from "./environments/N64Emulator";
// import { N64_CONTROL_MAP } from "./controlMap"; // Import the map
import N64Controller from "./client/LocalControls";

import ServerLogsDisplay from "./components/ServerLogsDisplay";
import type { ServerLogMessage } from "./types";

// This is purely cosmetic, but looks charmy ;)
import Console3D from "./components/Console3D";

// Initialize Vitrus
const vitrus = new Vitrus({
  apiKey: import.meta.env.VITE_VITRUS_API_KEY,
  world: import.meta.env.VITE_VITRUS_WORLD, // as we are using an actor, we need to define a world for it.
  // debug: true,
  baseUrl: "ws://localhost:3333",
});

/* Emulator hot-reload Optimization */
interface MemoizedEmulatorDisplayProps {
  emulatorRef: React.RefObject<N64EmulatorRef | null>;
}

// Create the memoized wrapper component for N64Emulator
const MemoizedEmulatorDisplay = React.memo<MemoizedEmulatorDisplayProps>(
  ({ emulatorRef }) => {
    // This console.log will help us verify if this component re-renders unnecessarily.
    // Ideally, it should log very infrequently after initial mount.
    console.log("MemoizedEmulatorDisplay rendering/re-rendering");
    return (
      <div className="absolute top-[-100px] left-0 w-full h-full z-0">
        <N64Emulator ref={emulatorRef} />
      </div>
    );
  }
);
MemoizedEmulatorDisplay.displayName = "MemoizedEmulatorDisplay"; // For better debugging in React DevTools

function App() {
  const emulatorRef = useRef<N64EmulatorRef>(null);
  const [serverLogs, setServerLogs] = useState<ServerLogMessage[]>([]);
  const [aiPlayerName, setAiPlayerName] = useState<string | null>(null);
  const [actor, setActor] = useState<any>(null);

  const addLog = (message: string) => {
    setServerLogs((prevLogs) => [
      ...prevLogs,
      {
        id: Date.now().toString(),
        message,
        level: "INFO",
        timestamp: Date.now(),
      },
    ]);
  };

  const connectActor = async () => {
    // This will register the actor in the world
    const actor = await vitrus.actor("emulator", {});
    setActor(actor);
    addLog("🐸 Actor connected");
  };

  // Connect to Vitrus Actor
  useEffect(() => {
    connectActor();
    return () => {
      if (actor) {
        actor.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (actor) {
      actor.on("init", (config: any) => {
        console.log("Actor initialized with config:", config);
        addLog(JSON.stringify(args));
        return true;
      });

      actor.on("log", (args: any) => {
        console.log(args);
        addLog(JSON.stringify(args));
        return true;
      });

      actor.on("screenshot", async () => {
        addLog("📸 Screenshot requested (base64)");
        const screenshot = await emulatorRef.current?.getBase64Screenshot();
        console.log(
          "screenshot (base64)",
          screenshot?.substring(0, 50) + "..."
        );
        return screenshot;
      });

      actor.on("press_button", (button: string) => {
        console.log(button);
        addLog(`🕹️ ${button} pressed`);

        return true;
      });
    }
  }, [actor]);
  /*
.EJS_emulator.gameManager.functions.simulateInput(
                  player,
                  control,
                  0
  */

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="p-0 bg-[#211293] text-white h-screen w-screen relative overflow-hidden">
        <div className="absolute top-6 left-0 w-full flex justify-center items-center z-20">
          {aiPlayerName && (
            <div className="text-center">
              <h1 className="text-white text-3xl flex items-center justify-center gap-2">
                <pre>{aiPlayerName}</pre>{" "}
                <span className="opacity-50">playing</span>
              </h1>
            </div>
          )}
        </div>
        <ServerLogsDisplay logs={serverLogs} />
        <MemoizedEmulatorDisplay emulatorRef={emulatorRef} />
        <div className="absolute bottom-0 left-0 w-[100%] h-[30%] z-1">
          <Console3D />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-20 w-fit">
          {/* <Button
            type="default"
            icon={<CameraOutlined />}
            // onClick={handleManualScreenshot}
          >
            Screenshot
          </Button> */}
          <N64Controller onClickButton={() => {}} />
        </div>

        <div className="z-0 text-sm text-gray-400 absolute bottom-4 right-4 flex items-end justify-end gap-2">
          <div className="flex items-end justify-end gap-4">
            <p>
              AI Actor from{" "}
              <a
                className="text-white"
                href="https://sketchfab.com/3d-models/nintendo-64-816d53eca00e4f3192a8d23f62388472"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vitrus SDK
              </a>
            </p>

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
              N64 model from{" "}
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

        <ShowCursor label="Human" hideCursor={true} />
      </div>
    </ConfigProvider>
  );
}

export default App;

// --- Vitrus SDK Import ---
import Vitrus from "vitrus";

// --- React Imports ---
import React, { useRef, useState, useEffect, useCallback } from "react";

// --- Ant Design Imports ---
import { ConfigProvider, theme, Button, Dropdown, Input, Space } from "antd";
import { GlobalOutlined } from "@ant-design/icons";

// --- Local Imports ---
import ShowCursor from "./components/ShowCursor";
import N64Emulator from "./environments/N64Emulator";
import type { N64EmulatorRef } from "./environments/N64Emulator";
import N64Controller from "./components/LocalControls";

import ServerLogsDisplay from "./components/ServerLogsDisplay";
import type { ServerLogMessage } from "./types";

// This is purely cosmetic, but looks charmy ;)
import Console3D from "./components/Console3D";
import { getN64KeyCode } from "./controlMap";

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

  // Vitrus and Actor connection states
  const [currentApiKey, setCurrentApiKey] = useState<string | undefined>(
    import.meta.env.VITE_VITRUS_API_KEY
  );
  const [currentWorldId, setCurrentWorldId] = useState<string | undefined>(
    import.meta.env.VITE_VITRUS_WORLD
  );
  const [vitrusInstance, setVitrusInstance] = useState<Vitrus | null>(null);
  const [actor, setActor] = useState<any>(null);

  // Dropdown form states
  const [inputApiKey, setInputApiKey] = useState<string>("");
  const [inputWorldId, setInputWorldId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const addLog = useCallback((message: string) => {
    setServerLogs((prevLogs) => [
      ...prevLogs,
      {
        id: Date.now().toString(),
        message,
        level: "INFO",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Refs to store previous API key and World ID to prevent re-initializing Vitrus with same credentials
  const prevApiKeyRef = useRef<string | undefined>(undefined);
  const prevWorldIdRef = useRef<string | undefined>(undefined);

  // Effect to initialize/update Vitrus instance ONLY when credentials ACTUALLY change
  useEffect(() => {
    if (currentApiKey && currentWorldId) {
      if (
        currentApiKey !== prevApiKeyRef.current ||
        currentWorldId !== prevWorldIdRef.current
      ) {
        addLog(
          "🔑 API Key or World ID changed. Initializing new Vitrus instance..."
        );
        const newVitrus = new Vitrus({
          apiKey: currentApiKey,
          world: currentWorldId,
          baseUrl: "ws://localhost:3333", // Ensure this is the correct base URL
          // debug: true, // Uncomment if needed
        });
        setVitrusInstance(newVitrus);
        prevApiKeyRef.current = currentApiKey;
        prevWorldIdRef.current = currentWorldId;
        addLog(
          `🌍 Vitrus instance configured. API Key: ${currentApiKey.substring(
            0,
            5
          )}..., World ID: ${currentWorldId}`
        );
      } else {
        // Optional: Log that credentials haven't changed, so instance is reused.
        // addLog("👍 Vitrus credentials unchanged. Instance remains the same.");
      }
    } else {
      // If credentials are not present, ensure Vitrus instance is null.
      if (vitrusInstance !== null) {
        // Only update if it was previously not null to avoid unnecessary renders
        addLog(
          "⚠️ Vitrus API Key or World ID not provided. Clearing Vitrus instance."
        );
        setVitrusInstance(null);
      }
      prevApiKeyRef.current = undefined; // Clear refs too
      prevWorldIdRef.current = undefined;
    }
  }, [currentApiKey, currentWorldId, addLog, vitrusInstance]); // vitrusInstance is included for the conditional setVitrusInstance(null)

  // Effect to connect/reconnect actor when Vitrus instance changes
  useEffect(() => {
    let actorCreatedInThisEffect: any = null; // To manage cleanup for the actor created by this specific effect run

    const connectAndSetActor = async () => {
      if (vitrusInstance) {
        addLog("⏳ Attempting to connect Vitrus actor (instance available)...");
        try {
          const newActor = await vitrusInstance.actor("emulator", {});
          actorCreatedInThisEffect = newActor;
          setActor(newActor);
          addLog("🐸 Vitrus actor connected successfully!");
        } catch (error: any) {
          console.error("Failed to connect actor:", error);
          addLog(
            `🔥 Error connecting actor: ${error.message || String(error)}`
          );
          setActor(null); // Ensure actor is null on connection failure
        }
      } else {
        // If vitrusInstance becomes null (e.g. credentials cleared), ensure actor state is also null.
        setActor(null);
        // addLog("🔌 Vitrus instance not available. Actor set to null by connection effect."); // This log might be redundant if the previous effect already logs it
      }
    };

    connectAndSetActor();

    // Cleanup function: Runs when vitrusInstance changes (triggering effect re-run) OR when the component unmounts.
    return () => {
      if (actorCreatedInThisEffect) {
        addLog(
          "🧹 Cleaning up: disconnecting actor from previous Vitrus instance or on unmount..."
        );
        actorCreatedInThisEffect
          .disconnect()
          .catch((e: any) =>
            addLog(`⚠️ Error during actor cleanup disconnect: ${e.message}`)
          );
      }
    };
  }, [vitrusInstance, addLog]); // addLog is stable. This effect runs if vitrusInstance reference changes.

  useEffect(() => {
    if (actor) {
      addLog("🎧 Setting up actor event listeners...");
      actor.on("init", (config: any) => {
        console.log("Actor initialized with config:", config);
        addLog(JSON.stringify(config));
        // Example: if config has a name for the AI player
        if (config && typeof config.name === "string") {
          setAiPlayerName(config.name);
        }
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

      actor.on("press_button", (args: any) => {
        console.log(args);
        const player = args.player || 0;
        const DEFAULT_HOLD_TIME = 50; // Default hold time in milliseconds
        const holdTime =
          typeof args.holdTime === "number" && args.holdTime > 0
            ? args.holdTime
            : DEFAULT_HOLD_TIME;

        if (Array.isArray(args.buttons)) {
          // Handle array of buttons
          args.buttons.forEach((button: string) => {
            const buttonKey = getN64KeyCode(button);
            if (buttonKey !== undefined) {
              (window as any).EJS_emulator.gameManager.functions.simulateInput(
                player,
                buttonKey,
                1 // Press the button
              );
              addLog(`🕹️ ${button} pressed (batch, hold: ${holdTime}ms)`);
              // Optional: Add a small delay or mechanism to release the button if needed
              setTimeout(() => {
                (
                  window as any
                ).EJS_emulator.gameManager.functions.simulateInput(
                  player,
                  buttonKey,
                  0 // Release the button
                );
              }, holdTime); // Use the specified or default hold time
            } else {
              addLog(`⚠️ Unknown button in batch: ${button}`);
            }
          });
        } else if (args.button) {
          // Handle single button
          const buttonKey = getN64KeyCode(args.button);
          if (buttonKey !== undefined) {
            (window as any).EJS_emulator.gameManager.functions.simulateInput(
              player,
              buttonKey,
              1 // Press the button
            );
            addLog(`🕹️ ${args.button} pressed (hold: ${holdTime}ms)`);
            // Optional: Release the button if needed, similar to above
            setTimeout(() => {
              (window as any).EJS_emulator.gameManager.functions.simulateInput(
                player,
                buttonKey,
                0 // Release the button
              );
            }, holdTime); // Use the specified or default hold time
          } else {
            addLog(`⚠️ Unknown button: ${args.button}`);
          }
        } else {
          addLog(
            `⚠️ Invalid 'press_button' arguments: ${JSON.stringify(args)}`
          );
        }

        return true;
      });
      addLog("✅ Actor event listeners active.");

      // Optional: Cleanup for listeners if actor.off or similar is available
      return () => {
        addLog(
          "🧹 Removing event listeners from the old actor instance (if applicable)..."
        );
        // If actor.off("event", handler) or actor.removeAllListeners() exists:
        // actor.off("init", ...);
        // actor.off("log", ...);
        // actor.off("screenshot", ...);
        // actor.off("press_button", ...);
      };
    }
  }, [actor, addLog, emulatorRef]);

  const handleConfirmConnection = () => {
    addLog(
      `🚀 Confirming new connection settings. API Key: ${inputApiKey.substring(
        0,
        5
      )}..., World ID: ${inputWorldId}`
    );
    if (!inputApiKey.trim() || !inputWorldId.trim()) {
      addLog("⚠️ API Key and World ID are required.");
      // Consider showing an Antd message.error() here for better UX
      return;
    }
    setCurrentApiKey(inputApiKey.trim());
    setCurrentWorldId(inputWorldId.trim());
    setIsDropdownOpen(false);
  };

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      setInputApiKey(
        currentApiKey || import.meta.env.VITE_VITRUS_API_KEY || ""
      );
      setInputWorldId(
        currentWorldId || import.meta.env.VITE_VITRUS_WORLD || ""
      );
    }
    setIsDropdownOpen(open);
  };

  const connectionDropdownMenu = (
    <div className="p-4 bg-neutral-700 shadow-lg rounded-md border border-gray-200 dark:border-neutral-700 w-80">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          addonBefore="API Key"
          placeholder="Enter VITRUS API KEY"
          value={inputApiKey}
          onChange={(e) => setInputApiKey(e.target.value)}
          className="bg-neutral-700 text-white placeholder-gray-400 border-neutral-600"
        />
        <Input
          addonBefore="World ID"
          placeholder="Enter World ID"
          value={inputWorldId}
          onChange={(e) => setInputWorldId(e.target.value)}
          className="bg-neutral-700 text-white placeholder-gray-400 border-neutral-600"
        />
        <Button
          type="primary"
          onClick={handleConfirmConnection}
          block
          icon={<GlobalOutlined />}
        >
          Connect
        </Button>
      </Space>
    </div>
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div className="p-0 bg-[#211293] text-white h-screen w-screen relative overflow-hidden">
        <div className="absolute top-6 right-6 z-30">
          <Dropdown
            overlay={connectionDropdownMenu}
            trigger={["click"]}
            open={isDropdownOpen}
            onOpenChange={handleDropdownOpenChange}
          >
            {actor ? (
              <Button
                type="default"
                size="large"
                className="flex items-center dark:text-white dark:border-gray-600 dark:hover:border-apple-blue dark:hover:text-apple-blue"
              >
                <span className="mr-2 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                Connected
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<GlobalOutlined />}
                className={
                  !currentApiKey || !currentWorldId ? "animate-pulse" : ""
                }
              >
                Connect World
              </Button>
            )}
          </Dropdown>
        </div>

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

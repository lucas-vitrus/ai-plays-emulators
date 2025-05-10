// frontend/src/environments/N64Emulator.tsx
// This file defines a React component that embeds and controls an N64 emulator.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { message, Button, Space, Alert } from "antd";
import { UploadOutlined, RedoOutlined } from "@ant-design/icons";

declare global {
  interface Window {
    Module: any;
    FS: any;
    InputController: any;
    saveAs?: (blob: Blob, filename: string) => void;
    myApp: any; // To satisfy original script.js global expectations if any part still relies on it during transition
  }
}

// Define a type for the status bar props
interface StatusBarProps {
  statusText: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ statusText }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-2 text-center text-sm">
      {statusText}
    </div>
  );
};

const N64Emulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorInstanceRef = useRef<EmulatorController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [beforeEmulatorStarted, setBeforeEmulatorStarted] = useState(true);
  const [moduleInitializing, setModuleInitializing] = useState(true);
  const [isLoadingRom, setIsLoadingRom] = useState(false);
  const [lblError, setLblError] = useState<string>("");

  // Emulator Settings State
  const [showFPS, setShowFPS] = useState(true);
  const [swapSticks, setSwapSticks] = useState(false);
  const [disableAudioSync, setDisableAudioSync] = useState(true); // Default from script.js, core might expect flag
  const [invert2P, setInvert2P] = useState(false);
  const [invert3P, setInvert3P] = useState(false);
  const [invert4P, setInvert4P] = useState(false);
  const [mobileModeSetting, setMobileModeSetting] = useState(false); // Separate from actual mobile mode detection for config
  const [videoPlugin, setVideoPlugin] = useState<'glide' | 'rice' | 'angry'>('glide');
  const [mouseMode, setMouseMode] = useState(false);
  const [useVBO, setUseVBO] = useState(false);
  // Add eepData, sraData, flaData states if/when their upload is implemented. For now, they are implicitly null.
  // const [eepData, setEepData] = useState<Uint8Array | null>(null);
  // const [sraData, setSraData] = useState<Uint8Array | null>(null);
  // const [flaData, setFlaData] = useState<Uint8Array | null>(null);

  // EmulatorController class definition
  // Defined inside N64Emulator to capture state setters (setModuleInitializing, etc.)
  class EmulatorController {
    public rom_name: string = "";
    public inputControllerInstance: any = null;

    public initModule = () => {
      console.log("EmulatorController: module initialized");
      setModuleInitializing(false);
    };

    public processPrintStatement = (text: string) => {
      console.log("EmuPrint:", text);
      if (
        text.includes(
          "mupen64plus: Starting R4300 emulator: Cached Interpreter"
        )
      ) {
        console.log("detected emulator started");
        // Handle post-boot actions
      }
      if (text.includes("writing game.savememory")) {
        setTimeout(() => {
          this.SaveSram();
        }, 100);
      }
    };

    private downloadFile = async (url: string): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        const oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        oReq.responseType = "arraybuffer";
        oReq.onload = () => {
          if (oReq.status === 200) {
            resolve(new Uint8Array(oReq.response));
          } else {
            reject(new Error(`Failed to download ${url}: ${oReq.statusText}`));
          }
        };
        oReq.onerror = () =>
          reject(new Error(`Network error while downloading ${url}`));
        oReq.send();
      });
    };

    private writeAssets = async () => {
      try {
        const assetUrl = "/n64/assets.zip";
        console.log(`Downloading ${assetUrl}`);
        const responseData = await this.downloadFile(assetUrl);
        console.log(`${assetUrl} downloaded, size: ${responseData.length}`);
        window.FS.writeFile("assets.zip", responseData);
        console.log("assets.zip written to Emscripten FS");
      } catch (error) {
        console.error("Error writing assets:", error);
        setLblError(
          `Error writing assets: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    public WriteConfigFile = () => {
      // Base controller mappings (simplified for now, script.js has more complex setup)
      const joypadDefaults = [
        "AnalogDeadzone=0,0", // Example, these would come from InputController state ideally
        "AnalogPeak=32767,32767",
        "Joy Mapping Stop=*",
        "Joy Mapping Save State=*",
        "Joy Mapping Load State=*",
        "Joy Mapping Screenshot=*",
        // Placeholder for actual button mappings from script.js equivalent
        // These would ideally come from an InputController instance similar to script.js
        "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0" // Simplified Joypad
      ];
      const keyboardDefaults = [
        // Placeholder for actual keyboard mappings from script.js equivalent
        "76", "75", "80", "72", "13", "87", "83", "65", "68", "88", "67", "90", "86", "66", "27", "38", "40", "37", "39" // Simplified Keyboard
      ];

      let configString = joypadDefaults.join("\r\n") + "\r\n";
      configString += keyboardDefaults.join("\r\n") + "\r\n";
      
      // Save file flags (remains "0" until EEP/SRA/FLA upload is implemented)
      configString += "0\r\n"; // eepData null
      configString += "0\r\n"; // sraData null
      configString += "0\r\n"; // flaData null

      // Settings from React state
      configString += (showFPS ? "1" : "0") + "\r\n";
      configString += (swapSticks ? "1" : "0") + "\r\n";
      configString += (disableAudioSync ? "1" : "0") + "\r\n";
      configString += (invert2P ? "1" : "0") + "\r\n";
      configString += (invert3P ? "1" : "0") + "\r\n";
      configString += (invert4P ? "1" : "0") + "\r\n";
      configString += (mobileModeSetting ? "1" : "0") + "\r\n"; // Use the specific state for config

      // Video plugin settings
      configString += (videoPlugin === 'angry' ? "1" : "0") + "\r\n"; // forceAngry
      configString += (mouseMode ? "1" : "0") + "\r\n";
      configString += (useVBO ? "1" : "0") + "\r\n"; // script.js also checks iosMode here, simplified for now
      configString += (videoPlugin === 'rice' ? "1" : "0") + "\r\n"; // ricePlugin
      
      console.log("Writing config.txt with settings:", configString);
      window.FS.writeFile("config.txt", configString);
    };

    public LoadEmulator = async (
      byteArray: Uint8Array,
      romNameFull: string
    ) => {
      if (moduleInitializing && !window.Module?.calledRun) {
        message.error("Emulator module not yet initialized.");
        return;
      }
      setIsLoadingRom(true);
      setBeforeEmulatorStarted(false);
      setLblError("");
      this.rom_name = romNameFull.includes("/")
        ? romNameFull.substring(romNameFull.lastIndexOf("/") + 1)
        : romNameFull;
      console.log(`Loading emulator for ROM: ${this.rom_name}`);

      try {
        if (this.rom_name.toLowerCase().endsWith(".zip")) {
          setLblError("Zip format not supported. Please uncompress first.");
          setIsLoadingRom(false);
          setBeforeEmulatorStarted(true);
          return;
        }
        await this.writeAssets();
        window.FS.writeFile("custom.v64", byteArray);
        console.log("custom.v64 written to Emscripten FS");
        this.WriteConfigFile();
        // await this.LoadSram(); // TODO: Implement LoadSram
        console.log("Calling Module.callMain...");
        window.Module.callMain(["custom.v64"]);
        this.configureEmulatorPostLoad();
      } catch (error) {
        console.error("Error in LoadEmulator:", error);
        setLblError(
          `Error loading emulator: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setBeforeEmulatorStarted(true);
      } finally {
        setIsLoadingRom(false);
      }
    };

    private configureEmulatorPostLoad = () => {
      console.log("Emulator configured (post-load).");
      // Resize canvas, setup mobile mode, etc.
    };

    public loadRomByUrl = async (url: string) => {
      if (!url) {
        message.error("No ROM selected.");
        return;
      }
      setLblError("");
      setIsLoadingRom(true);
      console.log(`Attempting to load ROM from URL: ${url}`);
      try {
        const romData = await this.downloadFile(url);
        await this.LoadEmulator(romData, url);
      } catch (error) {
        console.error(`Error loading ROM from URL ${url}:`, error);
        setLblError(
          `Failed to load ROM: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setIsLoadingRom(false);
        setBeforeEmulatorStarted(true);
      }
    };

    public uploadRom = async (file: File) => {
      setLblError("");
      setIsLoadingRom(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result) {
          const byteArray = new Uint8Array(e.target.result as ArrayBuffer);
          await this.LoadEmulator(byteArray, file.name);
        }
      };
      reader.onerror = (e) => {
        console.error("FileReader error:", e);
        setLblError("Error reading ROM file.");
        setIsLoadingRom(false);
        setBeforeEmulatorStarted(true);
      };
      reader.readAsArrayBuffer(file);
    };

    public SaveSram = () => {
      console.log("SaveSram called - placeholder"); /* Port logic */
    };
    public retrieveSettings = () => {
      console.log("retrieveSettings called - placeholder"); /* Port logic */
    };
    public newRom = () => {
      // Instead of reload, reset state to allow choosing a new ROM
      setBeforeEmulatorStarted(true);
      setLblError("");
      this.rom_name = ""; // Clear current ROM name
      // Potentially more cleanup, like telling the emulator to shut down if possible
      if (window.Module && typeof window.Module.exit === "function") {
        // window.Module.exit(); // This might be too aggressive or break re-entry. Test thoroughly.
      }
      message.info("Select a new ROM.");
    };
  }

  useEffect(() => {
    // Instantiate EmulatorController and store in ref.
    // This must happen before window.Module is configured if its callbacks use the controller.
    if (!emulatorInstanceRef.current) {
      emulatorInstanceRef.current = new EmulatorController();
    }

    if (!canvasRef.current) {
      console.error("Canvas ref is not available during initial setup.");
      setLblError(
        "Initialization Error: Canvas element not found. Please refresh."
      );
      setModuleInitializing(false);
      return;
    }

    window.Module = {
      canvas: canvasRef.current,
      onRuntimeInitialized: () => {
        console.log("N64 Emscripten Runtime Initialized!");
        emulatorInstanceRef.current?.initModule();
      },
      print: (text: string) =>
        emulatorInstanceRef.current?.processPrintStatement(text),
      printErr: (text: string) => {
        console.error("EmuErr:", text);
        emulatorInstanceRef.current?.processPrintStatement(`ERR: ${text}`);
        // Optionally, update lblError for critical emulator errors shown to the user
        // setLblError(`Emulator Core Error: ${text}`);
      },
    };

    const mainEmuScriptUrl = "/n64/n64wasm.js"; //  USER: REPLACE THIS WITH YOUR ACTUAL MAIN EMULATOR JS FILE

    const loadScript = (
      src: string,
      onLoad: () => void,
      onError: () => void
    ) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = onLoad;
      script.onerror = onError;
      document.body.appendChild(script);
      return script;
    };

    const emuScript = loadScript(
      mainEmuScriptUrl,
      () => {
        console.log("Main emulator script loaded.");
      },
      () => {
        console.error("Error loading main emulator script:");
        setLblError(
          "Failed to load the emulator engine. Please refresh the page or check the console."
        );
        setModuleInitializing(false); // Ensure loading state is cleared
      }
    );

    return () => {
      // Cleanup script tags if they were added
      // This is simplified; more robust cleanup might be needed
      try {
        if (emuScript && emuScript.parentNode)
          emuScript.parentNode.removeChild(emuScript);
        // Consider calling a cleanup method on emulatorInstanceRef.current if it exists
        // For example, to ensure audio contexts are released if not handled by newRom
        // emulatorInstanceRef.current?.newRom(); // Or a more specific cleanup
      } catch (e) {
        console.warn("Error during script cleanup:", e);
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && emulatorInstanceRef.current) {
      emulatorInstanceRef.current.uploadRom(file);
    }
    if (event.target) {
      event.target.value = ""; // Reset input to allow re-uploading the same file
    }
  };

  const handleNewRomClick = () => {
    emulatorInstanceRef.current?.newRom();
  };

  const getEmulatorStatusText = useCallback((): string => {
    if (moduleInitializing) return "Emulator Initializing...";
    if (isLoadingRom) return "Loading ROM...";
    if (lblError && !beforeEmulatorStarted) return `Error: ${lblError}`; // Show error in status if game tried to load
    if (beforeEmulatorStarted) return "Ready. Select a ROM to start.";
    if (emulatorInstanceRef.current?.rom_name) {
      return `Running: ${emulatorInstanceRef.current.rom_name}`;
    }
    return "Emulator Active";
  }, [moduleInitializing, isLoadingRom, beforeEmulatorStarted, lblError]);

  return (
    <div className="flex flex-col h-full">
      {/* Control Panel */}
      <div className="p-2">
        <Space>
          {!moduleInitializing && beforeEmulatorStarted && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleUploadClick}
              disabled={isLoadingRom || moduleInitializing}
              loading={isLoadingRom}
            >
              Upload ROM
            </Button>
          )}
          {!moduleInitializing && !beforeEmulatorStarted && (
            <Button
              icon={<RedoOutlined />}
              onClick={handleNewRomClick}
              disabled={isLoadingRom || moduleInitializing}
            >
              Load New ROM
            </Button>
          )}
        </Space>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelected}
          accept=".v64,.z64,.n64,.rom" // Common N64 ROM extensions
        />
      </div>

      {/* Error Display Area */}
      {lblError &&
        beforeEmulatorStarted && ( // Show prominent error if it happens before ROM load attempt
          <div className="m-4">
            <Alert
              message="Error"
              description={lblError}
              type="error"
              showIcon
              closable
              onClose={() => setLblError("")}
            />
          </div>
        )}

      {/* Canvas Container */}
      <div
        id="n64-canvas-container"
        className="flex-grow w-full flex items-center justify-center p-1 overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          id="canvas"
          className="border-2 rounded-sm shadow-2xl"
          width={800}
          height={600}
        >
          Your browser does not support the HTML5 canvas tag.
        </canvas>
      </div>

      {/* Status Bar */}
      <StatusBar statusText={getEmulatorStatusText()} />
    </div>
  );
};

export default N64Emulator;

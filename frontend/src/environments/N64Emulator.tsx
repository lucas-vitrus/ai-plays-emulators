// N64Emulator.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";

// --- Constants and Globals ---
const AUDIOBUFFSIZE = 2048;
// Since we found the actual assets.zip file in public/n64, let's not use base64
// Instead we'll dynamically load it when needed
const ASSETS_ZIP_BASE64 = ""; // This placeholder will be ignored as we'll fetch the file directly
const STRING_SELECTGAME = "Select Game ROM (N64)";
const STRING_FULLSCREEN = "Toggle Fullscreen";
const STRING_SOUND = "Toggle Sound";
const STRING_SAVESTATE = "Save State";
const STRING_LOADSTATE = "Load State";
const STRING_RELOAD = "Reload Game";
const STRING_ERROR_TITLE = "Error";
const STRING_ERROR_MESSAGE =
  "Invalid file format. Please select a .n64, .v64, or .z64 ROM file.";
const STRING_ERROR_STATE_MESSAGE =
  "Invalid file format. Please select a .state file.";
const STRING_ERROR_OK = "OK";

// Paths to check for Nintendo64.js
const EMULATOR_PATHS = [
  "/Nintendo64.js",           // Root of public - this is the correct one
  "/n64/Nintendo64.js",       // In n64 subfolder
  "./Nintendo64.js",          // Relative
  "../Nintendo64.js",         // Parent
  "Nintendo64.js",            // No leading slash
  "/public/Nintendo64.js",    // Public folder explicit
  "/assets/Nintendo64.js",    // Assets folder
  "/static/Nintendo64.js",    // Static folder
  "/js/Nintendo64.js",        // JS folder
];

// Also check for the WASM file path
const WASM_PATHS = [
  "/n64wasm.wasm",           // Root
  "/n64/n64wasm.wasm",       // In n64 subfolder
  "./n64wasm.wasm",          // Relative
];

// --- Helper Functions ---
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to detect N64 emulator issues
function checkForCommonEmulationIssues(): string[] {
  const issues: string[] = [];
  
  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    issues.push("WebAssembly is not supported in your browser. The N64 emulator requires WebAssembly support.");
  }
  
  // Check for Audio API support
  if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
    issues.push("Web Audio API is not supported in your browser. Sound may not work properly.");
  }
  
  // Check for MIME types being properly configured
  fetch('/n64/n64wasm.wasm', { method: 'HEAD' })
    .then(response => {
      const contentType = response.headers.get('Content-Type');
      if (contentType && !contentType.includes('application/wasm')) {
        issues.push(`WASM file is served with incorrect MIME type: ${contentType}. Should be 'application/wasm'.`);
      }
    })
    .catch(() => {
      // We'll catch this elsewhere when loading the file
    });
    
  return issues;
}

// --- Emscripten Module/FS Types ---
interface EmscriptenModule {
  canvas: HTMLCanvasElement | null;
  FS: any;
  HEAP16: Int16Array;
  _neil_serialize: () => void;
  _neil_unserialize: () => void;
  _neil_reset: () => void;
  callMain: (args: string[]) => void;
  cwrap: (
    ident: string,
    returnType: string | null,
    argTypes: string[]
  ) => (...args: any[]) => any;
  _neilGetSoundBufferResampledAddress: () => number;
  _neilGetAudioWritePosition: () => number;
  _runMainLoop: () => void;
}

declare global {
  interface Window {
    Module: EmscriptenModule;
    FS: any;
    myApp: MyN64Class;
  }
}

// --- MyN64Class (Adapted from original.html) ---
class MyN64Class {
  private canvas: HTMLCanvasElement;
  private Module: EmscriptenModule;
  private FS: any;
  private getGameSoundEnabled: () => boolean;
  private getIsEmulatorRunning: () => boolean;
  private getRomName: () => string | null;
  private setRomNameCallback: (name: string | null) => void;

  private audioContext?: AudioContext;
  private gainNode?: GainNode;
  private pcmPlayer?: ScriptProcessorNode;
  private audioBufferResampled?: Int16Array;
  private audioWritePosition: number = 0;
  private audioReadPosition: number = 0;
  private audioThreadLock: boolean = false;
  private setRemainingAudio?: (remaining: number) => void;

  constructor(
    canvasElement: HTMLCanvasElement,
    module: EmscriptenModule, // Module is now passed in
    fs: any, // FS is now passed in
    getGameSoundEnabled: () => boolean,
    getIsEmulatorRunning: () => boolean,
    getRomName: () => string | null,
    setRomNameCallback: (name: string | null) => void
  ) {
    this.canvas = canvasElement;
    this.Module = module;
    this.FS = fs;
    this.getGameSoundEnabled = getGameSoundEnabled;
    this.getIsEmulatorRunning = getIsEmulatorRunning;
    this.getRomName = getRomName;
    this.setRomNameCallback = setRomNameCallback;

    // The Module object itself (window.Module) will be prepared in the useEffect hook
    // before this class is instantiated.
    // this.Module["canvas"] is not needed here as canvas is passed directly to Emscripten via window.Module.canvas

    (window as any)["myApp"] = this; // For Emscripten to call SaveStateEvent
  }

  public LoadEmulator(byteArray: ArrayBuffer, romName: string): void {
    try {
      this.setRomNameCallback(romName);

      this.FS.writeFile(
        "assets.zip",
        new Uint8Array(base64ToArrayBuffer(ASSETS_ZIP_BASE64))
      );
      this.FS.writeFile("custom.v64", new Uint8Array(byteArray));

      if (/star.*wars.*racer.*n64/gi.test(romName)) {
        this.canvas.className = "game_star_wars_racer";
      } else {
        this.canvas.className = "";
      }

      let configString = "";
      // Gamepad (all 0s as per original.html)
      for (let i = 0; i < 14; i++) configString += "0" + "\r\n";
      // Keyboard
      configString += "f" + "\r\n"; // Mapping_Left
      configString += "h" + "\r\n"; // Mapping_Right
      configString += "t" + "\r\n"; // Mapping_Up
      configString += "g" + "\r\n"; // Mapping_Down
      configString += "Enter" + "\r\n"; // Mapping_Action_Start
      configString += "i" + "\r\n"; // Mapping_Action_CUP
      configString += "k" + "\r\n"; // Mapping_Action_CDOWN
      configString += "j" + "\r\n"; // Mapping_Action_CLEFT
      configString += "l" + "\r\n"; // Mapping_Action_CRIGHT
      configString += "a" + "\r\n"; // Mapping_Action_Z
      configString += "q" + "\r\n"; // Mapping_Action_L
      configString += "w" + "\r\n"; // Mapping_Action_R
      configString += "s" + "\r\n"; // Mapping_Action_B
      configString += "d" + "\r\n"; // Mapping_Action_A
      configString += "`" + "\r\n"; // Mapping_Menu
      configString += "ArrowUp" + "\r\n"; // Mapping_Action_Analog_Up
      configString += "ArrowDown" + "\r\n"; // Mapping_Action_Analog_Down
      configString += "ArrowLeft" + "\r\n"; // Mapping_Action_Analog_Left
      configString += "ArrowRight" + "\r\n"; // Mapping_Action_Analog_Right
      // Other settings (as per original.html structure)
      for (let i = 0; i < 15; i++) configString += "0" + "\r\n"; // Covers Load Save, Show FPS, etc.

      this.FS.writeFile("config.txt", configString);

      this.initAudio();
      this.Module.callMain(["custom.v64"]);
      this.setRemainingAudio = this.Module.cwrap(
        "neil_set_buffer_remaining",
        null,
        ["number"]
      );
    } catch (err) {
      console.error("Error loading emulator:", err);
      alert("Error loading emulator. See console for details.");
    }
  }

  private initAudio(): void {
    if (!this.Module || !this.Module.HEAP16) {
      console.error("Module or HEAP16 not initialized for audio");
      return;
    }
    this.audioContext = new AudioContext({
      latencyHint: "interactive",
      sampleRate: 44100,
    });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.getGameSoundEnabled() ? 0.5 : 0;
    this.gainNode.connect(this.audioContext.destination);

    const audioBufferPtr = this.Module._neilGetSoundBufferResampledAddress();
    // original.html used 64000 (bytes), so 32000 Int16 samples.
    // HEAP16.buffer is the underlying ArrayBuffer. audioBufferPtr is byte offset.
    this.audioBufferResampled = new Int16Array(
      this.Module.HEAP16.buffer,
      audioBufferPtr,
      64000 / 2
    );

    this.audioWritePosition = 0;
    this.audioReadPosition = 0;
    this.audioThreadLock = false;

    this.pcmPlayer = this.audioContext.createScriptProcessor(
      AUDIOBUFFSIZE,
      2,
      2
    );
    this.pcmPlayer.onaudioprocess = this.AudioProcessRecurring.bind(this);
    this.pcmPlayer.connect(this.gainNode);
  }

  public updateGain(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  private hasEnoughSamples(): boolean {
    if (!this.audioBufferResampled) return false;
    let readPositionTemp = this.audioReadPosition;
    let enoughSamples = true;
    for (let sample = 0; sample < AUDIOBUFFSIZE; sample++) {
      if (this.audioWritePosition !== readPositionTemp) {
        // In original.html, increment was by 2 for Int16 samples from byte buffer
        readPositionTemp =
          (readPositionTemp + 2) % this.audioBufferResampled.length;
      } else {
        enoughSamples = false;
        break;
      }
    }
    return enoughSamples;
  }

  private AudioProcessRecurring(
    audioProcessingEvent: AudioProcessingEvent
  ): void {
    if (this.audioThreadLock) return;
    if (!this.getIsEmulatorRunning()) return;
    if (!this.audioBufferResampled || !this.setRemainingAudio || !this.Module)
      return;

    this.audioThreadLock = true;

    const outputBuffer = audioProcessingEvent.outputBuffer;
    const outputDataL = outputBuffer.getChannelData(0);
    const outputDataR = outputBuffer.getChannelData(1);

    this.Module._runMainLoop();
    // original.html divides by 2 for Int16 offset from byte offset
    this.audioWritePosition = this.Module._neilGetAudioWritePosition() / 2;

    if (!this.hasEnoughSamples()) {
      this.Module._runMainLoop();
      this.audioWritePosition = this.Module._neilGetAudioWritePosition() / 2;
    }

    const soundEnabled = this.getGameSoundEnabled();

    for (let i = 0; i < AUDIOBUFFSIZE; i++) {
      if (this.audioWritePosition !== this.audioReadPosition) {
        if (soundEnabled) {
          outputDataL[i] =
            this.audioBufferResampled[this.audioReadPosition] / 32768.0;
          outputDataR[i] =
            this.audioBufferResampled[this.audioReadPosition + 1] / 32768.0;
        } else {
          outputDataL[i] = 0;
          outputDataR[i] = 0;
        }
        this.audioReadPosition =
          (this.audioReadPosition + 2) % this.audioBufferResampled.length;
      } else {
        outputDataL[i] = 0;
        outputDataR[i] = 0;
      }
    }

    let audioBufferRemainingInSamples = 0;
    if (this.audioWritePosition >= this.audioReadPosition) {
      audioBufferRemainingInSamples =
        this.audioWritePosition - this.audioReadPosition;
    } else {
      audioBufferRemainingInSamples =
        this.audioBufferResampled.length -
        this.audioReadPosition +
        this.audioWritePosition;
    }

    this.setRemainingAudio(audioBufferRemainingInSamples * 2); // Convert Int16 sample count back to byte count

    this.audioThreadLock = false;
  }

  public SaveStateEvent(): void {
    // Called by Emscripten
    try {
      if (!this.FS || !this.getRomName) return;
      const compressed: Uint8Array = this.FS.readFile("/savestate.gz", {
        encoding: "binary",
      });
      const currentRomName = this.getRomName();
      if (!currentRomName) return;

      const fileName = currentRomName.replace(/\.[^/.]+$/, "") + ".state";
      this.download_Blob(compressed, fileName, "application/octet-stream");

      const request = indexedDB.open("N64WASMDB", 1);
      request.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("N64WASMSTATES")) {
          db.createObjectStore("N64WASMSTATES");
        }
      };
      request.onsuccess = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        const transaction = db.transaction("N64WASMSTATES", "readwrite");
        const romStore = transaction.objectStore("N64WASMSTATES");
        romStore.put(compressed, "custom.v64.state"); // Or use currentRomName for multiple slots
      };
      request.onerror = (ev) => {
        console.error(
          "IndexedDB error:",
          (ev.target as IDBOpenDBRequest).error
        );
      };
    } catch (err) {
      console.error("Error in SaveStateEvent:", err);
    }
  }

  private download_Blob(
    data: Uint8Array,
    fileName: string,
    mimeType: string
  ): void {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    this.download_URL(url, fileName);
    setTimeout(() => window.URL.revokeObjectURL(url), 100); // Delay revoke slightly
  }

  private download_URL(dataUrl: string, fileName: string): void {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.style.display = "none";
    a.click();
    a.remove();
  }
}

// --- React Component ---
const N64Emulator: React.FC = () => {
  const [isEmulatorScriptLoaded, setIsEmulatorScriptLoaded] = useState(false);
  const [isGuiVisible, setIsGuiVisible] = useState(true);
  const [gameSoundEnabled, setGameSoundEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem("GAME_SOUND_ENABLED");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [romName, setRomName] = useState<string | null>(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [scriptError, setScriptError] = useState<string | null>(null);
  // Added state to track script loading status
  const [scriptLoadingState, setScriptLoadingState] = useState<{
    loaded: boolean;
    error: boolean;
    path?: string;
  }>({ loaded: false, error: false });
  // Add state for emulation issues
  const [emulationIssues, setEmulationIssues] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const romFileInputRef = useRef<HTMLInputElement>(null);
  const stateFileInputRef = useRef<HTMLInputElement>(null);
  const myN64ClassInstanceRef = useRef<MyN64Class | null>(null);
  const isEmulatorRunningRef = useRef<boolean>(true);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getGameSoundEnabled = useCallback(
    () => gameSoundEnabled,
    [gameSoundEnabled]
  );
  const getIsEmulatorRunning = useCallback(
    () => isEmulatorRunningRef.current,
    []
  );
  const getRomNameCallback = useCallback(() => romName, [romName]);

  // Check for common emulation issues
  useEffect(() => {
    const issues = checkForCommonEmulationIssues();
    if (issues.length > 0) {
      console.warn("Emulation issues detected:", issues);
      setEmulationIssues(issues);
    }
  }, []);

  // 1. First useEffect: Try loading Nintendo64.js from various paths
  useEffect(() => {
    if (!canvasRef.current) {
      console.error("Canvas reference not available for script loading");
      return;
    }

    console.log("Starting search for Nintendo64.js...");
    
    // Track all attempted paths for debugging
    const attemptedPaths: string[] = [];
    
    // Also check for WASM availability to proactively prevent issues
    Promise.all(
      WASM_PATHS.map(path => 
        fetch(path, { method: 'HEAD' })
          .then(response => ({ path, status: response.status }))
          .catch(() => ({ path, status: 0 }))
      )
    ).then(results => {
      const foundWasm = results.find(r => r.status === 200);
      if (foundWasm) {
        console.log(`Found WASM file at: ${foundWasm.path}`);
        
        // If using n64 subfolder for WASM, we might want to prioritize the same folder for JS
        if (foundWasm.path.includes('/n64/')) {
          // Move the n64 subfolder path to the top of the list if WASM was found there
          const n64JsPath = "/n64/Nintendo64.js";
          const index = EMULATOR_PATHS.indexOf(n64JsPath);
          if (index > 0) {
            EMULATOR_PATHS.splice(index, 1);
            EMULATOR_PATHS.unshift(n64JsPath);
          }
        }
      } else {
        console.warn("WASM file not found in any of the checked paths");
        setEmulationIssues(prev => [...prev, "WASM file not found. The emulator won't work without it."]);
      }
    });

    // Function to check if a file exists at a given URL
    const checkFileExists = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      } catch (error) {
        console.warn(`Failed to check ${url}:`, error);
        return false;
      }
    };

    // Function to actually load the script
    const loadScript = (scriptPath: string) => {
      console.log(`Loading Nintendo64.js from: ${scriptPath}`);
      
      // Prepare the Module object before loading the script
      (window as any).Module = {
        canvas: canvasRef.current,
        preRun: [(window as any).Module?.preRun || []].flat(),
        onRuntimeInitialized: function () {
          console.log("Module runtime initialized!");
        },
        print: function (text: string) {
          console.log("Module stdout:", text);
        },
        printErr: function (text: string) {
          console.warn("Module stderr:", text);
        },
        // Try to explicitly set the locateFile function to help find WASM
        locateFile: function(path: string, scriptDirectory: string) {
          if (path.endsWith('.wasm')) {
            // Check if we found a WASM path above
            for (const wasmPath of WASM_PATHS) {
              if (wasmPath.includes('/n64/')) {
                return wasmPath;
              }
            }
            
            // If the JS file is in the /n64/ directory, look for WASM there too
            if (scriptPath.includes('/n64/')) {
              return '/n64/n64wasm.wasm';
            }
          }
          return scriptDirectory + path;
        }
      };

      // Create and add the script element
      const script = document.createElement("script");
      script.src = scriptPath;
      script.async = true;
      script.id = "n64-emulator-script";

      // Remove any existing script (for hot reloading)
      const existingScript = document.getElementById("n64-emulator-script");
      if (existingScript) {
        console.log("Removing existing N64 script");
        existingScript.parentNode?.removeChild(existingScript);
      }

      script.onload = () => {
        console.log(`Successfully loaded script from ${scriptPath}`);
        setScriptLoadingState({ loaded: true, error: false, path: scriptPath });
      };

      script.onerror = (err) => {
        console.error(`Failed to load script from ${scriptPath}:`, err);
        attemptedPaths.push(scriptPath);
        
        // Try next path if available
        tryNextPath();
      };

      document.body.appendChild(script);
    };

    // Try each path in sequence until one works
    let pathIndex = 0;
    
    const tryNextPath = async () => {
      if (pathIndex >= EMULATOR_PATHS.length) {
        // We've tried all paths and none worked
        console.error("Failed to load Nintendo64.js from any path:", attemptedPaths);
        setScriptError(
          `Could not find Nintendo64.js. Please ensure the file exists in one of these locations: ${EMULATOR_PATHS.join(", ")}`
        );
        setScriptLoadingState({ loaded: false, error: true });
        return;
      }

      const currentPath = EMULATOR_PATHS[pathIndex++];
      console.log(`Checking path ${pathIndex}/${EMULATOR_PATHS.length}: ${currentPath}`);
      
      const exists = await checkFileExists(currentPath);
      if (exists) {
        console.log(`Found Nintendo64.js at: ${currentPath}`);
        loadScript(currentPath);
      } else {
        console.log(`Nintendo64.js not found at: ${currentPath}`);
        attemptedPaths.push(currentPath);
        tryNextPath();
      }
    };

    // Start the search
    tryNextPath();

    return () => {
      // Cleanup script element on unmount
      const scriptElem = document.getElementById("n64-emulator-script");
      if (scriptElem && scriptElem.parentNode) {
        console.log("Removing Nintendo64.js script from document");
        scriptElem.parentNode.removeChild(scriptElem);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // 2. Second useEffect: Handle emulator initialization after script is loaded
  useEffect(() => {
    if (!scriptLoadingState.loaded || scriptLoadingState.error) {
      // Either not loaded yet or there was an error
      return;
    }

    console.log("Script loaded successfully, initializing emulator");

    // Debug output to check what's available
    console.log("Module properties:", Object.keys(window.Module || {}));
    console.log("Is window.FS defined?", !!window.FS);
    console.log(
      "Is window.Module.FS defined?",
      !!(window.Module && window.Module.FS)
    );

    // Debug if window.Module has essential Emscripten methods
    if (window.Module) {
      console.log("Module methods check:");
      console.log(
        "  - callMain:",
        typeof window.Module.callMain === "function"
          ? "✅ Present"
          : "❌ Missing"
      );
      console.log(
        "  - cwrap:",
        typeof window.Module.cwrap === "function" ? "✅ Present" : "❌ Missing"
      );
      console.log(
        "  - _runMainLoop:",
        typeof window.Module._runMainLoop === "function"
          ? "✅ Present"
          : "❌ Missing"
      );
    }

    const moduleCheckTimeout = setTimeout(() => {
      console.error("Timed out waiting for Module to be fully initialized");
      console.log("Final window.Module state:", window.Module);
      // Check for WASM issues specifically
      const networkRequests = performance.getEntriesByType("resource");
      const wasmRequests = networkRequests.filter(
        (req) => req.name.includes(".wasm") || req.name.includes("Nintendo64")
      );
      console.log("WASM-related network requests:", wasmRequests);

      setScriptError(
        "Timed out waiting for emulator to initialize. The WASM file may not be loading correctly due to MIME type issues."
      );
      setIsEmulatorScriptLoaded(false);
    }, 10000); // 10 second timeout

    const checkModuleReady = setInterval(() => {
      // Log progress to help debug
      console.log("Checking if Module is ready...");
      console.log("Module properties now:", Object.keys(window.Module || {}));

      // Less strict check that doesn't require callMain
      if (window.Module && window.Module.FS && canvasRef.current) {
        clearInterval(checkModuleReady);
        clearTimeout(moduleCheckTimeout);
        console.log("Emscripten Module appears ready!");

        // Ensure FS is also available on window if MyN64Class expects window.FS
        if (!window.FS) {
          console.log("Setting window.FS from Module.FS");
          (window as any).FS = window.Module.FS;
        }

        // Create our controller class
        console.log("Creating MyN64Class instance");
        try {
          myN64ClassInstanceRef.current = new MyN64Class(
            canvasRef.current,
            window.Module,
            window.Module.FS,
            getGameSoundEnabled,
            getIsEmulatorRunning,
            getRomNameCallback,
            setRomName
          );
          console.log("MyN64Class instance created successfully");
          setIsEmulatorScriptLoaded(true);
        } catch (err) {
          console.error("Error creating MyN64Class:", err);
          setScriptError(`Error initializing N64 emulator: ${err}`);
          setIsEmulatorScriptLoaded(false);
        }
      } else {
        // Report what's missing
        if (!window.Module) console.log("window.Module not defined yet");
        else if (!window.Module.FS)
          console.log("window.Module.FS not defined yet");
        else if (!canvasRef.current) console.log("canvas not available");
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(checkModuleReady);
      clearTimeout(moduleCheckTimeout);
      if (
        window.myApp &&
        myN64ClassInstanceRef.current &&
        window.myApp === myN64ClassInstanceRef.current
      ) {
        console.log("Cleaning up window.myApp reference");
        delete (window as any).myApp;
      }
    };
  }, [
    scriptLoadingState.loaded,
    scriptLoadingState.error,
    getGameSoundEnabled,
    getIsEmulatorRunning,
    getRomNameCallback,
  ]);

  useEffect(() => {
    localStorage.setItem(
      "GAME_SOUND_ENABLED",
      JSON.stringify(gameSoundEnabled)
    );
    myN64ClassInstanceRef.current?.updateGain(gameSoundEnabled ? 0.5 : 0);
  }, [gameSoundEnabled]);

  const resetControlsVisibilityTimer = useCallback(() => {
    if (isGuiVisible) {
      setAreControlsVisible(true);
      return;
    }
    setAreControlsVisible(true);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => {
      if (!isGuiVisible) setAreControlsVisible(false); // Check isGuiVisible again
    }, 3000);
  }, [isGuiVisible]);

  useEffect(() => {
    if (!isGuiVisible) {
      resetControlsVisibilityTimer();
      document.addEventListener("click", resetControlsVisibilityTimer);
      document.addEventListener("mousemove", resetControlsVisibilityTimer);
    }

    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      document.removeEventListener("click", resetControlsVisibilityTimer);
      document.removeEventListener("mousemove", resetControlsVisibilityTimer);
    };
  }, [isGuiVisible, resetControlsVisibilityTimer]);

  useEffect(() => {
    const handleBlur = () => {
      isEmulatorRunningRef.current = false;
      console.log("Emulator paused (blur)");
    };
    const handleFocus = () => {
      isEmulatorRunningRef.current = true;
      console.log("Emulator resumed (focus)");
    };
    const detectEmulatorKey = (e: KeyboardEvent) => {
      if (
        e.key === "`" ||
        e.code === "Backquote" ||
        e.keyCode === 192 ||
        e.keyCode === 0
      ) {
        console.log("Emulator menu key pressed (default: backtick)");
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("keydown", detectEmulatorKey);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("keydown", detectEmulatorKey);
    };
  }, []);

  const handleRomFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "n64" || extension === "v64" || extension === "z64") {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (e.target?.result && myN64ClassInstanceRef.current) {
            const romData = e.target.result as ArrayBuffer;
            console.log(`Loading ROM: ${file.name}`);
            myN64ClassInstanceRef.current.LoadEmulator(romData, file.name);
            setIsGuiVisible(false);
            resetControlsVisibilityTimer();
          } else {
            console.error("FileReader error or N64 class instance not ready.");
            alert("Error processing ROM file.");
          }
        };
        reader.onerror = (err) => {
          console.error("FileReader failed:", err);
          alert("Error reading ROM file.");
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert(`${STRING_ERROR_TITLE}: ${STRING_ERROR_MESSAGE}`);
      }
    } catch (err) {
      console.error("Error in handleRomFileChange:", err);
      alert("An unexpected error occurred while selecting the ROM.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const toggleSoundHandler = () => {
    setGameSoundEnabled((prev) => !prev);
  };

  const saveStateHandler = () => {
    try {
      if (window.Module && window.Module._neil_serialize) {
        window.Module._neil_serialize();
      } else {
        console.warn("Module or _neil_serialize not available for save state.");
        alert("Save state function is not ready.");
      }
    } catch (err) {
      console.error("Error saving state:", err);
      alert("Error saving state.");
    }
  };

  const loadStateHandler = () => {
    stateFileInputRef.current?.click();
  };

  const handleStateFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "state") {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (
            e.target?.result &&
            window.Module?.FS &&
            window.Module?._neil_unserialize
          ) {
            console.log(`Loading state file: ${file.name}`);
            window.Module.FS.writeFile(
              "/savestate.gz",
              new Uint8Array(e.target.result as ArrayBuffer)
            );
            window.Module._neil_unserialize();
          } else {
            console.warn(
              "Module, FS, or _neil_unserialize not available for load state."
            );
            alert(
              "Load state function is not ready or file could not be read."
            );
          }
        };
        reader.onerror = (err) => {
          console.error("FileReader for state file failed:", err);
          alert("Error reading state file.");
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert(`${STRING_ERROR_TITLE}: ${STRING_ERROR_STATE_MESSAGE}`);
      }
    } catch (err) {
      console.error("Error loading state file:", err);
      alert("An unexpected error occurred while selecting the state file.");
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const reloadGameHandler = () => {
    try {
      if (window.Module && window.Module._neil_reset) {
        console.log("Reloading game...");
        window.Module._neil_reset();
      } else {
        console.warn("Module or _neil_reset not available for reload game.");
        alert("Reload game function is not ready.");
      }
    } catch (err) {
      console.error("Error reloading game:", err);
      alert("Error reloading game.");
    }
  };

  const fullscreenHandler = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        const emuContainer = document.querySelector(".n64-emulator-container");
        if (emuContainer && "requestFullscreen" in emuContainer) {
          emuContainer.requestFullscreen();
        } else if (
          canvasRef.current &&
          "requestFullscreen" in canvasRef.current
        ) {
          canvasRef.current.requestFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  // Additional loading state when script loads but before module is fully initialized
  if (scriptLoadingState.loaded && !isEmulatorScriptLoaded) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div>Script loaded. Waiting for Emulator Module to initialize...</div>
        <div style={{ margin: "10px", fontSize: "12px", color: "#666" }}>
          This may take several seconds. If it takes too long, check console for
          WASM errors.
        </div>
      </div>
    );
  }

  // Update the Error display to include emulation issues
  if (scriptError || emulationIssues.length > 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <h2>Emulator Error</h2>
        {scriptError && <p>{scriptError}</p>}
        
        {emulationIssues.length > 0 && (
          <>
            <h3>System Compatibility Issues</h3>
            <ul style={{ textAlign: "left", display: "inline-block" }}>
              {emulationIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </>
        )}
        
        <p>
          Please ensure <code>Nintendo64.js</code> and <code>n64wasm.wasm</code> are in the correct location
          (usually in the <code>public</code> or <code>public/n64</code> folder) and served with the correct MIME type.
        </p>
      </div>
    );
  }

  // Initial loading state
  if (!scriptLoadingState.loaded || !isEmulatorScriptLoaded) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading N64 Emulator Core...
      </div>
    );
  }

  // Main component UI
  return (
    <div className="n64-emulator-container tw-relative tw-w-full tw-h-screen tw-bg-gray-800 dark:tw-bg-black tw-flex tw-justify-center tw-items-center tw-overflow-hidden">
      <input
        type="file"
        ref={romFileInputRef}
        className="tw-hidden"
        accept=".n64,.v64,.z64"
        onChange={handleRomFileChange}
      />
      <input
        type="file"
        ref={stateFileInputRef}
        className="tw-hidden"
        accept=".state"
        onChange={handleStateFileChange}
      />

      {isGuiVisible && (
        <div className="gui_container tw-text-center tw-p-8 md:tw-p-12 tw-bg-gray-700 dark:tw-bg-gray-900 tw-rounded-lg tw-shadow-xl tw-text-white">
          <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-mb-6">
            Nintendo 64 Emulator
          </h1>
          <button
            className="tw-bg-blue-500 hover:tw-bg-blue-600 tw-text-white tw-font-bold tw-py-3 tw-px-6 tw-rounded-lg tw-text-lg tw-cursor-pointer focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-400 dark:focus:tw-ring-blue-600"
            title={STRING_SELECTGAME}
            onClick={() => romFileInputRef.current?.click()}
          >
            {STRING_SELECTGAME}
          </button>
          <p className="tw-mt-6 tw-text-sm tw-text-gray-300 dark:tw-text-gray-400">
            Performance may vary. Ensure <code>Nintendo64.js</code> and
            associated files are correctly configured.
          </p>
        </div>
      )}

      <canvas
        id="canvas" // Keep original ID if Nintendo64.js targets it.
        ref={canvasRef}
        className="tw-max-w-full tw-max-h-full tw-object-contain"
        style={{
          display: isGuiVisible ? "none" : "block",
          imageRendering: "pixelated", // For sharp pixels
          width: isGuiVisible ? 0 : "100%", // Ensure it takes space when visible
          height: isGuiVisible ? 0 : "100%",
        }}
      />

      {!isGuiVisible && areControlsVisible && (
        <div className="ingame-controls-overlay tw-absolute tw-bottom-5 tw-left-1/2 tw--translate-x-1/2 tw-flex tw-gap-2 tw-p-2 tw-bg-black tw-bg-opacity-50 dark:tw-bg-opacity-70 tw-rounded-lg tw-z-50">
          <button
            title={STRING_FULLSCREEN}
            onClick={fullscreenHandler}
            className="tw-p-2 tw-bg-gray-600 hover:tw-bg-gray-500 tw-text-white tw-rounded"
          >
            FS
          </button>
          <button
            title={STRING_SOUND}
            onClick={toggleSoundHandler}
            className="tw-p-2 tw-bg-gray-600 hover:tw-bg-gray-500 tw-text-white tw-rounded"
          >
            {gameSoundEnabled ? "🔊" : "🔇"}
          </button>
          <button
            title={STRING_SAVESTATE}
            onClick={saveStateHandler}
            className="tw-p-2 tw-bg-gray-600 hover:tw-bg-gray-500 tw-text-white tw-rounded"
          >
            Save
          </button>
          <button
            title={STRING_LOADSTATE}
            onClick={loadStateHandler}
            className="tw-p-2 tw-bg-gray-600 hover:tw-bg-gray-500 tw-text-white tw-rounded"
          >
            Load
          </button>
          <button
            title={STRING_RELOAD}
            onClick={reloadGameHandler}
            className="tw-p-2 tw-bg-gray-600 hover:tw-bg-gray-500 tw-text-white tw-rounded"
          >
            Reload
          </button>
        </div>
      )}
      <style>
        {`
        .game_star_wars_racer {
          /* Example custom style for a game */
          /* custom styles like negative margins if needed */
        }
      `}
      </style>
    </div>
  );
};

export default N64Emulator;

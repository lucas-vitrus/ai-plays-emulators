// frontend/src/environments/N64Emulator2.tsx
// This file implements a React-based Nintendo 64 emulator component.

import React, { useEffect, useRef, useState } from "react";
import { Button, Upload, message } from "antd";
import {
  UploadOutlined,
  FullscreenOutlined,
  SoundOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
// We'll need to manage the global NINTENDO64 object and other emulator-specific globals.
// It's good practice to declare them if they are expected to be in the global scope.
declare global {
  interface Window {
    NINTENDO64: any; // Replace 'any' with a more specific type if available
    HEAPU8: any; // Replace 'any' with a more specific type if available
    FS: { // Assuming FS is an object with methods like createDataFile
      createDataFile: (
        parent: string,
        name: string,
        data: Uint8Array,
        canRead: boolean,
        canWrite: boolean,
        canOwn?: boolean
      ) => void;
      [key: string]: any; // Other FS methods
    };
    // Add other expected globals like localforage if used directly
    localforage: any;
  }
}

// Placeholder for styles that might be complex for Tailwind or need data URLs
// For example, the base64 background images from the original HTML.
// We will address these more specifically later.
const styles = {
  container: {
    // Example: backgroundImage: 'url(data:image/png;base64,...)'
  },
  guiBackground: {
    // Styles for background images will be populated based on test.htm's CSS
    // For example: backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAz4AAAMBCAYAAAAu52Gg...")'
  },
  // Add other GUI elements if they use base64 images
  guiFullscreen: {},
  guiSoundOn: {},
  guiSoundOff: {},
  guiRom: {},
};

interface N64EmulatorProps {
  romUrl?: string;
  n64BaseUrl?: string; // Base URL for N64 assets like n64wasm.js and assets.zip
}

const N64Emulator2: React.FC<N64EmulatorProps> = ({ romUrl, n64BaseUrl = "/n64/" }) => {
  const [romLoaded, setRomLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGUI, setShowGUI] = useState(true); // Or false, depending on initial desired state

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load the N64 script (e.g., n64wasm.js)
    const script = document.createElement("script");
    script.src = `${n64BaseUrl}n64wasm.js`; // Load from /n64/ directory
    script.async = true;
    script.onload = async () => {
      console.log("n64wasm.js loaded");

      // Wait for FS to be available (common in Emscripten)
      const waitForFS = async () => {
        if (window.FS && window.FS.createDataFile) {
          // Preload assets.zip
          try {
            const response = await fetch(`${n64BaseUrl}assets.zip`);
            if (!response.ok) {
              throw new Error(`Failed to fetch assets.zip: ${response.statusText}`);
            }
            const assetsBuffer = await response.arrayBuffer();
            window.FS.createDataFile(
              "/", // Root directory in virtual FS
              "assets.zip",
              new Uint8Array(assetsBuffer),
              true, // canRead
              true, // canWrite
              true  // canOwn
            );
            console.log("assets.zip preloaded into virtual FS");
          } catch (error) {
            console.error("Error preloading assets.zip:", error);
            message.error("Failed to load emulator assets.zip.");
          }
        } else {
          console.log("FS not ready, retrying...");
          setTimeout(waitForFS, 100); // Retry after a short delay
        }
      };
      
      await waitForFS();

      // Initialize emulator if window.NINTENDO64 is now available
      if (window.NINTENDO64 && typeof window.NINTENDO64.init === 'function') {
        // The original test.htm might call an init function with the canvas
        // window.NINTENDO64.init(canvasRef.current);
        console.log("NINTENDO64 object is available.");
      } else {
        console.warn("NINTENDO64 object or init function not found after script load.");
      }
    };
    script.onerror = () => {
      message.error("Failed to load n64wasm.js. Ensure it's in the /public/n64/ directory.");
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      // Potentially add cleanup for NINTENDO64 object if it has a destroy/quit method
    };
  }, [n64BaseUrl]); // Re-run if n64BaseUrl changes

  // Effect to load ROM from romUrl prop
  useEffect(() => {
    if (romUrl && window.NINTENDO64 && window.FS && romLoaded === false) { // Check romLoaded to prevent re-loading
      const loadRomFromUrl = async () => {
        try {
          message.info(`Loading ROM from URL: ${romUrl}`);
          const response = await fetch(romUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch ROM: ${response.statusText}`);
          }
          const romBuffer = await response.arrayBuffer();
          
          // Extract filename from URL to use in FS
          const filename = romUrl.substring(romUrl.lastIndexOf('/') + 1);

          // Option 1: Write to FS then load (closer to original test.htm)
          // Ensure FS is ready
          if (window.FS.createDataFile) {
             window.FS.createDataFile("/", filename, new Uint8Array(romBuffer), true, true, true);
             console.log(`${filename} written to virtual FS`);
             if (window.NINTENDO64.loadrom) { // Check if loadrom exists
                window.NINTENDO64.loadrom(new Uint8Array(romBuffer)); // Original takes Uint8Array or ArrayBuffer
                console.log("NINTENDO64.loadrom called with ArrayBuffer from URL.");
             } else if (window.NINTENDO64.Module && window.NINTENDO64.Module.callMain) {
                // Some emscripten apps load by calling main with filename
                window.NINTENDO64.Module.callMain([filename]);
                console.log("NINTENDO64.Module.callMain called with filename from URL.");
             } else {
                throw new Error("Emulator has no recognized ROM loading function (loadrom or Module.callMain).");
             }
          } else {
             throw new Error("FS.createDataFile is not available to load ROM into virtual file system.");
          }

          setRomLoaded(true);
          setShowGUI(false); // Optionally hide GUI after ROM loads
          message.success(`${filename} loaded successfully!`);
        } catch (error) {
          console.error("Error loading ROM from URL:", error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          message.error(`Failed to load ROM from URL: ${errorMessage}`);
          setRomLoaded(false);
        }
      };

      // Delay ROM loading slightly to ensure emulator is fully initialized by n64wasm.js
      const timer = setTimeout(() => {
        if (window.NINTENDO64 && window.FS) { // Double check before loading
          loadRomFromUrl();
        } else {
          console.warn("Emulator not ready for ROM loading from URL yet, will retry.");
          // Potentially add a retry mechanism here if emulator takes longer
        }
      }, 500); // Adjust delay as needed

      return () => clearTimeout(timer);
    }
  }, [romUrl, n64BaseUrl, romLoaded]); // Depend on romLoaded to prevent re-triggering

  const handleRomUpload = async (file: File) => {
    console.log("ROM selected for upload:", file.name);
    if (window.NINTENDO64 && window.FS) {
      try {
        const romBuffer = await file.arrayBuffer();
        
        // Write to FS (similar to URL loading)
        if (window.FS.createDataFile) {
            window.FS.createDataFile("/", file.name, new Uint8Array(romBuffer), true, true, true);
            console.log(`${file.name} written to virtual FS from upload`);
           if (window.NINTENDO64.loadrom) {
              window.NINTENDO64.loadrom(new Uint8Array(romBuffer));
              console.log("NINTENDO64.loadrom called with ArrayBuffer from upload.");
           } else if (window.NINTENDO64.Module && window.NINTENDO64.Module.callMain) {
              window.NINTENDO64.Module.callMain([file.name]);
              console.log("NINTENDO64.Module.callMain called with filename from upload.");
           } else {
              throw new Error("Emulator has no recognized ROM loading function.");
           }
        } else {
           throw new Error("FS.createDataFile is not available for local ROM upload.");
        }

        setRomLoaded(true);
        setShowGUI(false);
        message.success(`${file.name} loaded successfully!`);
      } catch (error) {
        console.error("Error loading ROM from file upload:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        message.error(`Failed to load ROM: ${errorMessage}`);
        setRomLoaded(false);
      }
    } else {
      message.error("Emulator not ready. Please wait for n64wasm.js to load.");
    }
    return false; // Prevent antd default upload
  };

  const toggleMute = () => {
    // Logic to toggle sound, e.g., window.NINTENDO64.toggleMute()
    setIsMuted(!isMuted);
    console.log(isMuted ? "Unmuting" : "Muting");
  };

  const toggleFullscreen = () => {
    // Logic to toggle fullscreen, e.g., window.NINTENDO64.requestFullScreen(true/false)
    if (canvasRef.current) {
      if (!document.fullscreenElement) {
        canvasRef.current.requestFullscreen().catch((err) => {
          alert(
            `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
          );
        });
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleSaveState = () => {
    console.log("Save state clicked");
    // Logic for window.NINTENDO64.savestate() or similar
  };

  const handleLoadState = () => {
    console.log("Load state clicked");
    // Logic for window.NINTENDO64.loadstate() or similar
  };

  // Placeholder for drag-and-drop functionality
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (
        file.name.endsWith(".zip") ||
        file.name.endsWith(".z64") ||
        file.name.endsWith(".n64") ||
        file.name.endsWith(".v64")
      ) {
        handleRomUpload(file);
      } else {
        message.error("Invalid ROM file. Please use .z64, .n64, .v64 or .zip");
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // The original HTML has a 'container' that's initially hidden.
  // And a 'gui_container' for controls.
  // We'll replicate this structure using Tailwind for styling.

  return (
    <div
      className="relative w-screen h-screen bg-gray-800 text-white flex flex-col items-center justify-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Emulator Canvas Area */}
      {/* The original HTML hides this initially, controlled by JS */}
      <div
        id="container"
        className={`${
          romLoaded ? "block" : "hidden"
        } w-[640px] h-[480px] border border-black`}
      >
        {/* The canvas where the emulator will render */}
        <canvas
          ref={canvasRef}
          id="emulator_target"
          className="w-full h-full"
        ></canvas>
      </div>

      {/* GUI Controls Area */}
      {/* This also seems to be dynamically shown/hidden or positioned */}
      {showGUI && (
        <div
          id="gui_container"
          className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50 flex justify-center items-center space-x-4"
          style={styles.guiBackground} // Example for background image
        >
          <Upload beforeUpload={handleRomUpload} showUploadList={false}>
            <Button icon={<UploadOutlined />}>Load ROM</Button>
          </Upload>
          <Button icon={<FolderOpenOutlined />} onClick={handleLoadState}>
            Load State
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={handleSaveState}>
            Save State
          </Button>
          <Button icon={<SoundOutlined />} onClick={toggleMute}>
            {isMuted ? "Unmute" : "Mute"}
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      )}

      {/* Hidden file input for ROMs, triggered by button, similar to original */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".z64,.n64,.v64,.zip"
        onChange={(e) => e.target.files && handleRomUpload(e.target.files[0])}
      />

      {/* Placeholder for messages or status, like the original 'output' div */}
      <div id="output" className="absolute top-4 left-4 text-sm">
        {/* Messages will go here */}
        {!romLoaded &&
          (romUrl ? `Attempting to load ROM from ${romUrl}...` : "No ROM loaded. Drag & drop a ROM file or use 'Load ROM' button.")}
        {romLoaded && "ROM Loaded. Emulator should be running."}
      </div>
    </div>
  );
};

export default N64Emulator2;

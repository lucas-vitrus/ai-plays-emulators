// N64Emulator2.tsx
// A minimalistic N64 emulator component that loads the necessary scripts
// and provides a simple interface to upload and run ROM files

import React, { useState, useEffect, useCallback } from "react";

const N64Emulator2: React.FC = () => {
  const [emulatorLoaded, setEmulatorLoaded] = useState(false);

  useEffect(() => {
    const body = document.body;
    const createdElements: HTMLElement[] = [];

    const ensureElement = (
      id: string,
      tagName: string,
      parent: HTMLElement,
      setupFn?: (el: HTMLElement) => void
    ) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement(tagName);
        el.id = id;
        if (setupFn) setupFn(el);
        parent.appendChild(el);
        createdElements.push(el);
      }
      return el;
    };

    const mainDiv = ensureElement("maindiv", "div", body);
    const topPanel = ensureElement(
      "topPanel",
      "div",
      mainDiv,
      (el) => (el.style.display = "none")
    );
    const myDiv = ensureElement("mydiv", "div", mainDiv);
    const middleDiv = ensureElement("middleDiv", "div", body);
    const bottomPanel = ensureElement(
      "bottomPanel",
      "div",
      body,
      (el) => (el.style.display = "none")
    );
    ensureElement(
      "canvasDiv",
      "div",
      myDiv,
      (el) => (el.style.display = "none")
    );
    ensureElement("file-upload", "input", body, (el) => {
      (el as HTMLInputElement).type = "file";
      el.style.display = "none";
    });
    ensureElement(
      "dropArea",
      "div",
      topPanel,
      (el) => (el.style.display = "none")
    );
    const lblErrorOuter = ensureElement(
      "lblErrorOuter",
      "div",
      topPanel,
      (el) => (el.style.display = "none")
    );
    ensureElement("lblError", "div", lblErrorOuter);

    const scriptsToLoad = [
      { src: "https://code.jquery.com/jquery-3.3.1.min.js", id: "jquery-script" },
      { src: "/n64/n64wasm.js", id: "n64wasm-script" },
      { src: "/n64/settings.js", id: "settings-script" },
      { src: "/n64/romlist.js", id: "romlist-script" },
      { 
        src: `/n64/script.js?v=${Math.floor(Math.random() * 100000)}`,
        id: "main-script",
      },
    ];
    let scriptsLoadedCount = 0;

    const loadScript = (index: number) => {
      if (index >= scriptsToLoad.length) {
        let attempts = 0;
        const intervalId = setInterval(() => {
          attempts++;
          if (window.myApp && window.myApp.uploadBrowse) {
            console.log("Emulator fully initialized (myApp is ready).");
            setEmulatorLoaded(true);
            clearInterval(intervalId);
          } else if (attempts > 40) {
            console.error(
              "Emulator initialization timed out (myApp not found after loading all scripts)."
            );
            clearInterval(intervalId);
          }
        }, 100);
        return;
      }

      const scriptData = scriptsToLoad[index];
      const existingScript = document.getElementById(scriptData.id);
      if (existingScript) {
        scriptsLoadedCount++;
        if (scriptsLoadedCount === scriptsToLoad.length) {
          loadScript(scriptsToLoad.length);
        } else {
          loadScript(index + 1);
        }
        return;
      }

      const script = document.createElement("script");
      script.id = scriptData.id;
      script.src = scriptData.src;
      script.async = false; // Keep loading synchronously

      script.onload = () => {
        console.log(`${scriptData.src} loaded successfully`);
        scriptsLoadedCount++;
        loadScript(index + 1);
      };
      script.onerror = () => {
        console.error(`Error loading script: ${scriptData.src}`);
        if (scriptData.id === "jquery-script" || scriptData.id === "main-script") {
            console.error(`Critical script ${scriptData.id} failed to load. Halting further script loading.`);
            setEmulatorLoaded(false);
        }
      };
      body.appendChild(script);
    };

    loadScript(0);

    return () => {
      scriptsToLoad.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      createdElements.forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);

  const handleUploadClick = useCallback(() => {
    if (window.myApp && window.myApp.uploadBrowse) {
      window.myApp.uploadBrowse();
    } else {
      console.error(
        "Emulator not fully initialized or myApp.uploadBrowse not found."
      );
    }
  }, []);

  return (
    <div className="n64-emulator-container p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        N64 Emulator
      </h2>
      <button
        className={`px-4 py-2 rounded font-semibold text-white ${!emulatorLoaded
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
          } dark:bg-apple-blue dark:hover:bg-blue-700`}
        onClick={handleUploadClick}
        disabled={!emulatorLoaded}
      >
        Upload ROM
      </button>
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        {!emulatorLoaded
          ? "Loading emulator resources..."
          : "Emulator ready. Upload a ROM to play!"}
      </div>
      <div
        id="mydiv_canvas_container"
        className="mt-4 border border-gray-300 dark:border-gray-700"
      >
        <canvas
          id="canvas"
          style={{ width: "640px", height: "480px", background: "#000" }}
        ></canvas>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    myApp: any;
  }
}

export default N64Emulator2;

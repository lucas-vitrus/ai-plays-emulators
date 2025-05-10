import React, { useEffect, useRef } from "react";
import { buildEmulator, type EmulatorArtifacts } from "./buildEmulator";
import type { Settings } from "./types";
import { defaultPathToData } from "./defaultPathToData";
import { defaultSize } from "./defaultSize";

type Props = { width?: number; height?: number } & Settings;

export const EmulatorJS: React.FunctionComponent<Props> = (props) => {
  const emulatorRootRef = useRef<HTMLDivElement>(null);

  const width = props.width || defaultSize.width;
  const height = props.height || defaultSize.height;

  useEffect(() => {
    if (!emulatorRootRef.current) return;

    const currentEmulatorRoot = emulatorRootRef.current; // Capture for cleanup safety
    console.log("currentEmulatorRoot", currentEmulatorRoot);
    // 1. Set up global EJS variables on the main window object
    const activeGlobals: Set<string> = new Set<string>();
    const setGlobal = (key: string, value: unknown) => {
      // @ts-ignore allow setting on window
      window[key] = value;
      activeGlobals.add(key);
    };

    // Set base EJS globals, allowing props to override where appropriate
    setGlobal("EJS_player", "#game"); // The #game div will be inside gameHostElement
    setGlobal("EJS_pathtodata", props.EJS_pathtodata || defaultPathToData);
    setGlobal("EJS_gameName", props.EJS_gameName || "gameNamePlaceholder");

    // Set other EJS_ properties from props
    for (const key in props) {
      if (
        Object.prototype.hasOwnProperty.call(props, key) &&
        key.startsWith("EJS_")
      ) {
        // Ensure not to overwrite the base globals already set if they come from props (handled by order)
        if (
          key !== "EJS_player" &&
          key !== "EJS_pathtodata" &&
          key !== "EJS_gameName"
        ) {
          // @ts-ignore
          const propValue = props[key as keyof Props];
          if (propValue !== undefined) {
            setGlobal(key, propValue);
          }
        }
      }
    }

    // 2. Build the emulator elements using the updated buildEmulator
    const { gameHostElement, scriptToLoad } = buildEmulator({
      loader: `${props.EJS_pathtodata || defaultPathToData}/loader.js`,
      width,
      height,
    });

    // 3. Clear previous content and append the new game host element
    currentEmulatorRoot.innerHTML = ""; // Clear any previous content from re-renders
    currentEmulatorRoot.appendChild(gameHostElement);

    // 4. Load the emulator script
    const script = document.createElement("script");
    script.src = scriptToLoad;
    script.async = true;
    // script.onload = () => console.log("EmulatorJS script loaded:", scriptToLoad)
    // script.onerror = () => console.error("Failed to load EmulatorJS script:", scriptToLoad)
    document.body.appendChild(script);

    // Cleanup function: remove the script and clear globals
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      activeGlobals.forEach((key) => {
        // @ts-ignore allow deleting from window
        delete window[key];
      });
      // Clear the emulator content from the div
      if (currentEmulatorRoot) {
        currentEmulatorRoot.innerHTML = "";
      }
    };
  }, [props, width, height]); // Re-run effect if props, width, or height change

  return (
    <div
      id="emulator-root"
      ref={emulatorRootRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: "0", // Replicates iframe's border:0 style
        // Consider adding margin: 0, padding: 0 if needed for layout consistency
      }}
    >
      {/* Emulator content will be dynamically inserted here by the useEffect hook */}
    </div>
  );
};

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { EmulatorJS } from "../lib/custom-react-emulatorjs/EmulatorJS";

// Type definition for the EJS_emulator global, specific to this module's needs
declare global {
  interface Window {
    EJS_emulator?: {
      screenshot: () => void;
    };
  }
}

export interface N64EmulatorRef {
  triggerScreenshot: () => void;
}

const N64Emulator = forwardRef<N64EmulatorRef, {}>((props, ref) => {
  const [isGameStarted, setIsGameStarted] = useState(false);
  // const emulatorRef = useRef<any>(null); // This ref seems unused, can be removed if not needed for other EJS direct interactions

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/latest/data/";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    triggerScreenshot: () => {
      if (!isGameStarted) {
        console.warn("Cannot take screenshot: Game has not started yet.");
        return;
      }

      const canvas = document.querySelector(".ejs_canvas") as HTMLCanvasElement;
      if (canvas) {
        requestAnimationFrame(() => {
          // It might even be beneficial to wait for two frames for WebGL contexts
          // requestAnimationFrame(() => {
          try {
            const dataURL = canvas.toDataURL("image/png");
            console.log("Screenshot taken from canvas. Data URL:", dataURL);

            const link = document.createElement("a");
            link.download = "screenshot.png";
            link.href = dataURL;
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
          } catch (error) {
            console.error("Error taking screenshot from canvas:", error);
          }
          // });
        });
      } else {
        console.warn(
          "ejs_canvas not found. Attempting fallback screenshot methods."
        );
        // Fallback to existing methods if canvas is not found
        if (
          window.EJS_emulator &&
          typeof window.EJS_emulator.screenshot === "function"
        ) {
          window.EJS_emulator.screenshot();
          console.log(
            "Screenshot triggered via window.EJS_emulator.screenshot() (fallback)"
          );
        } else {
          const emulatorScreenshotButton =
            document.getElementById("screenshotbutton") ||
            document.querySelector('button[onclick*="screenshot"]');
          if (
            emulatorScreenshotButton &&
            typeof (emulatorScreenshotButton as HTMLButtonElement).click ===
              "function"
          ) {
            (emulatorScreenshotButton as HTMLButtonElement).click();
            console.log(
              "Attempted screenshot via emulator's own button click (fallback)."
            );
          } else {
            console.warn(
              "Fallback screenshot methods also failed: Emulator screenshot function unavailable, and its button not found."
            );
          }
        }
      }
    },
  }));

  const rom =
    "https://rpuqlzpbhnfjvmauvgiz.supabase.co/storage/v1/object/public/roms//The%20Legend%20of%20Zelda%20-%20Ocarina%20of%20Time.z64";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div
        className="w-fit h-fit border rounded-lg overflow-hidden shadow-lg"
        id="emulator-component"
      >
        <EmulatorJS
          EJS_onGameStart={() => {
            console.log(
              "Game started. Emulator should be ready for screenshots."
            );
            setIsGameStarted(true);
          }}
          EJS_ready={() => {
            console.log(
              "EmulatorJS component instance is ready. Game will start based on EJS_startOnLoaded."
            );
            // window.EJS_emulator might not be fully populated here yet. EJS_onGameStart is safer.
          }}
          EJS_startOnLoaded={true}
          EJS_Buttons={{
            screenshot: true, // This should make EmulatorJS provide its own screenshot button
            gamepad: true,
          }}
          EJS_pathtodata="https://cdn.emulatorjs.org/latest/data/"
          EJS_core="n64"
          EJS_gameUrl={rom}
          width={800}
          height={600}
        />
      </div>
    </div>
  );
});

export default N64Emulator;

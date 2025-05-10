import { useEffect, useImperativeHandle, forwardRef, useState } from "react";
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
  triggerScreenshot: (commandId?: string) => void;
}

interface N64EmulatorProps {
  onScreenshot?: (base64Data: string, commandId?: string) => void;
}

const N64Emulator = forwardRef<N64EmulatorRef, N64EmulatorProps>(
  (props, ref) => {
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

    useImperativeHandle(
      ref,
      () => {
        const MIN_SCREENSHOT_SIZE_BYTES = 36 * 1024; // 36KB
        const MAX_RETRIES = 10; // Total attempts
        const RETRY_DELAY_MS = 500; // Delay between retries

        // Helper function to get Data URL file size in bytes
        const getDataUrlFileSize = (dataURL: string): number => {
          const prefix = "data:image/png;base64,";
          if (!dataURL.startsWith(prefix)) {
            console.warn(
              "DataURL does not have expected image/png base64 prefix for size calculation."
            );
            return 0;
          }
          const base64Data = dataURL.substring(prefix.length);
          try {
            // The length of the decoded base64 string is the number of bytes of the binary data.
            return window.atob(base64Data).length;
          } catch (e) {
            console.error(
              "Failed to decode base64 string for size calculation:",
              e
            );
            return 0;
          }
        };

        // Helper function to handle fallback screenshot mechanisms
        const handleFallbackScreenshot = (commandId?: string) => {
          console.warn("Attempting fallback screenshot methods.");
          if (props.onScreenshot) {
            console.warn(
              `Fallback screenshot triggered for commandId: ${commandId}. Manual capture might be needed.`
            );
          }

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
        };

        return {
          triggerScreenshot: (commandId?: string) => {
            if (!isGameStarted) {
              console.warn(
                `Cannot take screenshot for commandId: ${commandId}. Game has not started yet.`
              );
              if (props.onScreenshot) {
                // Notify App.tsx that screenshot failed if possible, or handle error state
              }
              return;
            }

            const canvas = document.querySelector(
              ".ejs_canvas"
            ) as HTMLCanvasElement;
            if (canvas) {
              let currentAttempt = 0;

              const attemptScreenshotCapture = () => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(async () => {
                    try {
                      const dataURL = canvas.toDataURL("image/png");
                      const fileSize = getDataUrlFileSize(dataURL);
                      console.log(
                        `Screenshot attempt ${
                          currentAttempt + 1
                        }/${MAX_RETRIES} for commandId: ${commandId}. Size: ${fileSize} bytes.`
                      );

                      let proceed = false;

                      if (fileSize > MIN_SCREENSHOT_SIZE_BYTES) {
                        console.log("Screenshot size is sufficient.");
                        proceed = true;
                      } else if (currentAttempt < MAX_RETRIES - 1) {
                        currentAttempt++;
                        console.warn(
                          `Screenshot size ${fileSize} bytes is <= ${MIN_SCREENSHOT_SIZE_BYTES} bytes. Retrying in ${RETRY_DELAY_MS}ms... (Attempt ${
                            currentAttempt + 1
                          }/${MAX_RETRIES}) for commandId: ${commandId}`
                        );
                        setTimeout(attemptScreenshotCapture, RETRY_DELAY_MS);
                      } else {
                        console.warn(
                          `Screenshot size ${fileSize} bytes is <= ${MIN_SCREENSHOT_SIZE_BYTES} bytes after ${MAX_RETRIES} attempts for commandId: ${commandId}. Proceeding.`
                        );
                        proceed = true;
                      }

                      if (proceed) {
                        if (props.onScreenshot) {
                          props.onScreenshot(dataURL, commandId);
                          console.log(
                            `Screenshot data passed to onScreenshot callback for commandId: ${commandId}. Final size: ${fileSize} bytes.`
                          );
                        } else {
                          // Fallback to download if no callback is provided
                          const link = document.createElement("a");
                          link.download = commandId
                            ? `screenshot-${commandId}.png`
                            : "screenshot.png";
                          link.href = dataURL;
                          document.body.appendChild(link); // Required for Firefox
                          link.click();
                          document.body.removeChild(link);
                          console.log(
                            `Screenshot download initiated for commandId: ${commandId}. Final size: ${fileSize} bytes.`
                          );
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Error during screenshot canvas capture (attempt ${
                          currentAttempt + 1
                        }) for commandId: ${commandId}:`,
                        error
                      );
                      handleFallbackScreenshot(commandId);
                    }
                  });
                });
              };
              attemptScreenshotCapture();
            } else {
              console.warn(`ejs_canvas not found for commandId: ${commandId}.`);
              handleFallbackScreenshot(commandId);
            }
          },
        };
      },
      [isGameStarted, props.onScreenshot]
    );

    const rom =
      "https://rpuqlzpbhnfjvmauvgiz.supabase.co/storage/v1/object/public/roms//The%20Legend%20of%20Zelda%20-%20Ocarina%20of%20Time.z64";

    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div
          className="w-fit h-fit rounded-lg overflow-hidden"
          style={{
            border: "1px solid #000",
            boxShadow: "0 20px 30px 0px rgba(0, 0, 0, 0.33)",
          }}
          id="emulator-component"
        >
          <EmulatorJS
            EJS_onGameStart={() => {
              console.log(
                "Game started. Emulator should be ready for screenshots."
              );
              setIsGameStarted(true);
              console.log(window);
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
  }
);

export default N64Emulator;

/* EJS_defaultControls={{
            0: {
              0: {
                value: "x",
                value2: "BUTTON_2",
              },
              1: {
                value: "s",
                value2: "BUTTON_4",
              },
              2: {
                value: "v",
                value2: "SELECT",
              },
              3: {
                value: "enter",
                value2: "START",
              },
              4: {
                value: "up arrow",
                value2: "DPAD_UP",
              },
              5: {
                value: "down arrow",
                value2: "DPAD_DOWN",
              },
              6: {
                value: "left arrow",
                value2: "DPAD_LEFT",
              },
              7: {
                value: "right arrow",
                value2: "DPAD_RIGHT",
              },
              8: {
                value: "z",
                value2: "BUTTON_1",
              },
              9: {
                value: "a",
                value2: "BUTTON_3",
              },
              10: {
                value: "q",
                value2: "LEFT_TOP_SHOULDER",
              },
              11: {
                value: "e",
                value2: "RIGHT_TOP_SHOULDER",
              },
              12: {
                value: "tab",
                value2: "LEFT_BOTTOM_SHOULDER",
              },
              13: {
                value: "r",
                value2: "RIGHT_BOTTOM_SHOULDER",
              },
              14: {
                value: "",
                value2: "LEFT_STICK",
              },
              15: {
                value: "",
                value2: "RIGHT_STICK",
              },
              16: {
                value: "h",
                value2: "LEFT_STICK_X:+1",
              },
              17: {
                value: "f",
                value2: "LEFT_STICK_X:-1",
              },
              18: {
                value: "g",
                value2: "LEFT_STICK_Y:+1",
              },
              19: {
                value: "t",
                value2: "LEFT_STICK_Y:-1",
              },
              20: {
                value: "l",
                value2: "RIGHT_STICK_X:+1",
              },
              21: {
                value: "j",
                value2: "RIGHT_STICK_X:-1",
              },
              22: {
                value: "k",
                value2: "RIGHT_STICK_Y:+1",
              },
              23: {
                value: "i",
                value2: "RIGHT_STICK_Y:-1",
              },
              24: {
                value: "1",
              },
              25: {
                value: "2",
              },
              26: {
                value: "3",
              },
              27: {
                value: "add",
              },
              28: {
                value: "space",
              },
              29: {
                value: "subtract",
              },
            },
            1: {},
            2: {},
            3: {},
          }}*/

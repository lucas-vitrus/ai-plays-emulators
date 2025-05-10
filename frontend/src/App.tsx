import React, { useRef } from "react";
import { ConfigProvider, theme, Button, notification, Input } from "antd";
import N64Emulator from "./environments/N64Emulator";
import type { N64EmulatorRef } from "./environments/N64Emulator";
import ShowCursor from "./components/ShowCursor";

// The global Window interface for EJS_emulator is now in N64Emulator.tsx
// declare global {
//   interface Window {
//     EJS_emulator?: {
//       screenshot: () => void;
//     };
//   }
// }

const { darkAlgorithm } = theme;

function App() {
  const emulatorRef = useRef<N64EmulatorRef>(null);

  const handleScreenshot = async () => {
    if (emulatorRef.current) {
      emulatorRef.current.triggerScreenshot();
    } else {
      console.warn("N64Emulator ref not available. Screenshot attempt failed.");
      notification.warning({
        message: "Screenshot Unavailable",
        description:
          "The emulator component is not yet ready. Please try again shortly.",
      });
    }
  };

  const handleFakeEnterPress = () => {
    const gameElement = document.getElementById("game") as HTMLElement;
    const targetElement = gameElement || window; // Prefer game element, fallback to window

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    });

    targetElement.dispatchEvent(event);

    if (gameElement) {
      // Attempt to focus the game element as well, which might be necessary for some emulators
      if (typeof gameElement.focus === "function") {
        gameElement.focus();
      }
      // Dispatch keyup as well, as some systems require both
      const eventUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      targetElement.dispatchEvent(eventUp);
      notification.info({
        message: "Enter Key Sent to #game",
        description:
          "The Enter key press has been simulated on the #game element.",
      });
    } else {
      notification.warning({
        message: "Enter Key Sent to Window (Fallback)",
        description:
          "#game element not found. Enter key press simulated on the window.",
      });
    }
  };

  const fakeKey = (key: string) => {
    console.log("emulatorjs", (window as any).EJS_emulator);

    console.log(
      "emulatorjs1",
      (window as any).EJS_emulator.gameManager
    );

    (window as any).EJS_emulator.gameManager.functions.simulateInput(0, 3, 1);
    setTimeout(() => {
      (window as any).EJS_emulator.gameManager.functions.simulateInput(0, 3, 0);
    }, 200); // 100ms delay
    // (window as any).EJS_emulator.gameManager.functions.restart();

    // (window as any).EJS_emulator.pause();
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
      }}
    >
      <div
        style={{
          padding: "0px",
          backgroundColor: "#211221",
          color: "white",
          height: "100vh",
          width: "100vw",
          position: "relative",
        }}
      >
        <ShowCursor label="Human" hideCursor={true} />
        <N64Emulator ref={emulatorRef} />
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <p className="text-sm text-gray-400">aiN64</p>
          <Button
            type="primary"
            onClick={handleScreenshot}
            style={{ backgroundColor: "#007AFF" }}
          >
            Screenshot
          </Button>
          <Button
            type="default"
            onClick={handleFakeEnterPress}
            style={{ marginLeft: "8px" }}
          >
            Fake Enter Press
          </Button>
          <Button type="default" onClick={() => fakeKey("Enter")}>
            Fake Enter Key1
          </Button>
          <Input id="in" />
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;

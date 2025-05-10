import React, { useRef } from "react";
import { ConfigProvider, theme, Button, notification } from "antd";
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
        description: "The emulator component is not yet ready. Please try again shortly.",
      });
    }
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
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;

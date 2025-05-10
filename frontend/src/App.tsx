import { ConfigProvider, theme, Button } from "antd";
import N64Emulator from "./environments/N64Emulator";
import ShowCursor from "./components/ShowCursor";

const { darkAlgorithm } = theme;

function App() {
  const handleScreenshot = () => {
    const containerDiv = document.getElementById("emulator-component");
    let canvas: HTMLCanvasElement | null = null;

    if (containerDiv) {
      // Try to find a canvas with the specific class '.ejs_canvas' inside the container
      const specificCanvas =
        containerDiv.querySelector<HTMLCanvasElement>(".ejs_canvas");
      if (specificCanvas instanceof HTMLCanvasElement) {
        canvas = specificCanvas;
      } else {
        // If not found, or if it wasn't a canvas, try to find any generic canvas element inside the container
        const genericCanvas =
          containerDiv.querySelector<HTMLCanvasElement>("canvas");
        if (genericCanvas instanceof HTMLCanvasElement) {
          canvas = genericCanvas;
        }
      }
    }

    if (canvas) {
      // If a canvas was successfully found and verified
      try {
        const imageURL = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = imageURL;
        a.download = "n64-screenshot.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error("Error taking screenshot:", error);
        alert(
          "Could not take screenshot. The canvas might be tainted by cross-origin data."
        );
      }
    } else if (containerDiv) {
      // Container was found, but no suitable canvas inside
      console.warn(
        "N64 canvas not found inside '#emulator-component' for screenshot."
      );
      alert(
        "Could not find the N64 screen canvas within the emulator component."
      );
    } else {
      // Container element with ID 'emulator-component' was not found
      console.warn(
        "Element with ID 'emulator-component' not found for screenshot."
      );
      alert(
        "Could not find the emulator component (ID: emulator-component) to capture."
      );
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
        <N64Emulator />
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

import { useRef, useState } from "react";
import {
  ConfigProvider,
  theme,
  Button,
  notification,
  Input,
  Drawer,
} from "antd";
import { MenuOutlined } from "@ant-design/icons";
import N64Emulator from "./environments/N64Emulator";
import type { N64EmulatorRef } from "./environments/N64Emulator";
import ShowCursor from "./components/ShowCursor";
import Console3D from "./components/Console3D";
import RemoteController from "./client/Connection";
import { PiHamburgerBold } from "react-icons/pi";

const { darkAlgorithm } = theme;

function App() {
  const emulatorRef = useRef<N64EmulatorRef>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

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

  const fakeKey = (key: string) => {
    console.log("emulatorjs", (window as any).EJS_emulator);

    console.log("emulatorjs1", (window as any).EJS_emulator.gameManager);

    (window as any).EJS_emulator.gameManager.functions.simulateInput(0, 3, 1);
    setTimeout(() => {
      (window as any).EJS_emulator.gameManager.functions.simulateInput(0, 3, 0);
    }, 200); // 100ms delay
    // (window as any).EJS_emulator.gameManager.functions.restart();

    // (window as any).EJS_emulator.pause();
  };

  const showDrawer = () => {
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
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
          backgroundColor: "#211293",
          color: "white",
          height: "100vh",
          width: "100vw",
          position: "relative",
        }}
      >
        <Button
          type="text"
          className="opacity-30 hover:opacity-100"
          icon={<MenuOutlined style={{ color: "white", fontSize: "24px" }} />}
          onClick={showDrawer}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 10,
            color: "white",
          }}
        />
        <ShowCursor label="Human" hideCursor={true} />
        <div className="absolute top-6 left-0 w-full flex justify-center items-center">
          {/* <h1 className="text-white text-4xl w-full flex justify-center items-center">
            AI Plays Nintendo 64 (<strong>3D</strong>)
          </h1> */}
        </div>
        <div className="absolute top-[-100px] left-0 w-full h-full z-0">
          <N64Emulator ref={emulatorRef} />
        </div>
        <div className="absolute bottom-0 left-0 w-[100%] h-[30%] z-2">
          <Console3D />
        </div>
        <Drawer
          title="Controller"
          placement="left"
          onClose={onCloseDrawer}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
          headerStyle={{
            backgroundColor: "#1f1f1f",
            borderBottom: "1px solid #303030",
          }}
        >
          <div className="w-full h-full z-3">
            <RemoteController />
          </div>
        </Drawer>
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <p className="text-sm text-gray-400">aiN64</p>
          <Button
            type="primary"
            onClick={handleScreenshot}
            style={{ backgroundColor: "#007AFF" }}
          >
            Screenshot
          </Button>
          <Button type="default" onClick={() => fakeKey("Enter")}>
            Press Enter
          </Button>
          <Input id="in" />
        </div>

        <div className="text-sm text-gray-400 absolute bottom-4 right-4 flex items-end justify-endspace-x-4 flex-col">
          <p>
            Built on top of{" "}
            <a
              className="text-white"
              href="https://sketchfab.com/3d-models/nintendo-64-816d53eca00e4f3192a8d23f62388472#:~:text=3D%20Model-,Ethanboor,-FOLLOW"
              target="_blank"
              rel="noopener noreferrer"
            >
              EmulatorJS
            </a>
          </p>
          <p>
            Nintendo 64 Model from{" "}
            <a
              className="text-white"
              href="https://sketchfab.com/3d-models/nintendo-64-816d53eca00e4f3192a8d23f62388472#:~:text=3D%20Model-,Ethanboor,-FOLLOW"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ethanboor
            </a>
          </p>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;

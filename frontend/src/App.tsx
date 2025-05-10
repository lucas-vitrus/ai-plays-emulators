import { ConfigProvider, theme } from "antd";

import N64Emulator3 from "./environments/N64Emulator3";
import ShowCursor from "./components/ShowCursor";

const { darkAlgorithm } = theme;

function App() {
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
        }}
      >
        <ShowCursor label="Human" hideCursor={true} />
        <N64Emulator3 />
        <div className="absolute bottom-1 left-1">
          <p>aiN64</p>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;

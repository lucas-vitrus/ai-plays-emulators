import { ConfigProvider, theme } from "antd";

import N64Environment from "./environments/N64Emulator";

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
        <N64Environment />
        <div className="absolute bottom-1 left-1">
          <p>aiN64</p>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;

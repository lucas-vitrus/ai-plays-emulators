import React, { useEffect, useRef } from "react";
import { EmulatorJS } from "../lib/custom-react-emulatorjs/EmulatorJS";

const N64Emulator: React.FC = () => {
  const emulatorRef = useRef<any>(null); // Replace 'any' with the correct type if available from the library

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/latest/data/";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Optional: Remove the script when the component unmounts
      document.head.removeChild(script);
    };
  }, []);

  //   Zelda
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
            console.log("Game started");
          }}
          // EJS_startOnLoaded={true}
          EJS_startOnLoaded={true}
          EJS_Buttons={{
            screenshot: true,
            gamepad: true,
          }}
          EJS_ready={() => {
            console.log("Emulator ready");
          }}
          EJS_pathtodata="https://cdn.emulatorjs.org/latest/data/"
          EJS_core="n64" // emulator core
          EJS_gameUrl={rom} // rom url
          width={800}
          height={600}
        />
      </div>
    </div>
  );
};

export default N64Emulator;

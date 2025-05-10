import React, { useEffect } from "react";
import { EmulatorJS } from "react-emulatorjs";

const N64Emulator3: React.FC = () => {
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
    <div>
      <h1>N64 Emulator</h1>
      <EmulatorJS
        EJS_pathtodata="https://cdn.emulatorjs.org/latest/data/"
        EJS_core="n64" // emulator core
        EJS_gameUrl={rom} // rom url
        width={800}
        height={600}
      />
    </div>
  );
};

export default N64Emulator3;

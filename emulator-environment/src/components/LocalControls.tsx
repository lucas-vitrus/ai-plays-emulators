// frontend/src/client/LocalControls.tsx
// This file contains the LocalControls component, which renders a mock Nintendo 64 controller accessible via a drawer.

import React, { useState } from "react";
import { Drawer, Button as AntButton } from "antd"; // Re-introducing AntButton for the trigger
import { PiControl, PiJoystick } from "react-icons/pi";
import { getN64KeyCode } from "../controlMap"; // Added import

interface LocalControlsProps {
  onClickButton: (key: string) => void;
}

// Inner component to render the actual controller layout
const N64ControllerLayout: React.FC<LocalControlsProps> = ({
  onClickButton,
}) => {
  const handleButtonClick = (key: string) => {
    const buttonCode = getN64KeyCode(key);
    const player = 0; // Assuming player 0 for local controls
    const pressDuration = 100; // Duration for the button press in ms

    if (buttonCode !== undefined) {
      if (
        (window as any).EJS_emulator &&
        (window as any).EJS_emulator.gameManager &&
        (window as any).EJS_emulator.gameManager.functions &&
        typeof (window as any).EJS_emulator.gameManager.functions
          .simulateInput === "function"
      ) {
        (window as any).EJS_emulator.gameManager.functions.simulateInput(
          player,
          buttonCode,
          1 // Press the button
        );
        console.log(
          `LocalControls: Player ${player} pressed UI button '${key}', code: ${buttonCode}.`
        );

        setTimeout(() => {
          if (
            (window as any).EJS_emulator &&
            (window as any).EJS_emulator.gameManager &&
            (window as any).EJS_emulator.gameManager.functions &&
            typeof (window as any).EJS_emulator.gameManager.functions
              .simulateInput === "function"
          ) {
            (window as any).EJS_emulator.gameManager.functions.simulateInput(
              player,
              buttonCode,
              0 // Release the button
            );
            console.log(
              `LocalControls: Player ${player} released UI button '${key}' ( code: ${buttonCode}) after ${pressDuration}ms.`
            );
          }
        }, pressDuration);
      } else {
        console.warn(
          "LocalControls: EJS_emulator.gameManager.functions.simulateInput is not available on window object or is not a function."
        );
      }
    } else {
      console.warn(
        `LocalControls: Unknown button or mapping for UI key "${key}"`
      );
    }

    // Call the original prop, so parent components can also react if needed
    onClickButton(key);
  };

  const mimeticButtonBase =
    "flex items-center justify-center rounded-full cursor-pointer select-none transition-all duration-100 ease-in-out shadow-md hover:shadow-lg active:shadow-inner active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const shoulderButtonColors =
    "bg-gray-500 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-white";
  const dPadColors =
    "bg-neutral-800 hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white";
  const startButtonColors =
    "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white";
  const zButtonColors =
    "bg-gray-600 hover:bg-gray-500 dark:bg-gray-500 dark:hover:bg-gray-400 text-white";
  const aButtonColors = "text-white"; // Specific style for #007AFF
  const bButtonColors =
    "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white";
  const cButtonColors =
    "bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-black";

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-2 rounded-xl select-none font-sans w-full max-w-2xl mx-auto overflow-hidden">
      {/* Top part with L and R buttons */}
      <div className="flex justify-between w-full max-w-lg mb-[-20px] z-10 px-4 overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          className={`${mimeticButtonBase} ${shoulderButtonColors} w-16 h-16 text-lg focus:ring-gray-400`}
          onClick={() => handleButtonClick("L")}
        >
          L
        </div>
        <div
          role="button"
          tabIndex={0}
          className={`${mimeticButtonBase} ${shoulderButtonColors} w-16 h-16 text-lg focus:ring-gray-400`}
          onClick={() => handleButtonClick("R")}
        >
          R
        </div>
      </div>

      {/* Main body - no background, buttons appear to float */}
      <div className="relative rounded-3xl w-full max-w-lg min-h-[260px] flex items-stretch justify-between p-6 pt-10">
        {/* Left Handle with D-Pad */}
        <div className="flex flex-col justify-start items-center w-1/4 h-full pt-8">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28 h-28 place-items-center">
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("LEFT_STICK_Y:+1")}
            >
              ▲
            </div>
            <div />
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("DPAD_LEFT")}
            >
              ◀
            </div>
            <div className="w-10 h-10 rounded-full shadow-inner"> </div>{" "}
            {/* D-pad center appearance */}
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("DPAD_RIGHT")}
            >
              ▶
            </div>
            <div />
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("LEFT_STICK_Y:-1")}
            >
              ▼
            </div>
            <div />
          </div>
        </div>

        {/* Center Handle with Start and Z Buttons */}
        <div className="flex flex-col items-center justify-start w-1/3 h-full pt-2 pb-4 space-y-8">
          <div
            role="button"
            tabIndex={0}
            className={`${mimeticButtonBase} ${startButtonColors} w-16 h-16 text-sm font-semibold focus:ring-red-400`}
            onClick={() => handleButtonClick("START")}
          >
            START
          </div>
          <div
            role="button"
            tabIndex={0}
            className={`${mimeticButtonBase} ${zButtonColors} w-14 h-14 text-base focus:ring-gray-400`}
            onClick={() => handleButtonClick("LEFT_BOTTOM_SHOULDER")}
          >
            Z
          </div>
        </div>

        {/* Right Handle with A, B, and C Buttons */}
        <div className="flex flex-col justify-start items-center w-1/4 h-full pt-8">
          <div className="relative w-28 h-24 mb-4">
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${bButtonColors} w-12 h-12 text-xl absolute top-0 left-1 focus:ring-green-400`}
              onClick={() => handleButtonClick("BUTTON_4")}
            >
              B
            </div>
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${aButtonColors} w-16 h-16 text-2xl absolute bottom-0 right-0 focus:ring-blue-400`}
              style={{ backgroundColor: "#007AFF" }} // Apple Blue for A button
              onClick={() => handleButtonClick("BUTTON_2")}
            >
              A
            </div>
          </div>

          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-28 h-28 place-items-center">
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("RIGHT_STICK_Y:+1")}
            >
              ▲
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("RIGHT_STICK_X:-1")}
            >
              ◀
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("RIGHT_STICK_X:+1")}
            >
              ▶
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("LEFT_STICK_Y:-1")}
            >
              ▼
            </div>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
};

// Main exported component that manages the drawer
const N64Controller: React.FC<LocalControlsProps> = ({ onClickButton }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      <div className="p-4 flex justify-center">
        <AntButton onClick={showDrawer} icon={<PiJoystick />}>
          Joypad
        </AntButton>
      </div>
      <Drawer
        title="N64 Controls"
        placement="bottom"
        className="overflow-hidden w-fit"
        closable={true}
        onClose={closeDrawer}
        open={isDrawerOpen}
        mask={false}
        height={480} // Adjusted height
        width={800}
        getContainer={false} // Optional: to render drawer inline if needed, usually not for bottom drawers
        styles={{
          content: {
            backgroundColor: "#333333aa",
            width: "600px",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <N64ControllerLayout onClickButton={onClickButton} />
      </Drawer>
    </>
  );
};

export default N64Controller;

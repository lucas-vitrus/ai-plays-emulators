// frontend/src/client/LocalControls.tsx
// This file contains the LocalControls component, which renders a mock Nintendo 64 controller accessible via a drawer.

import React, { useState } from "react";
import { Drawer, Button as AntButton, Switch } from "antd"; // Re-introducing AntButton for the trigger and Switch for dev mode
import { PiJoystick } from "react-icons/pi";
import { getN64KeyCode, isSpecialKey, analogInput } from "../controlMap"; // Added import

interface LocalControlsProps {
  onClickButton: (key: string) => void;
}

interface N64ControllerLayoutProps extends LocalControlsProps {
  isDevMode: boolean;
}

// Inner component to render the actual controller layout
const N64ControllerLayout: React.FC<N64ControllerLayoutProps> = ({
  onClickButton,
  isDevMode,
}) => {
  const handleButtonClick = (key: string) => {
    const buttonCode = getN64KeyCode(key);
    const player = 0; // Assuming player 0 for local controls
    const pressDuration = 100; // Duration for the button press in ms
    const inputValue = isSpecialKey(buttonCode || 0) ? analogInput : 1;
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
          // 1 // Press the button
          inputValue
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
    "flex items-center justify-center rounded-full cursor-pointer select-none transition-all duration-100 ease-in-out shadow-md hover:shadow-lg active:shadow-inner active:scale-95 active:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 relative";
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
  const devModeTextStyle =
    "absolute top-0 left-1/2 -translate-x-1/2 -mt-4 text-xs font-mono bg-black bg-opacity-50 text-white px-1 rounded";

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
          L{isDevMode && <span className={devModeTextStyle}>L</span>}
        </div>
        <div
          role="button"
          tabIndex={0}
          className={`${mimeticButtonBase} ${shoulderButtonColors} w-16 h-16 text-lg focus:ring-gray-400`}
          onClick={() => handleButtonClick("R")}
        >
          R{isDevMode && <span className={devModeTextStyle}>R</span>}
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
              onClick={() => handleButtonClick("LEFT_STICK_Y:-1")}
            >
              ▲
              {isDevMode && (
                <span className={devModeTextStyle}>LEFT_STICK_Y:-1</span>
              )}
            </div>
            <div />
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("LEFT_STICK_X:-1")}
            >
              ◀
              {isDevMode && (
                <span className={devModeTextStyle}>LEFT_STICK_X:-1</span>
              )}
            </div>
            <div className="w-10 h-10 rounded-full shadow-inner"> </div>{" "}
            {/* D-pad center appearance */}
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("LEFT_STICK_X:+1")}
            >
              ▶
              {isDevMode && (
                <span className={devModeTextStyle}>LEFT_STICK_X:+1</span>
              )}
            </div>
            <div />
            <div
              role="button"
              className={`${mimeticButtonBase} ${dPadColors} w-10 h-10 focus:ring-neutral-500`}
              onClick={() => handleButtonClick("LEFT_STICK_Y:+1")}
            >
              ▼
              {isDevMode && (
                <span className={devModeTextStyle}>LEFT_STICK_Y:+1</span>
              )}
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
            {isDevMode && <span className={devModeTextStyle}>START</span>}
          </div>
          <div
            role="button"
            tabIndex={0}
            className={`${mimeticButtonBase} ${zButtonColors} w-14 h-14 text-base focus:ring-gray-400`}
            onClick={() => handleButtonClick("LEFT_BOTTOM_SHOULDER")}
          >
            Z
            {isDevMode && (
              <span className={devModeTextStyle}>LEFT_BOTTOM_SHOULDER</span>
            )}
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
              B{isDevMode && <span className={devModeTextStyle}>BUTTON_4</span>}
            </div>
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${aButtonColors} w-16 h-16 text-2xl absolute bottom-0 right-0 focus:ring-blue-400`}
              style={{ backgroundColor: "#007AFF" }} // Apple Blue for A button
              onClick={() => handleButtonClick("BUTTON_2")}
            >
              A{isDevMode && <span className={devModeTextStyle}>BUTTON_2</span>}
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
              {isDevMode && (
                <span className={devModeTextStyle}>RIGHT_STICK_Y:+1</span>
              )}
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("RIGHT_STICK_X:-1")}
            >
              ◀
              {isDevMode && (
                <span className={devModeTextStyle}>RIGHT_STICK_X:-1</span>
              )}
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("RIGHT_STICK_X:+1")}
            >
              ▶
              {isDevMode && (
                <span className={devModeTextStyle}>RIGHT_STICK_X:+1</span>
              )}
            </div>
            <div />
            <div
              role="button"
              tabIndex={0}
              className={`${mimeticButtonBase} ${cButtonColors} w-10 h-10 text-sm focus:ring-yellow-400`}
              onClick={() => handleButtonClick("LEFT_STICK_Y:-1")}
            >
              ▼
              {isDevMode && (
                <span className={devModeTextStyle}>LEFT_STICK_Y:-1</span>
              )}
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
  const [isDevMode, setIsDevMode] = useState(false); // State for dev mode

  const showDrawer = () => {
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const toggleDevMode = (checked: boolean) => {
    setIsDevMode(checked);
  };

  return (
    <>
      <div className="p-4 flex justify-center">
        <AntButton onClick={showDrawer} icon={<PiJoystick />}>
          Joypad
        </AntButton>
      </div>
      <Drawer
        title={
          <div className="flex justify-between items-center">
            N64 Controls
            <div className="flex items-center space-x-2">
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                Dev Mode
              </span>
              <Switch
                size="small"
                checked={isDevMode}
                onChange={toggleDevMode}
              />
            </div>
          </div>
        }
        placement="bottom"
        closable={true}
        onClose={closeDrawer}
        open={isDrawerOpen}
        mask={false}
        height={480} // Adjusted height
        styles={{
          content: {
            backgroundColor: "#333333aa",
            width: "600px",
            backdropFilter: "blur(10px)",
            marginLeft: "auto",
            marginRight: "auto",
          },
          header: {
            backgroundColor: "#333333aa",
            borderBottom: "1px solid #444444",
          },
          body: {
            padding: 0,
          },
        }}
      >
        <N64ControllerLayout
          onClickButton={onClickButton}
          isDevMode={isDevMode}
        />
      </Drawer>
    </>
  );
};

export default N64Controller;

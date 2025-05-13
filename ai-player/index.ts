import Vitrus from "vitrus";
import fs from "fs";
import path from "path";

const vitrus = new Vitrus({
  apiKey: import.meta.env.VITRUS_API_KEY as string,
  world: import.meta.env.VITRUS_WORLD as string, // as we are using an actor, we need to define a world for it.
  // baseUrl: "ws://localhost:3333",
  // debug: true,
});

const emulator = await vitrus.actor("emulator");

// Simple function call
const response = await emulator.run("log", {
  message: "Hello world!",
});
console.log(response);

// Screenshot function call
const screenshot = await emulator.run("screenshot");
console.log(screenshot);

if (screenshot) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `screenshot-${timestamp}.png`;
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const filePath = path.join(screenshotsDir, fileName);

  try {
    // Ensure the screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Remove data URI prefix if present
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, imageBuffer);
    console.log(`Screenshot saved to ${filePath}`);

  } catch (error) {
    console.error("Failed to save screenshot:", error);
  }
} else {
  console.error("Screenshot data is not in the expected format:", screenshot);
}


const responseButton = await emulator.run("press_button", {
  button: "START",
});

console.log(responseButton);
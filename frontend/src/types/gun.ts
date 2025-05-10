/**
 * Defines the types of commands that can be sent from the server to the client via Gun.js.
 */
export type ClientGunCommandType = 'REQUEST_SCREENSHOT' | 'PRESS_BUTTON';

/**
 * Base interface for all commands sent from the server to the client.
 */
export interface BaseClientGunCommand {
  id: string; // Unique ID for this command instance
  type: ClientGunCommandType;
}

/**
 * Command sent from the server to request a screenshot from the client.
 */
export interface RequestScreenshotClientCommand extends BaseClientGunCommand {
  type: 'REQUEST_SCREENSHOT';
}

/**
 * Command sent from the server to simulate a button press on the client's emulator.
 */
export interface PressButtonClientCommandPayload {
  player: number;    // Player index (e.g., 0 for player 1)
  controlName: string; // Name of the control to press (e.g., "START", "BUTTON_A")
  value: number;     // Value for the control (e.g., 1 for press, 0 for release, or analog value)
  duration?: number; // Optional duration in milliseconds to hold the button press. Defaults to 200ms.
}

export interface PressButtonClientCommand extends BaseClientGunCommand {
  type: 'PRESS_BUTTON';
  payload: PressButtonClientCommandPayload;
}

/**
 * Union type representing all possible commands the client can receive from the server.
 */
export type ClientGunCommand = RequestScreenshotClientCommand | PressButtonClientCommand;

/**
 * Message type for the client sending screenshot data back to the server.
 */
export interface GunScreenshotResponseMessage {
  id: string;          // Unique ID for this screenshot data packet
  commandId: string;   // ID of the RequestScreenshotClientCommand that initiated this screenshot
  data: string;        // Base64 encoded image data
  timestamp: number;   // Epoch milliseconds timestamp of when the screenshot was taken/sent
}

// --- New Server Log Message Type ---
/**
 * Message type for logs sent from the server to be displayed on the client.
 */
export interface ServerLogMessage {
  id: string;          // Unique ID for this log message
  message: string;     // The content of the log
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"; // Log level
  timestamp: number;   // Epoch milliseconds timestamp of when the log was generated
} 
/**
 * N64 Control Map
 * 
 * This object maps human-readable N64 controller button/axis names
 * to their corresponding key codes or identifiers used by the emulator.
 * 
 * - A, B, START: Standard letter/symbol keys for buttons.
 * - DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT: Arrow keys for the D-Pad.
 * - L_TRIG, R_TRIG, Z_TRIG: Keyboard keys for triggers (e.g., Q, E, Tab).
 * - C_UP, C_DOWN, C_LEFT, C_RIGHT: Keys for C-buttons (e.g., K, I, J, L).
 * - LEFT_STICK_X_PLUS, LEFT_STICK_X_MINUS: Keys for positive/negative X-axis of the left analog stick (e.g., H, F).
 * - LEFT_STICK_Y_PLUS, LEFT_STICK_Y_MINUS: Keys for positive/negative Y-axis of the left analog stick (e.g., G, T).
 * 
 * The specific key codes (like 88 for 'A', 38 for 'DPAD_UP') are examples
 * and should match the expected input codes for the target N64 emulator.
 */
export const N64_CONTROL_MAP: { [key: string]: number } = {
  A: 88,          // Typically 'X' key
  B: 83,          // Typically 'S' key
  START: 13,      // Enter key
  DPAD_UP: 38,    // Up arrow
  DPAD_DOWN: 40,  // Down arrow
  DPAD_LEFT: 37,  // Left arrow
  DPAD_RIGHT: 39, // Right arrow
  L_TRIG: 81,     // Typically 'Q' key
  R_TRIG: 69,     // Typically 'E' key
  Z_TRIG: 9,      // Tab key
  C_UP: 75,       // Typically 'K' key
  C_DOWN: 73,     // Typically 'I' key
  C_LEFT: 74,     // Typically 'J' key
  C_RIGHT: 76,    // Typically 'L' key
  LEFT_STICK_X_PLUS: 72,  // Typically 'H' for rightward stick movement
  LEFT_STICK_X_MINUS: 70, // Typically 'F' for leftward stick movement
  LEFT_STICK_Y_PLUS: 71,  // Typically 'G' for upward stick movement (often inverted, check emulator)
  LEFT_STICK_Y_MINUS: 84, // Typically 'T' for downward stick movement (often inverted, check emulator)
  // Add other less common ones if needed, e.g. BUTTON_2, BUTTON_4 directly if used
  // These might represent other specific gamepad buttons or functions if mapped.
};

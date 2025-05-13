/**
 * N64 Control Map
 * 
 * This object maps human-readable N64 controller button/axis names,
 * based on observed gamepad mappings, to their corresponding key codes
 * or identifiers used potentially by an emulator or input system.
 * 
 * The names like 'BUTTON_2', 'DPAD_UP', 'LEFT_TOP_SHOULDER', 'LEFT_STICK_X:+1'
 * correspond to specific inputs detected from a controller.
 * 
 * The numeric values (e.g., 88, 38, 81, 72) represent the key codes
 * associated with these inputs.
 */
export const N64_CONTROL_MAP: { [key: string]: number } = {
  // Buttons
  'BUTTON_2': 0,  // Corresponds to 'A' in original mapping?
  'BUTTON_4': 1,  // Corresponds to 'B' in original mapping?
  'START': 3,     // Enter key

  // D-Pad
  'DPAD_UP': 4,    // Up arrow
  'DPAD_DOWN': 5,  // Down arrow
  'DPAD_LEFT': 6,  // Left arrow
  'DPAD_RIGHT': 7, // Right arrow

  // Shoulders/Triggers
  'LEFT_TOP_SHOULDER': 10,     // Corresponds to 'L_TRIG' in original mapping? (e.g., 'Q')
  'RIGHT_TOP_SHOULDER': 11,    // Corresponds to 'R_TRIG' in original mapping? (e.g., 'E')
  'LEFT_BOTTOM_SHOULDER': 12,   // Corresponds to 'Z_TRIG' in original mapping? (e.g., Tab)

  // Left Stick Axes
  'LEFT_STICK_X:+1': 16,  // Positive X-axis (e.g., 'H')
  'LEFT_STICK_X:-1': 17, // Negative X-axis (e.g., 'F')
  'LEFT_STICK_Y:+1': 18,  // Positive Y-axis (e.g., 'G')
  'LEFT_STICK_Y:-1': 19, // Negative Y-axis (e.g., 'T')


  // Right Stick (originally mapped to C-buttons)
  'RIGHT_STICK_X:+1': 20,    // Corresponds to 'C_RIGHT' (e.g., 'L')
  'RIGHT_STICK_X:-1': 21,    // Corresponds to 'C_LEFT' (e.g., 'J')
  'RIGHT_STICK_Y:+1': 22,    // Corresponds to 'C_UP' (e.g., 'K')
  'RIGHT_STICK_Y:-1': 23,    // Corresponds to 'C_DOWN' (e.g., 'I')

  // Indices 24-29 from the image had values 49, 50, 51, 0, 0, 0 but no value2.
  // These are omitted unless their corresponding control names are known.
};

/**
 * Retrieves the N64 key code for a given control name.
 * 
 * @param controlName The human-readable name of the N64 control (e.g., "A", "START", "DPAD_UP").
 * @returns The corresponding key code number, or undefined if the control name is not found.
 */
export const getN64KeyCode = (controlName: string): number | undefined => {
  return N64_CONTROL_MAP[controlName];
};

const specialKeys = [16, 17, 18, 19, 20, 21, 22, 23];
export const isSpecialKey = (key: number): boolean => {
  return specialKeys.includes(key);
};

export const analogInput = 0x7fff;

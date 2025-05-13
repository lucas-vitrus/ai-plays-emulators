// This file contains functions for interacting with the EJS emulator.

/**
 * Simulates pressing and optionally releasing a button on the emulator.
 *
 * @param player - The player number (e.g., 0 for player 1).
 * @param control - The name or identifier of the control/button to simulate.
 * @param value - The value to set for the control (e.g., 1 for press, 0 for release).
 * @param duration - The duration in milliseconds to hold the button press.
 *                   If > 0 and value is 1, the button will be automatically released after this duration.
 */
export const pressButton = (
  player: number,
  control: string,
  value: 0 | 1,
  duration: number
): void => {
  try {
    if (
      (window as any).EJS_emulator?.gameManager?.functions?.simulateInput
    ) {
      (window as any).EJS_emulator.gameManager.functions.simulateInput(
        player,
        control,
        value
      );

      if (value === 1 && duration > 0) {
        setTimeout(() => {
          try {
            (
              window as any
            ).EJS_emulator.gameManager.functions.simulateInput(
              player,
              control,
              0 // Release the button
            );
          } catch (e: any) {
            console.error(
              `Error during button release simulation: player ${player}, control ${control}. Error: ${e.message}`,
              e
            );
          }
        }, duration);
      }
    } else {
      console.warn("EJS_emulator or simulateInput function not found on window.");
    }
  } catch (e: any) {
    console.error(
      `Error during initial button press simulation: player ${player}, control ${control}, value ${value}. Error: ${e.message}`,
      e
    );
  }
}; 
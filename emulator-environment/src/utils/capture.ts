// Utility functions for capturing DOM elements as images.

import html2canvas from 'html2canvas';

/**
 * Captures a given DOM element as a PNG data URL.
 * @param element - the HTML element to capture
 * @returns a Promise that resolves to a data URL string
 */
export async function captureDivAsImage(element: HTMLElement): Promise<string> {
  if (!element) throw new Error("No element provided for capture.");
  // render the element to a canvas
  const canvas = await html2canvas(element, {
    // optional settings:
    // useCORS: true,
    // backgroundColor: null, // Setting this to null will make the background transparent
    scale: window.devicePixelRatio, // Improves quality on high-density displays
  });
  // get a PNG data URL
  return canvas.toDataURL('image/png');
} 
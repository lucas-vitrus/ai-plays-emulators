import { defaultSize } from "./defaultSize"

type Params = {
  loader: string
  width?: number
  height?: number
}

// Export this type for EmulatorJS.tsx to use
export type EmulatorArtifacts = {
  gameHostElement: HTMLDivElement
  scriptToLoad: string
}

export const buildEmulator = ({
  loader,
  width = defaultSize.width,
  height = defaultSize.height,
}: Params): EmulatorArtifacts => {
  const gameHostElement = document.createElement("div")
  // Apply styles that were previously on the outer div in the iframe body
  gameHostElement.style.width = `${width}px`
  gameHostElement.style.height = `${height}px`
  gameHostElement.style.maxWidth = "100%"
  // Note: The style "body, html { margin: 0; padding: 0; }" from the original iframe
  // is not applied here directly. If needed, it could be applied to this element
  // or its parent in EmulatorJS.tsx.

  const gameDiv = document.createElement("div")
  gameDiv.id = "game"
  // To ensure gameDiv fills gameHostElement if desired (optional, depends on emulator's CSS)
  // gameDiv.style.width = "100%";
  // gameDiv.style.height = "100%";

  gameHostElement.appendChild(gameDiv)

  return {
    gameHostElement,
    scriptToLoad: loader,
  }
}

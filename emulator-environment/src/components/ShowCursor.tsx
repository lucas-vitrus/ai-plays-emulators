// frontend/src/components/ShowCursor.tsx
// This component renders a circle that follows the mouse cursor
// and shows a ripple effect on click.
// It is designed to be overlaid on top of all other content.

import React, { useState, useEffect } from "react";
import type { CSSProperties } from "react";

interface ShowCursorProps {
  size?: number;
  color?: string;
  label?: string; // Optional label text
  hideCursor?: boolean; // Optional prop to hide the default browser cursor
}

// --- RippleItem Component ---/
const RIPPLE_ANIMATION_DURATION = 600; // ms

interface RippleItemProps {
  id: string;
  x: number;
  y: number;
  itemSize: number;
  color: string;
  onComplete: (id: string) => void;
}

const RippleItem: React.FC<RippleItemProps> = ({
  id,
  x,
  y,
  itemSize,
  color,
  onComplete,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const startAnimTimer = requestAnimationFrame(() => {
      setIsAnimating(true);
    });

    const removeTimer = setTimeout(() => {
      onComplete(id);
    }, RIPPLE_ANIMATION_DURATION);

    return () => {
      cancelAnimationFrame(startAnimTimer);
      clearTimeout(removeTimer);
    };
  }, [id, onComplete]);

  const rippleBaseStyle: CSSProperties = {
    position: "fixed",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 9998, // Just below the main cursor
    border: `2px solid ${color}`,
    backgroundColor: "transparent",
    transition: `transform ${RIPPLE_ANIMATION_DURATION}ms ease-out, opacity ${RIPPLE_ANIMATION_DURATION}ms ease-out`,
    willChange: "transform, opacity",
    left: `${x}px`,
    top: `${y}px`,
    width: `${itemSize}px`,
    height: `${itemSize}px`,
  };

  const initialStyle: CSSProperties = {
    ...rippleBaseStyle,
    transform: "translate(-50%, -50%) scale(0.5)",
    opacity: 0.7,
  };

  const animatingStyle: CSSProperties = {
    ...rippleBaseStyle,
    transform: `translate(-50%, -50%) scale(${itemSize > 20 ? 2.5 : 3.5})`,
    opacity: 0,
  };

  return <div style={isAnimating ? animatingStyle : initialStyle} />;
};

// --- ShowCursor Component ---/
interface RippleState {
  id: string;
  x: number;
  y: number;
  rippleSize: number;
}

const ShowCursor: React.FC<ShowCursorProps> = ({
  size = 20,
  color = "#007AFF",
  label,
  hideCursor = false, // Default to false
}) => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [ripples, setRipples] = useState<RippleState[]>([]);

  // Helper function to determine text color based on background brightness
  const getContrastingTextColor = (hexColor: string): string => {
    if (!hexColor.startsWith('#')) {
      // If not a hex color, default to black. Could be improved for named colors.
      return '#000000';
    }
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Standard luminance calculation
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 128 ? '#000000' : '#FFFFFF'; // Dark text on light bg, light text on dark bg
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    const handleMouseDown = (event: MouseEvent) => {
      const newRipple: RippleState = {
        id: `ripple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: event.clientX,
        y: event.clientY,
        rippleSize: size,
      };
      setRipples((prevRipples) => [...prevRipples, newRipple]);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);

    const originalBodyCursor = document.body.style.cursor;
    if (hideCursor) {
      document.body.style.cursor = 'none';
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      document.body.style.cursor = originalBodyCursor; // Restore original cursor style on unmount
    };
  }, [size, color, hideCursor]); // Added hideCursor to dependencies

  const handleRippleComplete = (idToRemove: string) => {
    setRipples((prevRipples) => prevRipples.filter((r) => r.id !== idToRemove));
  };

  const cursorStyle: CSSProperties = {
    position: "fixed",
    top: `${position.y - size / 2}px`,
    left: `${position.x - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: color.startsWith('#') ? `${color}80` : `rgba(0, 122, 255, 0.5)`,
    borderRadius: "50%",
    border: `2px solid ${color}`,
    zIndex: 9999,
    pointerEvents: "none",
    transition: "transform 0.05s ease-out", // Faster transition for main cursor
    willChange: "transform",
  };

  const labelStyle: CSSProperties = {
    position: "fixed",
    top: `${position.y + size / 2 + 5}px`,
    left: `${position.x}px`,
    transform: 'translateX(-50%)',
    backgroundColor: color.startsWith('#') ? `${color}CC` : color, // Use main color with ~80% opacity for hex, otherwise full
    color: getContrastingTextColor(color), // Set text color for contrast
    padding: '2px 5px',
    borderRadius: '3px',
    fontSize: '12px',
    zIndex: 9999, // Same z-index as cursor
    pointerEvents: 'none',
    whiteSpace: 'nowrap', // Prevent label from wrapping
    transition: "transform 0.05s ease-out",
    willChange: "transform",
  };

  return (
    <>
      <div style={cursorStyle} />
      {label && position.x > -100 && (
        <div style={labelStyle}>{label}</div>
      )}
      {ripples.map((ripple) => (
        <RippleItem
          key={ripple.id}
          id={ripple.id}
          x={ripple.x}
          y={ripple.y}
          itemSize={ripple.rippleSize}
          color={color}
          onComplete={handleRippleComplete}
        />
      ))}
    </>
  );
};

export default ShowCursor;

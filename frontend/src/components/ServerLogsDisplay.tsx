// frontend/src/components/ServerLogsDisplay.tsx
// This component is responsible for displaying server-side logs in a terminal-like view.

import React, { useEffect, useRef } from "react";
import type { ServerLogMessage } from "../types/gun";

interface ServerLogsDisplayProps {
  logs: ServerLogMessage[];
  maxHeight?: string; // e.g., "33vh", "200px"
  className?: string;
}

const getLogLevelColor = (level: ServerLogMessage["level"]) => {
  switch (level) {
    case "ERROR":
      return "#FF4D4F"; // Ant Design red for dark theme
    case "WARN":
      return "#FAAD14"; // Ant Design orange for dark theme
    case "DEBUG":
      return "#722ED1"; // Ant Design purple for dark theme
    case "INFO":
    default:
      return "#52C41A"; // Ant Design green for dark theme
  }
};

const ServerLogsDisplay: React.FC<ServerLogsDisplayProps> = ({
  logs,
  maxHeight = "80vh",
  className = "",
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const defaultClasses =
    "absolute top-10 left-10 w-full md:w-1/3 h-screen bg-black bg-opacity-60 p-2 z-0 overflow-y-auto text-xs font-mono overscroll-contain";

  return (
    <div
      ref={logContainerRef}
      className={`${defaultClasses} ${className}`.trim()}
      style={{
        maxHeight: maxHeight,
        backdropFilter: "blur(3px)", // Slightly increased blur
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: "1px 0 0 1px", // Top and left border for a bit of definition
        borderStyle: "solid",
        boxShadow: "-2px -2px 10px rgba(0,0,0,0.3)", // Subtle shadow for depth
      }}
    >
      <div className="text-gray-400 mb-1 sticky top-0 bg-black bg-opacity-70 backdrop-blur-sm z-10 py-1 px-1 -mx-2 -mt-2 border-b border-gray-700">
        Player Logs
      </div>
      <div style={{ paddingTop: "0.5rem" }}>
        {" "}
        {/* Add some padding below the sticky header */}
        {logs.map((log) => (
          <div key={log.id} className="whitespace-pre-wrap break-words mb-0.5">
            <span style={{ color: getLogLevelColor(log.level) }}>
              [{log.level}]
            </span>
            <span className="text-gray-500 ml-1">
              [{new Date(log.timestamp).toLocaleTimeString()}]:
            </span>
            <span className="ml-1 text-gray-300">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Awaiting server logs...</div>
        )}
      </div>
    </div>
  );
};

export default ServerLogsDisplay;

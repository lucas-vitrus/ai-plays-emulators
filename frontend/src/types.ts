
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
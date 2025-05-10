import { useEffect, useCallback, type ChangeEvent } from "react";
import { Peer } from "peerjs";
import { create } from "zustand";
import { Button, Input } from "antd";
import { customAlphabet } from "nanoid";
import { PiArrowsClockwise, PiCopy } from "react-icons/pi";

// --- Types ---
type ImageRecord = { id: string; data: string };
type JsonRecord = { id: string; payload: any };

// --- Zustand Store ---
interface Store {
  peer?: Peer;
  peerId: string;
  connections: Record<string, any>;
  targetId: string;
  file: File | null;
  images: ImageRecord[];
  messages: JsonRecord[];
  jsonText: string;

  setPeer: (p: Peer) => void;
  setPeerId: (id: string) => void;
  addConnection: (conn: any) => void;
  setTargetId: (id: string) => void;
  setFile: (file: File | null) => void;
  addImage: (img: ImageRecord) => void;
  addMessage: (msg: JsonRecord) => void;
  setJsonText: (text: string) => void;
}

const PEER_ID_STORAGE_KEY = "peerId";
const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);
const generateNewPeerId = () => `v-${nanoid()}`;

export const useStore = create<Store>((set, get) => ({
  peer: undefined,
  peerId: "",
  connections: {},
  targetId: "",
  file: null,
  images: [],
  messages: [],
  jsonText: "",

  setPeer: (p) => set({ peer: p }),
  setPeerId: (id) => set({ peerId: id }),
  addConnection: (conn) =>
    set({ connections: { ...get().connections, [conn.peer]: conn } }),
  setTargetId: (id) => set({ targetId: id }),
  setFile: (file) => set({ file }),
  addImage: (img) =>
    set({
      images: get().images.some((i) => i.id === img.id)
        ? get().images
        : [...get().images, img],
    }),
  addMessage: (msg) =>
    set({
      messages: get().messages.some((m) => m.id === msg.id)
        ? get().messages
        : [...get().messages, msg],
    }),
  setJsonText: (text) => set({ jsonText: text }),
}));

// --- React Component ---
export default function RemoteController() {
  const {
    peer,
    peerId,
    connections,
    targetId,
    file,
    images,
    messages,
    jsonText,
    setPeer,
    setPeerId,
    addConnection,
    setTargetId,
    setFile,
    addImage,
    addMessage,
    setJsonText,
  } = useStore();

  // Load peerId from localStorage or generate a new one on mount
  useEffect(() => {
    let storedPeerId = localStorage.getItem(PEER_ID_STORAGE_KEY);
    if (!storedPeerId) {
      storedPeerId = generateNewPeerId();
      localStorage.setItem(PEER_ID_STORAGE_KEY, storedPeerId);
    }
    setPeerId(storedPeerId);
  }, [setPeerId]);

  // Memoized connection handler
  const wireConnection = useCallback(
    (conn: any) => {
      conn.on("data", (raw: any) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === "image") {
            addImage({ id: msg.id, data: msg.data });
          } else if (msg.type === "json") {
            addMessage({ id: msg.id, payload: msg.payload });
          }
        } catch (e) {
          console.error("Failed to parse incoming data:", e);
        }
      });
      addConnection(conn);
    },
    [addImage, addMessage, addConnection]
  );

  // Initialize and manage PeerJS instance
  useEffect(() => {
    if (!peerId) return; // Don't initialize if peerId isn't set yet

    // Clean up previous peer instance if it exists
    if (peer && !peer.destroyed) {
      console.log(`Destroying previous PeerJS instance for ID: ${peer.id}`);
      peer.destroy();
    }

    console.log(`Attempting to initialize Peer with ID: ${peerId}`);
    const newPeerInstance = new Peer(peerId);

    newPeerInstance.on("open", (id) => {
      console.log(
        `PeerJS connection open with ID: ${id}. Listening for connections.`
      );
      // We use the peerId from the store as the source of truth.
      // 'id' here is confirmation from the server.
      setPeer(newPeerInstance);
    });

    newPeerInstance.on("connection", (conn) => {
      console.log(`New connection from ${conn.peer}`);
      wireConnection(conn);
    });

    newPeerInstance.on("error", (err: any) => {
      console.error("PeerJS error:", err);
      if (err.type === "unavailable-id") {
        alert(
          `Peer ID "${peerId}" is unavailable. Generating a new one automatically.`
        );
        const newId = generateNewPeerId();
        localStorage.setItem(PEER_ID_STORAGE_KEY, newId);
        setPeerId(newId); // This will trigger a re-run of this useEffect
      } else if (err.type === "peer-unavailable") {
        // This typically means the target peer ID doesn't exist or is offline
        // Already handled by connect logic, but good to log
        console.warn(`Target peer ID "${targetId}" is unavailable.`);
      }
      // Consider setting an error state in the store for other types of errors
    });

    // Set the new peer instance in the store, replacing the old one if any
    // This might seem redundant if newPeerInstance.on('open') also calls setPeer,
    // but it's a fallback and ensures peer is set if 'open' is delayed or if we don't rely on 'open' for setting.
    // However, for consistency, let's primarily rely on 'open'.
    // setPeer(newPeerInstance); // Re-evaluating this: setPeer in 'open' is better.

    return () => {
      console.log(`Cleaning up PeerJS instance for ID: ${newPeerInstance.id}`);
      if (newPeerInstance && !newPeerInstance.destroyed) {
        newPeerInstance.destroy();
      }
    };
  }, [peerId, setPeer, setPeerId, wireConnection]); // Added setPeerId for the error case

  // Dial a peer
  const connect = () => {
    if (!peer || !targetId || connections[targetId] || peer.disconnected) {
      if (peer && peer.disconnected && !peer.destroyed) {
        console.log("Peer is disconnected, attempting to reconnect...");
        peer.reconnect();
      } else if (!peer || peer.destroyed) {
        console.error(
          "PeerJS instance is not available or destroyed. Cannot connect."
        );
        alert(
          "Connection not ready. Please wait or reset your ID if issues persist."
        );
        return;
      }
      if (!targetId) {
        alert("Target Peer ID is empty.");
        return;
      }
      if (connections[targetId]) {
        console.log(
          `Already connected to or attempting to connect to ${targetId}`
        );
        return;
      }
    }
    console.log(`Attempting to connect to target: ${targetId}`);
    const conn = peer.connect(targetId);
    conn.on("open", () => {
      console.log(`Connection established with ${targetId}`);
      wireConnection(conn);
    });
    conn.on("error", (err: any) => {
      console.error(`Connection error with ${targetId}:`, err);
      alert(
        `Failed to connect to ${targetId}. Please check the ID and network.`
      );
    });
  };

  // Send an image
  const sendImage = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const id = Date.now().toString();
      const msg = JSON.stringify({ type: "image", id, data: base64 });
      Object.values(connections).forEach((c) => c.send(msg));
      addImage({ id, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Send JSON
  const sendJson = () => {
    try {
      const payload = JSON.parse(jsonText);
      const id = Date.now().toString();
      const msg = JSON.stringify({ type: "json", id, payload });
      Object.values(connections).forEach((c) => c.send(msg));
      addMessage({ id, payload });
      setJsonText("");
    } catch {
      alert("Invalid JSON");
    }
  };

  // Copy Peer ID to clipboard
  const copyPeerIdToClipboard = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId).then(
        () => {
          console.log("Peer ID copied to clipboard!");
          // Consider adding a user-friendly notification (e.g., Ant Design message)
        },
        (err) => {
          console.error("Failed to copy Peer ID: ", err);
          alert("Failed to copy Peer ID.");
        }
      );
    }
  };

  const handleResetPeerId = () => {
    const newId = generateNewPeerId();
    localStorage.setItem(PEER_ID_STORAGE_KEY, newId);
    setPeerId(newId); // This will trigger the useEffect to re-initialize Peer
    alert(`Peer ID has been reset to: ${newId}`);
  };

  return (
    <div style={{ padding: 20, zIndex: 1000, maxWidth: 600, margin: "auto" }}>
      <section
        style={{
          marginBottom: 20,
          padding: 15,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h2>Window</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Input
            value={peerId || "Generating..."}
            readOnly
            style={{ flexGrow: 1 }}
            addonBefore={
              <div className="flex items-center gap-2">
                {" "}
                <Button
                  onClick={handleResetPeerId}
                  icon={<PiArrowsClockwise />}
                  shape="circle"
                  type="text"
                  size="small"
                ></Button>
                ID
              </div>
            }
          />
          <Button
            type="text"
            onClick={copyPeerIdToClipboard}
            disabled={!peerId}
            icon={<PiCopy />}
            shape="circle"
          ></Button>
        </div>
        {peer && peer.disconnected && !peer.destroyed && (
          <p style={{ color: "orange", marginTop: 5 }}>
            Status: Disconnected. Attempting to reconnect...
          </p>
        )}
        {peer && !peer.disconnected && !peer.destroyed && (
          <p style={{ color: "green", marginTop: 5 }}>
            Status: Connected to PeerServer
          </p>
        )}
        {(!peer || peer.destroyed) && !peerId && (
          <p style={{ color: "red", marginTop: 5 }}>Status: Initializing...</p>
        )}
        {(!peer || peer.destroyed) && peerId && (
          <p style={{ color: "red", marginTop: 5 }}>
            Status: Not connected. Please check console or reset ID.
          </p>
        )}
      </section>

      <section
        style={{
          marginBottom: 20,
          padding: 15,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h2>Connect to Remote Peer</h2>
        <input
          placeholder="Peer ID"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
        />
        <Button
          onClick={connect}
          disabled={!targetId || !peer || peer.disconnected || peer.destroyed}
        >
          Connect
        </Button>
      </section>

      <section
        style={{
          marginBottom: 20,
          padding: 15,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h2>Send Image</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFile(e.target.files?.[0] || null)
          }
        />
        <Button
          onClick={sendImage}
          disabled={
            !file ||
            !Object.keys(connections).length ||
            (peer && (peer.disconnected || peer.destroyed))
          }
        >
          Send Image
        </Button>
      </section>

      <section
        style={{
          marginBottom: 20,
          padding: 15,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h2>Send JSON</h2>
        <textarea
          rows={3}
          cols={40}
          placeholder='{"foo":"bar"}'
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <br />
        <Button
          onClick={sendJson}
          disabled={
            !jsonText ||
            !Object.keys(connections).length ||
            (peer && (peer.disconnected || peer.destroyed))
          }
        >
          Send JSON
        </Button>
      </section>

      <section
        style={{
          marginBottom: 20,
          padding: 15,
          border: "1px solid #eee",
          borderRadius: 8,
        }}
      >
        <h2>Received Images</h2>
        {images.length === 0 && <p>No images received yet.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {images.map((img) => (
            <img
              key={img.id}
              src={img.data}
              alt={`Received image ${img.id}`}
              style={{
                maxWidth: 150,
                maxHeight: 150,
                border: "1px solid #ddd",
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </section>

      <section
        style={{ padding: 15, border: "1px solid #eee", borderRadius: 8 }}
      >
        <h2>Received JSON</h2>
        {messages.length === 0 && <p>No JSON messages received yet.</p>}
        <ul>
          {messages.map((msg: JsonRecord) => (
            <li key={msg.id}>
              <code>{JSON.stringify(msg.payload)}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

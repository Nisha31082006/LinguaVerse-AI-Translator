import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import AppLayout from "../layouts/AppLayout";

interface Utterance {
  speaker: string;
  originalText: string;
  translatedText: string | null;
  timestamp: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ta", name: "Tamil" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

export default function LiveConversationPage() {
  const socketRef = useRef<Socket | null>(null);

  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [myLanguage, setMyLanguage] = useState("en");
  const [peerLanguage, setPeerLanguage] = useState("ta");
  const [message, setMessage] = useState("");
  const [feed, setFeed] = useState<Utterance[]>([]);
  const [peerPresent, setPeerPresent] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = io("/", { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("joined-room", () => setJoined(true));
    socket.on("peer-joined", () => setPeerPresent(true));
    socket.on("peer-left", () => setPeerPresent(false));

    socket.on("utterance", (data: Utterance) => {
      setFeed((prev) => [...prev, data]);
    });

    socket.on("translation", (data: Utterance & { targetLanguage: string }) => {
      setFeed((prev) => {
        const idx = [...prev]
          .reverse()
          .findIndex((u) => u.originalText === data.originalText && u.translatedText === null);
        if (idx === -1) return [...prev, data];
        const realIdx = prev.length - 1 - idx;
        const updated = [...prev];
        updated[realIdx] = { ...updated[realIdx], translatedText: data.translatedText };
        return updated;
      });
    });

    socket.on("translation-error", () => {
      // surfaced inline via the untranslated utterance remaining as-is
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  function joinRoom() {
    if (!roomCode.trim() || !socketRef.current) return;
    socketRef.current.emit("join-room", { roomCode: roomCode.trim() });
  }

  function sendMessage() {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("speak", {
      roomCode: roomCode.trim(),
      text: message,
      sourceLanguage: myLanguage,
      targetLanguage: peerLanguage,
    });
    setMessage("");
  }

  return (
    <AppLayout>
      <h1 className="mb-6 text-2xl font-bold text-primary-600">Live Conversation</h1>

      {!joined ? (
        <div className="max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">
            {connected ? "Connected to server." : "Connecting…"}
          </p>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Room code (share this with the other person)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={joinRoom}
            disabled={!connected || !roomCode.trim()}
            className="w-full rounded-lg bg-primary-600 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            Join room
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <span>
              Room <strong>{roomCode}</strong>
            </span>
            <span className={peerPresent ? "text-emerald-500" : "text-slate-400"}>
              {peerPresent ? "● Peer connected" : "○ Waiting for peer…"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-slate-500">I speak</label>
              <select
                value={myLanguage}
                onChange={(e) => setMyLanguage(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <label className="text-slate-500">translate to</label>
              <select
                value={peerLanguage}
                onChange={(e) => setPeerLanguage(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-96 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            {feed.length === 0 && (
              <p className="text-sm text-slate-400">
                No messages yet — say something below.
              </p>
            )}
            {feed.map((u, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3 text-sm dark:border-slate-800">
                <p className="text-xs font-medium text-slate-400">{u.speaker}</p>
                <p>{u.originalText}</p>
                {u.translatedText ? (
                  <p className="mt-1 text-primary-600">{u.translatedText}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">translating…</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

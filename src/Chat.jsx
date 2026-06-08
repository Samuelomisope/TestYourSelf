import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
import { useAuth } from "./useAuth";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft, faUsers, faUser, faPaperPlane,
  faSpinner, faStore, faMicrophone, faImage,
  faFile, faSmile, faReply, faCheck, faCheckDouble,
  faPlus, faTimes, faSearch, faStop, faVideo,
  faPalette, faXmark, faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { encryptMessage, decryptMessage } from "./crypto";
import { uploadSingle } from "./useUpload";
import { API } from "./config";

// ── Helpers ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function safeAvatar(url, seed) {
  const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || "?")}`;
  if (!url || url.startsWith("blob:")) return fallback;
  return url;
}

function avatarError(e, seed) {
  e.target.onerror = null;
  e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || "?")}`;
}

function isStatusExpired(status) {
  return Date.now() - new Date(status.createdAt).getTime() > 24 * 60 * 60 * 1000;
}

// FIX: Pick the best supported audio format for the current browser.
// iOS/Safari only supports audio/mp4; Chrome/Firefox support audio/webm.
function getSupportedMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🙏"];

const WALLPAPER_PRESETS = [
  { id: "default",  label: "Default",  bg: "#f0f4ff", type: "color" },
  { id: "midnight", label: "Midnight", bg: "#0f172a", type: "color" },
  { id: "rose",     label: "Rose",     bg: "#fff1f2", type: "color" },
  { id: "forest",   label: "Forest",   bg: "#f0fdf4", type: "color" },
  { id: "sand",     label: "Sand",     bg: "#fefce8", type: "color" },
  { id: "slate",    label: "Slate",    bg: "#f8fafc", type: "color" },
  { id: "lavender", label: "Lavender", bg: "#f5f3ff", type: "color" },
  { id: "ocean",    label: "Ocean",    bg: "#ecfeff", type: "color" },
];

const STATUS_BG_COLORS = [
  { id: "indigo",  label: "Indigo",  value: "#4f46e5" },
  { id: "rose",    label: "Rose",    value: "#e11d48" },
  { id: "emerald", label: "Emerald", value: "#059669" },
  { id: "amber",   label: "Amber",   value: "#d97706" },
  { id: "sky",     label: "Sky",     value: "#0284c7" },
  { id: "purple",  label: "Purple",  value: "#7c3aed" },
  { id: "pink",    label: "Pink",    value: "#db2777" },
  { id: "dark",    label: "Dark",    value: "#1e293b" },
];

// ── Read Receipt ───────────────────────────────────────────────────
function ReadReceipt({ isRead, isOwn }) {
  if (!isOwn) return null;
  return (
    <span className={`text-xs ml-1 ${isRead ? "text-blue-400" : "text-gray-300"}`}>
      <FontAwesomeIcon icon={isRead ? faCheckDouble : faCheck} />
    </span>
  );
}

// ── Voice Note Button ──────────────────────────────────────────────
// FIX: Click-based toggle instead of onMouseDown/onTouchStart which
// double-fires on mobile and causes instant start+stop.
function VoiceNoteButton({ onStart, onStop, recording, recordingSeconds }) {
  return (
    <button
      onClick={recording ? onStop : onStart}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition relative select-none ${
        recording
          ? "bg-red-500 text-white"
          : "bg-gray-100 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50"
      }`}
      title={recording ? "Stop recording" : "Record voice note"}
    >
      {recording && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40 pointer-events-none" />
      )}
      <FontAwesomeIcon icon={recording ? faStop : faMicrophone} className="relative z-10" />
      {recording && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-500 font-mono whitespace-nowrap bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm">
          {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
          {String(recordingSeconds % 60).padStart(2, "0")}
        </span>
      )}
    </button>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────
function MessageBubble({ message, isOwn, onReply, onReact }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const decryptedText = message.text ? decryptMessage(message.text) : null;

  const groupedReactions = useMemo(() =>
    message.reactions?.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {}),
    [message.reactions]
  );

  return (
    <div className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {!isOwn && (
        <img
          src={safeAvatar(message.sender?.photoURL, message.sender?.displayName)}
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
          alt=""
          onError={(e) => avatarError(e, message.sender?.displayName)}
        />
      )}

      <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <p className="text-xs text-indigo-400 mb-1 ml-1 font-medium">{message.sender?.displayName}</p>
        )}

        {message.replyTo && (
          <div className="px-3 py-1.5 rounded-xl mb-1 text-xs border-l-2 border-indigo-400 bg-gray-100 text-gray-500 max-w-full truncate">
            <p className="font-medium text-indigo-500">{message.replyTo.sender?.displayName}</p>
            <p className="truncate">{message.replyTo.text ? decryptMessage(message.replyTo.text) : "Media"}</p>
          </div>
        )}

        <div className="relative">
          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
            isOwn
              ? "bg-indigo-500 text-white rounded-tr-sm"
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
          }`}>
            {message.type === "image" && message.mediaUrl && (
              <img
                src={message.mediaUrl}
                alt="media"
                className="rounded-xl max-w-[200px] mb-1 cursor-pointer"
                onClick={() => window.open(message.mediaUrl, "_blank")}
              />
            )}
            {message.type === "video" && message.mediaUrl && (
              <video src={message.mediaUrl} controls className="rounded-xl max-w-[200px] mb-1" />
            )}

            {/* FIX: Proper audio player with preload, fallback source, and styling */}
            {message.type === "audio" && message.mediaUrl && (
              <div className={`flex items-center py-1 ${isOwn ? "text-white" : "text-gray-700"}`}>
                <audio
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                  className="max-w-[220px] h-8"
                  style={{ accentColor: isOwn ? "#ffffff" : "#6366f1" }}
                >
                  <source src={message.mediaUrl} />
                  {/* Fallback for browsers that need explicit type */}
                  <source src={message.mediaUrl} type="audio/webm" />
                  <source src={message.mediaUrl} type="audio/mp4" />
                  <source src={message.mediaUrl} type="audio/ogg" />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {message.type === "file" && message.mediaUrl && (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 ${isOwn ? "text-white" : "text-indigo-500"}`}
              >
                <FontAwesomeIcon icon={faFile} />
                <span className="text-xs underline">View File</span>
              </a>
            )}
            {decryptedText && <p>{decryptedText}</p>}
          </div>

          <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} hidden group-hover:flex items-center gap-1 px-1`}>
            <button
              onClick={() => onReply(message)}
              className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-500 transition"
            >
              <FontAwesomeIcon icon={faReply} className="text-xs" />
            </button>
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-500 transition"
            >
              <FontAwesomeIcon icon={faSmile} className="text-xs" />
            </button>
          </div>

          {showEmoji && (
            <div className={`absolute z-10 bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-white rounded-full shadow-lg border border-gray-100 flex gap-1 px-2 py-1`}>
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowEmoji(false); }}
                  className="text-lg hover:scale-125 transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <span key={emoji} className="bg-white border border-gray-100 rounded-full px-2 py-0.5 text-xs shadow-sm">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 mt-1 mx-1">
          <p className="text-xs text-gray-300">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <ReadReceipt isRead={message.isRead} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}

// ── Wallpaper Picker ───────────────────────────────────────────────
function WallpaperPicker({ current, onSelect, onClose }) {
  const [customColor, setCustomColor] = useState("#ffffff");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSingle(file, "wallpapers");
      onSelect({ id: "custom-image", bg: url, type: "image" });
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">
            <FontAwesomeIcon icon={faPalette} className="mr-2 text-indigo-500" />
            Chat Wallpaper
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p className="text-xs text-gray-400 font-medium mb-2">PRESETS</p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {WALLPAPER_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`h-14 rounded-2xl border-2 transition ${current?.id === preset.id ? "border-indigo-500 scale-105" : "border-transparent"}`}
              style={{ background: preset.bg }}
            >
              <span className="text-xs text-gray-500 font-medium">{preset.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 font-medium mb-2">CUSTOM COLOR</p>
        <div className="flex items-center gap-3 mb-5">
          <input
            type="color"
            value={customColor}
            onChange={e => setCustomColor(e.target.value)}
            className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer"
          />
          <button
            onClick={() => onSelect({ id: "custom-color", bg: customColor, type: "color" })}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm hover:bg-indigo-600 transition"
          >
            Apply Color
          </button>
        </div>

        <p className="text-xs text-gray-400 font-medium mb-2">CUSTOM IMAGE</p>
        <button
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition disabled:opacity-50"
        >
          {uploading
            ? <><FontAwesomeIcon icon={faSpinner} spin className="mr-2" />Uploading...</>
            : <><FontAwesomeIcon icon={faImage} className="mr-2" />Upload Image</>
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>
    </div>
  );
}

// ── Status Circle ──────────────────────────────────────────────────
function StatusCircle({ status, onClick, isOwn }) {
  const viewed = status.views?.length > 0;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0">
      <div className={`w-14 h-14 rounded-full p-0.5 ${viewed && !isOwn ? "bg-gray-200" : "bg-gradient-to-tr from-indigo-500 to-purple-500"}`}>
        <img
          src={safeAvatar(status.user?.photoURL, status.user?.displayName)}
          className="w-full h-full rounded-full object-cover border-2 border-white"
          alt=""
          onError={(e) => avatarError(e, status.user?.displayName)}
        />
      </div>
      <p className="text-xs text-gray-500 truncate w-14 text-center">
        {isOwn ? "My Status" : status.user?.displayName}
      </p>
    </button>
  );
}

// ── Room List Item ─────────────────────────────────────────────────
function RoomItem({ room, currentUserId, onClick, active }) {
  const otherMember = room.isGroup ? null : room.members?.find(m => m.user?.id !== currentUserId);
  const lastMessage = room.messages?.[0];
  const name = room.isGroup
    ? (room.university?.shortName || room.name || "Group")
    : (otherMember?.user?.displayName || "Unknown");
  const avatar = room.isGroup ? null : otherMember?.user?.photoURL;

  const unread = useMemo(() =>
    room.unreadCount ?? (room.messages?.filter(m => !m.isRead && m.sender?.id !== currentUserId).length || 0),
    [room.unreadCount, room.messages, currentUserId]
  );

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${active ? "bg-indigo-50" : ""}`}
    >
      <div className="relative shrink-0">
        {room.isGroup ? (
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUsers} className="text-indigo-500 text-lg" />
          </div>
        ) : (
          <img
            src={safeAvatar(avatar, name)}
            className="w-12 h-12 rounded-full object-cover border border-gray-200"
            onError={(e) => avatarError(e, name)}
            alt=""
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 text-sm truncate">{name}</p>
          {lastMessage && (
            <p className="text-xs text-gray-400 shrink-0 ml-2">
              {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        {lastMessage && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {lastMessage.sender?.displayName}: {lastMessage.text ? decryptMessage(lastMessage.text) : "Media"}
          </p>
        )}
      </div>
      {unread > 0 && (
        <span className="shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
          {unread}
        </span>
      )}
    </button>
  );
}

// ── Chat Room ──────────────────────────────────────────────────────
function ChatRoom({ room, dbUserId, onBack, wallpaper, onOpenWallpaper }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0); // FIX: live timer
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null); // FIX: timer ref

  const otherMember = room.isGroup ? null : room.members?.find(m => m.user?.id !== dbUserId);
  const roomName = room.isGroup
    ? (room.university?.shortName || "Group Chat")
    : (otherMember?.user?.displayName || "Chat");

  const wallpaperStyle = useMemo(() => {
    if (!wallpaper) return { backgroundColor: "#f0f4ff" };
    if (wallpaper.type === "image") return { backgroundImage: `url(${wallpaper.bg})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { backgroundColor: wallpaper.bg };
  }, [wallpaper]);

  useEffect(() => {
    if (!dbUserId) return;
    let socket;
    let mounted = true;

    const connect = async () => {
      try {
        const [data] = await Promise.all([
          apiFetch(`/chat/rooms/${room.id}/messages`),
          apiFetch(`/chat/rooms/${room.id}/read`, { method: "POST" }).catch(console.error),
        ]);
        if (mounted) {
          setMessages(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Failed to load messages. Please try again.");
          setLoading(false);
        }
      }

      if (!mounted) return;
      try {
        const token = await getIdToken(auth.currentUser, true);
        if (!mounted) return;
        socket = io(`${API}/chat`, {
          transports: ["websocket"],
          auth: { token },
        });
        socketRef.current = socket;

        socket.on("connect", () => socket.emit("joinRoom", { roomId: room.id }));
        socket.on("newMessage", (message) => {
          if (mounted) setMessages(prev => [...prev, message]);
        });
        socket.on("userTyping", ({ userId, isTyping }) => {
          if (mounted && userId !== dbUserId) setTypingUser(isTyping ? userId : null);
        });
        socket.on("messageReaction", ({ messageId, reaction }) => {
          if (mounted) setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const existing = m.reactions?.find(r => r.userId === reaction.userId);
            if (existing) {
              return { ...m, reactions: m.reactions.map(r => r.userId === reaction.userId ? reaction : r) };
            }
            return { ...m, reactions: [...(m.reactions || []), reaction] };
          }));
        });
      } catch (err) {
        console.error("Socket connection error:", err);
      }
    };

    connect();

    return () => {
      mounted = false;
      clearInterval(recordingTimerRef.current); // FIX: cleanup timer
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (socket) {
        socket.emit("leaveRoom", { roomId: room.id });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [room.id, dbUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (overrides = {}) => {
    if ((!text.trim() && !overrides.mediaUrl) || !socketRef.current) {
      if (!socketRef.current) setSendError("Connection lost. Please refresh.");
      return;
    }
    setSendError(null);
    socketRef.current.emit("sendMessage", {
      roomId: room.id,
      senderId: dbUserId,
      text: text.trim() ? encryptMessage(text.trim()) : "",
      replyToId: replyTo?.id,
      type: "text",
      ...overrides,
    });
    setText("");
    setReplyTo(null);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socketRef.current?.emit("typing", { roomId: room.id, userId: dbUserId, isTyping: true });
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { roomId: room.id, userId: dbUserId, isTyping: false });
    }, 1500);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadSingle(file, "chat");
      sendMessage({ mediaUrl: url, mediaType: file.type, type: "image", text: "" });
    } catch (err) {
      console.error(err);
      setUploadError("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadSingle(file, "chat");
      sendMessage({ mediaUrl: url, mediaType: file.type, type: "file", text: "" });
    } catch (err) {
      console.error(err);
      setUploadError("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── FIX: Fully rewritten startRecording ───────────────────────────
  // Changes:
  //   1. getSupportedMimeType() for cross-browser/iOS support
  //   2. start(250) timeslice so ondataavailable fires regularly
  //   3. requestData() called before stop to flush final chunk
  //   4. Live timer so user sees recording duration
  //   5. User-friendly error messages for permission/device issues
  //   6. Blob size check to catch silent empty recordings
  //   7. Stream always released in all code paths
  const startRecording = async () => {
    if (recording) return; // guard against double-tap
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);

        // Release mic immediately
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) {
          setUploadError("No audio captured. Please try again.");
          return;
        }

        const actualMime = mimeType || "audio/webm";
        const ext = actualMime.includes("mp4") ? "m4a"
          : actualMime.includes("ogg") ? "ogg"
          : "webm";

        const blob = new Blob(audioChunksRef.current, { type: actualMime });

        if (blob.size < 500) {
          setUploadError("Recording was too short. Please try again.");
          return;
        }

        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: actualMime });
        setUploading(true);
        setUploadError(null);
        try {
          const url = await uploadSingle(file, "chat/audio");
          sendMessage({ mediaUrl: url, mediaType: actualMime, type: "audio", text: "" });
        } catch (err) {
          console.error("Voice upload error:", err);
          setUploadError("Voice upload failed. Please try again.");
        } finally {
          setUploading(false);
        }
      };

      // timeslice=250ms: ondataavailable fires every 250ms, not just on stop
      mediaRecorder.start(250);
      setRecording(true);

      // Start visible timer
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

    } catch (err) {
      console.error("Mic error:", err);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setUploadError("Microphone permission denied. Please allow mic access and try again.");
      } else if (err.name === "NotFoundError") {
        setUploadError("No microphone found on this device.");
      } else {
        setUploadError("Could not start recording. Please try again.");
      }
    }
  };

  // FIX: requestData() flushes buffered audio before onstop fires
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.requestData(); // flush final chunk
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleReact = (messageId, emoji) => {
    socketRef.current?.emit("reactMessage", {
      messageId, emoji, userId: dbUserId, roomId: room.id,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-indigo-500 transition md:hidden">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        {room.isGroup ? (
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUsers} className="text-indigo-500" />
          </div>
        ) : (
          <img
            src={safeAvatar(otherMember?.user?.photoURL, roomName)}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
            alt=""
            onError={(e) => avatarError(e, roomName)}
          />
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">{roomName}</p>
          {typingUser
            ? <p className="text-xs text-indigo-400 animate-pulse">typing...</p>
            : <p className="text-xs text-gray-400">{room.isGroup ? `${room.members?.length || 0} members` : "tap for info"}</p>
          }
        </div>
        <button
          onClick={onOpenWallpaper}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition"
          title="Change wallpaper"
        >
          <FontAwesomeIcon icon={faPalette} className="text-sm" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={wallpaperStyle}>
        <div className="min-h-full space-y-3">
          {loading ? (
            <div className="text-center py-10 text-indigo-400">
              <FontAwesomeIcon icon={faSpinner} spin />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="bg-white/80 rounded-2xl px-6 py-4 inline-block shadow-sm">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white/80 rounded-2xl px-6 py-4 inline-block shadow-sm">
                <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender?.id === dbUserId}
                onReply={setReplyTo}
                onReact={handleReact}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error banner */}
      {(uploadError || sendError) && (
        <div className="bg-red-50 border-t border-red-100 px-4 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-red-500">{uploadError || sendError}</p>
          <button onClick={() => { setUploadError(null); setSendError(null); }} className="text-red-400 hover:text-red-600">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faReply} className="text-indigo-400 text-xs" />
            <div>
              <p className="text-xs text-indigo-500 font-medium">{replyTo.sender?.displayName}</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                {replyTo.text ? decryptMessage(replyTo.text) : "Media"}
              </p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 flex items-end gap-2 shrink-0">
        <div className="flex gap-1">
          <label className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
            <FontAwesomeIcon icon={faImage} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <label className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
            <FontAwesomeIcon icon={faFile} />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <input
          value={text}
          onChange={handleTyping}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 bg-gray-50"
        />

        {uploading ? (
          <div className="w-10 h-10 flex items-center justify-center text-indigo-400">
            <FontAwesomeIcon icon={faSpinner} spin />
          </div>
        ) : text.trim() ? (
          <button
            onClick={() => sendMessage()}
            className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 transition"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        ) : (
          // FIX: VoiceNoteButton replaces onMouseDown/onTouchStart which double-fired on mobile
          <VoiceNoteButton
            onStart={startRecording}
            onStop={stopRecording}
            recording={recording}
            recordingSeconds={recordingSeconds}
          />
        )}
      </div>
    </div>
  );
}

// ── Status Creator ─────────────────────────────────────────────────
function StatusCreator({ onClose, onPosted, dbUser }) {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState(STATUS_BG_COLORS[0].value);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const imageRef = useRef();
  const videoRef = useRef();

  const handleMediaChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMode(type);
  };

  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); };
  }, [mediaPreview]);

  const handlePost = async () => {
    if (mode === "text" && !text.trim()) return;
    if ((mode === "image" || mode === "video") && !mediaFile) return;
    setPosting(true);
    setError(null);
    try {
      let body = { type: mode };
      if (mode === "text") {
        body.text = text;
        body.bgColor = bgColor;
      } else {
        const folder = mode === "video" ? "chat/status/video" : "chat/status/image";
        const url = await uploadSingle(mediaFile, folder);
        body.mediaUrl = url;
        body.mediaType = mediaFile.type;
        if (text.trim()) body.text = text;
      }
      const status = await apiFetch("/chat/status", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onPosted(status);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to post status. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Preview area */}
        <div
          className="relative w-full h-56 flex items-center justify-center"
          style={{ backgroundColor: mode === "text" ? bgColor : "#1e293b" }}
        >
          {mode === "text" && (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="bg-transparent text-white text-center text-xl font-semibold placeholder-white/60 outline-none resize-none w-full px-6 text-center"
              rows={3}
              style={{ caretColor: "white" }}
            />
          )}
          {mode === "image" && mediaPreview && (
            <img src={mediaPreview} className="h-full w-full object-cover" alt="preview" />
          )}
          {mode === "video" && mediaPreview && (
            <video src={mediaPreview} className="h-full w-full object-cover" autoPlay muted loop />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4">
            {[
              { id: "text",  icon: faSmile, label: "Text" },
              { id: "image", icon: faImage, label: "Image" },
              { id: "video", icon: faVideo, label: "Video" },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === "image") imageRef.current.click();
                  else if (m.id === "video") videoRef.current.click();
                  else setMode("text");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  mode === m.id ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <FontAwesomeIcon icon={m.icon} /> {m.label}
              </button>
            ))}
          </div>

          {mode === "text" && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-2">BACKGROUND COLOR</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_BG_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setBgColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition ${bgColor === color.value ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          )}

          {(mode === "image" || mode === "video") && (
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add a caption (optional)..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 mb-4"
            />
          )}

          {error && <p className="text-red-500 text-xs text-center mb-3">{error}</p>}

          <button
            onClick={handlePost}
            disabled={posting || (mode === "text" && !text.trim()) || ((mode === "image" || mode === "video") && !mediaFile)}
            className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {posting ? <><FontAwesomeIcon icon={faSpinner} spin /> Posting...</> : "Post Status"}
          </button>
        </div>

        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => handleMediaChange(e, "image")} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleMediaChange(e, "video")} />
      </div>
    </div>
  );
}

// ── Status Viewer ──────────────────────────────────────────────────
function StatusViewer({ status, onClose, onView }) {
  useEffect(() => { onView(status.id); }, [status.id, onView]);

  const bgStyle = status.bgColor
    ? { backgroundColor: status.bgColor }
    : { backgroundColor: "#1e293b" };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={bgStyle}>
      <div className="flex items-center gap-3 px-4 py-4">
        <button onClick={onClose} className="text-white">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <img
          src={safeAvatar(status.user?.photoURL, status.user?.displayName)}
          className="w-8 h-8 rounded-full object-cover"
          alt=""
          onError={(e) => avatarError(e, status.user?.displayName)}
        />
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{status.user?.displayName}</p>
          <p className="text-gray-400 text-xs">{new Date(status.createdAt).toLocaleTimeString()}</p>
        </div>
        <p className="text-xs text-white/50">
          Expires {new Date(new Date(status.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        {status.type === "video" && status.mediaUrl ? (
          <video src={status.mediaUrl} controls autoPlay className="max-h-full max-w-full rounded-2xl" />
        ) : status.type === "image" && status.mediaUrl ? (
          <img src={status.mediaUrl} alt="status" className="max-h-full max-w-full rounded-2xl" />
        ) : (
          <p className="text-white text-2xl font-semibold text-center">{status.text}</p>
        )}
      </div>

      {status.text && (status.type === "image" || status.type === "video") && (
        <p className="text-white/80 text-sm text-center px-6 pb-2">{status.text}</p>
      )}

      <p className="text-gray-400 text-xs text-center pb-6">
        {status.views?.length || 0} views
      </p>
    </div>
  );
}

// ── Main Chat Component ────────────────────────────────────────────
function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("chats");
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [viewingStatus, setViewingStatus] = useState(null);
  const [showStatusCreate, setShowStatusCreate] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState(WALLPAPER_PRESETS[0]);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [roomsData, userData, statusData] = await Promise.all([
          apiFetch("/chat/rooms"),
          apiFetch("/users/me"),
          apiFetch("/chat/status"),
        ]);
        setRooms(roomsData);
        setDbUser(userData);

        if (userData.chatWallpaper) {
          setWallpaper(userData.chatWallpaper);
        }

        setStatuses(statusData.filter(s => !isStatusExpired(s)));

        const params = new URLSearchParams(location.search);
        const targetUserId = params.get("dm");
        if (targetUserId) {
          const room = await apiFetch("/chat/rooms/dm", {
            method: "POST",
            body: JSON.stringify({ targetUserId }),
          });
          setActiveRoom(room);
          setRooms(prev => {
            const exists = prev.find(r => r.id === room.id);
            return exists ? prev.map(r => r.id === room.id ? room : r) : [room, ...prev];
          });
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    init();
  }, [location.search]);

  const handleWallpaperSelect = async (preset) => {
    setWallpaper(preset);
    setShowWallpaperPicker(false);
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ chatWallpaper: preset }),
      });
    } catch (err) {
      console.error("Failed to save wallpaper preference:", err);
    }
  };

  const handleViewStatus = useCallback((id) => {
    apiFetch(`/chat/status/${id}/view`, { method: "POST" }).catch(console.error);
  }, []);

  const searchUsers = async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await apiFetch(`/chat/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data);
    } catch (err) { console.error(err); }
    setSearching(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setUserSearch(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchUsers(value), 400);
  };

  const liveStatuses = useMemo(() => statuses.filter(s => !isStatusExpired(s)), [statuses]);
  const myStatuses = useMemo(() => liveStatuses.filter(s => s.user?.id === dbUser?.id), [liveStatuses, dbUser]);
  const otherStatuses = useMemo(() => liveStatuses.filter(s => s.user?.id !== dbUser?.id), [liveStatuses, dbUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/home")} className="text-gray-400 hover:text-indigo-500 transition">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-lg font-bold text-indigo-500">ChatSnap</h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto flex gap-6 mt-2">
          {["chats", "status"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-1 text-sm font-semibold capitalize border-b-2 transition ${
                tab === t ? "border-indigo-500 text-indigo-500" : "border-transparent text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto flex overflow-hidden" style={{ height: "calc(100vh - 97px)" }}>

        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0 ${activeRoom ? "hidden md:flex" : "flex"}`}>

          {tab === "chats" && (
            <>
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    value={userSearch}
                    onChange={handleSearchChange}
                    placeholder="Search by name or @username..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border focus:border-indigo-300 transition"
                  />
                  {searching && (
                    <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={async () => {
                          const room = await apiFetch("/chat/rooms/dm", {
                            method: "POST",
                            body: JSON.stringify({ targetUserId: u.id }),
                          });
                          setActiveRoom(room);
                          setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev]);
                          setUserSearch("");
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left"
                      >
                        <img
                          src={safeAvatar(u.photoURL, u.displayName)}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          alt=""
                          onError={(e) => avatarError(e, u.displayName)}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{u.displayName}</p>
                          {u.chatSnapUsername && (
                            <p className="text-xs text-gray-400">@{u.chatSnapUsername}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-400">
                  <FontAwesomeIcon icon={faSpinner} spin />
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <FontAwesomeIcon icon={faUser} className="text-5xl text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium text-sm">No conversations yet</p>
                  <button
                    onClick={() => navigate("/marketplace")}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-full text-xs font-medium hover:bg-indigo-600 transition"
                  >
                    <FontAwesomeIcon icon={faStore} /> Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {rooms.map(room => (
                    <RoomItem
                      key={room.id}
                      room={room}
                      currentUserId={dbUser?.id}
                      active={activeRoom?.id === room.id}
                      onClick={() => setActiveRoom(room)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "status" && (
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-3">MY STATUS</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={safeAvatar(user?.photoURL, user?.displayName)}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      alt=""
                      onError={(e) => avatarError(e, user?.displayName)}
                    />
                    <button
                      onClick={() => setShowStatusCreate(true)}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">My Status</p>
                    <p className="text-xs text-gray-400">
                      {myStatuses.length > 0
                        ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""} · expires in 24h`
                        : "Tap + to add status"}
                    </p>
                  </div>
                </div>
              </div>

              {otherStatuses.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium mb-3">RECENT UPDATES</p>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {otherStatuses.map(status => (
                      <StatusCircle
                        key={status.id}
                        status={status}
                        isOwn={false}
                        onClick={() => setViewingStatus(status)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherStatuses.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm">No status updates yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${activeRoom ? "flex" : "hidden md:flex"}`}>
          {activeRoom ? (
            <ChatRoom
              room={activeRoom}
              dbUserId={dbUser?.id}
              onBack={() => setActiveRoom(null)}
              wallpaper={wallpaper}
              onOpenWallpaper={() => setShowWallpaperPicker(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <FontAwesomeIcon icon={faUser} className="text-5xl text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-gray-400 text-sm mt-1">Choose from the list or start a new chat</p>
            </div>
          )}
        </div>
      </div>

      {showStatusCreate && (
        <StatusCreator
          onClose={() => setShowStatusCreate(false)}
          onPosted={(status) => setStatuses(prev => [status, ...prev])}
          dbUser={dbUser}
        />
      )}

      {viewingStatus && (
        <StatusViewer
          status={viewingStatus}
          onClose={() => setViewingStatus(null)}
          onView={handleViewStatus}
        />
      )}

      {showWallpaperPicker && (
        <WallpaperPicker
          current={wallpaper}
          onSelect={handleWallpaperSelect}
          onClose={() => setShowWallpaperPicker(false)}
        />
      )}
    </div>
  );
}

export default Chat;
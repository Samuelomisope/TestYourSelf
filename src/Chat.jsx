import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
  faPalette, faXmark, faChevronRight, faUserGroup,
  faPhotoFilm, faMagnifyingGlass, faFileAudio,
  faHouse, faBook, faRobot, faComments, faChevronDown,
  faBell, faCircle, faEllipsisV, faLock, faGlobe,
  faStar, faHashtag, faAt, faInfoCircle,
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

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus","audio/ogg"];
  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString();
}

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🙏"];

const STATUS_BG_COLORS = [
  { id: "indigo",  value: "#4f46e5" },
  { id: "rose",    value: "#e11d48" },
  { id: "emerald", value: "#059669" },
  { id: "amber",   value: "#d97706" },
  { id: "sky",     value: "#0284c7" },
  { id: "purple",  value: "#7c3aed" },
  { id: "pink",    value: "#db2777" },
  { id: "dark",    value: "#1e293b" },
];

const TAB_LINKS = [
  { href: "/home",           label: "Home",   icon: faHouse },
  { href: "/study-material", label: "Study",  icon: faBook },
  { href: "/ai",             label: "AI",     icon: faRobot },
  { href: "/chat",           label: "Chat",   icon: faComments },
  { href: "/marketplace",    label: "Market", icon: faStore },
];

// ── Read Receipt ───────────────────────────────────────────────────
function ReadReceipt({ isRead, isOwn }) {
  if (!isOwn) return null;
  return (
    <span className={`text-xs ml-1 ${isRead ? "text-violet-400" : "text-white/30"}`}>
      <FontAwesomeIcon icon={isRead ? faCheckDouble : faCheck} />
    </span>
  );
}

// ── Voice Note Button ──────────────────────────────────────────────
function VoiceNoteButton({ onStart, onStop, recording, recordingSeconds }) {
  return (
    <button
      onClick={recording ? onStop : onStart}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition relative select-none ${
        recording ? "bg-red-500 text-white" : "bg-white/5 border border-white/10 text-white/40 hover:text-violet-400 hover:border-violet-500/40"
      }`}
      title={recording ? "Stop recording" : "Record voice note"}
    >
      {recording && (
        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40 pointer-events-none" />
      )}
      <FontAwesomeIcon icon={recording ? faStop : faMicrophone} className="relative z-10" />
      {recording && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-red-400 font-mono whitespace-nowrap bg-[#0d0d14] px-2 py-0.5 rounded-full border border-red-500/20">
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
          className="w-7 h-7 rounded-full object-cover shrink-0 mt-1 border border-white/10"
          alt=""
          onError={(e) => avatarError(e, message.sender?.displayName)}
        />
      )}

      <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <p className="text-xs text-violet-400 mb-1 ml-1 font-medium">{message.sender?.displayName}</p>
        )}

        {message.replyTo && (
          <div className="px-3 py-1.5 rounded-xl mb-1 text-xs border-l-2 border-violet-500 bg-white/5 text-white/40 max-w-full truncate">
            <p className="font-medium text-violet-400">{message.replyTo.sender?.displayName}</p>
            <p className="truncate">{message.replyTo.text ? decryptMessage(message.replyTo.text) : "Media"}</p>
          </div>
        )}

        <div className="relative">
          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
            isOwn
              ? "bg-violet-500 text-white rounded-tr-sm"
              : "bg-white/[0.07] border border-white/10 text-white/90 rounded-tl-sm"
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
            {message.type === "audio" && message.mediaUrl && (
              <div className="flex items-center py-1">
                <audio controls preload="metadata" controlsList="nodownload"
                  className="max-w-[220px] h-8"
                  style={{ accentColor: isOwn ? "#ffffff" : "#8b5cf6" }}>
                  <source src={message.mediaUrl} />
                  <source src={message.mediaUrl} type="audio/webm" />
                  <source src={message.mediaUrl} type="audio/mp4" />
                  <source src={message.mediaUrl} type="audio/ogg" />
                </audio>
              </div>
            )}
            {message.type === "file" && message.mediaUrl && (
              <a href={message.mediaUrl} target="_blank" rel="noreferrer"
                className={`flex items-center gap-2 ${isOwn ? "text-white" : "text-violet-400"}`}>
                <FontAwesomeIcon icon={faFile} />
                <span className="text-xs underline">View File</span>
              </a>
            )}
            {decryptedText && <p>{decryptedText}</p>}
          </div>

          {/* Hover actions */}
          <div className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} hidden group-hover:flex items-center gap-1 px-1`}>
            <button onClick={() => onReply(message)}
              className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-violet-400 transition">
              <FontAwesomeIcon icon={faReply} className="text-xs" />
            </button>
            <button onClick={() => setShowEmoji(!showEmoji)}
              className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-violet-400 transition">
              <FontAwesomeIcon icon={faSmile} className="text-xs" />
            </button>
          </div>

          {showEmoji && (
            <div className={`absolute z-10 bottom-full mb-1 ${isOwn ? "right-0" : "left-0"} bg-[#0d0d14] border border-white/10 rounded-full shadow-xl flex gap-1 px-2 py-1`}>
              {EMOJIS.map(emoji => (
                <button key={emoji}
                  onClick={() => { onReact(message.id, emoji); setShowEmoji(false); }}
                  className="text-lg hover:scale-125 transition">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <span key={emoji} className="bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-xs">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 mt-1 mx-1">
          <p className="text-xs text-white/20">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <ReadReceipt isRead={message.isRead} isOwn={isOwn} />
        </div>
      </div>
    </div>
  );
}

// ── Create Group Modal ─────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  const searchUsers = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await apiFetch(`/chat/users/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(v), 400);
  };

  const toggleMember = (user) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter a group name."); return; }
    if (selected.length < 1) { setError("Add at least one member."); return; }
    setCreating(true); setError("");
    try {
      const room = await apiFetch("/chat/rooms/create-group", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), memberIds: selected.map(u => u.id) }),
      });
      onCreated(room);
      onClose();
    } catch { setError("Failed to create group. Please try again."); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUserGroup} className="text-violet-400" />
            <h2 className="text-base font-bold text-white">New Group</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 140px)" }}>
          <div className="px-5 pt-4 pb-2">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 mb-4"
              maxLength={50} />

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selected.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/20 rounded-full pl-2 pr-1 py-1">
                    <img src={safeAvatar(u.photoURL, u.displayName)} className="w-5 h-5 rounded-full object-cover" alt=""
                      onError={e => avatarError(e, u.displayName)} />
                    <span className="text-xs text-violet-400 font-medium">{u.displayName}</span>
                    <button onClick={() => toggleMember(u)} className="text-violet-400/60 hover:text-violet-300 ml-0.5">
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative mb-2">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
              <input value={search} onChange={handleSearchChange} placeholder="Search members..."
                className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition" />
              {searching && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />}
            </div>
          </div>

          <div className="px-3 pb-2">
            {results.map(u => {
              const isSelected = !!selected.find(s => s.id === u.id);
              return (
                <button key={u.id} onClick={() => toggleMember(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-1 ${
                    isSelected ? "bg-violet-500/15 border border-violet-500/20" : "hover:bg-white/5"
                  }`}>
                  <img src={safeAvatar(u.photoURL, u.displayName)} className="w-9 h-9 rounded-full object-cover border border-white/10" alt=""
                    onError={e => avatarError(e, u.displayName)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                    {u.chatSnapUsername && <p className="text-xs text-white/30">@{u.chatSnapUsername}</p>}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/5">
          {error && <p className="text-pink-400 text-xs mb-2 text-center">{error}</p>}
          <button onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length < 1}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-medium transition disabled:opacity-40 flex items-center justify-center gap-2">
            {creating
              ? <><FontAwesomeIcon icon={faSpinner} spin /> Creating...</>
              : <><FontAwesomeIcon icon={faUserGroup} /> Create Group ({selected.length} members)</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Search Messages Panel ──────────────────────────────────────────
function SearchMessagesPanel({ roomId, onClose, onJumpTo }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/chat/rooms/${roomId}/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch { setResults([]); }
    setLoading(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  return (
    <div className="absolute inset-0 bg-[#0a0a0f] z-20 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
        <button onClick={onClose} className="text-white/40 hover:text-violet-400 transition">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
          <input autoFocus value={query} onChange={handleChange} placeholder="Search messages..."
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 transition" />
        </div>
        {loading && <FontAwesomeIcon icon={faSpinner} spin className="text-violet-400 text-sm shrink-0" />}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.length === 0 && query.trim() && !loading && (
          <p className="text-center text-white/30 text-sm py-10">No messages found for "{query}"</p>
        )}
        {!query.trim() && (
          <p className="text-center text-white/20 text-sm py-10">Type to search messages in this chat</p>
        )}
        {results.map(msg => (
          <button key={msg.id} onClick={() => onJumpTo(msg.id)}
            className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/20 transition">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-violet-400">{msg.sender?.displayName}</p>
              <p className="text-xs text-white/20">{timeAgo(msg.createdAt)}</p>
            </div>
            <p className="text-sm text-white/60 truncate">
              {msg.text ? decryptMessage(msg.text) : "Media"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Media Gallery Panel ────────────────────────────────────────────
function MediaGalleryPanel({ roomId, onClose }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("images");

  useEffect(() => {
    apiFetch(`/chat/rooms/${roomId}/media`)
      .then(setMedia).catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [roomId]);

  const images = media.filter(m => m.type === "image");
  const videos = media.filter(m => m.type === "video");
  const audio  = media.filter(m => m.type === "audio");
  const files  = media.filter(m => m.type === "file");

  const TABS = [
    { id: "images", label: "Images", icon: faImage,     data: images },
    { id: "videos", label: "Videos", icon: faVideo,     data: videos },
    { id: "audio",  label: "Audio",  icon: faFileAudio, data: audio  },
    { id: "files",  label: "Files",  icon: faFile,      data: files  },
  ];

  const active = TABS.find(t => t.id === activeTab);

  return (
    <div className="absolute inset-0 bg-[#0a0a0f] z-20 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
        <button onClick={onClose} className="text-white/40 hover:text-violet-400 transition">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2 className="font-semibold text-white text-sm flex-1">Media & Files</h2>
        <FontAwesomeIcon icon={faPhotoFilm} className="text-violet-400" />
      </div>

      <div className="flex border-b border-white/5 shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-semibold flex flex-col items-center gap-0.5 transition border-b-2 ${
              activeTab === tab.id ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"
            }`}>
            <FontAwesomeIcon icon={tab.icon} />
            <span>{tab.label}</span>
            <span className="text-xs text-white/20 font-normal">({tab.data.length})</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-violet-400">
            <FontAwesomeIcon icon={faSpinner} spin />
          </div>
        ) : active.data.length === 0 ? (
          <div className="text-center py-10">
            <FontAwesomeIcon icon={active.icon} className="text-4xl text-white/10 mb-2" />
            <p className="text-white/30 text-sm">No {active.label.toLowerCase()} yet</p>
          </div>
        ) : activeTab === "images" ? (
          <div className="grid grid-cols-3 gap-1.5">
            {images.map(item => (
              <button key={item.id} onClick={() => window.open(item.mediaUrl, "_blank")}
                className="aspect-square rounded-xl overflow-hidden bg-white/5 hover:opacity-80 transition">
                <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : activeTab === "videos" ? (
          <div className="grid grid-cols-2 gap-2">
            {videos.map(item => (
              <button key={item.id} onClick={() => window.open(item.mediaUrl, "_blank")}
                className="aspect-video rounded-xl overflow-hidden bg-white/5 hover:opacity-80 transition">
                <video src={item.mediaUrl} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : activeTab === "audio" ? (
          <div className="space-y-2">
            {audio.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 bg-violet-500/15 rounded-full flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faFileAudio} className="text-violet-400 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/30 truncate mb-1">
                    {item.sender?.displayName} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <audio controls preload="metadata" className="w-full h-7" style={{ accentColor: "#8b5cf6" }}>
                    <source src={item.mediaUrl} />
                    <source src={item.mediaUrl} type="audio/webm" />
                    <source src={item.mediaUrl} type="audio/mp4" />
                    <source src={item.mediaUrl} type="audio/ogg" />
                  </audio>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map(item => (
              <a key={item.id} href={item.mediaUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-3 hover:border-violet-500/30 hover:bg-violet-500/5 transition">
                <div className="w-9 h-9 bg-violet-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={faFile} className="text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">File</p>
                  <p className="text-xs text-white/30">{item.sender?.displayName} · {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="text-white/20 text-xs shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status Circle ──────────────────────────────────────────────────
function StatusCircle({ status, onClick, isOwn }) {
  const viewed = status.views?.length > 0;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0">
      <div className={`w-14 h-14 rounded-full p-0.5 ${viewed && !isOwn ? "bg-white/10" : "bg-gradient-to-tr from-violet-500 to-purple-500"}`}>
        <img src={safeAvatar(status.user?.photoURL, status.user?.displayName)}
          className="w-full h-full rounded-full object-cover border-2 border-[#0a0a0f]"
          alt="" onError={(e) => avatarError(e, status.user?.displayName)} />
      </div>
      <p className="text-xs text-white/40 truncate w-14 text-center">
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
    ? (room.name || room.university?.shortName || "Group")
    : (otherMember?.user?.displayName || "Unknown");
  const avatar = room.isGroup ? null : otherMember?.user?.photoURL;

  const unread = useMemo(() =>
    room.unreadCount ?? (room.messages?.filter(m => !m.isRead && m.sender?.id !== currentUserId).length || 0),
    [room.unreadCount, room.messages, currentUserId]
  );

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition text-left border-b border-white/[0.04] ${
        active ? "bg-violet-500/10 border-l-2 border-l-violet-500" : "hover:bg-white/[0.03]"
      }`}>
      <div className="relative shrink-0">
        {room.isGroup ? (
          <div className="w-12 h-12 bg-violet-500/15 border border-violet-500/20 rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUsers} className="text-violet-400 text-lg" />
          </div>
        ) : (
          <img src={safeAvatar(avatar, name)}
            className="w-12 h-12 rounded-full object-cover border border-white/10"
            onError={(e) => avatarError(e, name)} alt="" />
        )}
        {/* Online dot — can be driven by real presence later */}
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0a0a0f] rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white text-sm truncate">{name}</p>
          {lastMessage && (
            <p className="text-xs text-white/20 shrink-0 ml-2">
              {timeAgo(lastMessage.createdAt)}
            </p>
          )}
        </div>
        {lastMessage && (
          <p className="text-xs text-white/30 truncate mt-0.5">
            {lastMessage.sender?.displayName}: {lastMessage.text ? decryptMessage(lastMessage.text) : "Media"}
          </p>
        )}
      </div>
      {unread > 0 && (
        <span className="shrink-0 min-w-5 h-5 px-1.5 bg-violet-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
          {unread}
        </span>
      )}
    </button>
  );
}

// ── Chat Room ──────────────────────────────────────────────────────
function ChatRoom({ room, dbUserId, onBack, onOpenWallpaper }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const messageRefs = useRef({});
  const typingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  const otherMember = room.isGroup ? null : room.members?.find(m => m.user?.id !== dbUserId);
  const roomName = room.isGroup
    ? (room.name || room.university?.shortName || "Group Chat")
    : (otherMember?.user?.displayName || "Chat");

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
        if (mounted) { setMessages(data); setLoading(false); }
      } catch (err) {
        console.error(err);
        if (mounted) { setError("Failed to load messages."); setLoading(false); }
      }

      if (!mounted) return;
      try {
        const token = await getIdToken(auth.currentUser, true);
        if (!mounted) return;
        socket = io(`${API}/chat`, { transports: ["websocket"], auth: { token } });
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
            if (existing) return { ...m, reactions: m.reactions.map(r => r.userId === reaction.userId ? reaction : r) };
            return { ...m, reactions: [...(m.reactions || []), reaction] };
          }));
        });
      } catch (err) { console.error("Socket error:", err); }
    };

    connect();
    return () => {
      mounted = false;
      clearInterval(recordingTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (socket) { socket.emit("leaveRoom", { roomId: room.id }); socket.disconnect(); }
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
    setUploading(true); setUploadError(null);
    try {
      const url = await uploadSingle(file, "chat");
      sendMessage({ mediaUrl: url, mediaType: file.type, type: "image", text: "" });
    } catch { setUploadError("Image upload failed."); }
    finally { setUploading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadError(null);
    try {
      const url = await uploadSingle(file, "chat");
      sendMessage({ mediaUrl: url, mediaType: file.type, type: "file", text: "" });
    } catch { setUploadError("File upload failed."); }
    finally { setUploading(false); }
  };

  const startRecording = async () => {
    if (recording) return;
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
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (audioChunksRef.current.length === 0) { setUploadError("No audio captured."); return; }
        const actualMime = mimeType || "audio/webm";
        const ext = actualMime.includes("mp4") ? "m4a" : actualMime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        if (blob.size < 500) { setUploadError("Recording too short."); return; }
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: actualMime });
        setUploading(true); setUploadError(null);
        try {
          const url = await uploadSingle(file, "chat/audio");
          sendMessage({ mediaUrl: url, mediaType: actualMime, type: "audio", text: "" });
        } catch { setUploadError("Voice upload failed."); }
        finally { setUploading(false); }
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setUploadError("Microphone permission denied.");
      } else if (err.name === "NotFoundError") {
        setUploadError("No microphone found.");
      } else {
        setUploadError("Could not start recording.");
      }
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.requestData();
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleReact = (messageId, emoji) => {
    socketRef.current?.emit("reactMessage", { messageId, emoji, userId: dbUserId, roomId: room.id });
  };

  const handleJumpTo = (messageId) => {
    setShowSearch(false);
    setTimeout(() => {
      const el = messageRefs.current[messageId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toDateString();
      if (date !== lastDate) {
        groups.push({ type: "date", label: date === new Date().toDateString() ? "Today" : date });
        lastDate = date;
      }
      groups.push({ type: "message", msg });
    });
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col h-full relative bg-[#0a0a0f]">
      {showSearch && <SearchMessagesPanel roomId={room.id} onClose={() => setShowSearch(false)} onJumpTo={handleJumpTo} />}
      {showMedia && <MediaGalleryPanel roomId={room.id} onClose={() => setShowMedia(false)} />}

      {/* Header */}
      <div className="bg-[#0d0d14] border-b border-white/5 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-white/40 hover:text-violet-400 transition md:hidden">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        {room.isGroup ? (
          <div className="w-10 h-10 bg-violet-500/15 border border-violet-500/20 rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUsers} className="text-violet-400" />
          </div>
        ) : (
          <div className="relative">
            <img src={safeAvatar(otherMember?.user?.photoURL, roomName)}
              className="w-10 h-10 rounded-full object-cover border border-white/10" alt=""
              onError={(e) => avatarError(e, roomName)} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0d0d14] rounded-full" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">{roomName}</p>
          {typingUser
            ? <p className="text-xs text-violet-400 animate-pulse">typing...</p>
            : <p className="text-xs text-white/30">{room.isGroup ? `${room.members?.length || 0} members` : "Online"}</p>
          }
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(true)}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/30 transition">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
          </button>
          <button onClick={() => setShowMedia(true)}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/30 transition">
            <FontAwesomeIcon icon={faPhotoFilm} className="text-sm" />
          </button>
          <button onClick={onOpenWallpaper}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/30 transition">
            <FontAwesomeIcon icon={faPalette} className="text-sm" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-violet-400"><FontAwesomeIcon icon={faSpinner} spin /></div>
        ) : error ? (
          <div className="text-center py-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 inline-block">
              <p className="text-pink-400 text-sm">{error}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
            <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faComments} className="text-violet-400 text-2xl" />
            </div>
            <p className="text-white/40 text-sm">No messages yet</p>
            <p className="text-white/20 text-xs">Say hello to {roomName}!</p>
          </div>
        ) : (
          groupedMessages.map((item, i) =>
            item.type === "date" ? (
              <div key={`date-${i}`} className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-white/20 px-2">{item.label}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            ) : (
              <div key={item.msg.id} ref={el => { if (el) messageRefs.current[item.msg.id] = el; }}>
                <MessageBubble
                  message={item.msg}
                  isOwn={item.msg.sender?.id === dbUserId}
                  onReply={setReplyTo}
                  onReact={handleReact}
                />
              </div>
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {(uploadError || sendError) && (
        <div className="bg-pink-500/10 border-t border-pink-500/20 px-4 py-2 flex items-center justify-between shrink-0">
          <p className="text-xs text-pink-400">{uploadError || sendError}</p>
          <button onClick={() => { setUploadError(null); setSendError(null); }} className="text-pink-400 hover:text-pink-300">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className="bg-violet-500/10 border-t border-violet-500/20 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faReply} className="text-violet-400 text-xs" />
            <div>
              <p className="text-xs text-violet-400 font-medium">{replyTo.sender?.displayName}</p>
              <p className="text-xs text-white/30 truncate max-w-[200px]">
                {replyTo.text ? decryptMessage(replyTo.text) : "Media"}
              </p>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white/60">
            <FontAwesomeIcon icon={faTimes} className="text-xs" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#0d0d14] border-t border-white/5 px-3 py-3 flex items-end gap-2 shrink-0">
        <div className="flex gap-1">
          <label className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition cursor-pointer">
            <FontAwesomeIcon icon={faImage} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <label className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/40 transition cursor-pointer">
            <FontAwesomeIcon icon={faFile} />
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
        <input
          value={text}
          onChange={handleTyping}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition"
        />
        {uploading ? (
          <div className="w-10 h-10 flex items-center justify-center text-violet-400">
            <FontAwesomeIcon icon={faSpinner} spin />
          </div>
        ) : text.trim() ? (
          <button onClick={() => sendMessage()}
            className="w-10 h-10 bg-violet-500 hover:bg-violet-400 text-white rounded-full flex items-center justify-center transition">
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        ) : (
          <VoiceNoteButton onStart={startRecording} onStop={stopRecording} recording={recording} recordingSeconds={recordingSeconds} />
        )}
      </div>
    </div>
  );
}

// ── Status Creator ─────────────────────────────────────────────────
function StatusCreator({ onClose, onPosted }) {
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
    setPosting(true); setError(null);
    try {
      let body = { type: mode };
      if (mode === "text") { body.text = text; body.bgColor = bgColor; }
      else {
        const folder = mode === "video" ? "chat/status/video" : "chat/status/image";
        const url = await uploadSingle(mediaFile, folder);
        body.mediaUrl = url; body.mediaType = mediaFile.type;
        if (text.trim()) body.text = text;
      }
      const status = await apiFetch("/chat/status", { method: "POST", body: JSON.stringify(body) });
      onPosted(status);
      onClose();
    } catch { setError("Failed to post status. Please try again."); }
    finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="bg-[#0d0d14] border border-white/10 w-full max-w-lg rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="relative w-full h-56 flex items-center justify-center rounded-t-3xl overflow-hidden"
          style={{ backgroundColor: mode === "text" ? bgColor : "#0d0d14" }}>
          {mode === "text" && (
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="bg-transparent text-white text-center text-xl font-semibold placeholder-white/40 outline-none resize-none w-full px-6 text-center"
              rows={3} style={{ caretColor: "white" }} />
          )}
          {mode === "image" && mediaPreview && <img src={mediaPreview} className="h-full w-full object-cover" alt="preview" />}
          {mode === "video" && mediaPreview && <video src={mediaPreview} className="h-full w-full object-cover" autoPlay muted loop />}
          <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            {[
              { id: "text", icon: faSmile, label: "Text" },
              { id: "image", icon: faImage, label: "Image" },
              { id: "video", icon: faVideo, label: "Video" },
            ].map(m => (
              <button key={m.id}
                onClick={() => {
                  if (m.id === "image") imageRef.current.click();
                  else if (m.id === "video") videoRef.current.click();
                  else setMode("text");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  mode === m.id ? "bg-violet-500 text-white" : "bg-white/5 border border-white/10 text-white/40 hover:text-violet-400"
                }`}>
                <FontAwesomeIcon icon={m.icon} /> {m.label}
              </button>
            ))}
          </div>
          {mode === "text" && (
            <div className="mb-4">
              <p className="text-xs text-white/30 font-medium mb-2">BACKGROUND COLOR</p>
              <div className="flex gap-2 flex-wrap">
                {STATUS_BG_COLORS.map(color => (
                  <button key={color.id} onClick={() => setBgColor(color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition ${bgColor === color.value ? "border-violet-400 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color.value }} />
                ))}
              </div>
            </div>
          )}
          {(mode === "image" || mode === "video") && (
            <input value={text} onChange={e => setText(e.target.value)}
              placeholder="Add a caption (optional)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 mb-4" />
          )}
          {error && <p className="text-pink-400 text-xs text-center mb-3">{error}</p>}
          <button onClick={handlePost}
            disabled={posting || (mode === "text" && !text.trim()) || ((mode === "image" || mode === "video") && !mediaFile)}
            className="w-full py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-medium transition disabled:opacity-40 flex items-center justify-center gap-2">
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
  const bgStyle = status.bgColor ? { backgroundColor: status.bgColor } : { backgroundColor: "#0d0d14" };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={bgStyle}>
      <div className="flex items-center gap-3 px-4 py-4">
        <button onClick={onClose} className="text-white"><FontAwesomeIcon icon={faChevronLeft} /></button>
        <img src={safeAvatar(status.user?.photoURL, status.user?.displayName)}
          className="w-8 h-8 rounded-full object-cover border border-white/20" alt=""
          onError={(e) => avatarError(e, status.user?.displayName)} />
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{status.user?.displayName}</p>
          <p className="text-white/40 text-xs">{new Date(status.createdAt).toLocaleTimeString()}</p>
        </div>
        <p className="text-xs text-white/30">
          Expires {new Date(new Date(status.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        {status.type === "video" && status.mediaUrl
          ? <video src={status.mediaUrl} controls autoPlay className="max-h-full max-w-full rounded-2xl" />
          : status.type === "image" && status.mediaUrl
          ? <img src={status.mediaUrl} alt="status" className="max-h-full max-w-full rounded-2xl" />
          : <p className="text-white text-2xl font-semibold text-center">{status.text}</p>
        }
      </div>
      {status.text && (status.type === "image" || status.type === "video") && (
        <p className="text-white/70 text-sm text-center px-6 pb-2">{status.text}</p>
      )}
      <p className="text-white/30 text-xs text-center pb-6">{status.views?.length || 0} views</p>
    </div>
  );
}

// ── Empty Conversation placeholder ────────────────────────────────
function EmptyState({ onCreateGroup }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
      {/* Ambient orb */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-600 rounded-full opacity-5 blur-[80px]" />
      </div>
      <div className="relative w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-3xl flex items-center justify-center">
        <FontAwesomeIcon icon={faComments} className="text-violet-400 text-3xl" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0a0a0f]" />
      </div>
      <div>
        <p className="text-white font-semibold text-base">Your conversations</p>
        <p className="text-white/30 text-sm mt-1">Select a chat to start messaging or create a new group</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button onClick={onCreateGroup}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm font-medium transition">
          <FontAwesomeIcon icon={faUserGroup} /> Create a Group
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-xs">
        {[
          { icon: faLock, label: "Encrypted", sub: "AES secured" },
          { icon: faFileAudio, label: "Voice Notes", sub: "Record & send" },
          { icon: faPhotoFilm, label: "Media", sub: "Photos & files" },
        ].map(f => (
          <div key={f.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 flex flex-col items-center gap-1">
            <FontAwesomeIcon icon={f.icon} className="text-violet-400 text-sm" />
            <p className="text-white/60 text-xs font-medium">{f.label}</p>
            <p className="text-white/20 text-[10px]">{f.sub}</p>
          </div>
        ))}
      </div>
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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => { return () => clearTimeout(searchDebounceRef.current); }, []);

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
        if (userData.chatWallpaper) setWallpaper(userData.chatWallpaper);
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
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ chatWallpaper: preset }) });
    } catch (err) { console.error("Failed to save wallpaper:", err); }
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
    } catch { }
    setSearching(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setUserSearch(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchUsers(value), 400);
  };

  const liveStatuses = useMemo(() => statuses.filter(s => !isStatusExpired(s)), [statuses]);
  const myStatuses  = useMemo(() => liveStatuses.filter(s => s.user?.id === dbUser?.id), [liveStatuses, dbUser]);
  const otherStatuses = useMemo(() => liveStatuses.filter(s => s.user?.id !== dbUser?.id), [liveStatuses, dbUser]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(room) => {
            setRooms(prev => [room, ...prev]);
            setActiveRoom(room);
            setShowCreateGroup(false);
          }}
        />
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <Link to="/home" className="text-white/40 hover:text-violet-400 transition">
                <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
              </Link>
              <h1 className="text-lg font-black tracking-tight">
                TEST<span className="text-violet-400">YOURSELF</span>
                <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Chat</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 border border-violet-500/30 text-violet-400 rounded-full text-xs font-medium hover:bg-violet-500/25 transition">
                <FontAwesomeIcon icon={faUserGroup} />
                <span>New Group</span>
              </button>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center justify-around border-t border-white/5 px-2">
            {TAB_LINKS.map(tab => {
              const isActive = location.pathname === tab.href;
              return (
                <Link key={tab.href} to={tab.href}
                  className={`flex flex-col items-center py-2 px-4 border-b-2 transition text-xs gap-0.5 ${
                    isActive ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"
                  }`}>
                  <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto flex pt-[97px]" style={{ height: "100vh" }}>

        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-white/5 bg-[#0a0a0f] flex flex-col shrink-0 ${activeRoom ? "hidden md:flex" : "flex"}`}>

          {/* Sidebar tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {["chats", "status"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold capitalize transition border-b-2 ${
                  tab === t ? "border-violet-500 text-violet-400" : "border-transparent text-white/30 hover:text-white/60"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {tab === "chats" && (
            <>
              {/* Search */}
              <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
                  <input value={userSearch} onChange={handleSearchChange}
                    placeholder="Search by name or @username..."
                    className="w-full pl-8 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition" />
                  {searching && <FontAwesomeIcon icon={faSpinner} spin className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-[#0d0d14] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    {searchResults.map(u => (
                      <button key={u.id}
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition text-left">
                        <img src={safeAvatar(u.photoURL, u.displayName)}
                          className="w-8 h-8 rounded-full object-cover border border-white/10" alt=""
                          onError={(e) => avatarError(e, u.displayName)} />
                        <div>
                          <p className="text-sm font-medium text-white">{u.displayName}</p>
                          {u.chatSnapUsername && <p className="text-xs text-white/30">@{u.chatSnapUsername}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-violet-400">
                  <FontAwesomeIcon icon={faSpinner} spin />
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mb-3">
                    <FontAwesomeIcon icon={faComments} className="text-violet-400 text-xl" />
                  </div>
                  <p className="text-white/50 font-medium text-sm">No conversations yet</p>
                  <p className="text-white/20 text-xs mt-1">Start by searching for someone or creating a group</p>
                  <button onClick={() => setShowCreateGroup(true)}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white rounded-full text-xs font-medium hover:bg-violet-400 transition">
                    <FontAwesomeIcon icon={faUserGroup} /> Create a Group
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {rooms.map(room => (
                    <RoomItem key={room.id} room={room} currentUserId={dbUser?.id}
                      active={activeRoom?.id === room.id} onClick={() => setActiveRoom(room)} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "status" && (
            <div className="flex-1 overflow-y-auto">
              {/* My status */}
              <div className="px-4 py-4 border-b border-white/[0.04]">
                <p className="text-xs text-white/30 font-semibold tracking-widest mb-3">MY STATUS</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={safeAvatar(user?.photoURL, user?.displayName)}
                      className="w-12 h-12 rounded-full object-cover border border-white/10" alt=""
                      onError={(e) => avatarError(e, user?.displayName)} />
                    <button onClick={() => setShowStatusCreate(true)}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center text-white border-2 border-[#0a0a0f]">
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">My Status</p>
                    <p className="text-xs text-white/30">
                      {myStatuses.length > 0
                        ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""} · expires in 24h`
                        : "Tap + to add status"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Others' statuses */}
              {otherStatuses.length > 0 && (
                <div className="px-4 py-4">
                  <p className="text-xs text-white/30 font-semibold tracking-widest mb-3">RECENT UPDATES</p>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {otherStatuses.map(status => (
                      <StatusCircle key={status.id} status={status} isOwn={false} onClick={() => setViewingStatus(status)} />
                    ))}
                  </div>
                </div>
              )}

              {otherStatuses.length === 0 && (
                <div className="text-center py-10">
                  <FontAwesomeIcon icon={faCircle} className="text-3xl text-white/5 mb-2" />
                  <p className="text-white/20 text-sm">No status updates yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${activeRoom ? "flex" : "hidden md:flex"}`}>
          {activeRoom ? (
            <ChatRoom
              room={activeRoom}
              dbUserId={dbUser?.id}
              onBack={() => setActiveRoom(null)}
              wallpaper={wallpaper}
              onOpenWallpaper={() => setShowWallpaperPicker(true)}
            />
          ) : (
            <EmptyState onCreateGroup={() => setShowCreateGroup(true)} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showStatusCreate && (
        <StatusCreator onClose={() => setShowStatusCreate(false)}
          onPosted={(status) => setStatuses(prev => [status, ...prev])} />
      )}
      {viewingStatus && (
        <StatusViewer status={viewingStatus} onClose={() => setViewingStatus(null)} onView={handleViewStatus} />
      )}
      {showWallpaperPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowWallpaperPicker(false)}>
          <div className="bg-[#0d0d14] border border-white/10 w-full max-w-lg rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">
                <FontAwesomeIcon icon={faPalette} className="mr-2 text-violet-400" />
                Chat Wallpaper
              </h2>
              <button onClick={() => setShowWallpaperPicker(false)} className="text-white/30 hover:text-white transition">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <p className="text-xs text-white/30 font-semibold tracking-widest mb-3">PRESETS</p>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { id: "default",  label: "Default",  bg: "#0a0a0f" },
                { id: "midnight", label: "Midnight",  bg: "#0f172a" },
                { id: "violet",   label: "Violet",    bg: "#1e1b4b" },
                { id: "forest",   label: "Forest",    bg: "#052e16" },
                { id: "rose",     label: "Rose",      bg: "#4c0519" },
                { id: "slate",    label: "Slate",     bg: "#0f1729" },
                { id: "amber",    label: "Amber",     bg: "#2d1900" },
                { id: "ocean",    label: "Ocean",     bg: "#0c1a2e" },
              ].map(preset => (
                <button key={preset.id} onClick={() => handleWallpaperSelect({ id: preset.id, bg: preset.bg, type: "color" })}
                  className={`h-14 rounded-2xl border-2 transition flex items-end justify-center pb-1.5 ${
                    wallpaper?.id === preset.id ? "border-violet-400 scale-105" : "border-white/10"
                  }`}
                  style={{ background: preset.bg }}>
                  <span className="text-xs text-white/50">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
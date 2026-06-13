import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";
import { useAuth } from "./useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook, faUsers, faShoppingBag, faGraduationCap,
  faFlag, faBan, faCheckCircle, faChartBar, faStore, faStar,
  faChevronLeft, faComment, faBullhorn,
} from "@fortawesome/free-solid-svg-icons";
import { API } from "./config";

const ADMIN_EMAILS = ["omisope34@gmail.com"];

async function apiFetch(path, options = {}) {
  const token = await getIdToken(auth.currentUser, true);
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function isActive(lastActiveAt) {
  if (!lastActiveAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(lastActiveAt) > sevenDaysAgo;
}

// ── Shared styles ──────────────────────────────────────────────────
const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition";
const thCls = "px-4 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wider";
const tdCls = "px-4 py-3 text-sm text-white/60";

function StatCard({ label, value, icon, accent = "violet" }) {
  const colors = {
    violet: "border-violet-500/40 bg-violet-500/5",
    purple: "border-purple-500/40 bg-purple-500/5",
    pink:   "border-pink-500/40 bg-pink-500/5",
    green:  "border-emerald-500/40 bg-emerald-500/5",
    red:    "border-pink-500/40 bg-pink-500/5",
  };
  const iconColors = { violet:"text-violet-400", purple:"text-purple-400", pink:"text-pink-400", green:"text-emerald-400", red:"text-pink-400" };
  return (
    <div className={`rounded-2xl p-5 border-l-4 ${colors[accent]} border border-white/10 flex items-center gap-4`}>
      <div className={`text-2xl ${iconColors[accent]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
        <p className="text-xs text-white/30 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <p className="text-white/60 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/40 hover:border-white/20 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-pink-500/80 hover:bg-pink-500 text-white text-sm transition">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/40 hover:border-violet-500/30 disabled:opacity-30 transition">Previous</button>
      <span className="text-sm text-white/30">Page {page} of {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/40 hover:border-violet-500/30 disabled:opacity-30 transition">Next</button>
    </div>
  );
}

// ── Announcements Tab ──────────────────────────────────────────────
function AnnouncementsTab() {
  const [mode, setMode] = useState("all"); // "all" | "one"
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", message }
  const [history, setHistory] = useState([]);

  const reset = () => { setTitle(""); setDescription(""); setEmail(""); };

  const send = async () => {
    setStatus(null);
    if (!title.trim() || !description.trim()) {
      setStatus({ type: "error", message: "Please fill in both the subject line and message body." });
      return;
    }
    if (mode === "one" && !email.trim()) {
      setStatus({ type: "error", message: "Please enter a user email." });
      return;
    }

    setSending(true);
    try {
      if (mode === "all") {
        const data = await apiFetch("/admin/broadcast", {
          method: "POST",
          body: JSON.stringify({ title, description }),
        });
        setStatus({ type: "success", message: `Sent to ${data.sent} user${data.sent !== 1 ? "s" : ""} successfully.` });
        setHistory(h => [{ type: "all", title, description, sent: data.sent, time: new Date().toLocaleString() }, ...h]);
      } else {
        await apiFetch("/admin/broadcast/single", {
          method: "POST",
          body: JSON.stringify({ email, title, description }),
        });
        setStatus({ type: "success", message: `Email sent to ${email} successfully.` });
        setHistory(h => [{ type: "one", title, description, email, time: new Date().toLocaleString() }, ...h]);
      }
      reset();
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Something went wrong." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Compose card */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">New announcement</p>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-black/30 rounded-xl w-fit">
          <button
            onClick={() => { setMode("all"); setStatus(null); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === "all" ? "bg-violet-500 text-white" : "text-white/40 hover:text-white/60"}`}
          >
            All users
          </button>
          <button
            onClick={() => { setMode("one"); setStatus(null); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${mode === "one" ? "bg-violet-500 text-white" : "text-white/40 hover:text-white/60"}`}
          >
            Specific user
          </button>
        </div>

        {/* Email field (specific user only) */}
        {mode === "one" && (
          <div>
            <label className="text-xs text-white/30 mb-1.5 block">User email</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        <div>
          <label className="text-xs text-white/30 mb-1.5 block">Subject line</label>
          <input
            type="text"
            placeholder="e.g. Study Material Page Updated"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="text-xs text-white/30 mb-1.5 block">Message body</label>
          <textarea
            placeholder="Describe the update — what changed and why users should care..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Status feedback */}
        {status && (
          <div className={`rounded-xl px-4 py-2.5 text-sm ${status.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-pink-500/10 text-pink-400 border border-pink-500/20"}`}>
            {status.message}
          </div>
        )}

        <button
          onClick={send}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition"
        >
          <FontAwesomeIcon icon={faBullhorn} />
          {sending ? "Sending..." : mode === "all" ? "Send to all users" : "Send to this user"}
        </button>
      </div>

      {/* History */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Sent announcements</p>
          {history.length > 0 && (
            <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 rounded-full text-xs font-semibold">{history.length}</span>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-white/20 text-sm text-center py-6">No announcements sent yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {history.map((h, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white">{h.title}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.type === "all" ? "bg-violet-500/15 text-violet-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                    {h.type === "all" ? `${h.sent} users` : h.email}
                  </span>
                </div>
                <p className="text-xs text-white/30">{h.time}</p>
                <p className="text-xs text-white/40 mt-1 truncate">{h.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { apiFetch("/admin/users").then(setUsers).catch(console.error).finally(() => setLoading(false)); }, []);

  const deleteUser = async (id) => {
    try { await apiFetch(`/admin/users/${id}`, { method: "DELETE" }); setUsers(u => u.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  const filtered = users.filter(u => u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <input type="text" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${inputCls} mb-4`} />
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03]"><tr><th className={thCls}>User</th><th className={thCls}>Email</th><th className={thCls}>University</th><th className={thCls}>Joined</th><th className={thCls}>Action</th><th className={thCls}>Last Active</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`} className="w-7 h-7 rounded-full object-cover border border-white/10" alt="" />
                      <span className="font-medium text-white text-sm">{u.displayName || "—"}</span>
                      {u.isBanned && <span className="px-1.5 py-0.5 bg-pink-500/15 text-pink-400 rounded text-xs">Banned</span>}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isActive(u.lastActiveAt) ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                        {isActive(u.lastActiveAt) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={tdCls}>{u.email}</td>
                    <td className={tdCls}>{u.university?.shortName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/30">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/30">{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 flex items-center gap-3 whitespace-nowrap min-w-[180px]">
                      <button onClick={async () => {
                        try {
                          const token = await getIdToken(auth.currentUser, true);
                          await fetch(`${API}/admin/users/${u.id}/ban`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
                          setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isBanned: !x.isBanned } : x));
                        } catch (err) { console.error(err); }
                      }} className={`text-xs font-medium transition ${u.isBanned ? "text-emerald-400 hover:text-emerald-300" : "text-yellow-400 hover:text-yellow-300"}`}>
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                      <button onClick={() => setConfirm({ id: u.id, name: u.displayName })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button>
                      <button
                        onClick={() => {
                          const subject = prompt('Email subject:');
                          const message = prompt('Your message:');
                          if (!subject || !message) return;
                          apiFetch('/admin/send-message', {
                            method: 'POST',
                            body: JSON.stringify({ userId: u.id, subject, message }),
                          })
                            .then(() => alert(`Message sent to ${u.displayName}!`))
                            .catch(() => alert('Failed to send message'));
                        }}
                        className="text-violet-400 hover:text-violet-300 text-xs font-medium transition"
                      >
                        Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No users found.</p>}
          </div>
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} setPage={setPage} />
        </>
      )}
      {confirm && <ConfirmModal message={`Delete user "${confirm.name}"? This cannot be undone.`} onConfirm={() => { deleteUser(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Materials Tab ──────────────────────────────────────────────────
function MaterialsTab() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { apiFetch("/admin/materials").then(setMaterials).catch(console.error).finally(() => setLoading(false)); }, []);

  const deleteMaterial = async (id) => {
    try { await apiFetch(`/admin/materials/${id}`, { method: "DELETE" }); setMaterials(m => m.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  const filtered = materials.filter(m => m.title?.toLowerCase().includes(search.toLowerCase()) || m.faculty?.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <input type="text" placeholder="Search materials..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${inputCls} mb-4`} />
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03]"><tr><th className={thCls}>Title</th><th className={thCls}>Uploaded By</th><th className={thCls}>Faculty</th><th className={thCls}>Visibility</th><th className={thCls}>Date</th><th className={thCls}>Action</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-medium text-white text-sm max-w-[180px] truncate">{m.title}</td>
                    <td className={tdCls}>{m.user?.displayName || "—"}</td>
                    <td className={tdCls}>{m.faculty || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.isPublic ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"}`}>{m.isPublic ? "Public" : "Private"}</span></td>
                    <td className="px-4 py-3 text-xs text-white/30">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><button onClick={() => setConfirm({ id: m.id, name: m.title })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No materials found.</p>}
          </div>
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} setPage={setPage} />
        </>
      )}
      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? This cannot be undone.`} onConfirm={() => { deleteMaterial(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Products Tab ───────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { apiFetch("/admin/products").then(setProducts).catch(console.error).finally(() => setLoading(false)); }, []);

  const deleteProduct = async (id) => {
    try { await apiFetch(`/admin/products/${id}`, { method: "DELETE" }); setProducts(p => p.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  const filtered = products.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <input type="text" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${inputCls} mb-4`} />
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03]"><tr><th className={thCls}>Title</th><th className={thCls}>Seller</th><th className={thCls}>Price</th><th className={thCls}>Status</th><th className={thCls}>Date</th><th className={thCls}>Action</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-medium text-white text-sm max-w-[180px] truncate">{p.title}</td>
                    <td className={tdCls}>{p.user?.displayName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-violet-400 font-semibold">₦{p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : p.status === "SOLD" ? "bg-pink-500/15 text-pink-400" : "bg-white/5 text-white/30"}`}>{p.status || "ACTIVE"}</span></td>
                    <td className="px-4 py-3 text-xs text-white/30">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><button onClick={() => setConfirm({ id: p.id, name: p.title })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No products found.</p>}
          </div>
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} setPage={setPage} />
        </>
      )}
      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? This cannot be undone.`} onConfirm={() => { deleteProduct(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Universities Tab ───────────────────────────────────────────────
function UniversitiesTab() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newShort, setNewShort] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { apiFetch("/universities").then(setUniversities).catch(console.error).finally(() => setLoading(false)); }, []);

  const addUniversity = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try { const created = await apiFetch("/universities", { method: "POST", body: JSON.stringify({ name: newName, shortName: newShort }) }); setUniversities(u => [...u, created]); setNewName(""); setNewShort(""); }
    catch (err) { console.error(err); }
    setAdding(false);
  };

  const deleteUniversity = async (id) => {
    try { await apiFetch(`/admin/universities/${id}`, { method: "DELETE" }); setUniversities(u => u.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input type="text" placeholder="University full name *" value={newName} onChange={e => setNewName(e.target.value)} className={`flex-1 ${inputCls}`} />
        <input type="text" placeholder="Short name e.g. UNILAG" value={newShort} onChange={e => setNewShort(e.target.value)} className="w-36 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40 transition" />
        <button onClick={addUniversity} disabled={adding} className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm transition">Add</button>
      </div>
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[0.03]"><tr><th className={thCls}>Name</th><th className={thCls}>Short</th><th className={thCls}>Country</th><th className={thCls}>Verified</th><th className={thCls}>Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {universities.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-medium text-white text-sm">{u.name}</td>
                  <td className={tdCls}>{u.shortName || "—"}</td>
                  <td className={tdCls}>{u.country || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={async () => {
                      try {
                        const token = await getIdToken(auth.currentUser, true);
                        await fetch(`${API}/universities/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isVerified: !u.isVerified }) });
                        setUniversities(prev => prev.map(x => x.id === u.id ? { ...x, isVerified: !x.isVerified } : x));
                      } catch (err) { console.error(err); }
                    }} className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 ${u.isVerified ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-white/5 text-white/30 hover:bg-white/10"}`}>
                      {u.isVerified ? <><FontAwesomeIcon icon={faCheckCircle} /> Verified</> : "Verify"}
                    </button>
                  </td>
                  <td className="px-4 py-3"><button onClick={() => setConfirm({ id: u.id, name: u.name })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {universities.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No universities found.</p>}
        </div>
      )}
      {confirm && <ConfirmModal message={`Delete "${confirm.name}"? This cannot be undone.`} onConfirm={() => { deleteUniversity(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiFetch("/admin/reports").then(setReports).catch(() => setReports([])).finally(() => setLoading(false)); }, []);

  const resolve = async (id) => {
    try { await apiFetch(`/admin/reports/${id}/resolve`, { method: "PATCH" }); setReports(r => r.map(x => x.id === id ? { ...x, resolved: true } : x)); }
    catch (err) { console.error(err); }
  };

  return (
    <div>
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : reports.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3 text-emerald-400/50"><FontAwesomeIcon icon={faCheckCircle} /></p>
          <p className="text-white/40 font-medium">No reports yet</p>
          <p className="text-white/20 text-sm mt-1">Everything looks clean!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => (
            <div key={r.id} className={`bg-white/[0.03] border border-white/10 rounded-2xl p-4 ${r.status === "RESOLVED" ? "opacity-40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{r.reason}</p>
                  <p className="text-xs text-white/30 mt-1">Reported by: {r.reporter?.displayName || "Unknown"}</p>
                  <p className="text-xs text-white/30">Target: {r.targetType} — {r.targetId}</p>
                  <p className="text-xs text-white/20">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                {!r.resolved
                  ? <button onClick={() => resolve(r.id)} className="shrink-0 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-full text-xs font-medium hover:bg-emerald-500/25 transition">Resolve</button>
                  : <span className="shrink-0 px-3 py-1.5 bg-white/5 text-white/30 rounded-full text-xs font-medium">Resolved</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sellers Tab ────────────────────────────────────────────────────
function SellersTab() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { apiFetch("/admin/sellers").then(setSellers).catch(console.error).finally(() => setLoading(false)); }, []);

  const deleteSeller = async (id) => {
    try { await apiFetch(`/admin/sellers/${id}`, { method: "DELETE" }); setSellers(s => s.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div>
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[0.03]"><tr><th className={thCls}>Seller</th><th className={thCls}>Email</th><th className={thCls}>ChatSnap</th><th className={thCls}>WhatsApp</th><th className={thCls}>Rating</th><th className={thCls}>Sales</th><th className={thCls}>Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {sellers.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <img src={s.user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${s.user?.displayName}`} className="w-7 h-7 rounded-full object-cover border border-white/10" alt="" />
                    <span className="font-medium text-white text-sm">{s.user?.displayName || "—"}</span>
                  </td>
                  <td className={tdCls}>{s.user?.email || "—"}</td>
                  <td className={tdCls}>{s.chatSnapUsername || "—"}</td>
                  <td className={tdCls}>{s.whatsapp || "—"}</td>
                  <td className="px-4 py-3 text-yellow-400 flex items-center gap-1 text-sm"><FontAwesomeIcon icon={faStar} />{s.rating > 0 ? s.rating.toFixed(1) : "—"}</td>
                  <td className={tdCls}>{s.totalSales}</td>
                  <td className="px-4 py-3"><button onClick={() => setConfirm({ id: s.id, name: s.user?.displayName })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {sellers.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No sellers found.</p>}
        </div>
      )}
      {confirm && <ConfirmModal message={`Remove seller "${confirm.name}"? This cannot be undone.`} onConfirm={() => { deleteSeller(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Reviews Tab ────────────────────────────────────────────────────
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { apiFetch("/admin/reviews").then(setReviews).catch(console.error).finally(() => setLoading(false)); }, []);

  const deleteReview = async (id) => {
    try { await apiFetch(`/admin/reviews/${id}`, { method: "DELETE" }); setReviews(r => r.filter(x => x.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <div>
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full">
            <thead className="bg-white/[0.03]"><tr><th className={thCls}>Reviewer</th><th className={thCls}>Item</th><th className={thCls}>Rating</th><th className={thCls}>Comment</th><th className={thCls}>Date</th><th className={thCls}>Action</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {reviews.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 font-medium text-white text-sm">{r.user?.displayName || "—"}</td>
                  <td className="px-4 py-3 text-white/50 text-sm max-w-[150px] truncate">{r.item?.title || "—"}</td>
                  <td className="px-4 py-3 text-yellow-400 flex items-center gap-1 text-sm"><FontAwesomeIcon icon={faStar} /> {r.rating}</td>
                  <td className="px-4 py-3 text-white/40 text-sm max-w-[200px] truncate">{r.comment || "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/30">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button onClick={() => setConfirm({ id: r.id })} className="text-pink-400 hover:text-pink-300 text-xs font-medium transition">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {reviews.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No reviews found.</p>}
        </div>
      )}
      {confirm && <ConfirmModal message="Delete this review? This cannot be undone." onConfirm={() => { deleteReview(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ── Feedback Tab ───────────────────────────────────────────────────
function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { apiFetch("/feedback").then(setFeedbacks).catch(console.error).finally(() => setLoading(false)); }, []);

  const filtered = feedbacks.filter(f =>
    f.message?.toLowerCase().includes(search.toLowerCase()) ||
    f.category?.toLowerCase().includes(search.toLowerCase()) ||
    f.user?.displayName?.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const categoryColors = {
    Bug: "bg-pink-500/15 text-pink-400",
    Suggestion: "bg-violet-500/15 text-violet-400",
    General: "bg-white/10 text-white/40",
  };

  return (
    <div>
      <input type="text" placeholder="Search feedback..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${inputCls} mb-4`} />
      {loading ? <p className="text-white/20 text-sm text-center py-10">Loading...</p> : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className={thCls}>User</th>
                  <th className={thCls}>Category</th>
                  <th className={thCls}>Rating</th>
                  <th className={thCls}>Message</th>
                  <th className={thCls}>Page</th>
                  <th className={thCls}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map(f => (
                  <tr key={f.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 text-sm text-white font-medium">{f.user?.displayName || "Anonymous"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[f.category] || "bg-white/5 text-white/30"}`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-yellow-400 text-sm flex items-center gap-1">
                      <FontAwesomeIcon icon={faStar} /> {f.rating}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-sm max-w-[260px] truncate">{f.message}</td>
                    <td className={tdCls}>{f.page || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/30">{new Date(f.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center text-white/20 py-8 text-sm">No feedback yet.</p>}
          </div>
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} setPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Main Admin ─────────────────────────────────────────────────────
function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);

  useEffect(() => { apiFetch("/admin/stats").then(setStats).catch(console.error); }, []);

  if (user && !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4 text-white/10"><FontAwesomeIcon icon={faBan} /></p>
          <p className="text-white font-semibold">Access Denied</p>
          <p className="text-white/30 text-sm mt-1">You don't have permission to view this page.</p>
          <button onClick={() => navigate("/home")} className="mt-4 px-5 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-full text-sm transition">Go Home</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview",       label: "Overview",       icon: <FontAwesomeIcon icon={faChartBar} /> },
    { id: "users",          label: "Users",          icon: <FontAwesomeIcon icon={faUsers} /> },
    { id: "materials",      label: "Materials",      icon: <FontAwesomeIcon icon={faBook} /> },
    { id: "products",       label: "Products",       icon: <FontAwesomeIcon icon={faShoppingBag} /> },
    { id: "sellers",        label: "Sellers",        icon: <FontAwesomeIcon icon={faStore} /> },
    { id: "reviews",        label: "Reviews",        icon: <FontAwesomeIcon icon={faStar} /> },
    { id: "universities",   label: "Universities",   icon: <FontAwesomeIcon icon={faGraduationCap} /> },
    { id: "reports",        label: "Reports",        icon: <FontAwesomeIcon icon={faFlag} /> },
    { id: "feedback",       label: "Feedback",       icon: <FontAwesomeIcon icon={faComment} /> },
    { id: "announcements",  label: "Announcements",  icon: <FontAwesomeIcon icon={faBullhorn} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/home")} className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 className="text-lg font-black tracking-tight">
            TEST<span className="text-violet-400">YOURSELF</span>
            <span className="ml-2 text-xs font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full align-middle">Admin</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <img src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`} className="w-8 h-8 rounded-full object-cover border border-white/10" alt="" />
          <span className="text-sm text-white/50 hidden sm:block">{user?.displayName}</span>
          <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 border border-violet-500/20 rounded-full text-xs font-semibold">Admin</span>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border ${activeTab === tab.id ? "bg-violet-500 text-white border-violet-500" : "bg-white/[0.03] border-white/10 text-white/50 hover:border-violet-500/30 hover:text-violet-400"}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white/70">Platform Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Users"      value={stats?.users}       icon={<FontAwesomeIcon icon={faUsers} />}        accent="violet" />
              <StatCard label="Study Materials"  value={stats?.materials}   icon={<FontAwesomeIcon icon={faBook} />}         accent="purple" />
              <StatCard label="Products Listed"  value={stats?.products}    icon={<FontAwesomeIcon icon={faShoppingBag} />}  accent="pink" />
              <StatCard label="Universities"     value={stats?.universities} icon={<FontAwesomeIcon icon={faGraduationCap} />} accent="green" />
              <StatCard label="Pending Reports"  value={stats?.pendingReports} icon={<FontAwesomeIcon icon={faFlag} />}      accent="red" />
            </div>

            {stats?.marketplace && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Sellers"   value={stats.marketplace.sellers}        icon={<FontAwesomeIcon icon={faStore} />}        accent="violet" />
                <StatCard label="Total Buyers"    value={stats.marketplace.buyers}         icon={<FontAwesomeIcon icon={faUsers} />}        accent="purple" />
                <StatCard label="Active Listings" value={stats.marketplace.activeListings} icon={<FontAwesomeIcon icon={faShoppingBag} />}  accent="green" />
                <StatCard label="Sold Items"      value={stats.marketplace.soldListings}   icon={<FontAwesomeIcon icon={faCheckCircle} />}  accent="pink" />
              </div>
            )}

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
              <p className="text-sm font-semibold text-white/50 mb-1">Logged in as</p>
              <p className="text-white">{user?.email}</p>
              <p className="text-xs text-white/30 mt-1">You have full admin access to this platform.</p>
            </div>

            {stats?.topUniversities?.length > 0 && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <p className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2">
                  <FontAwesomeIcon icon={faChartBar} className="text-violet-400" /> Top Universities by Users
                </p>
                {stats.topUniversities.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <p className="text-sm text-white/70">{u.shortName || u.name}</p>
                    <div className="flex gap-4 text-xs text-white/30">
                      <span className="flex items-center gap-1"><FontAwesomeIcon icon={faUsers} className="text-violet-400/60" />{u._count.users}</span>
                      <span className="flex items-center gap-1"><FontAwesomeIcon icon={faBook} className="text-violet-400/60" />{u._count.studyMaterials}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/50">Inactive Users</p>
                <p className="text-xs text-white/30 mt-1">Send a re-engagement email to users inactive for 7+ days</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch('/admin/notify-inactive', { method: 'POST' });
                    alert(`Sent emails to ${res.sent} inactive users!`);
                  } catch {
                    alert(`Failed to send emails`);
                  }
                }}
                className="shrink-0 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-medium transition"
              >
                Notify Inactive Users
              </button>
            </div>
          </div>
        )}

        {activeTab === "users"          && <UsersTab />}
        {activeTab === "materials"      && <MaterialsTab />}
        {activeTab === "products"       && <ProductsTab />}
        {activeTab === "universities"   && <UniversitiesTab />}
        {activeTab === "reports"        && <ReportsTab />}
        {activeTab === "sellers"        && <SellersTab />}
        {activeTab === "reviews"        && <ReviewsTab />}
        {activeTab === "feedback"       && <FeedbackTab />}
        {activeTab === "announcements"  && <AnnouncementsTab />}
      </div>
    </div>
  );
}

export default Admin;

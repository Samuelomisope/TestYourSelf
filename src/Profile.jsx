import { useState, useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "./firebase";
import { updateProfile } from "firebase/auth";
import { apiGet, apiPatch } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit, faCamera, faBookOpen, faShoppingBag,
  faFire, faFile, faMessage, faSave, faTimes, faArrowLeft
} from "@fortawesome/free-solid-svg-icons";

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [pgUser, setPgUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("materials");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    faculty: "",
    department: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [userData, statsData, materialsData] = await Promise.all([
          apiGet("/users/me"),
          apiGet("/users/me/stats"),
          apiGet("/study-material/my"),
        ]);
        setPgUser(userData);
        setStats(statsData);
        setMaterials(Array.isArray(materialsData) ? materialsData : []);
        setForm({
          displayName: userData.displayName || "",
          bio: userData.bio || "",
          faculty: userData.faculty || "",
          department: userData.department || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoURL = pgUser?.photoURL;

      // Upload photo to Cloudinary if changed
      if (photoFile) {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("upload_preset", "testyourself_upload");
        formData.append("folder", "testyourself/avatars");
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await res.json();
        photoURL = data.secure_url;

        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
          displayName: form.displayName,
          photoURL,
        });
      } else {
        await updateProfile(auth.currentUser, { displayName: form.displayName });
      }

      // Update PostgreSQL
      const updated = await apiPatch("/users/me", {
        displayName: form.displayName,
        bio: form.bio,
        faculty: form.faculty,
        department: form.department,
        photoURL,
      });

      setPgUser(updated);
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getMimeFileType = (mimeType) => {
    if (!mimeType) return "📁";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("video")) return "🎬";
    if (mimeType.includes("word") || mimeType.includes("presentation")) return "📝";
    return "📁";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-indigo-500 text-sm">Loading profile...</div>
      </div>
    );
  }

  const avatar = photoPreview || pgUser?.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pgUser?.displayName || user?.email || "?")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-white z-40 shadow-sm px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/home")} className="text-gray-500 hover:text-indigo-500 transition">
          <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
        </button>
        <h1 style={{ fontFamily: "'Nunito', sans-serif" }} className="text-lg font-bold text-indigo-500">
          Profile
        </h1>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="text-indigo-500 hover:text-indigo-700 text-sm font-medium transition">
            <FontAwesomeIcon icon={faEdit} className="mr-1" /> Edit
          </button>
        ) : (
          <button onClick={() => { setEditing(false); setPhotoPreview(null); setPhotoFile(null); }}
            className="text-gray-400 hover:text-gray-600 text-sm transition">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </header>

      <main className="pt-20 pb-10 px-4 max-w-2xl mx-auto">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-5">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative">
              <img src={avatar} alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow" />
              {editing && (
                <button onClick={() => fileRef.current.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow hover:bg-indigo-600 transition">
                  <FontAwesomeIcon icon={faCamera} className="text-xs" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {editing ? (
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="mt-3 text-center text-xl font-bold text-gray-800 border-b-2 border-indigo-300 outline-none bg-transparent w-full max-w-xs"
              />
            ) : (
              <h2 className="mt-3 text-xl font-bold text-gray-800">{pgUser?.displayName || "—"}</h2>
            )}

            <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>

            {pgUser?.university && (
              <span className="mt-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                🏫 {pgUser.university.shortName || pgUser.university.name}
              </span>
            )}

            <p className="text-xs text-gray-400 mt-1">Joined {formatDate(pgUser?.createdAt)}</p>
          </div>

          {/* Bio */}
          {editing ? (
            <textarea
              placeholder="Write something about yourself..."
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none mb-3"
            />
          ) : pgUser?.bio ? (
            <p className="text-sm text-gray-600 text-center mb-3">{pgUser.bio}</p>
          ) : null}

          {/* Faculty & Department */}
          {editing && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" placeholder="Faculty / Course"
                value={form.faculty}
                onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <input type="text" placeholder="Department"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {!editing && (pgUser?.faculty || pgUser?.department) && (
            <div className="flex justify-center gap-2 flex-wrap mb-3">
              {pgUser.faculty && (
                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs">{pgUser.faculty}</span>
              )}
              {pgUser.department && (
                <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-xs">{pgUser.department}</span>
              )}
            </div>
          )}

          {/* Save Button */}
          {editing && (
            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition disabled:opacity-50">
              {saving ? "Saving..." : <><FontAwesomeIcon icon={faSave} className="mr-2" />Save Changes</>}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Files", value: stats?.files || 0, icon: faFile, color: "text-indigo-500" },
            { label: "Streak", value: pgUser?.streakCount || 0, icon: faFire, color: "text-orange-500" },
            { label: "Products", value: stats?.products || 0, icon: faShoppingBag, color: "text-pink-500" },
            { label: "Messages", value: stats?.messages || 0, icon: faMessage, color: "text-green-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
              <FontAwesomeIcon icon={stat.icon} className={`text-xl mb-1 ${stat.color}`} />
              <p className="text-lg font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("materials")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${activeTab === "materials" ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            <FontAwesomeIcon icon={faBookOpen} className="mr-1" /> Study Materials
          </button>
          <button onClick={() => setActiveTab("listings")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${activeTab === "listings" ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            <FontAwesomeIcon icon={faShoppingBag} className="mr-1" /> Listings
          </button>
        </div>

        {/* Materials Tab */}
        {activeTab === "materials" && (
          <div>
            {materials.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-3xl mb-2">📂</p>
                <p className="text-gray-500 font-medium">No materials uploaded yet</p>
                <Link to="/study-material"
                  className="mt-3 inline-block px-5 py-2 bg-indigo-500 text-white rounded-full text-sm hover:bg-indigo-600 transition">
                  Upload a file
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {materials.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                      {getMimeFileType(m.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                      <p className="text-xs text-gray-400">{m.faculty || "—"} · {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.isPublic ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                        {m.isPublic ? "Public" : "Private"}
                      </span>
                      <span className="text-xs text-gray-400">⬇️ {m.downloadCount || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-3xl mb-2">🛒</p>
            <p className="text-gray-500 font-medium">No listings yet</p>
            <Link to="/marketplace"
              className="mt-3 inline-block px-5 py-2 bg-indigo-500 text-white rounded-full text-sm hover:bg-indigo-600 transition">
              Go to Marketplace
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}

export default Profile;

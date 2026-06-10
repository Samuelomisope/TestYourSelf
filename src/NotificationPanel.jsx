import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNotifications } from "./useNotifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

function NotificationPanel({ onClose }) {
  const { notifications } = useNotifications();

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-semibold text-white text-sm">Notifications</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white transition text-sm">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-8">No notifications yet</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition ${!notif.read ? "bg-violet-500/5" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                {notif.type === "quiz" && (
                  <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                {notif.type === "material" && (
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" strokeLinecap="round" />
                  </svg>
                )}
                {notif.type === "chat" && (
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
                {!["quiz","material","chat"].includes(notif.type) && (
                  <div className="w-2 h-2 bg-violet-400 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70">{notif.message}</p>
                <p className="text-xs text-white/20 mt-1">{notif.createdAt?.toDate().toLocaleString()}</p>
              </div>

              {!notif.read && <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 shrink-0" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationPanel;
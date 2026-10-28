import { useNavigate } from "react-router-dom";
import { useNotifications } from "./useNotifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

function NotificationPanel({ onClose }) {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const openNotification = async (notification) => {
    try {
      if (!notification.read) await markAsRead(notification.id);
    } catch {
      // Still let the user open the relevant page if marking read fails.
    }
    const destination = {
      activity: "/home",
      material: "/study-material",
      study_plan_reminder: "/study-plan",
      chat: "/chat",
      ai_reply: "/ai",
      marketplace: "/marketplace",
    }[notification.type];
    if (destination) navigate(destination);
    onClose?.();
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-bg-elevated border border-ink/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/5">
        <h3 className="font-semibold text-ink text-sm">Notifications</h3>
        <button onClick={onClose} className="text-ink/30 hover:text-ink transition text-sm">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-ink/20 text-sm py-8">No notifications yet</p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => openNotification(notif)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openNotification(notif);
                }
              }}
              role="button"
              tabIndex={0}
              className={`flex items-start gap-3 px-4 py-3 border-b border-ink/5 cursor-pointer hover:bg-white/5 transition ${!notif.read ? "bg-violet-500/5" : ""}`}
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
                {notif.type === "ai_reply" && (
                  <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" />
                    <path d="M19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14z" />
                  </svg>
                )}

                {notif.type === "marketplace" && (
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4l1-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
)}
                {!["quiz", "material", "chat", "ai_reply", "marketplace"].includes(notif.type) && (
                  <div className="w-2 h-2 bg-violet-400 rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink/80">{notif.title}</p>
                <p className="text-sm text-ink/60">{notif.message}</p>
                <p className="text-xs text-ink/30 mt-1">{notif.createdAt instanceof Date && !Number.isNaN(notif.createdAt.getTime()) ? notif.createdAt.toLocaleString() : ""}</p>
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

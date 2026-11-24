import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import Navbar from "./Navbar";
import { auth } from "./firebase";
import { apiGet, apiPatch, apiPost } from "./api";
import { useAuth } from "./useAuth";
import { useDarkMode } from "./DarkModeContext.jsx";
import { useOnboarding } from "./onboarding/context";
import { useConfirm, notify } from "./ui/feedbackContext.js";
import { browserStorage, loadVoicePrefs, saveVoicePrefs } from "./classroom/voicePrefs.js";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
  { id: "system", label: "Match my device" },
];

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-4">
      <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children, labelId }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onChange, labelledBy, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} disabled={disabled} onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${checked ? "bg-violet-500" : "bg-ink/20"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const selectCls = "min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-ink";
const linkRow = "flex min-h-11 items-center justify-between rounded-xl px-1 text-sm font-medium hover:text-violet-500";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { theme, setTheme } = useDarkMode();
  const { startTour, openWhatsNew } = useOnboarding();

  const [profile, setProfile] = useState(null);
  const [billing, setBilling] = useState(null);
  const [failed, setFailed] = useState(false);
  const [voice, setVoice] = useState(() => loadVoicePrefs(browserStorage()));

  useEffect(() => {
    let cancelled = false;
    apiGet("/users/me").then((p) => { if (!cancelled) setProfile(p); }).catch(() => { if (!cancelled) setFailed(true); });
    apiGet("/billing/status").then((b) => { if (!cancelled) setBilling(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const premium = billing?.isPremium === true;
  const reminders = profile ? profile.emailReminders !== false : true;
  const premiumUntil = useMemo(() => (billing?.premiumUntil ? new Date(billing.premiumUntil).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : ""), [billing]);

  const changeVoice = (patch) => setVoice((current) => { const next = { ...current, ...patch }; saveVoicePrefs(browserStorage(), next); return next; });

  async function toggleReminders() {
    const next = !reminders;
    setProfile((p) => ({ ...p, emailReminders: next }));
    try {
      await apiPatch("/users/me/email-reminders", { enabled: next });
      notify.success(next ? "Study reminder emails are on." : "Study reminder emails are off.");
    } catch {
      setProfile((p) => ({ ...p, emailReminders: !next }));
      notify.error("Could not change that setting. Please try again.");
    }
  }

  async function finishSignOut() {
    await logout();
    await signOut(auth).catch(() => {});
    navigate("/");
  }

  async function signOutEverywhere() {
    const ok = await confirm({
      title: "Sign out of all devices?",
      message: "Every phone and computer signed in to your account will be signed out, including this one. You can sign in again with Google any time.",
      confirmLabel: "Sign out everywhere",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiPost("/auth/logout-all", {});
      notify.success("Signed out of all devices.");
      await finishSignOut();
    } catch {
      notify.error("Could not sign you out of all devices. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-28">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Appearance, notifications, your tutor and your account.</p>
        {failed && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">We couldn't load your account details. Settings stored on this device still work.</p>}

        <div className="space-y-4">
          <Section id="appearance" title="Appearance">
            <Row label="Theme" hint="Saved on this device." labelId="theme-label">
              <select aria-labelledby="theme-label" className={selectCls} value={theme} onChange={(e) => setTheme(e.target.value)}>
                {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Row>
          </Section>

          <Section id="notifications" title="Notifications">
            <Row label="Study reminder emails" hint="One a day at 6pm, only when you have plan tasks or flashcards waiting." labelId="reminders-label">
              <Switch checked={reminders} onChange={toggleReminders} labelledBy="reminders-label" disabled={!profile} />
            </Row>
          </Section>

          <Section id="classroom" title="AI Classroom">
            <Row label="Read new replies aloud" hint="Uses your device's voice. Saved on this device." labelId="speak-label">
              <Switch checked={voice.autoSpeak} onChange={() => changeVoice({ autoSpeak: !voice.autoSpeak })} labelledBy="speak-label" />
            </Row>
            <Row label="Voice speed" labelId="rate-label">
              <select aria-labelledby="rate-label" className={selectCls} value={voice.rate} onChange={(e) => changeVoice({ rate: Number(e.target.value) })}>
                {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
              </select>
            </Row>
            <Row label="Show the tutor" hint="Turn off to give the lesson more room." labelId="tutor-label">
              <Switch checked={voice.showTutor} onChange={() => changeVoice({ showTutor: !voice.showTutor })} labelledBy="tutor-label" />
            </Row>
            <Row label="Tutor style" hint={premium ? "The 3D tutor needs a capable device." : "The 3D tutor is part of Premium."} labelId="view-label">
              <select aria-labelledby="view-label" className={selectCls} value={voice.tutorView} onChange={(e) => changeVoice({ tutorView: e.target.value })}>
                <option value="auto">Automatic</option>
                <option value="2d">2D animated</option>
                <option value="3d" disabled={!premium}>3D{premium ? "" : " (Premium)"}</option>
              </select>
            </Row>
          </Section>

          <Section id="account" title="Account">
            <Row label="Email">
              <span className="truncate text-sm text-muted">{profile?.email || user?.email || "—"}</span>
            </Row>
            <Link to="/profile" className={linkRow}>Edit my profile, faculty and department <span aria-hidden="true">→</span></Link>
            <Row label="Plan" hint={premium ? (premiumUntil ? `Premium until ${premiumUntil}` : "Premium is active") : "Free"}>
              <Link to="/premium" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold hover:border-violet-500/50">{premium ? "Manage" : "See Premium"}</Link>
            </Row>
          </Section>

          <Section id="help" title="Help and legal">
            <button type="button" onClick={startTour} className={`${linkRow} w-full text-left`}>Take the app tour <span aria-hidden="true">→</span></button>
            <button type="button" onClick={openWhatsNew} className={`${linkRow} w-full text-left`}>What's new <span aria-hidden="true">→</span></button>
            <Link to="/feedback" className={linkRow}>Send feedback or contact us <span aria-hidden="true">→</span></Link>
            <Link to="/privacy" className={linkRow}>Privacy policy <span aria-hidden="true">→</span></Link>
            <Link to="/terms" className={linkRow}>Terms of service <span aria-hidden="true">→</span></Link>
            <p className="text-xs text-muted">To delete your account, send us a message from the feedback page and we will take care of it.</p>
          </Section>

          <Section id="session" title="Sign out">
            <button type="button" onClick={finishSignOut} className="min-h-11 w-full rounded-xl border border-line px-4 text-sm font-semibold hover:bg-ink/5">Sign out of this device</button>
            <button type="button" onClick={signOutEverywhere} className="min-h-11 w-full rounded-xl border border-red-500/40 px-4 text-sm font-semibold text-red-600 hover:bg-red-500/5 dark:text-red-400">Sign out of all devices</button>
          </Section>
        </div>
      </main>
    </div>
  );
}

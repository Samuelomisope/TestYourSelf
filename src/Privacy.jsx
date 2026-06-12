import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

const LAST_UPDATED = "June 12, 2025";
const APP_NAME = "TestYourself";
const CONTACT_EMAIL = "hello.testyourself@gmail.com"; // update this
const APP_URL = "https://testyourself-nu.vercel.app";

const Section = ({ title, children }) => (
  <section className="mb-10">
    <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-white/5">{title}</h2>
    <div className="text-white/50 text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500 rounded-full opacity-[0.06] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-40 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/home" className="text-white/40 hover:text-violet-400 transition">
            <FontAwesomeIcon icon={faChevronDown} className="rotate-90" />
          </Link>
          <h1 className="text-lg font-black tracking-tight">
            TEST<span className="text-violet-400">YOURSELF</span>
            <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Privacy</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-3xl mx-auto">

        {/* Hero */}
        <div className="mb-10 mt-4">
          <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-white/30 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl px-5 py-4 mb-10 text-sm text-violet-300">
          This policy explains what data {APP_NAME} collects, why we collect it, and how we use it. We keep it short and plain — no legal jargon.
        </div>

        <Section title="1. Who We Are">
          <p>
            {APP_NAME} is an educational platform that helps students study smarter and learn together.
            We are accessible at <a href={APP_URL} className="text-violet-400 hover:underline">{APP_URL}</a>.
            For any privacy questions, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect the following when you use {APP_NAME}:</p>
          <ul className="space-y-2 mt-2">
            {[
              { label: "Account information", desc: "Your name, email address, and profile photo when you sign up via Google or email." },
              { label: "Study materials", desc: "Files you upload (PDFs, videos, documents) and metadata like title, course name, and university." },
              { label: "Google Drive access", desc: "If you choose to import files from Google Drive, we request read-only access to let you select and download those files. We do not store your Drive credentials or access any files you do not explicitly select." },
              { label: "Usage data", desc: "Basic interaction data such as pages visited and features used, to help us improve the product." },
            ].map((item) => (
              <li key={item.label} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span><span className="text-white/70 font-medium">{item.label}:</span> {item.desc}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information only to provide and improve {APP_NAME}:</p>
          <ul className="space-y-2 mt-2">
            {[
              "To create and manage your account.",
              "To store and serve your uploaded study materials.",
              "To allow you to import files from Google Drive into your study library.",
              "To enable social features like public study material sharing.",
              "To send important account-related emails (e.g. password reset).",
              "To analyse usage patterns and improve the platform.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Google Drive Access">
          <p>
            {APP_NAME} uses the Google Picker API to let you import files from your Google Drive. When you use this feature:
          </p>
          <ul className="space-y-2 mt-2">
            {[
              "We request read-only access (drive.readonly scope) — we cannot modify or delete your Drive files.",
              "We only access files you explicitly select through the Google Picker.",
              "Selected files are downloaded once and uploaded to your TestYourself study library.",
              "We do not store your Google OAuth token beyond your current session.",
              "You can revoke our Drive access at any time via your Google Account settings at myaccount.google.com/permissions.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Our use of Google user data complies with the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section title="5. Data Sharing">
          <p>
            We do not sell your personal data. We do not share your data with third parties except:
          </p>
          <ul className="space-y-2 mt-2">
            {[
              "Firebase (Google) — for authentication and database storage.",
              "Render — for backend hosting.",
              "Vercel — for frontend hosting.",
              "When required by law.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your account data and uploaded files for as long as your account is active.
            If you delete a file or your account, the associated data is permanently removed within 30 days.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>You have the right to:</p>
          <ul className="space-y-2 mt-2">
            {[
              "Access the personal data we hold about you.",
              "Request correction of inaccurate data.",
              "Request deletion of your account and data.",
              "Withdraw consent for Google Drive access at any time.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard security measures including HTTPS, Firebase Authentication,
            and secure file storage. However, no method of transmission over the internet is 100% secure.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            {APP_NAME} is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with personal
            information, contact us and we will delete it.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this policy from time to time. We will notify you of significant changes
            by updating the date at the top of this page. Continued use of {APP_NAME} after changes
            means you accept the updated policy.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            Questions about this privacy policy? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

      </main>
    </div>
  );
}

export default Privacy;

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

function Terms() {
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
            <span className="ml-2 text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full align-middle">Terms</span>
          </h1>
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-3xl mx-auto">

        {/* Hero */}
        <div className="mb-10 mt-4">
          <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
          <p className="text-white/30 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl px-5 py-4 mb-10 text-sm text-violet-300">
          By using {APP_NAME}, you agree to these terms. Please read them — they're written to be clear, not confusing.
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using {APP_NAME} at <a href={APP_URL} className="text-violet-400 hover:underline">{APP_URL}</a>,
            you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
          </p>
        </Section>

        <Section title="2. What TestYourself Is">
          <p>
            {APP_NAME} is an educational platform where students can upload, share, and access
            study materials including PDFs, videos, notes, and presentations. It also provides
            tools like AI assistance, a study chat, and a marketplace for academic resources.
          </p>
        </Section>

        <Section title="3. Your Account">
          <ul className="space-y-2">
            {[
              "You must be at least 13 years old to use TestYourself.",
              "You are responsible for keeping your account credentials secure.",
              "You are responsible for all activity that occurs under your account.",
              "You must provide accurate information when creating your account.",
              "You may not create accounts for others without their permission.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use {APP_NAME} to:</p>
          <ul className="space-y-2 mt-2">
            {[
              "Upload content you do not own or have rights to share.",
              "Upload illegal, harmful, or offensive content.",
              "Harass, bully, or harm other users.",
              "Attempt to hack, disrupt, or overload our systems.",
              "Use the platform for commercial purposes without permission.",
              "Impersonate other users or institutions.",
              "Scrape or copy content from the platform without permission.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="5. Your Content">
          <p>
            You retain ownership of all content you upload to {APP_NAME}. By uploading content, you grant us
            a limited licence to store, display, and serve that content to you and, if marked public, to other users.
          </p>
          <p>
            You are solely responsible for the content you upload. Do not upload content that infringes
            on someone else's copyright or intellectual property.
          </p>
          <p>
            We reserve the right to remove any content that violates these terms without notice.
          </p>
        </Section>

        <Section title="6. Google Drive Integration">
          <p>
            {APP_NAME} offers an optional Google Drive integration that lets you import files directly
            from your Drive. By using this feature:
          </p>
          <ul className="space-y-2 mt-2">
            {[
              "You authorise us to access only the files you explicitly select.",
              "You confirm you have the right to upload any files you import from Drive.",
              "You can revoke this access at any time via your Google Account settings.",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-violet-400 mt-0.5">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The {APP_NAME} platform, including its design, code, logo, and features, is owned by us
            and protected by applicable intellectual property laws. You may not copy, reproduce, or
            distribute any part of the platform without our written permission.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            We reserve the right to suspend or terminate your account at any time if you violate
            these terms. You may also delete your account at any time. Upon termination, your
            content will be deleted within 30 days.
          </p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>
            {APP_NAME} is provided "as is" without warranties of any kind. We do not guarantee
            that the platform will be available at all times, error-free, or suitable for any
            particular purpose. Study materials shared by users are not verified by us.
          </p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, {APP_NAME} shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the platform, including
            loss of data or academic outcomes.
          </p>
        </Section>

        <Section title="11. Changes to Terms">
          <p>
            We may update these terms from time to time. We will notify you by updating the date
            at the top of this page. Continued use of {APP_NAME} after changes means you accept
            the updated terms.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            Questions about these terms? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

      </main>
    </div>
  );
}

export default Terms;

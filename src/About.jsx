import { useEffect } from "react";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "unilibng@gmail.com";

// Public page (no sign-in needed) so anyone can see who is behind UniLib.
export default function About() {
  useEffect(() => {
    const previous = document.title;
    document.title = "About UniLib | Founder and team";
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-black tracking-tight">
            UNI<span className="text-violet-400">LIB</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-violet-400 underline underline-offset-2">Open the app</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">About UniLib</h1>
        <p className="mt-4 text-base leading-relaxed text-ink/80">
          UniLib is an education platform for Nigerian university students. It brings a school's notes and past
          questions into one library and adds AI study tools: quizzes, flashcards, summaries, study plans and an AI
          classroom that teaches from your own material. The site is unilib.com.ng.
        </p>

        <h2 className="mt-10 text-xl font-bold">Who is behind UniLib</h2>
        <div className="mt-4 rounded-2xl border border-ink/10 bg-ink/[0.03] p-5">
          <p className="text-lg font-semibold">Samuel Omisope</p>
          <p className="text-sm text-ink/70">Founder and lead developer</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/80">
            Samuel is a Mining Engineering student at the Federal University of Technology, Akure (FUTA), Nigeria. He
            started UniLib to make it easier for students to find course materials and study with less stress, and he
            builds and runs the platform.
          </p>
        </div>

        <h2 className="mt-10 text-xl font-bold">What we are building</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink/80">
          <li>A library of study materials and past questions organised by school, department and course.</li>
          <li>AI study tools that work from the student's own notes.</li>
          <li>An AI classroom with a voice, a whiteboard and quick check-ins.</li>
          <li>Study plans, timed practice and reminders.</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold">Contact</h2>
        <p className="mt-3 text-sm text-ink/80">
          Email{" "}
          <a className="text-violet-400 underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          . You can also read our{" "}
          <Link className="text-violet-400 underline underline-offset-2" to="/privacy">Privacy Policy</Link> and{" "}
          <Link className="text-violet-400 underline underline-offset-2" to="/terms">Terms</Link>.
        </p>

        <p className="mt-12 text-xs text-ink/60">
          UniLib is an independent platform and is not affiliated with any university.
        </p>
      </main>
    </div>
  );
}

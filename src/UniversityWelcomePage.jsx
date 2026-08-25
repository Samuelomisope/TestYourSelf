import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getUniversityBySlug } from "./api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import futa1 from "./assets/futa1.jpg";
import futa2 from "./assets/futa2.jpg";
import futa3 from "./assets/futa3.jpg";

/**
 * UniversityWelcomePage
 *
 * Generic university welcome page — vision, mission, and core values.
 * Renders for whichever university's slug is in the route
 * (`/schools/:universitySlug`), so it serves every university, not
 * just FUTA. Loading and "not found" states are generic; there is no
 * FUTA-specific fallback copy — if a university has no vision/mission/
 * coreValues content yet, those sections simply don't render.
 *
 * Expects `getUniversityBySlug` to resolve a university row shaped like:
 *   {
 *     name, slug, establishedYear, tagline,
 *     vision, mission,
 *     coreValues: [{ letter, word, desc }, ...] | null,
 *     sourceUrl,
 *   }
 * `coreValues` is stored as JSON text in `University.coreValues`; this
 * component expects it already parsed by the API layer (or parses it
 * itself if it comes back as a raw string — see `parseCoreValues`).
 *
 * Uses a `fadeUp` keyframe for the entrance sequence — add this once to
 * `index.css` (outside any `@theme`/`:root` block) rather than injecting
 * it per-render:
 *
 *   @keyframes fadeUp {
 *     from { opacity: 0; transform: translateY(10px); }
 *     to { opacity: 1; transform: translateY(0); }
 *   }
 *   @media (prefers-reduced-motion: reduce) {
 *     [class*="animate-[fadeUp"] { animation: none; }
 *   }
 */

function parseCoreValues(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function PhotoSlot({ label, src, wide = false, delay = 0 }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative flex animate-[fadeUp_0.5s_ease-out_both] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-ink/20 bg-bg-elevated text-ink/30 transition-colors duration-200 hover:border-ink/30 ${
        wide ? "aspect-auto" : "aspect-[4/3]"
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <>
          <FontAwesomeIcon icon={faCamera} className="text-lg opacity-50" />
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
        </>
      )}
    </div>
  );
}

function VisionMissionCard({ kicker, text, delay = 0 }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="relative animate-[fadeUp_0.5s_ease-out_both] rounded-2xl border border-ink/10 bg-bg-elevated p-8 transition-colors duration-200 hover:border-ink/20 before:absolute before:left-0 before:top-7 before:h-7 before:w-0.5 before:bg-accent"
    >
      <p className="mb-3.5 font-serif text-[13px] font-medium uppercase tracking-wider text-accent-hover">
        {kicker}
      </p>
      <p className="font-serif text-xl leading-snug text-ink">{text}</p>
    </div>
  );
}

function CoreValueSeal({ letter, word, desc, delay = 0 }) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      tabIndex={0}
      className="group animate-[fadeUp_0.5s_ease-out_both] rounded-2xl border border-ink/10 bg-bg-elevated px-3.5 py-5 pb-4.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:bg-accent/[0.08] hover:shadow-[0_8px_24px_-12px_rgb(var(--color-accent)/0.35)] focus-visible:-translate-y-0.5 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-accent font-serif text-lg font-semibold text-accent-hover transition-transform duration-200 group-hover:scale-105">
        {letter}
      </div>
      <p className="mb-2 text-[13px] font-semibold text-ink">{word}</p>
      <p className="text-xs leading-snug text-ink/30">{desc}</p>
    </div>
  );
}

function coreValueGridClass(count) {
  // Keep the row sane for university value sets that aren't exactly 5.
  if (count <= 3) return "grid-cols-3 max-[480px]:grid-cols-1";
  if (count === 4) return "grid-cols-4 max-[720px]:grid-cols-2";
  return "grid-cols-5 max-[720px]:grid-cols-3 max-[480px]:grid-cols-2";
}

export default function UniversityWelcomePage() {
  const { universitySlug } = useParams();
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    async function loadUniversity() {
      try {
        const data = await getUniversityBySlug(universitySlug);
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
        } else {
          setUniversity(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUniversity();
    return () => {
      cancelled = true;
    };
  }, [universitySlug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-16 pb-24 text-ink/30">
        Loading university…
      </div>
    );
  }

  if (notFound || !university) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-16 pb-24">
        <p className="text-ink/60">
          We couldn't find that university. Double-check the link, or head
          back to the school directory.
        </p>
      </div>
    );
  }

  const coreValues = parseCoreValues(university.coreValues);
  const campusPhotos =
    university.slug === "futa" ? [futa1, futa2, futa3] : [null, null, null];

  return (
    <div className="mx-auto max-w-[960px] px-6 py-16 pb-24 text-ink">
      {/* Hero */}
      <div className="mb-6 flex animate-[fadeUp_0.5s_ease-out_both] items-center gap-2.5 text-xs font-medium uppercase tracking-widest text-accent-hover">
        <span>{university.name}</span>
        {university.establishedYear && (
          <>
            <span className="h-1 w-1 rounded-full bg-ink/30" />
            <span className="text-ink/30">Est. {university.establishedYear}</span>
          </>
        )}
      </div>

      <h1 className="mb-6 animate-[fadeUp_0.5s_ease-out_both] font-serif text-[clamp(40px,6vw,64px)] font-medium leading-[1.04] tracking-tight text-ink [animation-delay:60ms]">
        Welcome to <em className="italic text-accent-hover">{university.name}</em>
      </h1>

      {university.tagline && (
        <p className="mb-10 max-w-[640px] animate-[fadeUp_0.5s_ease-out_both] text-[17px] leading-relaxed text-ink/60 [animation-delay:120ms]">
          {university.tagline}
        </p>
      )}

      {/* Photo strip */}
      <div className="mb-[72px] grid grid-cols-[1.4fr_1fr_1fr] gap-3 max-[720px]:grid-cols-1">
        <PhotoSlot label="Campus photo" src={campusPhotos[0]} wide delay={160}/>
        <PhotoSlot label="Campus photo" src={campusPhotos[1]} delay={200} />
        <PhotoSlot label="Campus photo" src={campusPhotos[2]} delay={240} />
      </div>

      {/* Browse study materials CTA */}
      <div className="mb-[72px] flex animate-[fadeUp_0.5s_ease-out_both] [animation-delay:280ms]">
        <Link
          to={`/study-material?university=${university.slug}`}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          Browse {university.name} study materials
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Vision & Mission */}
      {(university.vision || university.mission) && (
        <>
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink/30 after:h-px after:flex-1 after:bg-ink/10">
            Vision &amp; mission
          </p>
          <div className="mb-[72px] grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
            {university.vision && (
              <VisionMissionCard kicker="Vision" text={university.vision} delay={0} />
            )}
            {university.mission && (
              <VisionMissionCard kicker="Mission" text={university.mission} delay={80} />
            )}
          </div>
        </>
      )}

      {/* Core values */}
      {coreValues && coreValues.length > 0 && (
        <>
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink/30 after:h-px after:flex-1 after:bg-ink/10">
            Core values
          </p>
          <p className="mb-8 max-w-[560px] text-[15px] leading-relaxed text-ink/60">
            Commitments carried by every school, every department and every
            student at {university.name}.
          </p>
          <div
            className={`mb-5 grid gap-3 ${coreValueGridClass(coreValues.length)}`}
          >
            {coreValues.map((v, i) => (
              <CoreValueSeal key={v.letter ?? v.word} {...v} delay={i * 50} />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      {university.sourceUrl && (
        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-7">
          <span className="text-[13px] text-ink/30">
            Source: {university.name} — official university profile
          </span>
          <a
            href={university.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="border-b border-accent pb-px text-[13px] text-accent-hover no-underline"
          >
            Read the full detail →
          </a>
        </div>
      )}
    </div>
  );
}
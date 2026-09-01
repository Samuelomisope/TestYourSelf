import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { getUniversityBySlug, getUniversityNews } from "./api";
import Navbar from "./Navbar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

import futa1 from "./assets/futa1.jpg";
import futa2 from "./assets/futa2.jpg";
import futa3 from "./assets/futa3.jpg";

/**
 * UniversityWelcomePage
 *
 * Generic university welcome page — vision, mission, core values and news.
 * Renders for whichever university's slug is in the route:
 * /schools/:universitySlug
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
          <FontAwesomeIcon
            icon={faCamera}
            className="text-lg opacity-50"
          />
          <span className="text-[11px] uppercase tracking-wide">
            {label}
          </span>
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

      <p className="font-serif text-xl leading-snug text-ink">
        {text}
      </p>
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

      <p className="mb-2 text-[13px] font-semibold text-ink">
        {word}
      </p>

      <p className="text-xs leading-snug text-ink/30">
        {desc}
      </p>
    </div>
  );
}

function formatNewsDate(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NewsItem({
  title,
  excerpt,
  coverImageUrl,
  sourceUrl,
  publishedAt,
  delay = 0,
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="flex animate-[fadeUp_0.5s_ease-out_both] gap-4 rounded-2xl border border-ink/10 bg-bg-elevated p-5 transition-colors duration-200 hover:border-ink/20"
    >
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="font-serif text-lg font-medium text-ink">
            {title}
          </p>

          {publishedAt && (
            <span className="shrink-0 text-xs text-ink/30">
              {formatNewsDate(publishedAt)}
            </span>
          )}
        </div>

        {excerpt && (
          <p className="mb-2 text-sm leading-relaxed text-ink/60">
            {excerpt}
          </p>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="border-b border-accent pb-px text-[13px] text-accent-hover no-underline"
          >
            Read more →
          </a>
        )}
      </div>
    </div>
  );
}

function coreValueGridClass(count) {
  if (count <= 3) {
    return "grid-cols-3 max-[480px]:grid-cols-1";
  }

  if (count === 4) {
    return "grid-cols-4 max-[720px]:grid-cols-2";
  }

  return "grid-cols-5 max-[720px]:grid-cols-3 max-[480px]:grid-cols-2";
}

export default function UniversityWelcomePage() {
  const { universitySlug } = useParams();

  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [news, setNews] = useState([]);

  // Load university
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setNotFound(false);
    setUniversity(null);
    setNews([]);

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
        console.error("Failed to load university:", err);

        if (!cancelled) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUniversity();

    return () => {
      cancelled = true;
    };
  }, [universitySlug]);

  // Load university news
  useEffect(() => {
    if (!university?.id) return;

    let cancelled = false;

    getUniversityNews(university.id)
      .then((data) => {
        if (!cancelled) {
          setNews(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error("Failed to load university news:", err);

        if (!cancelled) {
          setNews([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [university?.id]);

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />

        <main className="mx-auto max-w-[960px] px-6 pb-24 pt-32 text-ink">
          <p className="text-ink/30">
            Loading university…
          </p>
        </main>
      </>
    );
  }

  // Not found state
  if (notFound || !university) {
    return (
      <>
        <Navbar />

        <main className="mx-auto max-w-[960px] px-6 pb-24 pt-32">
          <p className="text-ink/60">
            We couldn't find that university. Double-check the link, or head
            back to the school directory.
          </p>
        </main>
      </>
    );
  }

  const coreValues = parseCoreValues(university.coreValues);

  const campusPhotos =
    university.slug === "futa"
      ? [futa1, futa2, futa3]
      : [null, null, null];

  const hasSchoolWebsites = university.schools?.some(
    (school) => school.admissionRequirement
  );

  return (
    <>
      {/* Navbar */}
      <Navbar />

      <main className="mx-auto max-w-[960px] px-6 pb-24 pt-32 text-ink">
        {/* Hero */}
        <div className="mb-6 flex animate-[fadeUp_0.5s_ease-out_both] items-center gap-2.5 text-xs font-medium uppercase tracking-widest text-accent-hover">
          <span>{university.name}</span>

          {university.establishedYear && (
            <>
              <span className="h-1 w-1 rounded-full bg-ink/30" />

              <span className="text-ink/30">
                Est. {university.establishedYear}
              </span>
            </>
          )}
        </div>

        <h1 className="mb-6 animate-[fadeUp_0.5s_ease-out_both] font-serif text-[clamp(40px,6vw,64px)] font-medium leading-[1.04] tracking-tight text-ink [animation-delay:60ms]">
          Welcome to{" "}
          <em className="italic text-accent-hover">
            {university.name}
          </em>
        </h1>

        {university.tagline && (
          <p className="mb-10 max-w-[640px] animate-[fadeUp_0.5s_ease-out_both] text-[17px] leading-relaxed text-ink/60 [animation-delay:120ms]">
            {university.tagline}
          </p>
        )}

        {/* Photo strip */}
        <div className="mb-[72px] grid grid-cols-[1.4fr_1fr_1fr] gap-3 max-[720px]:grid-cols-1">
          <PhotoSlot
            label="Campus photo"
            src={campusPhotos[0]}
            wide
            delay={160}
          />

          <PhotoSlot
            label="Campus photo"
            src={campusPhotos[1]}
            delay={200}
          />

          <PhotoSlot
            label="Campus photo"
            src={campusPhotos[2]}
            delay={240}
          />
        </div>

        {/* Browse study materials CTA */}
        <div className="mb-[72px] flex animate-[fadeUp_0.5s_ease-out_both] [animation-delay:280ms]">
          <Link
            to={`/study-material?university=${university.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Browse {university.name} study materials

            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        {/* Vision & Mission */}
        {(university.vision || university.mission) && (
          <section className="mb-[72px]">
            <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink/30 after:h-px after:flex-1 after:bg-ink/10">
              Vision &amp; mission
            </p>

            <div className="grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
              {university.vision && (
                <VisionMissionCard
                  kicker="Vision"
                  text={university.vision}
                  delay={0}
                />
              )}

              {university.mission && (
                <VisionMissionCard
                  kicker="Mission"
                  text={university.mission}
                  delay={80}
                />
              )}
            </div>
          </section>
        )}

        {/* Core values */}
        {coreValues && coreValues.length > 0 && (
          <section className="mb-[72px]">
            <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink/30 after:h-px after:flex-1 after:bg-ink/10">
              Core values
            </p>

            <p className="mb-8 max-w-[560px] text-[15px] leading-relaxed text-ink/60">
              Commitments carried by every school, every department and every
              student at {university.name}.
            </p>

            <div
              className={`grid gap-3 ${coreValueGridClass(
                coreValues.length
              )}`}
            >
              {coreValues.map((value, index) => (
                <CoreValueSeal
                  key={value.letter ?? value.word ?? index}
                  {...value}
                  delay={index * 50}
                />
              ))}
            </div>
          </section>
        )}

        {/* News */}
        <section className="mb-[72px]">
          <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink/30 after:h-px after:flex-1 after:bg-ink/10">
            Latest news
          </p>

          {news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, index) => (
                <NewsItem
                  key={item.id ?? index}
                  title={item.title}
                  excerpt={item.excerpt}
                  coverImageUrl={item.coverImageUrl}
                  sourceUrl={item.sourceUrl}
                  publishedAt={item.publishedAt}
                  delay={index * 50}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/40">
              No news available for this university yet.
            </p>
          )}
        </section>

        {/* Footer */}
        {(hasSchoolWebsites || university.sourceUrl) && (
          <footer className="mt-16 border-t border-ink/10 pt-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
              {/* University information */}
              <div className="space-y-2 lg:col-span-3">
                <h2 className="font-serif text-lg font-medium text-ink">
                  {university.name}
                </h2>

                {university.sourceUrl && (
                  <a
                    href={university.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block border-b border-accent pb-px text-[13px] text-accent-hover no-underline"
                  >
                    Official university profile →
                  </a>
                )}
              </div>

              {/* School websites */}
              {hasSchoolWebsites && (
                <div className="lg:col-span-3">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-ink/30">
                    School websites
                  </h3>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/50">
                    {university.schools
                      .filter(
                        (school) => school.admissionRequirement
                      )
                      .map((school) => (
                        <a
                          key={school.id}
                          href={school.admissionRequirement}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:text-violet-400"
                        >
                          {school.code}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Copyright */}
            <div className="mt-10 flex items-center justify-between border-t border-ink/5 pt-4">
              <p className="text-sm text-ink/20">
                © 2026 UNILIB
              </p>

              <p className="text-sm text-ink/20">
                All rights reserved.
              </p>
            </div>
          </footer>
        )}
      </main>
    </>
  );
}
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import { embedUrl, emptyMessage, formatDuration, planNote, readVideos, thumbUrl } from "./videoView";

// Optional videos for the step being taught. Nothing is requested until the student taps, and nothing
// loads from YouTube until they pick a video, so it costs no mobile data unless they choose it.
export default function StepVideos({ sessionId, stepIndex, stepTitle }) {
  const [state, setState] = useState({ status: "idle", result: null, videos: [] });
  const [playing, setPlaying] = useState(null);
  const requested = useRef(false);

  async function load() {
    if (requested.current) { setState((s) => ({ ...s, status: "open" })); return; }
    setState({ status: "loading", result: null, videos: [] });
    try {
      const result = await apiGet(`/classroom/sessions/${sessionId}/videos?step=${stepIndex}`);
      requested.current = true;
      setState({ status: "open", result, videos: readVideos(result) });
    } catch {
      setState({ status: "error", result: null, videos: [] });
    }
  }

  function notHelpful(videoId) {
    setState((s) => ({ ...s, videos: s.videos.filter((v) => v.videoId !== videoId) }));
    if (playing === videoId) setPlaying(null);
    apiPost(`/classroom/sessions/${sessionId}/videos/${videoId}/report?step=${stepIndex}`, {}).catch(() => {}); // the report is a courtesy; the student's view never depends on it
  }

  if (state.status === "idle" || state.status === "error") {
    return (
      <div className="mb-3">
        <Button variant="secondary" size="sm" onClick={load} aria-label={`Watch a video on ${stepTitle || "this step"}`}>Watch a video on this step</Button>
        {state.status === "error" && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">We could not load videos. Check your connection and try again.</p>}
      </div>
    );
  }
  if (state.status === "loading") return <p role="status" className="mb-3 text-sm text-ink/60 motion-safe:animate-pulse">Finding videos…</p>;

  const empty = state.videos.length === 0 ? emptyMessage(state.result) : null;
  const active = state.videos.find((v) => v.videoId === playing);
  return (
    <Card as="section" padding="sm" className="mb-3" aria-label="Videos for this step">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Videos{stepTitle ? `: ${stepTitle}` : ""}</h3>
        <Button variant="ghost" size="sm" onClick={() => { setPlaying(null); setState((s) => ({ ...s, status: "idle" })); }}>Close</Button>
      </div>
      {empty && (
        <div className="mt-2">
          <p className="text-sm text-ink/70">{empty.text}</p>
          {empty.upgrade && <Button to="/premium?from=classroom" size="sm" className="mt-2">See Premium</Button>}
        </div>
      )}
      {active && (
        <div className="mt-3">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe key={active.videoId} src={embedUrl(active.videoId)} title={`${active.title} (video)`} className="h-full w-full" loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        </div>
      )}
      <ul className="mt-3 space-y-2">
        {state.videos.map((video) => (
          <li key={video.videoId} className="rounded-xl border border-line p-2">
            <button type="button" onClick={() => setPlaying(video.videoId)} aria-pressed={playing === video.videoId}
              className="flex w-full min-w-0 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-violet-500">
              <img src={thumbUrl(video.videoId)} alt="" loading="lazy" className="h-14 w-24 shrink-0 rounded-lg bg-ink/10 object-cover" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm font-medium"><span className="sr-only">Play </span>{video.title}</span>
                <span className="block truncate text-xs text-ink/60">{video.channel}{video.channel ? " · " : ""}{formatDuration(video.durationSeconds)}</span>
              </span>
            </button>
            <div className="mt-1 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => notHelpful(video.videoId)} aria-label={`Not helpful: ${video.title}`}>Not helpful</Button>
            </div>
          </li>
        ))}
      </ul>
      {state.videos.length > 0 && planNote(state.result) && <p className="mt-2 text-xs text-ink/55">{planNote(state.result)}{state.result?.tier === "FREE" && <> <Link to="/premium?from=classroom" className="font-semibold underline">See Premium</Link></>}</p>}
    </Card>
  );
}

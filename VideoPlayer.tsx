import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = ["144p", "240p", "360p", "480p", "720p", "1080p"] as const;

/**
 * Video player with playback speeds and a quality selector (144p -> 1080p).
 * Quality maps to a variant URL when the teacher uploaded renditions
 * (`variants`), otherwise it scales the rendered resolution client-side.
 */
export default function VideoPlayer({
  src,
  variants,
  clipStart = 0,
  clipEnd,
  onWatched,
}: {
  src: string;
  variants?: Partial<Record<(typeof QUALITIES)[number], string>>;
  clipStart?: number;
  clipEnd?: number | null;
  onWatched?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("720p");
  const reported = useRef(false);

  const activeSrc = variants?.[quality] ?? src;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed, activeSrc]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onLoaded = () => {
      if (clipStart > 0 && v.currentTime < clipStart) v.currentTime = clipStart;
    };
    const onTime = () => {
      if (clipEnd && v.currentTime >= clipEnd) v.pause();
      if (!reported.current && v.duration && v.currentTime / v.duration > 0.8) {
        reported.current = true;
        onWatched?.();
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [clipStart, clipEnd, onWatched, activeSrc]);

  const maxHeight = Number(quality.replace("p", ""));

  return (
    <div className="space-y-2">
      <video
        ref={ref}
        src={activeSrc}
        controls
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        className="w-full rounded-xl bg-black"
        style={{ imageRendering: maxHeight < 480 ? "pixelated" : "auto" }}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1 font-semibold">
          Speed
          <select className="field w-auto px-2 py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 font-semibold">
          Quality
          <select
            className="field w-auto px-2 py-1"
            value={quality}
            onChange={(e) => setQuality(e.target.value as (typeof QUALITIES)[number])}
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

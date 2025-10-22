import { useMemo, useState, useEffect, useRef } from "react";

/**
 * Minimal slide engine that preserves the app's design tokens (Tailwind classes).
 * - Slides are configured in an array.
 * - Each slide shows title, description, optional media (image), and audio player.
 * - Navigation: Back/Next buttons; Last slide can show summary.
 */

export type Slide = {
  id: string;
  title: string;
  description?: string;
  audioSrc?: string;
  imageSrc?: string;
  // Optional: simple callouts / bullet points
  bullets?: string[];
  // Optional: custom React node content in the future
};

type Props = {
  slides: Slide[];
  onFinish?: () => void;
};

export default function SlideEngine({ slides, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = slides[index];

  useEffect(() => {
    // auto-pause when switching slides
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [index]);

  const canPrev = index > 0;
  const canNext = index < slides.length - 1;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto p-6 rounded-2xl shadow-lg bg-white/5 border border-white/10 backdrop-blur-md">
        <header className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{current.title}</h1>
          {current.description && (
            <p className="text-sm md:text-base text-white/80 mt-3">{current.description}</p>
          )}
        </header>

        {current.imageSrc && (
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.imageSrc} alt="" className="w-full rounded-xl" />
          </div>
        )}

        {current.bullets && current.bullets.length > 0 && (
          <ul className="space-y-2 text-left mb-6 list-disc list-inside text-white/90">
            {current.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-center gap-4 mt-2">
          {current.audioSrc && (
            <audio ref={audioRef} controls src={current.audioSrc} className="w-full" />
          )}
        </div>

        <footer className="mt-8 flex items-center justify-between">
          <button
            className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 disabled:opacity-40"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={!canPrev}
            aria-label="Zurück"
          >
            Zurück
          </button>
          <div className="text-sm text-white/60">
            {index + 1} / {slides.length}
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20"
            onClick={() => {
              if (canNext) setIndex((i) => Math.min(slides.length - 1, i + 1));
              else onFinish && onFinish();
            }}
            aria-label="Weiter"
          >
            {canNext ? "Weiter" : "Fertig"}
          </button>
        </footer>
      </div>
    </div>
  );
}

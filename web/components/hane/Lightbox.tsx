"use client";

/**
 * Lightbox — full-screen tap-to-close image zoom on a SUMI ground. Shows the
 * true (non-duotone) ID crop so the coach can inspect the real frame. Preserves
 * the original behavior exactly: tapping anywhere dismisses.
 */
type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function Lightbox({ src, alt = "Player frame", onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-sumi/95 p-4"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-full rounded-sm border border-sumi-line object-contain"
      />
      <span className="type-micro absolute bottom-6 uppercase text-ink-d-400">
        Tap anywhere to close
      </span>
    </div>
  );
}

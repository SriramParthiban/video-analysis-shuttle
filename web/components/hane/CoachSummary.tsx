import type { CSSProperties } from "react";

/**
 * CoachSummary — the VERDICT. A pull-quote, never a card: a 3px volt left rule,
 * verdict-voice narrative (Zen Kaku, generous leading), an Archivo drop-cap
 * initial (rendered in the display face, volt-underlined — not a serif), and a
 * mono meta line (players · duration · date). The one deliberately human panel.
 *
 * `text` arrives already rewritten (coach's player names substituted) by the page.
 */
type Props = {
  text: string;
  meta?: string;
  className?: string;
};

const DROPCAP: CSSProperties = {
  fontVariationSettings: '"wght" 800, "wdth" 125',
  fontSize: "3.4em",
  lineHeight: 0.78,
  letterSpacing: "-0.02em",
  borderBottom: "2px solid var(--color-volt)",
  paddingBottom: 2,
};

export default function CoachSummary({ text, meta, className = "" }: Props) {
  const body = (text ?? "").trim();
  const initial = body.slice(0, 1);
  const rest = body.slice(1);

  return (
    <figure className={`border-l-[3px] border-volt pl-5 md:pl-8 ${className}`}>
      <blockquote className="type-verdict text-ink-900">
        {initial ? (
          <>
            <span
              aria-hidden
              className="font-display float-left mr-3 mt-1 select-none text-ink-900"
              style={DROPCAP}
            >
              {initial}
            </span>
            {/* keep the real initial in the a11y flow via a visually-hidden copy */}
            <span className="sr-only">{initial}</span>
            {rest}
          </>
        ) : (
          body
        )}
      </blockquote>
      {meta && (
        <figcaption className="type-micro mt-6 uppercase text-ink-400">{meta}</figcaption>
      )}
    </figure>
  );
}

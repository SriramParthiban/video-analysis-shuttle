"use client";

import type { HTMLInputTypeAttribute } from "react";

/**
 * Field — underline-only input (no boxes). Mono micro-label above; a bottom --line
 * rule that focuses to volt via focus-line (scaleX 0→1). Vermilion on error.
 * Controlled: onChange receives the raw string value.
 */
type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  onBlur?: () => void;
  error?: string;
  /** render on sumi surfaces */
  variant?: "paper" | "sumi";
  id?: string;
  name?: string;
  autoComplete?: string;
  autoCapitalize?: string;
  disabled?: boolean;
  inputMode?: "text" | "email" | "numeric" | "decimal" | "tel" | "url" | "search" | "none";
  className?: string;
};

export default function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onBlur,
  error,
  variant = "paper",
  id,
  name,
  autoComplete,
  autoCapitalize,
  disabled,
  inputMode,
  className = "",
}: Props) {
  const sumi = variant === "sumi";
  const labelInk = sumi ? "text-ink-d-400" : "text-ink-400";
  const textInk = sumi ? "text-ink-d-900" : "text-ink-900";
  const placeholderInk = sumi ? "placeholder:text-ink-d-400" : "placeholder:text-ink-400";
  const baseLine = error ? "bg-weak" : sumi ? "bg-sumi-line" : "bg-line";

  return (
    <label className={`block ${className}`}>
      <span className={`type-micro ${labelInk}`}>{label}</span>
      <span className="relative mt-2 block">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          disabled={disabled}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`peer type-data w-full bg-transparent pb-2 caret-volt-deep outline-none disabled:opacity-40 ${textInk} ${placeholderInk}`}
        />
        {/* resting baseline */}
        <span aria-hidden className={`absolute inset-x-0 bottom-0 h-px ${baseLine}`} />
        {/* volt focus line (hidden while in error) */}
        {!error && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-volt transition-transform duration-200 ease-out peer-focus:scale-x-100"
          />
        )}
      </span>
      {error && <span className="type-micro mt-1.5 block text-weak-deep">{error}</span>}
    </label>
  );
}

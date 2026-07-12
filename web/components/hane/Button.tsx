"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button — three variants, no pills:
 *  · primary — volt fill / volt-ink text / 3px radius / press translateY(1px)
 *  · quiet   — ink text, hairline border → line-strong on hover + volt corner-ticks on hover
 *  · link    — volt-deep underline that draws in via background-size
 * Focus: 2px volt ring, 2px offset.
 */
type Variant = "primary" | "quiet" | "link";

type BaseProps = { variant?: Variant; children: ReactNode; className?: string };

type ButtonProps = BaseProps & { as?: "button" } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof BaseProps
  >;
type AnchorProps = BaseProps & { as: "a" } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof BaseProps
  >;

type Props = ButtonProps | AnchorProps;

const LABEL = "font-mono text-[13px] font-medium uppercase tracking-[0.1em]";
const FOCUS =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt";

const VARIANT: Record<Variant, string> = {
  primary: `${LABEL} inline-flex items-center justify-center gap-2 rounded-btn bg-volt px-5 py-3 text-volt-ink transition-[background-color,transform] duration-150 hover:bg-volt-deep active:translate-y-px disabled:pointer-events-none disabled:opacity-40`,
  quiet: `${LABEL} group relative inline-flex items-center justify-center gap-2 rounded-sm border border-line px-5 py-3 text-ink-900 transition-colors duration-150 hover:border-line-strong disabled:pointer-events-none disabled:opacity-40`,
  link: `${LABEL} inline bg-gradient-to-r from-volt-deep to-volt-deep bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-0.5 text-ink-900 transition-[background-size] duration-200 ease-out hover:bg-[length:100%_2px]`,
};

/** volt corner-ticks that appear on hover for the quiet variant */
function QuietTicks() {
  const arm = { horizontal: { width: 8, height: 2 }, vertical: { width: 2, height: 8 } };
  const cls = "pointer-events-none absolute bg-volt opacity-0 transition-opacity duration-150 group-hover:opacity-100";
  return (
    <>
      <span aria-hidden className={`${cls} left-0 top-0`} style={arm.horizontal} />
      <span aria-hidden className={`${cls} left-0 top-0`} style={arm.vertical} />
      <span aria-hidden className={`${cls} right-0 top-0`} style={arm.horizontal} />
      <span aria-hidden className={`${cls} right-0 top-0`} style={arm.vertical} />
      <span aria-hidden className={`${cls} bottom-0 left-0`} style={arm.horizontal} />
      <span aria-hidden className={`${cls} bottom-0 left-0`} style={arm.vertical} />
      <span aria-hidden className={`${cls} bottom-0 right-0`} style={arm.horizontal} />
      <span aria-hidden className={`${cls} bottom-0 right-0`} style={arm.vertical} />
    </>
  );
}

export default function Button(props: Props) {
  const { variant = "primary", children, className = "" } = props;
  const cls = `${VARIANT[variant]} ${FOCUS} ${className}`;

  if (props.as === "a") {
    const { as: _as, variant: _v, children: _c, className: _cn, ...rest } = props;
    void _as; void _v; void _c; void _cn;
    return (
      <a className={cls} {...rest}>
        {variant === "quiet" && <QuietTicks />}
        {children}
      </a>
    );
  }

  const { as: _as, variant: _v, children: _c, className: _cn, ...rest } = props;
  void _as; void _v; void _c; void _cn;
  return (
    <button className={cls} {...rest}>
      {variant === "quiet" && <QuietTicks />}
      {children}
    </button>
  );
}

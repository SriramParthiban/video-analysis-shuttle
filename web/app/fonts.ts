import { Archivo, Zen_Kaku_Gothic_New, DM_Mono } from "next/font/google";

// Display / big numbers — variable Archivo loaded EXPANDED via the wdth axis.
// `wght` is included automatically for variable fonts; we add `wdth` so the
// industrial expanded voice (font-variation-settings "wdth" 125/115) resolves.
export const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// Text / UI — Japanese foundry gothic with an immaculate Latin. Latin subset only.
export const text = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-zen",
});

// Data / mono — refined technical monospace.
export const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dmmono",
});

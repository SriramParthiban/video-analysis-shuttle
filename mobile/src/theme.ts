// A tiny shared style palette so screens look consistent.
export const colors = {
  bg: '#0f1420',
  card: '#1a2233',
  border: '#2a3448',
  text: '#f2f5fa',
  textDim: '#9aa7bd',
  primary: '#3b82f6',
  primaryText: '#ffffff',
  danger: '#ef4444',
  warn: '#f59e0b',
  ok: '#22c55e',
};

export const statusColor: Record<string, string> = {
  uploaded: colors.warn,
  queued: colors.warn,
  processing: colors.primary,
  done: colors.ok,
  failed: colors.danger,
  pending: colors.textDim,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

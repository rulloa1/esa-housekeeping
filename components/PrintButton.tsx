"use client";

export function PrintButton({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <button type="button" onClick={() => window.print()} style={style}>
      {label}
    </button>
  );
}

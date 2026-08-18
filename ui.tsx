import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  const paths: Record<string, ReactNode> = {
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </>
    ),
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="M10.8 12.2 20 3M17 6l3 3M15 8l2 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: <path d="M3 3l18 18M10.6 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1.1M6.1 6.6C3.6 8.3 2 12 2 12s3.6 7 10 7c2 0 3.7-.5 5.2-1.4M21.9 12s-1.4-2.6-3.8-4.5" />,
    book: <path d="M4 4h9a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4zM20 4v16" />,
    video: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M16 11l6-3v8l-6-3z" />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12z" />,
    live: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 18.4a9 9 0 0 0 0-12.8" />
      </>
    ),
    file: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2 20c0-3.4 3.1-5.2 7-5.2s7 1.8 7 5.2M17 8.2a3 3 0 0 1 0 5.6M18 20c0-2.2-.7-3.7-2-4.7" />
      </>
    ),
    inbox: <path d="M3 13h5l1.5 3h5L16 13h5M3 13l3-8h12l3 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    mail: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    back: <path d="M15 18l-6-6 6-6" />,
    logout: <path d="M15 12H3m4-4-4 4 4 4M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />,
    trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
    check: <path d="M4 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    upload: <path d="M12 17V4m-5 5 5-5 5 5M4 20h16" />,
  };
  return <svg {...common}>{paths[name] ?? null}</svg>;
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="field pr-11"
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon"
      >
        <Icon name={show ? "eyeOff" : "eye"} />
      </button>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <div className="card w-full max-w-sm p-4 anim" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold">{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Notice({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="mb-2 rounded-lg px-3 py-2 text-xs font-semibold"
      style={{
        background: kind === "error" ? "color-mix(in oklab, var(--red) 15%, transparent)" : "color-mix(in oklab, var(--gold) 18%, transparent)",
        color: kind === "error" ? "var(--red2)" : "var(--gold)",
      }}
    >
      {children}
    </p>
  );
}

export function DevFooter() {
  return (
    <footer className="mt-6 border-t px-3 py-4 text-center">
      <p className="text-lg font-black tracking-tight sm:text-2xl brand-title">
        Developer&nbsp;·&nbsp;Ammar Yasser&nbsp;·&nbsp;01281872620
      </p>
    </footer>
  );
}

export function BarChart({ data }: { data: { label: string; score: number; max: number }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted">No grades yet.</p>;
  return (
    <div className="card p-3">
      <div className="flex h-44 items-end gap-2">
        {data.map((d, i) => {
          const pct = Math.max(3, Math.round((d.score / Math.max(1, d.max)) * 100));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-muted">
                {d.score}/{d.max}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${pct}%`,
                  background: "linear-gradient(180deg, var(--gold2), var(--red))",
                }}
                title={`${d.label}: ${pct}%`}
              />
              <span className="line-clamp-1 w-full text-center text-[10px] text-muted">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

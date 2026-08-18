import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { DevFooter, Icon } from "../components/ui";

export default function Landing() {
  const [showRoles, setShowRoles] = useState(false);
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-3 pt-3">
        <TopBar />
        <span className="text-[11px] font-bold tracking-widest text-muted">EL TAMAYOZ</span>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="brand-title anim text-5xl leading-none sm:text-7xl">EL TAMAYOZ</h1>
        <p className="anim mt-1.5 text-sm font-medium tracking-wide text-muted sm:text-base">
          With Mr. Mohamed Morgan — mastering English is not impossible
        </p>

        <div className="anim mt-6 w-full max-w-xs space-y-2">
          {!showRoles ? (
            <button className="btn-primary" onClick={() => setShowRoles(true)}>
              <Icon name="user" /> Login
            </button>
          ) : (
            <>
              <button className="btn-big justify-center" onClick={() => nav("/auth/teacher")}>
                <Icon name="book" /> Teacher account
              </button>
              <button className="btn-big justify-center" onClick={() => nav("/auth/student")}>
                <Icon name="users" /> Student account
              </button>
              <button className="text-xs font-semibold text-muted" onClick={() => setShowRoles(false)}>
                Back
              </button>
            </>
          )}
        </div>
      </main>

      <DevFooter />
    </div>
  );
}

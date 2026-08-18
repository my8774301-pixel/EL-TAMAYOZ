import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { DevFooter, Icon, Notice, PasswordInput } from "../components/ui";
import { useAuth } from "../lib/auth";
import { GRADES } from "../lib/supabase";
import {
  isValidFullName,
  isValidPhone,
  isValidUsername,
  passwordProblem,
  throttle,
  resetThrottle,
} from "../lib/security";

export default function StudentAuth() {
  const { role } = useParams();
  const isTeacher = role === "teacher";
  const nav = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"choose" | "login" | "register">(isTeacher ? "login" : "choose");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    studentPhone: "",
    parentPhone: "",
    grade: GRADES[0].id as string,
    username: "",
    password: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function doLogin() {
    setErr("");
    const limited = throttle(`login:${username}`);
    if (limited) return setErr(limited);
    setBusy(true);
    const res = await signIn(username, password);
    setBusy(false);
    if (res.error) return setErr(res.error);
    resetThrottle(`login:${username}`);
    nav(res.profile?.role === "teacher" ? "/teacher" : "/student", { replace: true });
  }

  async function doRegister() {
    setErr("");
    setOk("");
    if (!isValidFullName(form.fullName)) return setErr("Please enter your full name (three names).");
    if (!isValidPhone(form.studentPhone)) return setErr("Invalid student phone number.");
    if (!isValidPhone(form.parentPhone)) return setErr("Invalid parent phone number.");
    if (!isValidUsername(form.username)) return setErr("Username: 4-24 letters, numbers, . _ -");
    const p = passwordProblem(form.password);
    if (p) return setErr(p);

    setBusy(true);
    const res = await signUp(form);
    setBusy(false);
    if (res.error) return setErr(res.error);
    setOk("Request sent! Your teacher will activate your account.");
    setMode("login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-3 pt-3">
        <TopBar />
        <button className="btn-mini" onClick={() => nav("/")}>
          <Icon name="back" /> Home
        </button>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="brand-title text-3xl">EL TAMAYOZ</h1>
        <p className="mb-4 text-xs font-medium text-muted">
          {isTeacher ? "Teacher access" : "Student access"}
        </p>

        <div className="card w-full max-w-sm p-4 anim">
          <Notice kind="error">{err}</Notice>
          <Notice kind="ok">{ok}</Notice>

          {mode === "choose" && (
            <div className="space-y-2">
              <button className="btn-primary" onClick={() => setMode("login")}>
                Login
              </button>
              <button className="btn-big justify-center" onClick={() => setMode("register")}>
                New account
              </button>
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-2">
              <input
                className="field"
                placeholder="Username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="Password"
              />
              <button className="btn-primary" disabled={busy} onClick={doLogin}>
                {busy ? "…" : "Login"}
              </button>
              {!isTeacher && (
                <button className="text-xs font-semibold text-muted" onClick={() => setMode("register")}>
                  Create a new account
                </button>
              )}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <input
                className="field"
                placeholder="Full name (three names)"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
              <input
                className="field"
                placeholder="Student phone number"
                inputMode="numeric"
                value={form.studentPhone}
                onChange={(e) => set("studentPhone", e.target.value)}
              />
              <input
                className="field"
                placeholder="Parent phone number"
                inputMode="numeric"
                value={form.parentPhone}
                onChange={(e) => set("parentPhone", e.target.value)}
              />
              <select className="field" value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.en}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="Username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
              />
              <PasswordInput
                value={form.password}
                onChange={(v) => set("password", v)}
                autoComplete="new-password"
                placeholder="Password"
              />
              <button className="btn-primary" disabled={busy} onClick={doRegister}>
                {busy ? "…" : "Create account"}
              </button>
              <button className="text-xs font-semibold text-muted" onClick={() => setMode("login")}>
                I already have an account
              </button>
            </div>
          )}
        </div>
      </main>

      <DevFooter />
    </div>
  );
}

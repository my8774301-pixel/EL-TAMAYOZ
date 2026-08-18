import { useState } from "react";
import { useTheme } from "../lib/theme";
import { useAuth } from "../lib/auth";
import { Icon, Modal, Notice, PasswordInput } from "./ui";
import { isValidUsername, passwordProblem } from "../lib/security";

/**
 * Top-right controls: theme (sun/crescent) + change password.
 * The "change username" icon appears only INSIDE the change-password panel,
 * next to the theme toggle position, as requested.
 */
export default function TopBar({ ar = false }: { ar?: boolean }) {
  const { theme, toggle } = useTheme();
  const { profile, changePassword, changeUsername, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "username">("password");

  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [uname, setUname] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const t = (en: string, arText: string) => (ar ? arText : en);

  const reset = () => {
    setCur("");
    setNext("");
    setConfirm("");
    setUname("");
    setErr("");
    setOk("");
  };

  async function submit() {
    setErr("");
    setOk("");
    if (mode === "password") {
      const problem = passwordProblem(next);
      if (problem) return setErr(problem);
      if (next !== confirm) return setErr(t("Passwords do not match.", "كلمتا المرور غير متطابقتين."));
      setBusy(true);
      const res = await changePassword(cur, next);
      setBusy(false);
      if (res.error) return setErr(res.error);
      reset();
      setOk(t("Password updated.", "تم تحديث كلمة المرور."));
    } else {
      if (!isValidUsername(uname))
        return setErr(t("Username: 4-24 letters, numbers, . _ -", "اليوزر: من 4 إلى 24 حرف/رقم."));
      setBusy(true);
      const res = await changeUsername(cur, uname);
      setBusy(false);
      if (res.error) return setErr(res.error);
      reset();
      setOk(t("Username updated.", "تم تحديث اليوزر."));
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button className="btn-icon" onClick={toggle} aria-label="Toggle theme" title={t("Theme", "الوضع")}>
        <Icon name={theme === "dark" ? "moon" : "sun"} />
      </button>
      {profile && (
        <>
          <button
            className="btn-icon"
            onClick={() => {
              setMode("password");
              reset();
              setOpen(true);
            }}
            aria-label="Change password"
            title={t("Change password", "تغيير كلمة المرور")}
          >
            <Icon name="key" />
          </button>
          <button className="btn-icon" onClick={signOut} aria-label="Sign out" title={t("Sign out", "خروج")}>
            <Icon name="logout" />
          </button>
        </>
      )}

      {open && (
        <Modal
          title={mode === "password" ? t("Change password", "تغيير كلمة المرور") : t("Change username", "تغيير اليوزر")}
          onClose={() => setOpen(false)}
        >
          {/* username icon lives only inside this panel */}
          <div className="mb-3 flex items-center gap-1.5">
            <button
              className="btn-icon"
              style={{ borderColor: mode === "password" ? "var(--gold)" : undefined }}
              onClick={() => {
                setMode("password");
                setErr("");
                setOk("");
              }}
              title={t("Change password", "تغيير كلمة المرور")}
            >
              <Icon name="key" />
            </button>
            <button
              className="btn-icon"
              style={{ borderColor: mode === "username" ? "var(--gold)" : undefined }}
              onClick={() => {
                setMode("username");
                setErr("");
                setOk("");
              }}
              title={t("Change username", "تغيير اليوزر")}
            >
              <Icon name="user" />
            </button>
            <span className="text-xs text-muted">
              {mode === "password" ? t("Password", "كلمة المرور") : t("Username", "اليوزر")}
            </span>
          </div>

          <Notice kind="error">{err}</Notice>
          <Notice kind="ok">{ok}</Notice>

          <div className="space-y-2">
            <PasswordInput
              value={cur}
              onChange={setCur}
              autoComplete="current-password"
              placeholder={t("Current password", "كلمة المرور الحالية")}
            />
            {mode === "password" ? (
              <>
                <PasswordInput
                  value={next}
                  onChange={setNext}
                  autoComplete="new-password"
                  placeholder={t("New password", "كلمة المرور الجديدة")}
                />
                <PasswordInput
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                  placeholder={t("Confirm new password", "تأكيد كلمة المرور")}
                />
              </>
            ) : (
              <input
                className="field"
                value={uname}
                onChange={(e) => setUname(e.target.value)}
                placeholder={t("New username", "اليوزر الجديد")}
              />
            )}
            <button className="btn-primary" disabled={busy} onClick={submit}>
              {busy ? "..." : t("Save", "حفظ")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

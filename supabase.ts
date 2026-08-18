import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  // Fail loudly in dev, never silently fall back to an insecure mock.
  console.warn(
    "[El Tamayoz] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(url ?? "http://localhost", key ?? "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "tamayoz-auth",
    flowType: "pkce",
  },
});

/** Grades offered by the platform. */
export const GRADES = [
  { id: "prep1", en: "Grade 7 (Prep 1)", ar: "أولى إعدادي" },
  { id: "prep2", en: "Grade 8 (Prep 2)", ar: "تانية إعدادي" },
  { id: "prep3", en: "Grade 9 (Prep 3)", ar: "تالتة إعدادي" },
  { id: "sec1", en: "Grade 10 (Sec 1)", ar: "أولى ثانوي" },
  { id: "sec2", en: "Grade 11 (Sec 2)", ar: "تانية ثانوي" },
  { id: "sec3", en: "Grade 12 (Sec 3)", ar: "تالتة ثانوي" },
] as const;

export type GradeId = (typeof GRADES)[number]["id"];

export const gradeLabel = (id: string, lang: "en" | "ar" = "en") =>
  GRADES.find((g) => g.id === id)?.[lang] ?? id;

١import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import {
  usernameToEmail,
  TEACHER_EMAIL,
  TEACHER_USERNAME_AR,
  clean,
} from "./security";

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  role: "student" | "teacher";
  grade: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  approved: boolean;
  blocked: boolean;
};

type AuthState = {
  loading: boolean;
  profile: Profile | null;
  signIn: (
    username: string,
    password: string
  ) => Promise<{ error?: string; profile?: Profile }>;
  signUp: (v: {
    fullName: string;
    studentPhone: string;
    parentPhone: string;
    grade: string;
    username: string;
    password: string;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  changePassword: (
    current: string,
    next: string
  ) => Promise<{ error?: string }>;
  changeUsername: (
    current: string,
    nextUsername: string
  ) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;

    if (!uid) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.error("PROFILE LOAD ERROR:", error);
      setProfile(null);
      return;
    }

    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));

    const {
      data: sub,
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        loadProfile();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const emailFor = (username: string) => {
    const trimmed = username.trim();

    if (trimmed === TEACHER_USERNAME_AR) {
      return TEACHER_EMAIL;
    }

    return usernameToEmail(clean(trimmed, 40));
  };

  const signIn: AuthState["signIn"] = async (username, password) => {
    const loginEmail = emailFor(username);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      console.error("SUPABASE LOGIN ERROR:", error);
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "No user returned from Supabase." };
    }

    const { data: p, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("PROFILE ERROR:", profileError);
      await supabase.auth.signOut();
      return { error: "Unable to load account profile." };
    }

    const prof = p as Profile | null;

    if (!prof) {
      await supabase.auth.signOut();
      return { error: "Account not found." };
    }

    if (prof.blocked) {
      await supabase.auth.signOut();
      return {
        error: "Your account is blocked. Please contact your teacher.",
      };
    }

    if (prof.role === "student" && !prof.approved) {
      await supabase.auth.signOut();
      return {
        error: "Your account is waiting for the teacher's approval.",
      };
    }

    setProfile(prof);

    return { profile: prof };
  };

  const signUp: AuthState["signUp"] = async (v) => {
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(v.username),
      password: v.password,
      options: {
        data: {
          full_name: clean(v.fullName, 80),
          username: v.username.toLowerCase(),
          grade: v.grade,
          student_phone: clean(v.studentPhone, 15),
          parent_phone: clean(v.parentPhone, 15),
        },
      },
    });

    if (error) {
      if (/already/i.test(error.message)) {
        return { error: "This username is already taken." };
      }

      return { error: error.message };
    }

    if (data.session) {
      await supabase.auth.signOut();
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const changePassword: AuthState["changePassword"] = async (
    current,
    next
  ) => {
    const { data: sess } = await supabase.auth.getSession();
    const email = sess.session?.user.email;

    if (!email) {
      return { error: "Session expired. Please sign in again." };
    }

    const { error: reauth } =
      await supabase.auth.signInWithPassword({
        email,
        password: current,
      });

    if (reauth) {
      return { error: "Current password is incorrect." };
    }

    const { error } = await supabase.auth.updateUser({
      password: next,
    });

    return error ? { error: error.message } : {};
  };

  const changeUsername: AuthState["changeUsername"] = async (
    current,
    nextUsername
  ) => {
    const { data: sess } = await supabase.auth.getSession();

    const email = sess.session?.user.email;
    const uid = sess.session?.user.id;

    if (!email || !uid) {
      return { error: "Session expired. Please sign in again." };
    }

    const { error: reauth } =
      await supabase.auth.signInWithPassword({
        email,
        password: current,
      });

    if (reauth) {
      return { error: "Current password is incorrect." };
    }

    const clean_u = nextUsername.trim().toLowerCase();

    const { data: taken, error: checkError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean_u)
        .maybeSingle();

    if (checkError) {
      return { error: checkError.message };
    }

    if (taken) {
      return { error: "This username is already taken." };
    }

    const { error: authErr } =
      await supabase.auth.updateUser({
        email: usernameToEmail(clean_u),
      });

    if (authErr) {
      return { error: authErr.message };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: clean_u })
      .eq("id", uid);

    if (error) {
      return { error: error.message };
    }

    await loadProfile();

    return {};
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        profile,
        signIn,
        signUp,
        signOut,
        changePassword,
        changeUsername,
        refresh: loadProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

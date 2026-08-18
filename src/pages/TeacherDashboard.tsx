import { useCallback, useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import Splash from "../components/Splash";
import VideoPlayer from "../components/VideoPlayer";
import { DevFooter, Icon, Notice } from "../components/ui";
import { useAuth } from "../lib/auth";
import { GRADES, gradeLabel, supabase } from "../lib/supabase";
import { clean, normalizeLiveLink } from "../lib/security";

type Tab = "requests" | "students" | "videos" | "homework" | "grades" | "messages" | "live" | "chats";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "requests", label: "طلبات الإنضمام", icon: "inbox" },
  { id: "students", label: "الطلاب", icon: "users" },
  { id: "videos", label: "الفيديوهات و ملفات PDF", icon: "video" },
  { id: "homework", label: "الواجبات", icon: "book" },
  { id: "grades", label: "الدرجات", icon: "chart" },
  { id: "messages", label: "الرسائل", icon: "mail" },
  { id: "live", label: "البث المباشر", icon: "live" },
  { id: "chats", label: "الدردشات", icon: "chat" },
];

type Student = {
  id: string;
  username: string;
  full_name: string;
  student_phone: string | null;
  parent_phone: string | null;
  approved: boolean;
  blocked: boolean;
};

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [splash, setSplash] = useState(true);
  const [grade, setGrade] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);

  const crumbs = ["الصفحة الرئيسية"];
  if (grade) crumbs.push(gradeLabel(grade, "ar"));
  if (tab) crumbs.push(TABS.find((t) => t.id === tab)!.label);

  const back = () => (tab ? setTab(null) : setGrade(null));

  if (!profile) return null;

  return (
    <div className="flex min-h-screen flex-col" dir="rtl">
      {splash && <Splash text="مرحبا مستر محمد" onDone={() => setSplash(false)} />}

      <div className="flex items-center justify-between px-3 pt-3">
        <TopBar ar />
        <div className="text-left">
          <p className="brand-title text-xl leading-none">التميز</p>
          <p className="text-[11px] font-semibold text-muted">لوحة تحكم المستر محمد</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-lg flex-1 px-3 pt-2">
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[11px] font-bold text-muted">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              <span style={i === crumbs.length - 1 ? { color: "var(--gold)" } : undefined}>{c}</span>
            </span>
          ))}
          {(grade || tab) && (
            <button className="btn-mini mr-auto" onClick={back}>
              <Icon name="back" /> رجوع
            </button>
          )}
        </div>

        {!grade && (
          <div className="space-y-2 anim">
            {GRADES.map((g) => (
              <button key={g.id} className="btn-big" onClick={() => setGrade(g.id)}>
                <Icon name="book" /> {g.ar}
              </button>
            ))}
          </div>
        )}

        {grade && !tab && (
          <div className="space-y-2 anim">
            {TABS.map((t) => (
              <button key={t.id} className="btn-big" onClick={() => setTab(t.id)}>
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        )}

        {grade && tab === "requests" && <StudentsPanel grade={grade} pending />}
        {grade && tab === "students" && <StudentsPanel grade={grade} />}
        {grade && tab === "videos" && <VideosPanel grade={grade} />}
        {grade && tab === "homework" && <HomeworkPanel grade={grade} />}
        {grade && tab === "grades" && <GradesPanel grade={grade} />}
        {grade && tab === "messages" && <BroadcastPanel grade={grade} teacherId={profile.id} />}
        {grade && tab === "live" && <LivePanel grade={grade} />}
        {grade && tab === "chats" && <ChatsPanel grade={grade} teacherId={profile.id} />}
      </main>

      <DevFooter />
    </div>
  );
}

/* ------------------------------- students ------------------------------- */
function StudentsPanel({ grade, pending = false }: { grade: string; pending?: boolean }) {
  const [rows, setRows] = useState<Student[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const q = supabase
      .from("profiles")
      .select("id, username, full_name, student_phone, parent_phone, approved, blocked")
      .eq("grade", grade)
      .eq("role", "student")
      .order("created_at", { ascending: false });
    const { data, error } = pending ? await q.eq("approved", false) : await q;
    if (error) setErr(error.message);
    setRows((data as Student[]) ?? []);
  }, [grade, pending]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (id: string, patch: Partial<Student>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) setErr(error.message);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف الطالب من المنصة؟")) return;
    const { error } = await supabase.rpc("delete_student", { target: id });
    if (error) setErr(error.message);
    load();
  };

  return (
    <div className="space-y-2 anim">
      <Notice kind="error">{err}</Notice>
      {rows.length === 0 && <p className="text-sm text-muted">لا يوجد طلاب هنا.</p>}
      {rows.map((s) => (
        <div key={s.id} className="card p-3">
          <p className="text-sm font-extrabold">{s.full_name}</p>
          <p className="text-[11px] text-muted">
            @{s.username} · الطالب: {s.student_phone} · ولي الأمر: {s.parent_phone}
          </p>
          <p className="mt-1 text-[11px] font-bold" style={{ color: s.blocked ? "var(--red2)" : "var(--gold)" }}>
            {s.blocked ? "محظور" : s.approved ? "مُفعَّل" : "في انتظار التفعيل"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {!s.approved && (
              <button className="btn-mini" onClick={() => update(s.id, { approved: true })}>
                <Icon name="check" /> تفعيل الحساب
              </button>
            )}
            <button className="btn-mini" onClick={() => update(s.id, { blocked: true })}>
              <Icon name="x" /> حظر
            </button>
            <button className="btn-mini" onClick={() => update(s.id, { blocked: false })}>
              <Icon name="check" /> إلغاء الحظر
            </button>
            <button className="btn-mini" style={{ color: "var(--red2)" }} onClick={() => remove(s.id)}>
              <Icon name="trash" /> حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- videos -------------------------------- */
type TVideo = {
  id: string;
  title: string;
  url: string;
  clip_start: number | null;
  clip_end: number | null;
};

function VideosPanel({ grade }: { grade: string }) {
  const [videos, setVideos] = useState<TVideo[]>([]);
  const [pdfs, setPdfs] = useState<{ id: string; title: string; url: string }[]>([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [viewers, setViewers] = useState<{ id: string; open: boolean; watched: string[]; notWatched: string[] } | null>(
    null,
  );
  const [preview, setPreview] = useState<TVideo | null>(null);

  const load = useCallback(async () => {
    const [v, p] = await Promise.all([
      supabase.from("videos").select("*").eq("grade", grade).order("created_at", { ascending: false }),
      supabase.from("pdfs").select("*").eq("grade", grade).order("created_at", { ascending: false }),
    ]);
    setVideos((v.data as TVideo[]) ?? []);
    setPdfs((p.data as { id: string; title: string; url: string }[]) ?? []);
  }, [grade]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(kind: "videos" | "pdfs") {
    setErr("");
    setOk("");
    const f = kind === "videos" ? file : pdfFile;
    const t = clean(kind === "videos" ? title : pdfTitle, 120);
    if (!f || !t) return setErr("اكتب العنوان واختر الملف.");
    if (kind === "videos" && !f.type.startsWith("video/")) return setErr("الملف ليس فيديو.");
    if (kind === "pdfs" && f.type !== "application/pdf") return setErr("الملف ليس PDF.");
    setBusy(true);
    const path = `${grade}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from(kind).upload(path, f, { cacheControl: "3600" });
    if (up.error) {
      setBusy(false);
      return setErr(up.error.message);
    }
    const { data: pub } = supabase.storage.from(kind).getPublicUrl(path);
    const insert =
      kind === "videos"
        ? supabase.from("videos").insert({
            grade,
            title: t,
            url: pub.publicUrl,
            storage_path: path,
            clip_start: start ? Number(start) : null,
            clip_end: end ? Number(end) : null,
          })
        : supabase.from("pdfs").insert({ grade, title: t, url: pub.publicUrl, storage_path: path });
    const { error } = await insert;
    setBusy(false);
    if (error) return setErr(error.message);
    setOk("تم الإرسال للطلاب.");
    setTitle("");
    setPdfTitle("");
    setFile(null);
    setPdfFile(null);
    setStart("");
    setEnd("");
    load();
  }

  async function del(kind: "videos" | "pdfs", id: string) {
    if (!confirm("حذف الملف؟")) return;
    await supabase.from(kind).delete().eq("id", id);
    load();
  }

  async function showViewers(v: TVideo) {
    const [views, students] = await Promise.all([
      supabase.from("video_views").select("student_id").eq("video_id", v.id),
      supabase.from("profiles").select("id, full_name").eq("grade", grade).eq("role", "student").eq("approved", true),
    ]);
    const seen = new Set(((views.data as { student_id: string }[]) ?? []).map((r) => r.student_id));
    const all = (students.data as { id: string; full_name: string }[]) ?? [];
    setViewers({
      id: v.id,
      open: true,
      watched: all.filter((s) => seen.has(s.id)).map((s) => s.full_name),
      notWatched: all.filter((s) => !seen.has(s.id)).map((s) => s.full_name),
    });
  }

  return (
    <div className="space-y-2 anim">
      <Notice kind="error">{err}</Notice>
      <Notice kind="ok">{ok}</Notice>

      <div className="card space-y-2 p-3">
        <p className="text-sm font-extrabold">إرسال فيديو من الجهاز</p>
        <input className="field" placeholder="عنوان الفيديو" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-1.5">
          <input
            className="field"
            placeholder="بداية الجزء (ثانية)"
            inputMode="numeric"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <input
            className="field"
            placeholder="نهاية الجزء (ثانية)"
            inputMode="numeric"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <input className="field" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn-primary" disabled={busy} onClick={() => upload("videos")}>
          <Icon name="upload" /> {busy ? "…" : "إرسال الفيديو"}
        </button>
      </div>

      <div className="card space-y-2 p-3">
        <p className="text-sm font-extrabold">إرسال ملف PDF</p>
        <input className="field" placeholder="عنوان الملف" value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} />
        <input
          className="field"
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
        />
        <button className="btn-primary" disabled={busy} onClick={() => upload("pdfs")}>
          <Icon name="upload" /> {busy ? "…" : "إرسال الملف"}
        </button>
      </div>

      {videos.map((v) => (
        <div key={v.id} className="card p-3">
          <p className="text-sm font-extrabold">{v.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button className="btn-mini" onClick={() => setPreview(preview?.id === v.id ? null : v)}>
              <Icon name="video" /> معاينة
            </button>
            <button className="btn-mini" onClick={() => showViewers(v)}>
              <Icon name="users" /> مين شاهد الفيديو
            </button>
            <button className="btn-mini" style={{ color: "var(--red2)" }} onClick={() => del("videos", v.id)}>
              <Icon name="trash" /> حذف
            </button>
          </div>
          {preview?.id === v.id && (
            <div className="mt-2">
              <VideoPlayer src={v.url} clipStart={v.clip_start ?? 0} clipEnd={v.clip_end} />
            </div>
          )}
          {viewers?.id === v.id && (
            <div className="mt-2 text-[11px]">
              <p style={{ color: "var(--gold)" }}>شاهدوا: {viewers.watched.join(" ، ") || "لا أحد"}</p>
              <p className="text-muted">لم يشاهدوا: {viewers.notWatched.join(" ، ") || "لا أحد"}</p>
            </div>
          )}
        </div>
      ))}

      {pdfs.map((p) => (
        <div key={p.id} className="card flex items-center justify-between p-3">
          <a className="text-sm font-bold" href={p.url} target="_blank" rel="noreferrer noopener">
            {p.title}
          </a>
          <button className="btn-mini" style={{ color: "var(--red2)" }} onClick={() => del("pdfs", p.id)}>
            <Icon name="trash" /> حذف
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- homework ------------------------------- */
function HomeworkPanel({ grade }: { grade: string }) {
  const [rows, setRows] = useState<{ id: string; lesson_title: string; details: string; due_date: string }[]>([]);
  const [f, setF] = useState({ lesson_title: "", details: "", due_date: "" });
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("homework").select("*").eq("grade", grade).order("due_date");
    setRows((data as typeof rows) ?? []);
  }, [grade]);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    setErr("");
    if (!f.lesson_title || !f.details || !f.due_date) return setErr("اكمل كل الحقول.");
    const { error } = await supabase.from("homework").insert({
      grade,
      lesson_title: clean(f.lesson_title, 120),
      details: clean(f.details, 1000),
      due_date: new Date(f.due_date).toISOString(),
    });
    if (error) return setErr(error.message);
    setF({ lesson_title: "", details: "", due_date: "" });
    load();
  }

  return (
    <div className="space-y-2 anim">
      <Notice kind="error">{err}</Notice>
      <div className="card space-y-2 p-3">
        <input
          className="field"
          placeholder="عنوان الدرس"
          value={f.lesson_title}
          onChange={(e) => setF({ ...f, lesson_title: e.target.value })}
        />
        <textarea
          className="field"
          rows={3}
          placeholder="تفاصيل الواجب"
          value={f.details}
          onChange={(e) => setF({ ...f, details: e.target.value })}
        />
        <input
          className="field"
          type="datetime-local"
          value={f.due_date}
          onChange={(e) => setF({ ...f, due_date: e.target.value })}
        />
        <button className="btn-primary" onClick={add}>
          إضافة الواجب
        </button>
      </div>
      {rows.map((h) => (
        <div key={h.id} className="card p-3">
          <p className="text-sm font-extrabold">{h.lesson_title}</p>
          <p className="text-xs text-muted">{h.details}</p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--gold)" }}>
              آخر موعد: {new Date(h.due_date).toLocaleString()}
            </span>
            <button
              className="btn-mini"
              style={{ color: "var(--red2)" }}
              onClick={async () => {
                await supabase.from("homework").delete().eq("id", h.id);
                load();
              }}
            >
              <Icon name="trash" /> حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- grades -------------------------------- */
function GradesPanel({ grade }: { grade: string }) {
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [f, setF] = useState({ student_id: "", exam_title: "", score: "", max_score: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("grade", grade)
        .eq("role", "student")
        .eq("approved", true);
      setStudents((data as { id: string; full_name: string }[]) ?? []);
    })();
  }, [grade]);

  async function add() {
    setErr("");
    setOk("");
    const score = Number(f.score);
    const max = Number(f.max_score);
    if (!f.student_id || !f.exam_title || !max || score > max || score < 0) return setErr("راجع البيانات المدخلة.");
    const { error } = await supabase.from("grades").insert({
      grade,
      student_id: f.student_id,
      exam_title: clean(f.exam_title, 80),
      score,
      max_score: max,
    });
    if (error) return setErr(error.message);
    setOk("تم إضافة الدرجة، هتظهر في الرسم البياني عند الطالب.");
    setF({ student_id: "", exam_title: "", score: "", max_score: "" });
  }

  return (
    <div className="card space-y-2 p-3 anim">
      <Notice kind="error">{err}</Notice>
      <Notice kind="ok">{ok}</Notice>
      <select className="field" value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })}>
        <option value="">اختر الطالب</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>
      <input
        className="field"
        placeholder="اسم الإمتحان"
        value={f.exam_title}
        onChange={(e) => setF({ ...f, exam_title: e.target.value })}
      />
      <div className="flex gap-1.5">
        <input
          className="field"
          placeholder="الدرجة"
          inputMode="numeric"
          value={f.score}
          onChange={(e) => setF({ ...f, score: e.target.value })}
        />
        <input
          className="field"
          placeholder="من كام"
          inputMode="numeric"
          value={f.max_score}
          onChange={(e) => setF({ ...f, max_score: e.target.value })}
        />
      </div>
      <button className="btn-primary" onClick={add}>
        إضافة الدرجة
      </button>
    </div>
  );
}

/* ------------------------------- broadcast ------------------------------ */
function BroadcastPanel({ grade, teacherId }: { grade: string; teacherId: string }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setErr("");
    setOk("");
    const text = clean(body, 800);
    if (!text) return setErr("اكتب الرسالة.");
    setBusy(true);
    const { data: students } = await supabase
      .from("profiles")
      .select("id")
      .eq("grade", grade)
      .eq("role", "student")
      .eq("approved", true)
      .eq("blocked", false);
    const rows = ((students as { id: string }[]) ?? []).map((s) => ({
      sender_id: teacherId,
      recipient_id: s.id,
      body: text,
      is_broadcast: true,
    }));
    if (rows.length === 0) {
      setBusy(false);
      return setErr("لا يوجد طلاب مُفعَّلين في هذا الصف.");
    }
    const { error } = await supabase.from("messages").insert(rows);
    setBusy(false);
    if (error) return setErr(error.message);
    setBody("");
    setOk(`تم إرسال الرسالة لـ ${rows.length} طالب كرسالة خاصة.`);
  }

  return (
    <div className="card space-y-2 p-3 anim">
      <Notice kind="error">{err}</Notice>
      <Notice kind="ok">{ok}</Notice>
      <textarea
        className="field"
        rows={4}
        placeholder="رسالة لكل طلاب الصف…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button className="btn-primary" disabled={busy} onClick={send}>
        {busy ? "…" : "إرسال للجميع"}
      </button>
    </div>
  );
}

/* --------------------------------- live --------------------------------- */
function LivePanel({ grade }: { grade: string }) {
  const [row, setRow] = useState<{ id: string; title: string; url: string; is_active: boolean } | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("live_sessions").select("*").eq("grade", grade).maybeSingle();
    setRow((data as typeof row) ?? null);
  }, [grade]);
  useEffect(() => {
    load();
  }, [load]);

  async function save(active: boolean) {
    setErr("");
    setOk("");
    const norm = normalizeLiveLink(url || row?.url || "");
    if (!norm.ok) return setErr("لينك غير مسموح. استخدم YouTube أو Google Meet أو Zoom بـ https.");
    const payload = { grade, title: clean(title || row?.title || "بث مباشر", 80), url: norm.url!, is_active: active };
    const { error } = await supabase.from("live_sessions").upsert(payload, { onConflict: "grade" });
    if (error) return setErr(error.message);
    setOk(active ? "البث ظاهر الآن في صفحة الطلاب." : "تم إيقاف البث.");
    load();
  }

  return (
    <div className="card space-y-2 p-3 anim">
      <Notice kind="error">{err}</Notice>
      <Notice kind="ok">{ok}</Notice>
      <p className="text-[11px] text-muted">
        الطالب هيشوف البث جوا المنصة من غير ما يدخل أي لينك — انت بس تحط اللينك هنا.
      </p>
      <input className="field" placeholder="عنوان البث" value={title || row?.title || ""} onChange={(e) => setTitle(e.target.value)} />
      <input
        className="field"
        placeholder="لينك YouTube / Google Meet / Zoom"
        value={url || row?.url || ""}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex gap-1.5">
        <button className="btn-primary" onClick={() => save(true)}>
          بدء البث
        </button>
        <button className="btn-big justify-center" onClick={() => save(false)}>
          إيقاف
        </button>
      </div>
      {row?.is_active && <p className="text-[11px]" style={{ color: "var(--gold)" }}>البث شغال حالياً.</p>}
    </div>
  );
}

/* -------------------------------- chats --------------------------------- */
function ChatsPanel({ grade, teacherId }: { grade: string; teacherId: string }) {
  const [students, setStudents] = useState<{ id: string; username: string; full_name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [peer, setPeer] = useState<{ id: string; full_name: string } | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; body: string }[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .eq("grade", grade)
        .eq("role", "student")
        .eq("approved", true);
      setStudents((data as typeof students) ?? []);
    })();
  }, [grade]);

  const load = useCallback(async () => {
    if (!peer) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body")
      .or(`and(sender_id.eq.${teacherId},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${teacherId})`)
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages((data as typeof messages) ?? []);
  }, [peer, teacherId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("messages-teacher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function send() {
    const text = clean(body, 800);
    if (!text || !peer) return;
    await supabase.from("messages").insert({ sender_id: teacherId, recipient_id: peer.id, body: text });
    setBody("");
    load();
  }

  if (!peer) {
    return (
      <div className="space-y-2 anim">
        <input className="field" placeholder="بحث باليوزر…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {students
          .filter((s) => s.username.includes(query.toLowerCase()) || s.full_name.includes(query))
          .map((s) => (
            <button key={s.id} className="btn-big" onClick={() => setPeer(s)}>
              <Icon name="user" /> {s.full_name} · @{s.username}
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 anim">
      <button className="btn-mini" onClick={() => setPeer(null)}>
        <Icon name="back" /> المحادثات
      </button>
      <div className="card max-h-[55vh] space-y-1.5 overflow-y-auto p-2.5">
        {messages.map((m) => {
          const mine = m.sender_id === teacherId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className="max-w-[80%] rounded-xl px-2.5 py-1.5 text-sm"
                style={{
                  background: mine ? "linear-gradient(100deg,var(--red),var(--gold))" : "var(--panel2)",
                  color: mine ? "#fff" : "var(--text)",
                }}
              >
                {m.body}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <input
          className="field"
          value={body}
          placeholder="رسالة…"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary w-auto px-4" onClick={send}>
          <Icon name="mail" />
        </button>
      </div>
    </div>
  );
                       }

import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import Splash from "../components/Splash";
import VideoPlayer from "../components/VideoPlayer";
import { BarChart, DevFooter, Icon, Notice } from "../components/ui";
import { useAuth } from "../lib/auth";
import { gradeLabel, supabase } from "../lib/supabase";
import { clean, normalizeLiveLink } from "../lib/security";

type Section = "home" | "homework" | "videos" | "grades" | "chat" | "live";

type VideoRow = {
  id: string;
  title: string;
  url: string;
  clip_start: number | null;
  clip_end: number | null;
  created_at: string;
};
type PdfRow = { id: string; title: string; url: string; created_at: string };
type HomeworkRow = { id: string; lesson_title: string; details: string; due_date: string };
type GradeRow = { id: string; exam_title: string; score: number; max_score: number; created_at: string };
type MessageRow = {
  id: string;
  sender_id: string | null;
  recipient_id: string | null;
  body: string;
  created_at: string;
  is_broadcast: boolean;
};
type PeerRow = { id: string; username: string; full_name: string; role: string };
type LiveRow = { id: string; title: string; url: string; is_active: boolean };

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [splash, setSplash] = useState(true);
  const [section, setSection] = useState<Section>("home");
  const grade = profile?.grade ?? "";

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [pdfs, setPdfs] = useState<PdfRow[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [live, setLive] = useState<LiveRow | null>(null);
  const [openVideo, setOpenVideo] = useState<VideoRow | null>(null);

  useEffect(() => {
    if (!grade || !profile) return;
    (async () => {
      const [v, p, h, g, l] = await Promise.all([
        supabase.from("videos").select("*").eq("grade", grade).order("created_at", { ascending: false }),
        supabase.from("pdfs").select("*").eq("grade", grade).order("created_at", { ascending: false }),
        supabase.from("homework").select("*").eq("grade", grade).order("due_date", { ascending: true }),
        supabase.from("grades").select("*").eq("student_id", profile.id).order("created_at", { ascending: true }),
        supabase.from("live_sessions").select("*").eq("grade", grade).eq("is_active", true).maybeSingle(),
      ]);
      setVideos((v.data as VideoRow[]) ?? []);
      setPdfs((p.data as PdfRow[]) ?? []);
      setHomework((h.data as HomeworkRow[]) ?? []);
      setGrades((g.data as GradeRow[]) ?? []);
      setLive((l.data as LiveRow) ?? null);
    })();
  }, [grade, profile]);

  const markWatched = useCallback(
    async (videoId: string) => {
      if (!profile) return;
      await supabase.from("video_views").upsert(
        { video_id: videoId, student_id: profile.id },
        { onConflict: "video_id,student_id" },
      );
    },
    [profile],
  );

  const chartData = grades.map((g) => ({ label: g.exam_title, score: g.score, max: g.max_score }));

  if (!profile) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {splash && <Splash text="Welcome to EL TAMAYOZ platform" onDone={() => setSplash(false)} />}

      {!openVideo && (
        <div className="flex items-center justify-between px-3 pt-3">
          <TopBar />
          <div className="text-right">
            <p className="brand-title text-lg leading-none">EL TAMAYOZ</p>
            <p className="text-[10px] text-muted">
              {profile.full_name} · {gradeLabel(grade)}
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-lg flex-1 px-3 pt-3">
        {section !== "home" && (
          <button className="btn-mini mb-2" onClick={() => setSection("home")}>
            <Icon name="back" /> Home
          </button>
        )}

        {section === "home" && (
          <div className="space-y-2 anim">
            <Tile icon="book" label="Homework" onClick={() => setSection("homework")} />
            <Tile icon="video" label="Videos & PDFs" onClick={() => setSection("videos")} />
            <Tile icon="chart" label="Student evaluation" onClick={() => setSection("grades")} />
            <Tile icon="chat" label="Chat" onClick={() => setSection("chat")} />
            <Tile icon="live" label="Live session" onClick={() => setSection("live")} />
          </div>
        )}

        {section === "homework" && (
          <div className="space-y-2 anim">
            {homework.length === 0 && <p className="text-sm text-muted">No homework yet.</p>}
            {homework.map((h) => (
              <div key={h.id} className="card p-3">
                <h3 className="text-base font-extrabold">{h.lesson_title}</h3>
                <p className="mt-1 text-sm text-muted">{h.details}</p>
                <p className="mt-2 text-xs font-bold" style={{ color: "var(--gold)" }}>
                  Deadline: {new Date(h.due_date).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {section === "videos" && (
          <div className="space-y-2 anim">
            {openVideo ? (
              <div className="space-y-2">
                <button className="btn-mini" onClick={() => setOpenVideo(null)}>
                  <Icon name="back" /> Back
                </button>
                <h3 className="text-base font-extrabold">{openVideo.title}</h3>
                <VideoPlayer
                  src={openVideo.url}
                  clipStart={openVideo.clip_start ?? 0}
                  clipEnd={openVideo.clip_end}
                  onWatched={() => markWatched(openVideo.id)}
                />
              </div>
            ) : (
              <>
                {videos.length === 0 && <p className="text-sm text-muted">No videos yet.</p>}
                {videos.map((v) => (
                  <button key={v.id} className="btn-big" onClick={() => setOpenVideo(v)}>
                    <Icon name="video" /> {v.title}
                  </button>
                ))}
                {pdfs.length > 0 && <h4 className="pt-2 text-xs font-bold text-muted">PDF files</h4>}
                {pdfs.map((p) => (
                  <a key={p.id} className="btn-big" href={p.url} target="_blank" rel="noreferrer noopener">
                    <Icon name="file" /> {p.title}
                  </a>
                ))}
              </>
            )}
          </div>
        )}

        {section === "grades" && (
          <div className="space-y-2 anim">
            <BarChart data={chartData} />
            {grades.map((g) => (
              <div key={g.id} className="card flex items-center justify-between p-2.5 text-sm">
                <span className="font-bold">{g.exam_title}</span>
                <span style={{ color: "var(--gold)" }}>
                  {g.score} / {g.max_score}
                </span>
              </div>
            ))}
          </div>
        )}

        {section === "chat" && <Chat me={profile.id} grade={grade} />}

        {section === "live" && (
          <div className="anim">
            {live ? (
              <div className="card overflow-hidden p-3">
                <h3 className="mb-2 text-base font-extrabold">{live.title}</h3>
                <LiveFrame url={live.url} />
              </div>
            ) : (
              <p className="text-sm text-muted">No live session right now.</p>
            )}
          </div>
        )}
      </main>

      {!openVideo && <DevFooter />}
    </div>
  );
}

function LiveFrame({ url }: { url: string }) {
  const norm = normalizeLiveLink(url);
  if (!norm.ok) return <p className="text-sm text-muted">Live link unavailable.</p>;
  if (norm.embed)
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={norm.embed}
          title="Live session"
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    );
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={norm.url}
        title="Live session"
        className="h-full w-full"
        allow="camera; microphone; autoplay; display-capture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function Tile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="btn-big" onClick={onClick}>
      <Icon name={icon} /> {label}
    </button>
  );
}

/** Student chat: with the teacher or with another student, searched by username. */
function Chat({ me, grade }: { me: string; grade: string }) {
  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [query, setQuery] = useState("");
  const [peer, setPeer] = useState<PeerRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, role")
        .or(`role.eq.teacher,and(grade.eq.${grade},approved.eq.true)`)
        .neq("id", me);
      setPeers((data as PeerRow[]) ?? []);
    })();
  }, [grade, me]);

  const load = useCallback(async () => {
    if (!peer) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${me}),and(is_broadcast.eq.true,recipient_id.eq.${me})`,
      )
      .order("created_at", { ascending: true })
      .limit(300);
    setMessages((data as MessageRow[]) ?? []);
  }, [peer, me]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("messages-student")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const filtered = useMemo(
    () =>
      peers.filter(
        (p) =>
          p.username.toLowerCase().includes(query.toLowerCase()) ||
          (p.role === "teacher" && "teacher".includes(query.toLowerCase())),
      ),
    [peers, query],
  );

  async function send() {
    setErr("");
    const text = clean(body, 800);
    if (!text || !peer) return;
    const { error } = await supabase.from("messages").insert({ sender_id: me, recipient_id: peer.id, body: text });
    if (error) return setErr(error.message);
    setBody("");
    load();
  }

  if (!peer) {
    return (
      <div className="space-y-2 anim">
        <input
          className="field"
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.map((p) => (
          <button key={p.id} className="btn-big" onClick={() => setPeer(p)}>
            <Icon name={p.role === "teacher" ? "book" : "user"} />
            <span className="truncate">
              {p.role === "teacher" ? "Mr. Mohamed Morgan" : `${p.full_name} · @${p.username}`}
            </span>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted">No users found.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 anim">
      <button className="btn-mini" onClick={() => setPeer(null)}>
        <Icon name="back" /> Conversations
      </button>
      <Notice kind="error">{err}</Notice>
      <div className="card max-h-[55vh] space-y-1.5 overflow-y-auto p-2.5">
        {messages.map((m) => {
          const mine = m.sender_id === me;
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
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      </div>
      <div className="flex gap-1.5">
        <input
          className="field"
          value={body}
          placeholder="Message…"
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

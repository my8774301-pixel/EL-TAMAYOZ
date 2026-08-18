# EL TAMAYOZ — منصة التميز

English learning platform for **Mr. Mohamed Morgan**.
Fully standalone: **Vite + React + TypeScript + Tailwind + Supabase**.
No Lovable dependency, no Lovable hosting — ready for GitHub Pages / Netlify / Vercel / any static host.

Developer: **Ammar Yasser — 01281872620**

---

## 1) Install & run locally

```bash
npm install
cp .env.example .env     # fill in your Supabase URL + anon key
npm run dev
```

Build for production:

```bash
npm run build     # output in dist/
```

## 2) Create the Supabase project

1. Create a project at https://supabase.com.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → Run.
   This creates tables, RLS policies, storage buckets, triggers and the realtime chat.
3. **Authentication → Providers → Email**: turn **Confirm email OFF**
   (usernames map to internal `username@tamayoz.local` addresses, so there is no real inbox).
4. Create the teacher account:
   - **Authentication → Users → Add user**
     - email: `teacher@tamayoz.local`
     - password: `محمد الهريسي`
     - auto-confirm: yes
   - then run in SQL Editor:
     ```sql
     update public.profiles
       set role = 'teacher', username = 'محمد مرجان', full_name = 'محمد مرجان',
           approved = true, blocked = false
     where id = (select id from auth.users where email = 'teacher@tamayoz.local');
     ```
   - Teacher then logs in with username **محمد مرجان** and password **محمد الهريسي**.
5. Copy **Project URL** and **anon public key** into `.env`.

## 3) Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Repo **Settings → Pages → Source: GitHub Actions**.
4. Push to `main` — `.github/workflows/deploy.yml` builds and publishes `dist/` automatically.

> GitHub Pages serves static files only, so the app uses hash-free client routing with
> `base: "./"`; the router always falls back to `/`, which is handled in `src/App.tsx`.

## 4) Features

**Landing page (English)** — big red/gold “EL TAMAYOZ” title, thin subtitle
“With Mr. Mohamed Morgan — mastering English is not impossible”, then Login → Teacher / Student.
Student → Login or New account (full name, student phone, parent phone, grade, username, password);
the request goes to the teacher, who activates the account.

**Student page (English)** — 3-second black welcome splash (white + gold), then large buttons:
Homework · Videos & PDFs · Student evaluation (bar chart of grades) · Chat · Live session
(the live stream is embedded — the student never enters a link).
Video player: playback speeds 0.5x–2x and quality 144p → 1080p, clip range respected.

**Teacher page (Arabic)** — “مرحبا مستر محمد” splash for 3 seconds, then
`التميز` + `لوحة تحكم المستر محمد`, a breadcrumb path that shortens on every back,
and the six grades (أولى إعدادي → تالتة ثانوي). Each grade is fully separate and has:
طلبات الإنضمام · الطلاب (تفعيل / حظر / إلغاء الحظر / حذف) · الفيديوهات و PDF
(رفع من الجهاز، تحديد جزء من الفيديو، حذف بعد الإرسال، مين شاهد الفيديو) ·
الواجبات (عنوان الدرس + التفاصيل + آخر موعد) · الدرجات (درجة الطالب / من كام → رسم بياني عنده) ·
الرسائل (رسالة واحدة تتوزع كرسائل خاصة على كل الطلاب) · البث المباشر (لينك YouTube / Meet / Zoom) ·
الدردشات.

**Everywhere** — sun/crescent light–dark toggle (top-left), change-password icon next to it,
and the change-username icon which appears only inside the password panel.
Every password field has a show/hide eye icon. The developer line is shown on every page
except while a video is open.

## 5) Security

- Row Level Security on every table; the teacher role is verified server-side with the
  `is_teacher()` SECURITY DEFINER function — never from client state.
- Students can only read their own grade's content, their own grades, and their own conversations.
- Sign-up always creates an **unapproved** student (DB trigger) — only the teacher can activate.
- Blocked / unapproved accounts are signed out immediately on login.
- Student deletion runs through the `delete_student()` teacher-only RPC.
- Client-side: input sanitising, username/password/phone validation, brute-force throttling,
  reauthentication before password/username change, sandboxed live iframes and an
  allow-list of live-stream hosts (YouTube / Google Meet / Zoom / Teams only, HTTPS only).
- The anon key is public by design; never put the service-role key in this frontend.

-- =====================================================================
-- EL TAMAYOZ platform — Supabase schema (run once in the SQL editor)
-- Security model: RLS on every table, teacher role checked via a
-- SECURITY DEFINER function (no role column on profiles is trusted client-side).
-- =====================================================================

create type public.app_role as enum ('student', 'teacher');

-- ------------------------------ profiles ------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role public.app_role not null default 'student',
  grade text,
  student_phone text,
  parent_phone text,
  approved boolean not null default false,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- role lookup that cannot recurse through RLS
create or replace function public.is_teacher(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and role = 'teacher');
$$;

create policy "own profile readable" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "teacher reads all profiles" on public.profiles
  for select to authenticated using (public.is_teacher(auth.uid()));

-- classmates + teacher visible for chat search (approved, non-blocked only)
create policy "classmates readable" on public.profiles
  for select to authenticated using (
    role = 'teacher'
    or (approved and not blocked
        and grade = (select p.grade from public.profiles p where p.id = auth.uid()))
  );

-- a student may edit only their own username; approval/role/block are teacher-only
create policy "student updates own username" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
    and blocked = (select p.blocked from public.profiles p where p.id = auth.uid())
    and grade is not distinct from (select p.grade from public.profiles p where p.id = auth.uid())
  );

create policy "teacher updates profiles" on public.profiles
  for update to authenticated using (public.is_teacher(auth.uid()))
  with check (public.is_teacher(auth.uid()));

-- profile row is created automatically on sign-up, always as an
-- unapproved student: only the teacher can activate the account.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role, grade, student_phone, parent_phone, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    'student',
    new.raw_user_meta_data->>'grade',
    new.raw_user_meta_data->>'student_phone',
    new.raw_user_meta_data->>'parent_phone',
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------- content ------------------------------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  title text not null,
  url text not null,
  storage_path text,
  clip_start numeric,
  clip_end numeric,
  created_at timestamptz not null default now()
);

create table public.pdfs (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  title text not null,
  url text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  lesson_title text not null,
  details text not null,
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_title text not null,
  score numeric not null check (score >= 0),
  max_score numeric not null check (max_score > 0),
  created_at timestamptz not null default now()
);

create table public.video_views (
  video_id uuid not null references public.videos(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (video_id, student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_broadcast boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  grade text not null unique,
  title text not null,
  url text not null,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

grant select on public.videos, public.pdfs, public.homework, public.grades, public.live_sessions to authenticated;
grant insert, update, delete on public.videos, public.pdfs, public.homework, public.grades, public.live_sessions to authenticated;
grant select, insert on public.video_views to authenticated;
grant select, insert on public.messages to authenticated;
grant all on public.videos, public.pdfs, public.homework, public.grades, public.live_sessions,
  public.video_views, public.messages to service_role;

alter table public.videos enable row level security;
alter table public.pdfs enable row level security;
alter table public.homework enable row level security;
alter table public.grades enable row level security;
alter table public.video_views enable row level security;
alter table public.messages enable row level security;
alter table public.live_sessions enable row level security;

-- helper: the caller's own grade, only when activated
create or replace function public.my_grade()
returns text language sql stable security definer set search_path = public as $$
  select grade from public.profiles where id = auth.uid() and approved and not blocked;
$$;

-- students read only their own grade's content; teacher does everything
do $$
declare t text;
begin
  foreach t in array array['videos', 'pdfs', 'homework', 'live_sessions'] loop
    execute format($f$
      create policy "students read %1$s" on public.%1$I
        for select to authenticated using (grade = public.my_grade());
      create policy "teacher writes %1$s" on public.%1$I
        for all to authenticated using (public.is_teacher(auth.uid()))
        with check (public.is_teacher(auth.uid()));
    $f$, t);
  end loop;
end $$;

create policy "student reads own grades" on public.grades
  for select to authenticated using (student_id = auth.uid());
create policy "teacher manages grades" on public.grades
  for all to authenticated using (public.is_teacher(auth.uid()))
  with check (public.is_teacher(auth.uid()));

create policy "student records own view" on public.video_views
  for insert to authenticated with check (student_id = auth.uid());
create policy "views readable" on public.video_views
  for select to authenticated using (student_id = auth.uid() or public.is_teacher(auth.uid()));

create policy "read own conversations" on public.messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send as self" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and (public.is_teacher(auth.uid())
         or exists (select 1 from public.profiles p
                    where p.id = auth.uid() and p.approved and not p.blocked))
  );

-- teacher-only student deletion (removes the auth user too)
create or replace function public.delete_student(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_teacher(auth.uid()) then
    raise exception 'not authorized';
  end if;
  delete from auth.users where id = target;
end $$;

revoke all on function public.delete_student(uuid) from public;
grant execute on function public.delete_student(uuid) to authenticated;

-- ------------------------------ storage -------------------------------
insert into storage.buckets (id, name, public) values ('videos', 'videos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', true)
  on conflict (id) do nothing;

create policy "teacher uploads media" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('videos', 'pdfs') and public.is_teacher(auth.uid()));
create policy "teacher deletes media" on storage.objects
  for delete to authenticated
  using (bucket_id in ('videos', 'pdfs') and public.is_teacher(auth.uid()));
create policy "authenticated read media" on storage.objects
  for select to authenticated using (bucket_id in ('videos', 'pdfs'));

-- ---------------------------- realtime chat ---------------------------
alter publication supabase_realtime add table public.messages;

-- =====================================================================
-- TEACHER ACCOUNT (run AFTER creating the auth user, see README step 4)
--   email: teacher@tamayoz.local   password: محمد الهريسي
-- update public.profiles
--   set role = 'teacher', username = 'محمد مرجان', full_name = 'محمد مرجان',
--       approved = true, blocked = false
--   where id = (select id from auth.users where email = 'teacher@tamayoz.local');
-- =====================================================================

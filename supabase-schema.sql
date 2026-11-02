-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

create table videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  youtube_id text,
  event text not null,
  year integer not null,
  competitors text not null,
  weight_class text not null,
  match_type text not null,
  ruleset text not null check (ruleset in ('Gi', 'No-Gi')),
  result text not null,
  owner_rating numeric(3,1) not null check (owner_rating >= 1 and owner_rating <= 10),
  owner_review text not null,
  thumbnail_url text not null,
  duration text not null,
  source_url text not null,
  date_added date not null default current_date,
  created_at timestamptz default now()
);

-- Enable read access for anonymous users
alter table videos enable row level security;

create policy "Allow public read access"
  on videos for select
  using (true);

-- Seed with one sample entry
insert into videos (title, description, youtube_id, source_url, event, year, competitors, weight_class, match_type, ruleset, result, owner_rating, owner_review, thumbnail_url, duration, date_added) values
('Gordon Ryan vs Andre Galvao', 'The long-awaited ADCC superfight. Gordon Ryan attempts to cement his legacy against the ADCC legend Andre Galvao.', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'ADCC', 2022, 'Gordon Ryan vs Andre Galvao', 'Superfight', 'Superfight', 'No-Gi', 'Submission (Rear Naked Choke)', 9.8, 'A flawless performance by Gordon. The way he systematically dismantled a legend like Galvao was shocking to witness live. The back take sequence is a thing of beauty. Historical significance is off the charts.', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', '16:40', '2024-02-18');

-- Only authenticated users can insert and update
create policy "Allow authenticated insert"
  on videos for insert
  to authenticated
  with check (true);

create policy "Allow authenticated update"
  on videos for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Private Video Library
-- ============================================================

create table collections (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null default '',
  created_at timestamptz default now()
);

alter table collections enable row level security;

create policy "Authenticated full access on collections"
  on collections for all
  to authenticated
  using (true)
  with check (true);

create table tags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

alter table tags enable row level security;

create policy "Authenticated full access on tags"
  on tags for all
  to authenticated
  using (true)
  with check (true);

create table library_videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  source_url text not null,
  youtube_id text,
  thumbnail_url text not null default '',
  description text not null default '',
  notes text not null default '',
  collection_id uuid references collections(id) on delete set null,
  created_at timestamptz default now()
);

alter table library_videos enable row level security;

create policy "Authenticated full access on library_videos"
  on library_videos for all
  to authenticated
  using (true)
  with check (true);

create table library_video_tags (
  video_id uuid references library_videos(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (video_id, tag_id)
);

alter table library_video_tags enable row level security;

create policy "Authenticated full access on library_video_tags"
  on library_video_tags for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Keepalive (dedicated writable row for the GitHub Action ping,
-- so free-tier inactivity pause sees a real write, not just a read)
-- ============================================================

create table keepalive (
  id int primary key default 1,
  alive boolean not null default true,
  pinged_at timestamptz not null default now(),
  constraint keepalive_singleton check (id = 1)
);

insert into keepalive (id) values (1);

alter table keepalive enable row level security;

create policy "Allow anon read"
  on keepalive for select
  using (true);

create policy "Allow anon update"
  on keepalive for update
  using (true)
  with check (true);

-- ============================================================
-- Technique articles (LLM-assisted blog posts)
-- Run this block in the Supabase SQL Editor. Also enable the pg_cron
-- extension first (Dashboard > Database > Extensions) for the log prune job.
--
-- If you ran an earlier version of this block, reset it first (this deletes any articles):
--   drop table if exists article_sources, articles, generation_log cascade;
--   drop function if exists public.articles_before_write(), public.claim_generation(int), public.generations_used_today();
-- ============================================================

create table articles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '',
  technique text not null default '',
  body_markdown text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_user_idx on articles (user_id, updated_at desc);
create index articles_published_idx on articles (published_at desc) where status = 'published';

alter table articles enable row level security;

-- Anyone (including anonymous visitors) can read published articles.
create policy "Public read published articles"
  on articles for select
  using (status = 'published');

-- Owners can read and write their own rows, drafts included.
create policy "Owner full access to articles"
  on articles for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Keeps updated_at current and stamps published_at on first publish. published_at is only ever set
-- here: a client cannot choose it on insert or clear it later, so the slug lock below cannot be
-- undone by "clear published_at, rename, republish".
create or replace function public.articles_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.published_at := null;
  else
    new.user_id := old.user_id;
    new.published_at := old.published_at;
    if old.published_at is not null and new.slug is distinct from old.slug then
      raise exception 'slug is locked once an article has been published';
    end if;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger articles_before_write
  before insert or update on articles
  for each row execute function public.articles_before_write();

-- Anonymous visitors may read only the publishable columns of published articles: not the author's
-- id, and never the raw notes (those live in article_sources, readable only by the owner).
revoke all on articles from anon;
grant select (id, title, slug, excerpt, technique, body_markdown, status, published_at, created_at, updated_at)
  on articles to anon;

-- The author's raw notes, kept apart from the article so publishing never exposes them.
create table article_sources (
  article_id uuid primary key references articles (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_markdown text not null default '',
  updated_at timestamptz not null default now()
);

alter table article_sources enable row level security;
revoke all on article_sources from anon;

create policy "Owner full access to article sources"
  on article_sources for all
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from articles a where a.id = article_id and a.user_id = auth.uid())
  );

-- Every generation request is logged here (failures included, since they still cost quota).
-- No policies on purpose: only claim_generation() writes to it.
create table generation_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index generation_log_user_idx on generation_log (user_id, created_at);
alter table generation_log enable row level security;

-- True when the signed-in caller is still under the limit (rolling 24 hours), and records the
-- request. The API passes the limit; calling this directly can only ever use up your own quota.
create or replace function public.claim_generation(p_daily_limit int default 5) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  -- One request at a time per user, so two simultaneous requests can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext(uid::text));
  if (select count(*) from generation_log where user_id = uid and created_at > now() - interval '24 hours') >= p_daily_limit then
    return false;
  end if;
  insert into generation_log (user_id) values (uid);
  return true;
end $$;

revoke execute on function public.claim_generation(int) from public, anon;
grant execute on function public.claim_generation(int) to authenticated;

-- How many generations the caller has left today (for the "N of 5 left" counter).
create or replace function public.generations_used_today() returns int
language sql security definer set search_path = public stable as $$
  select count(*)::int from generation_log
  where user_id = auth.uid() and created_at > now() - interval '24 hours'
$$;

revoke execute on function public.generations_used_today() from public, anon;
grant execute on function public.generations_used_today() to authenticated;

select cron.schedule(
  'prune-generation-log',
  '27 3 * * *',
  $$ delete from public.generation_log where created_at < now() - interval '2 days' $$
);

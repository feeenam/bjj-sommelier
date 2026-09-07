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

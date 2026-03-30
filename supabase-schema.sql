-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

create table videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  youtube_id text,
  event text not null check (event in ('ADCC', 'Worlds', 'Pans', 'Euros', 'WNO', 'CJI')),
  year integer not null,
  competitors text not null,
  weight_class text not null,
  match_type text not null check (match_type in ('Superfight', 'Final', 'Semi-Final', 'Quarter-Final', 'Round of 16', 'Absolute Final')),
  ruleset text not null check (ruleset in ('Gi', 'No-Gi')),
  result text not null,
  owner_rating numeric(2,1) not null check (owner_rating >= 1 and owner_rating <= 5),
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
('Gordon Ryan vs Andre Galvao', 'The long-awaited ADCC superfight. Gordon Ryan attempts to cement his legacy against the ADCC legend Andre Galvao.', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'ADCC', 2022, 'Gordon Ryan vs Andre Galvao', 'Superfight', 'Superfight', 'No-Gi', 'Submission (Rear Naked Choke)', 4.9, 'A flawless performance by Gordon. The way he systematically dismantled a legend like Galvao was shocking to witness live. The back take sequence is a thing of beauty. Historical significance is off the charts.', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', '16:40', '2024-02-18');

-- Allow inserts from the app
create policy "Allow public insert"
  on videos for insert
  with check (true);

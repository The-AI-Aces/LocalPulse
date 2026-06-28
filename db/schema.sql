
create extension if not exists postgis;
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  name text,
  is_authority boolean default false,
  created_at timestamp default now()
);
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  category text not null,
  description text,
  photo_url text,
  lat double precision not null,
  lng double precision not null,
  status text default 'Open',
  is_anonymous boolean default false,
  created_at timestamp default now()
);
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id) on delete cascade,
  user_id uuid references profiles(id),
  text text not null,
  created_at timestamp default now()
);
create table if not exists upvotes (
  issue_id uuid references issues(id) on delete cascade,
  user_id uuid references profiles(id),
  primary key (issue_id, user_id)
);
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  org_name text,
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  event_date date,
  created_at timestamp default now()
);
create table if not exists service_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  contact text,
  rating numeric default 0,
  lat double precision not null,
  lng double precision not null
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  issue_id uuid references issues(id),
  message text,
  is_read boolean default false,
  created_at timestamp default now()
);

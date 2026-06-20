-- Enable PostGIS: this lets us do "find things near this point" queries later
create extension if not exists postgis;

-- Profiles table: one row per user
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  is_authority boolean default false,
  created_at timestamp default now()
);

-- Issues table: the core civic reports
create table issues (
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

-- Comments on issues
create table comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id) on delete cascade,
  user_id uuid references profiles(id),
  text text not null,
  created_at timestamp default now()
);

-- Upvotes: one row per (issue, user) pair, prevents double-voting
create table upvotes (
  issue_id uuid references issues(id) on delete cascade,
  user_id uuid references profiles(id),
  primary key (issue_id, user_id)
);

-- Events / announcements
create table events (
  id uuid primary key default gen_random_uuid(),
  org_name text,
  title text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  event_date date,
  created_at timestamp default now()
);

-- Service provider directory
create table service_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  contact text,
  rating numeric default 0,
  lat double precision not null,
  lng double precision not null
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  issue_id uuid references issues(id),
  message text,
  is_read boolean default false,
  created_at timestamp default now()
);
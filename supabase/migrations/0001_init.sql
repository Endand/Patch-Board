-- Patch Board: initial schema
-- Design notes:
--   * No user accounts anywhere. Identity is anonymous and unverified.
--   * Boards gate on a hashed password; verification happens ONLY in server
--     actions. RLS below denies the anon key any direct read of a private
--     board, so the gate cannot be bypassed by talking to PostgREST.
--   * Templates are data, not code. The Smash preset is one row.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums

create type card_type as enum (
  'praise',      -- green
  'balance',     -- yellow
  'suggestion',  -- orange
  'bug',         -- red
  'polish',      -- blue
  'question'     -- grey
);

create type card_status as enum ('open', 'acknowledged', 'fixed', 'wontfix');

create type board_visibility as enum (
  'public',     -- anyone reads, anyone posts
  'protected',  -- anyone reads, password required to post
  'private'     -- password required to read at all
);

-- ---------------------------------------------------------------- templates

create table templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table template_sections (
  id         uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  group_name text,          -- e.g. 'Tilts'; null means ungrouped
  name       text not null, -- e.g. 'Up Tilt'
  position   integer not null,
  unique (template_id, position)
);

-- ---------------------------------------------------------------- boards

create table boards (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  subtitle      text,
  template_id   uuid references templates(id) on delete set null,
  visibility    board_visibility not null default 'public',
  access_hash   text,        -- bcrypt; null unless visibility <> 'public'
  owner_hash    text not null, -- bcrypt of the owner/moderator secret
  is_listed     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table sections (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards(id) on delete cascade,
  group_name text,
  name       text not null,
  position   integer not null,
  is_hidden  boolean not null default false,
  unique (board_id, position)
);

create index sections_board_idx on sections (board_id, position);

-- ---------------------------------------------------------------- cards

create table cards (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references sections(id) on delete cascade,
  board_id    uuid not null references boards(id) on delete cascade,
  type        card_type not null,
  status      card_status not null default 'open',
  title       text not null check (char_length(title) between 1 and 200),
  body        text check (char_length(body) <= 5000),
  media_url   text,
  author_name text check (char_length(author_name) <= 40),
  author_key  text,   -- random client id, for "my cards" only. Not a permission.
  ip_hash     text,   -- salted hash, stored now so rate limiting can be added later
  vote_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index cards_section_idx on cards (section_id, created_at desc);
create index cards_board_idx   on cards (board_id, type);

create table votes (
  card_id    uuid not null references cards(id) on delete cascade,
  voter_key  text not null,  -- client id from localStorage
  created_at timestamptz not null default now(),
  primary key (card_id, voter_key)
);

-- Keep cards.vote_count in step with the votes table.
create or replace function sync_vote_count() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update cards set vote_count = vote_count + 1 where id = new.card_id;
  elsif tg_op = 'DELETE' then
    update cards set vote_count = vote_count - 1 where id = old.card_id;
  end if;
  return null;
end $$;

create trigger votes_sync
  after insert or delete on votes
  for each row execute function sync_vote_count();

-- ---------------------------------------------------------------- RLS
-- Every table is locked to the anon key. All reads and writes go through
-- server actions using the service role, which is where the password check
-- lives. This is deliberate: a client-side gate would be decorative.

alter table templates         enable row level security;
alter table template_sections enable row level security;
alter table boards            enable row level security;
alter table sections          enable row level security;
alter table cards             enable row level security;
alter table votes             enable row level security;

-- Public boards are the one thing safe to expose directly, and even then the
-- secret columns must never leave the server.
create view public_boards as
  select id, slug, name, subtitle, visibility, is_listed, created_at
  from boards
  where visibility = 'public' and is_listed = true;

-- No policies are created. With RLS on and no policy, the anon role gets
-- nothing, which is the intent.

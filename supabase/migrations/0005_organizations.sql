-- Organizations: one password and one admin list across many boards.
--
-- A board can stand alone exactly as before. Joining an organization adds a
-- second route to the same board: anyone who unlocks the organization can use
-- every board in it, and anyone who administers the organization administers
-- every board in it. Board level passwords and admins keep working on top,
-- so a single board can still be shared with someone who has no business
-- seeing the rest.

create table organizations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  owner_user_id uuid references auth.users(id) on delete set null,
  -- Null means the organization adds no access of its own: its boards are
  -- reachable only by their own rules.
  access_hash   text,
  created_at    timestamptz not null default now()
);

create table org_admins (
  org_id   uuid not null references organizations(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_admins_user_idx on org_admins (user_id);

-- Removing an organization must not take its boards with it. They fall back
-- to standing alone, which is why this is set null rather than cascade.
alter table boards
  add column org_id uuid references organizations(id) on delete set null;

create index boards_org_idx on boards (org_id);

comment on column boards.org_id is
  'Organization this board belongs to. Null means it stands alone.';

alter table organizations enable row level security;
alter table org_admins    enable row level security;

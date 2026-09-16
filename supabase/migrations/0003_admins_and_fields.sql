-- Several admins per board, and per-board rules for what a card must carry.

-- Which optional parts of a card the board asks for. Title and type are
-- always required, so they are not configurable.
create type field_mode as enum ('required', 'optional', 'hidden');

alter table boards
  add column author_name_mode field_mode not null default 'optional',
  add column body_mode        field_mode not null default 'optional',
  add column media_url_mode   field_mode not null default 'optional';

comment on column boards.author_name_mode is
  'Whether a card must carry a name. Hidden means the field is not shown.';

-- Extra admins. owner_user_id on boards stays the primary owner: they cannot
-- be removed here, which stops a board from ending up with no one in charge.
create table board_admins (
  board_id  uuid not null references boards(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  added_by  uuid references auth.users(id) on delete set null,
  added_at  timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index board_admins_user_idx on board_admins (user_id);

alter table board_admins enable row level security;

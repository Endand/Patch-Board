-- Accounts for board owners.
--
-- Posting stays anonymous. An account only ever means "I administer these
-- boards": it is never required to read a board or leave feedback.
--
-- owner_hash is kept rather than dropped. It is how a board created before
-- accounts existed gets claimed by its first owner, and it stays as a
-- recovery path for a board whose owner loses access to their account.

alter table boards
  add column owner_user_id uuid references auth.users(id) on delete set null;

create index boards_owner_idx on boards (owner_user_id);

-- Claiming is one way: once a board has an owner it cannot be re-claimed with
-- the secret alone, so a leaked secret cannot take a board away from its
-- owner. The owner can still hand it over by rotating and sharing the secret
-- after clearing owner_user_id.
comment on column boards.owner_user_id is
  'Account that administers this board. Null means unclaimed.';

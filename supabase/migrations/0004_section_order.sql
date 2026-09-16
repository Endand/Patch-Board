-- Let owners rearrange a board's sections.
--
-- Position was unique per board, which makes reordering needlessly hard:
-- swapping two sections would collide mid-update and need a temporary value.
-- Order is presentation, not identity, so a plain index is the right tool and
-- ties simply fall back to the name.

alter table sections drop constraint if exists sections_board_id_position_key;
alter table template_sections
  drop constraint if exists template_sections_template_id_position_key;

create index if not exists sections_order_idx on sections (board_id, position);

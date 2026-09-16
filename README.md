# Patch Board

A template-driven board app. Boards are generated from a template rather than
started empty, cards are typed and color coded, and nobody needs an account to
contribute.

The first template is structured feedback on Super Smash Bros. character
movesets, one board per fighter. The product itself is not Smash specific.

## Concepts

- **Board**, one subject. A character, to start with.
- **Section**, a slot on the board, generated from a template and optionally
  grouped (Side/Up/Down Tilt all sit under a Tilts header).
- **Card**, one piece of feedback, typed and color coded.

| Color  | Type       | Meaning                                   |
| ------ | ---------- | ----------------------------------------- |
| Green  | Praise     | works well, keep it                       |
| Yellow | Balance    | too strong or weak, frame data, kill power |
| Orange | Suggestion | a design change or idea                   |
| Red    | Bug        | broken, crashes, desyncs                  |
| Blue   | Polish     | visuals, sound, animation                 |
| Grey   | Question   | asking rather than reporting              |

## Access

Posting is anonymous, identified only by a random key kept in the browser,
which is a convenience for editing your own cards and never a permission.
Accounts exist solely so somebody can run a board: reading and posting never
need one.

Each board has one of three visibility levels:

| Level            | Read           | Post           |
| ---------------- | -------------- | -------------- |
| Public           | anyone         | anyone         |
| Read only public | anyone         | password       |
| Private          | password       | password       |

Passwords are hashed with scrypt. Every table has row level security enabled
with no policies, so the anon key can read nothing at all and every query runs
through a server action that checks the grant first. A successful unlock stores
a signed cookie scoped to that one board.

A board belongs to the account that created it. That account can add other
accounts as admins, and every admin has the same powers: moderate cards and
change any setting, including adding further admins. Only the owner cannot be
removed, so a board always has someone in charge.

`/b/<board>/settings` covers renaming, visibility, setting or clearing the
access password at any time, which parts of a card the board requires, the
admin list, a replacement owner secret, and a moderation queue over every card.

Boards created before accounts existed carry an owner secret instead. Entering
it at `/b/<board>/claim` attaches the board to your account permanently. The
secret remains as a recovery code.

## Filtering

Both the board overview and each move page let you click the feedback type
chips to narrow what is shown, and recount as you go. Move pages add
checkboxes to hide anything already Acknowledged, Fixed or marked Won't fix.
Boards can also hide sections that have nothing in them.

Creating a board requires the site wide `ADMIN_SECRET`. Everything else is
open.

## Stack

Next.js (App Router) and Supabase, deployed on Vercel.

## Development

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Database schema lives in `supabase/migrations`, applied through the Supabase
SQL editor. `npm run seed` loads the Smash Fighter template and is safe to
re-run: it rewrites the template sections and skips boards that already exist.

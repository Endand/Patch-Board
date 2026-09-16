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

There are no user accounts. Posting is anonymous. Each board carries its own
password and one of three visibility levels: public, read only public, or
private. Password checks run server side only.

## Stack

Next.js (App Router) and Supabase, deployed on Vercel.

## Development

```bash
npm install
npm run dev
```

Database schema lives in `supabase/migrations`.

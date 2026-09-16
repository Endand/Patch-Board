/**
 * Seed the Smash Fighter template and the starting boards.
 *
 * Run with:  npm run seed
 *
 * Safe to re-run. Templates upsert on slug, and boards are skipped if a board
 * with that slug already exists, so existing cards are never disturbed.
 */
import { hashSecret } from "../src/lib/hash.ts";
import { SMASH_FIGHTER, type Template } from "../src/lib/templates.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("Missing Supabase env vars. Expected .env.local to be loaded.");
  process.exit(1);
}

async function db(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<unknown[]> {
  const { prefer, ...rest } = init;
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
      ...rest.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : [];
}

async function seedTemplate(template: Template): Promise<string> {
  const [row] = (await db("templates?on_conflict=slug", {
    method: "POST",
    prefer: "return=representation,resolution=merge-duplicates",
    body: JSON.stringify({
      slug: template.slug,
      name: template.name,
      description: template.description,
    }),
  })) as { id: string }[];

  // Rewrite the section list wholesale so edits to templates.ts take effect.
  await db(`template_sections?template_id=eq.${row.id}`, { method: "DELETE" });
  await db("template_sections", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(
      template.sections.map((s, i) => ({
        template_id: row.id,
        group_name: s.group,
        name: s.name,
        position: i,
      })),
    ),
  });

  console.log(`template ${template.slug}: ${template.sections.length} sections`);
  return row.id;
}

async function seedBoard(
  slug: string,
  name: string,
  subtitle: string,
  templateId: string,
  template: Template,
) {
  const existing = (await db(
    `boards?slug=eq.${slug}&select=id`,
  )) as { id: string }[];
  if (existing.length) {
    console.log(`board ${slug}: already exists, skipped`);
    return;
  }

  // Owner secret is printed once and never stored in plain text anywhere.
  const ownerSecret = crypto.randomUUID().slice(0, 8);
  const [board] = (await db("boards", {
    method: "POST",
    body: JSON.stringify({
      slug,
      name,
      subtitle,
      template_id: templateId,
      visibility: "public",
      owner_hash: await hashSecret(ownerSecret),
    }),
  })) as { id: string }[];

  await db("sections", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(
      template.sections.map((s, i) => ({
        board_id: board.id,
        group_name: s.group,
        name: s.name,
        position: i,
      })),
    ),
  });

  console.log(`board ${slug}: created, owner secret = ${ownerSecret}`);
}

const templateId = await seedTemplate(SMASH_FIGHTER);
await seedBoard("raiden", "Raiden", "Metal Gear Rising", templateId, SMASH_FIGHTER);
await seedBoard("kratos", "Kratos", "God of War", templateId, SMASH_FIGHTER);
console.log("\nSave those owner secrets, they are not recoverable.");

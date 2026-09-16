"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createBoard, type CreateResult } from "./actions";

type Template = { slug: string; name: string; description: string | null };

const VISIBILITY = [
  {
    value: "public",
    label: "Public",
    hint: "Anyone can read and post. No password.",
  },
  {
    value: "protected",
    label: "Read only public",
    hint: "Anyone can read. The password is needed to post.",
  },
  {
    value: "private",
    label: "Private",
    hint: "The password is needed to see the board at all.",
  },
];

export function NewBoardForm({ templates }: { templates: Template[] }) {
  const [visibility, setVisibility] = useState("public");
  const [state, action, pending] = useActionState<CreateResult | null, FormData>(
    createBoard,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-edge bg-surface p-5">
        <h2 className="font-medium">Board created</h2>
        <p className="mt-2 text-sm text-muted">
          The board belongs to your account, so you do not need this to
          moderate. Keep it anyway as a recovery code: it is hashed in the
          database and cannot be shown again.
        </p>
        <p className="mt-3 rounded border border-edge bg-background px-3 py-2 font-mono text-lg">
          {state.ownerSecret}
        </p>
        <Link
          href={`/b/${state.slug}`}
          className="mt-4 inline-block rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Open the board
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Name">
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Raiden"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </Field>

      <Field label="Subtitle" hint="Optional">
        <input
          name="subtitle"
          maxLength={120}
          placeholder="Metal Gear Rising"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </Field>

      <Field label="Template">
        <select
          name="template"
          defaultValue={templates[0]?.slug}
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">Visibility</legend>
        <div className="space-y-1.5">
          {VISIBILITY.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-2.5 rounded border border-edge bg-surface p-2.5"
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={(e) => setVisibility(e.target.value)}
                className="mt-0.5 accent-current"
              />
              <span>
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {visibility !== "public" && (
        <Field label="Board password" hint="Shared with contributors">
          <input
            name="password"
            type="text"
            required
            autoComplete="off"
            className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </Field>
      )}

      {state && !state.ok && (
        <p className="text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create board"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {hint && (
          <span className="ml-2 font-normal text-xs text-muted">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  rotateOwnerSecret,
  signOut,
  updateAccess,
  updateDetails,
  type SettingsResult,
} from "./actions";

const VISIBILITY = [
  { value: "public", label: "Public", hint: "Anyone can read and post." },
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

export function BoardSettings({
  slug,
  name,
  subtitle,
  visibility,
  hasPassword,
}: {
  slug: string;
  name: string;
  subtitle: string | null;
  visibility: string;
  hasPassword: boolean;
}) {
  const router = useRouter();

  const [detailState, detailAction, detailPending] = useActionState<
    SettingsResult | null,
    FormData
  >((prev, formData) => updateDetails(slug, prev, formData), null);

  const [chosen, setChosen] = useState(visibility);
  const [accessState, accessAction, accessPending] = useActionState<
    SettingsResult | null,
    FormData
  >((prev, formData) => updateAccess(slug, prev, formData), null);

  const [secretState, secretAction, secretPending] = useActionState<
    SettingsResult | null,
    FormData
  >(() => rotateOwnerSecret(slug), null);

  return (
    <div className="space-y-10">
      <Panel title="Details">
        <form action={detailAction} className="space-y-3">
          <Field label="Name">
            <input
              name="name"
              defaultValue={name}
              required
              maxLength={80}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </Field>
          <Field label="Subtitle" hint="Optional">
            <input
              name="subtitle"
              defaultValue={subtitle ?? ""}
              maxLength={120}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </Field>
          <Submit pending={detailPending}>Save details</Submit>
          <Result state={detailState} />
        </form>
        <p className="mt-2 text-xs text-muted">
          The board&apos;s web address does not change, so existing links keep
          working.
        </p>
      </Panel>

      <Panel title="Access">
        <form action={accessAction} className="space-y-3">
          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium">
              Visibility
            </legend>
            <div className="space-y-1.5">
              {VISIBILITY.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer gap-2.5 rounded border border-edge bg-background p-2.5"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={chosen === option.value}
                    onChange={(e) => setChosen(e.target.value)}
                    className="mt-0.5 accent-current"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs text-muted">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Board password"
            hint={hasPassword ? "Blank keeps the current one" : "Not set yet"}
          >
            <input
              name="password"
              type="text"
              autoComplete="off"
              placeholder={hasPassword ? "Unchanged" : "Set a password"}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </Field>

          {hasPassword && chosen === "public" && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="clear_password"
                className="accent-current"
              />
              Remove the password entirely
            </label>
          )}

          <Submit pending={accessPending}>Save access</Submit>
          <Result state={accessState} />
        </form>
        <p className="mt-2 text-xs text-muted">
          Changing the password does not sign out people who already unlocked
          the board. Rotate the owner secret below if you need to lock everyone
          out.
        </p>
      </Panel>

      <Panel title="Owner secret">
        <p className="mb-3 text-sm text-muted">
          Replace the secret if it leaked. The old one stops working
          immediately.
        </p>
        <form action={secretAction}>
          <Submit pending={secretPending}>Issue a new secret</Submit>
        </form>
        {secretState?.ok && secretState.ownerSecret && (
          <p className="mt-3 rounded border border-edge bg-background px-3 py-2 font-mono text-lg">
            {secretState.ownerSecret}
          </p>
        )}
        <Result state={secretState} />
      </Panel>

      <Panel title="Session">
        <button
          type="button"
          onClick={async () => {
            await signOut(slug);
            router.push(`/b/${slug}`);
          }}
          className="rounded border border-edge px-3 py-1.5 text-sm"
        >
          Sign out of this board
        </button>
      </Panel>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-edge bg-surface p-5">
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      {children}
    </section>
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
          <span className="ml-2 text-xs font-normal text-muted">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function Result({ state }: { state: SettingsResult | null }) {
  if (!state) return null;
  return (
    <p
      className={`text-sm ${state.ok ? "text-muted" : "text-rose-500"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

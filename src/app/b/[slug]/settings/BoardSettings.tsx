"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  addAdmin,
  deleteBoard,
  removeAdmin,
  rotateOwnerSecret,
  signOut,
  updateAccess,
  updateDetails,
  updateFields,
  type SettingsResult,
} from "./actions";

type FieldMode = "required" | "optional" | "hidden";

type Admin = { id: string; label: string; primary: boolean };

const FIELDS: {
  key: "author_name_mode" | "body_mode" | "media_url_mode";
  label: string;
  hint: string;
}[] = [
  {
    key: "author_name_mode",
    label: "Name",
    hint: "Who left the feedback. Still unverified either way.",
  },
  { key: "body_mode", label: "Details", hint: "The longer description." },
  {
    key: "media_url_mode",
    label: "Clip or image link",
    hint: "A link to footage or a screenshot.",
  },
];

const MODES: FieldMode[] = ["required", "optional", "hidden"];

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
  fields,
  admins,
  currentUserId,
  cardCount,
}: {
  slug: string;
  name: string;
  subtitle: string | null;
  visibility: string;
  hasPassword: boolean;
  fields: { authorName: FieldMode; body: FieldMode; mediaUrl: FieldMode };
  admins: Admin[];
  currentUserId: string | null;
  cardCount: number;
}) {
  const router = useRouter();

  const [fieldState, fieldAction, fieldPending] = useActionState<
    SettingsResult | null,
    FormData
  >((prev, formData) => updateFields(slug, prev, formData), null);

  const [adminState, adminAction, adminPending] = useActionState<
    SettingsResult | null,
    FormData
  >((prev, formData) => addAdmin(slug, prev, formData), null);

  // Deleting is the primary owner's alone. An admin can be added by another
  // admin, so it is not a power to hand out by accident.
  const isPrimaryOwner = admins.some(
    (a) => a.primary && a.id === currentUserId,
  );
  const [armed, setArmed] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<
    SettingsResult | null,
    FormData
  >((prev, formData) => deleteBoard(slug, prev, formData), null);

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

      <Panel title="Card fields">
        <p className="mb-4 text-sm text-muted">
          What every card on this board has to carry. Type and title are always
          required.
        </p>
        <form action={fieldAction} className="space-y-3">
          {FIELDS.map((field) => {
            const current =
              field.key === "author_name_mode"
                ? fields.authorName
                : field.key === "body_mode"
                  ? fields.body
                  : fields.mediaUrl;
            return (
              <div
                key={field.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-edge bg-background p-2.5"
              >
                <span>
                  <span className="block text-sm font-medium">
                    {field.label}
                  </span>
                  <span className="block text-xs text-muted">{field.hint}</span>
                </span>
                <span className="flex gap-1">
                  {MODES.map((mode) => (
                    <label
                      key={mode}
                      className="cursor-pointer rounded px-2 py-1 text-xs has-checked:bg-surface has-checked:font-medium"
                    >
                      <input
                        type="radio"
                        name={field.key}
                        value={mode}
                        defaultChecked={current === mode}
                        className="sr-only"
                      />
                      {mode[0].toUpperCase() + mode.slice(1)}
                    </label>
                  ))}
                </span>
              </div>
            );
          })}
          <Submit pending={fieldPending}>Save fields</Submit>
          <Result state={fieldState} />
        </form>
      </Panel>

      <Panel title="Admins">
        <p className="mb-4 text-sm text-muted">
          Admins can moderate cards and change these settings. Everyone listed
          here has the same powers, except that the owner cannot be removed.
        </p>

        <ul className="mb-4 space-y-2">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex flex-wrap items-center gap-2 rounded border border-edge bg-background px-3 py-2 text-sm"
            >
              <span>{admin.label}</span>
              {admin.primary && (
                <span className="rounded-full border border-edge px-1.5 py-0.5 text-[11px] text-muted">
                  Owner
                </span>
              )}
              {admin.id === currentUserId && (
                <span className="text-xs text-muted">you</span>
              )}
              {!admin.primary && (
                <RemoveAdmin slug={slug} userId={admin.id} />
              )}
            </li>
          ))}
        </ul>

        <form action={adminAction} className="flex flex-wrap gap-2">
          <input
            name="who"
            required
            autoComplete="off"
            placeholder="Their GitHub username"
            className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <Submit pending={adminPending}>Add admin</Submit>
        </form>
        <p className="mt-2 text-xs text-muted">
          They need to have signed in to Patch Board at least once. Matched
          exactly, and nothing here reveals who else has an account.
        </p>
        <Result state={adminState} />
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

      {isPrimaryOwner && (
        <section className="rounded-lg border border-rose-500/40 bg-surface p-5">
          <h2 className="mb-1 text-lg font-medium">Delete this board</h2>
          <p className="mb-4 text-sm text-muted">
            Removes {name}, its {cardCount}{" "}
            {cardCount === 1 ? "card" : "cards"} and every section. There is no
            undo and the link stops working for everyone.
          </p>
          {armed ? (
            <form action={deleteAction} className="space-y-3">
              <Field label={`Type "${name}" to confirm`}>
                <input
                  name="confirm"
                  autoComplete="off"
                  className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-rose-500"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={deletePending}
                  className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {deletePending ? "Deleting..." : "Delete permanently"}
                </button>
                <button
                  type="button"
                  onClick={() => setArmed(false)}
                  className="rounded px-3 py-1.5 text-sm text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <Result state={deleteState} />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setArmed(true)}
              className="rounded border border-rose-500/40 px-3 py-1.5 text-sm text-rose-500"
            >
              Delete board
            </button>
          )}
        </section>
      )}

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

function RemoveAdmin({ slug, userId }: { slug: string; userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <span className="ml-auto flex items-center gap-2">
      {error && <span className="text-xs text-rose-500">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await removeAdmin(slug, userId);
            if (!result.ok) setError(result.error);
          })
        }
        className="text-xs text-muted hover:text-rose-500"
      >
        Remove
      </button>
    </span>
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

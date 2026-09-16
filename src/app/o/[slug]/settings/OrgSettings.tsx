"use client";

import { useActionState, useState, useTransition } from "react";
import type { Board } from "@/lib/cards";
import {
  addOrgAdmin,
  deleteOrg,
  removeOrgAdmin,
  setBoardOrg,
  updateOrg,
  updateOrgPassword,
  type OrgResult,
} from "../../actions";

type Admin = { id: string; label: string; primary: boolean };

export function OrgSettings({
  slug,
  name,
  description,
  hasPassword,
  admins,
  currentUserId,
  boardsIn,
  boardsAvailable,
}: {
  slug: string;
  name: string;
  description: string | null;
  hasPassword: boolean;
  admins: Admin[];
  currentUserId: string | null;
  boardsIn: Board[];
  boardsAvailable: Board[];
}) {
  const [detailState, detailAction, detailPending] = useActionState<
    OrgResult | null,
    FormData
  >((prev, formData) => updateOrg(slug, prev, formData), null);

  const [passwordState, passwordAction, passwordPending] = useActionState<
    OrgResult | null,
    FormData
  >((prev, formData) => updateOrgPassword(slug, prev, formData), null);

  const [adminState, adminAction, adminPending] = useActionState<
    OrgResult | null,
    FormData
  >((prev, formData) => addOrgAdmin(slug, prev, formData), null);

  const isPrimaryOwner = admins.some(
    (a) => a.primary && a.id === currentUserId,
  );
  const [armed, setArmed] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<
    OrgResult | null,
    FormData
  >((prev, formData) => deleteOrg(slug, prev, formData), null);

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
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
            />
          </Field>
          <Field label="Description" hint="Optional">
            <input
              name="description"
              defaultValue={description ?? ""}
              maxLength={160}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
            />
          </Field>
          <Submit pending={detailPending}>Save details</Submit>
          <Result state={detailState} />
        </form>
      </Panel>

      <Panel title="Shared password">
        <p className="mb-4 text-sm text-muted">
          One password for every board inside. Anyone who enters it can read and
          post across all of them, without needing each board&apos;s own
          password.
        </p>
        <form action={passwordAction} className="space-y-3">
          <Field
            label="Password"
            hint={hasPassword ? "Replaces the current one" : "Not set"}
          >
            <input
              name="password"
              type="text"
              autoComplete="off"
              placeholder={hasPassword ? "New password" : "Set a password"}
              className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
            />
          </Field>
          {hasPassword && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="clear_password"
                className="accent-current"
              />
              Remove it instead. Boards keep their own passwords.
            </label>
          )}
          <Submit pending={passwordPending}>Save password</Submit>
          <Result state={passwordState} />
        </form>
      </Panel>

      <Panel title="Admins">
        <p className="mb-4 text-sm text-muted">
          An admin here administers every board in the organization: moderating
          cards, changing board settings, and adding more admins. You do not
          have to add them board by board.
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
                <RowAction
                  label="Remove"
                  run={() => removeOrgAdmin(slug, admin.id)}
                />
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
            className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
          />
          <Submit pending={adminPending}>Add admin</Submit>
        </form>
        <Result state={adminState} />
      </Panel>

      <Panel title="Boards">
        {boardsIn.length === 0 ? (
          <p className="mb-4 text-sm text-muted">
            Nothing in this organization yet.
          </p>
        ) : (
          <ul className="mb-5 space-y-2">
            {boardsIn.map((board) => (
              <li
                key={board.id}
                className="flex flex-wrap items-center gap-2 rounded border border-edge bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{board.name}</span>
                {board.visibility !== "public" && (
                  <span className="rounded-full border border-edge px-1.5 py-0.5 text-[11px] text-muted">
                    {board.visibility === "private" ? "Private" : "Locked"}
                  </span>
                )}
                <RowAction
                  label="Remove"
                  run={() => setBoardOrg(slug, board.id, false)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-edge pt-4">
          <p className="mb-2 text-sm font-medium">Add a board you own</p>
          {boardsAvailable.length === 0 ? (
            <p className="text-sm text-muted">
              Every board you own is already in an organization.
            </p>
          ) : (
            <ul className="space-y-2">
              {boardsAvailable.map((board) => (
                <li
                  key={board.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-edge bg-background px-3 py-2 text-sm"
                >
                  <span>{board.name}</span>
                  <RowAction
                    label="Add"
                    run={() => setBoardOrg(slug, board.id, true)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {isPrimaryOwner && (
        <section className="panel border-rose-500/40 p-5">
          <h2 className="mb-1 text-lg font-medium">
            Delete this organization
          </h2>
          <p className="mb-4 text-sm text-muted">
            The {boardsIn.length}{" "}
            {boardsIn.length === 1 ? "board" : "boards"} inside are kept and go
            back to standing on their own. The shared password and this admin
            list stop working.
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
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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
              className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-500"
            >
              Delete organization
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function RowAction({
  label,
  run,
}: {
  label: string;
  run: () => Promise<OrgResult>;
}) {
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
            const result = await run();
            if (!result.ok) setError(result.error);
          })
        }
        className="text-xs text-muted hover:text-foreground"
      >
        {label}
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
    <section className="panel p-5">
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
      className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Saving..." : children}
    </button>
  );
}

function Result({ state }: { state: OrgResult | null }) {
  if (!state || (state.ok && !state.message)) return null;
  return (
    <p
      className={`text-sm ${state.ok ? "text-muted" : "text-rose-500"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addSection,
  deleteSection,
  moveSection,
  renameSection,
  setSectionHidden,
  type SectionResult,
} from "./sections";

export type ManagedSection = {
  id: string;
  name: string;
  group_name: string | null;
  is_hidden: boolean;
  cardCount: number;
};

export function SectionManager({
  slug,
  sections,
}: {
  slug: string;
  sections: ManagedSection[];
}) {
  const groups = [
    ...new Set(sections.map((s) => s.group_name).filter(Boolean)),
  ] as string[];

  const [addState, addAction, addPending] = useActionState<
    SectionResult | null,
    FormData
  >((prev, formData) => addSection(slug, prev, formData), null);

  return (
    <section className="panel p-5">
      <h2 className="mb-1 text-lg font-medium">Sections</h2>
      <p className="mb-4 text-sm text-muted">
        The board was generated from a template. Add whatever the template does
        not cover, rename what does not fit, and reorder freely.
      </p>

      <ol className="mb-5 space-y-1.5">
        {sections.map((section, i) => (
          <Row
            key={section.id}
            slug={slug}
            section={section}
            first={i === 0}
            last={i === sections.length - 1}
          />
        ))}
      </ol>

      <form action={addAction} className="border-t border-edge pt-4">
        <p className="mb-2 text-sm font-medium">Add a section</p>
        <div className="flex flex-wrap gap-2">
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Section name"
            className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
          />
          <input
            name="group_name"
            list="pb-groups"
            maxLength={40}
            placeholder="Group, optional"
            className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
          />
          <datalist id="pb-groups">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={addPending}
            className="btn-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {addPending ? "Adding..." : "Add"}
          </button>
        </div>
        <Note state={addState} />
      </form>
    </section>
  );
}

function Row({
  slug,
  section,
  first,
  last,
}: {
  slug: string;
  section: ManagedSection;
  first: boolean;
  last: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.name);
  const [group, setGroup] = useState(section.group_name ?? "");
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<SectionResult | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<SectionResult>) =>
    start(async () => setState(await fn()));

  return (
    <li className="rounded border border-edge bg-background px-3 py-2">
      {editing ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="min-w-0 flex-1 rounded border border-edge bg-surface px-2 py-1 text-sm"
          />
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            list="pb-groups"
            maxLength={40}
            placeholder="Group"
            className="min-w-0 flex-1 rounded border border-edge bg-surface px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await renameSection(
                  slug,
                  section.id,
                  name,
                  group,
                );
                if (result.ok) setEditing(false);
                return result;
              })
            }
            className="btn-primary rounded px-2 py-1 text-xs font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setName(section.name);
              setGroup(section.group_name ?? "");
              setEditing(false);
            }}
            className="px-2 py-1 text-xs text-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {section.group_name && (
            <span className="text-xs uppercase tracking-wider text-muted">
              {section.group_name}
            </span>
          )}
          <span className={section.is_hidden ? "text-muted line-through" : ""}>
            {section.name}
          </span>
          {section.cardCount > 0 && (
            <span className="text-xs text-muted">
              {section.cardCount} {section.cardCount === 1 ? "card" : "cards"}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1 text-xs text-muted">
            <button
              type="button"
              disabled={pending || first}
              onClick={() => run(() => moveSection(slug, section.id, "up"))}
              className="rounded px-1.5 py-0.5 enabled:hover:text-foreground disabled:opacity-30"
              aria-label={`Move ${section.name} up`}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={pending || last}
              onClick={() => run(() => moveSection(slug, section.id, "down"))}
              className="rounded px-1.5 py-0.5 enabled:hover:text-foreground disabled:opacity-30"
              aria-label={`Move ${section.name} down`}
            >
              ↓
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(true)}
              className="rounded px-1.5 py-0.5 hover:text-foreground"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setSectionHidden(slug, section.id, !section.is_hidden),
                )
              }
              className="rounded px-1.5 py-0.5 hover:text-foreground"
            >
              {section.is_hidden ? "Show" : "Hide"}
            </button>

            {confirming ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteSection(slug, section.id))}
                  className="rounded px-1.5 py-0.5 font-medium text-rose-500"
                >
                  {section.cardCount > 0
                    ? `Delete with ${section.cardCount}`
                    : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded px-1.5 py-0.5"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(true)}
                className="rounded px-1.5 py-0.5 hover:text-rose-500"
              >
                Delete
              </button>
            )}
          </span>
        </div>
      )}
      <Note state={state} />
    </li>
  );
}

function Note({ state }: { state: SectionResult | null }) {
  if (!state || (state.ok && !state.message)) return null;
  return (
    <p
      className={`mt-1.5 text-xs ${state.ok ? "text-muted" : "text-rose-500"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

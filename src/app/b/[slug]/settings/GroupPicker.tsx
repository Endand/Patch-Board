"use client";

import { useState } from "react";

const NEW = "__new__";
const NONE = "";

/**
 * Pick an existing group, or make one.
 *
 * A free text field was the original design and it went wrong quietly: typing
 * a name that already existed produced a second heading with the same name
 * rather than joining the first. Choosing from the real list makes that
 * impossible, and "New group" keeps the escape hatch.
 */
export function GroupPicker({
  groups,
  value,
  onChange,
  name,
  id,
}: {
  groups: string[];
  value: string;
  onChange: (next: string) => void;
  /** Set to submit through a plain form rather than a controlled parent. */
  name?: string;
  id: string;
}) {
  const known = value === "" || groups.includes(value);
  const [creating, setCreating] = useState(!known);

  return (
    <span className="flex min-w-0 flex-1 gap-2">
      {name && <input type="hidden" name={name} value={value} />}

      <select
        id={id}
        aria-label="Group"
        value={creating ? NEW : value}
        onChange={(e) => {
          if (e.target.value === NEW) {
            setCreating(true);
            onChange("");
          } else {
            setCreating(false);
            onChange(e.target.value);
          }
        }}
        className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm"
      >
        <option value={NONE}>No group</option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
        <option value={NEW}>New group...</option>
      </select>

      {creating && (
        <input
          id={`${id}-new`}
          aria-label="New group name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={40}
          placeholder="Group name"
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
      )}
    </span>
  );
}

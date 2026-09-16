"use client";

import { useActionState } from "react";
import { submitOrgPassword, type OrgResult } from "../actions";

export function OrgPasswordGate({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<OrgResult | null, FormData>(
    (prev, formData) => submitOrgPassword(slug, prev, formData),
    null,
  );

  return (
    <form action={action} className="panel p-5">
      <h2 className="font-medium">Have the password for {name}?</h2>
      <p className="mt-1 text-sm text-muted">
        Entering it once opens every board in this organization, instead of
        unlocking them one at a time.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          name="password"
          type="password"
          required
          autoComplete="off"
          placeholder="Organization password"
          className="min-w-0 flex-1 rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Checking..." : "Unlock all"}
        </button>
      </div>

      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

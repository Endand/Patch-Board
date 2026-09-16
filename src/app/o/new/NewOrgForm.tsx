"use client";

import { useActionState } from "react";
import { createOrg, type OrgResult } from "../actions";

export function NewOrgForm() {
  const [state, action, pending] = useActionState<OrgResult | null, FormData>(
    createOrg,
    null,
  );

  return (
    <form action={action} className="panel space-y-4 p-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Name</span>
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Project Alpha"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Description
          <span className="ml-2 text-xs font-normal text-muted">Optional</span>
        </span>
        <input
          name="description"
          maxLength={160}
          placeholder="Our fighter roster"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Shared password
          <span className="ml-2 text-xs font-normal text-muted">
            Optional, can be set later
          </span>
        </span>
        <input
          name="password"
          type="text"
          autoComplete="off"
          placeholder="Opens every board inside"
          className="w-full rounded border border-edge bg-background px-3 py-2 text-sm outline-none focus:border-edge-strong"
        />
      </label>

      {state && !state.ok && (
        <p className="text-sm text-rose-500" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}

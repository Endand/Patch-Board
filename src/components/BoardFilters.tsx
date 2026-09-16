"use client";

import { useState, type ReactNode } from "react";

/**
 * Wraps the rendered section grid and hides empty sections on request.
 *
 * The filtering is CSS only, over server rendered markup, so the whole board
 * stays in the HTML for anyone without JavaScript and there is no second
 * render path to keep in step.
 */
export function BoardFilters({ children }: { children: ReactNode }) {
  const [hideEmpty, setHideEmpty] = useState(false);

  return (
    <>
      <div className="mb-5 flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="accent-current"
          />
          Hide empty sections
        </label>
      </div>

      <div className={`space-y-10 ${hideEmpty ? "pb-hide-empty" : ""}`}>
        {children}
      </div>
    </>
  );
}

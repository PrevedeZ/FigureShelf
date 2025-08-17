"use client";
import { useMemo, useState } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
};

export default function CharacterPicker({ value, onChange, options }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => options.filter((c) => c.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );

  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  return (
    <div className="space-y-3">
      <input
        className="field"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search characters..."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map((name) => (
          <button
            key={name}
            type="button"
            className={`inline-flex items-center justify-center text-center
                        px-3 py-2 rounded-lg border text-sm transition
                        ${value.includes(name)
                          ? "border-amber-400 bg-amber-50"
                          : "border-[var(--border)] hover:bg-gray-50"}`}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="badge">
              {v}
              <button
                type="button"
                className="ml-1 text-xs opacity-70 hover:opacity-100"
                onClick={() => toggle(v)}
                aria-label={`Remove ${v}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

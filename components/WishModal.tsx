"use client";
import { useEffect, useState } from "react";
import type { Figure } from "./types";
import { useCollection } from "./CollectionStore";

export default function WishModal({
  open,
  onClose,
  figure,
}: {
  open: boolean;
  onClose: () => void;
  figure: Figure | null;
}) {
  const { addWish } = useCollection();
  const [wantAnother, setWantAnother] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setWantAnother(false);
    setNote("");
  }, [open]);

  if (!open || !figure) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addWish(figure.id, { wantAnother, note: note || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,calc(100%-2rem))]">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold">Add to Wishlist</div>
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="text-sm text-gray-600">{figure.name}</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wantAnother} onChange={(e)=>setWantAnother(e.target.checked)} />
              I already own one, but I want another
            </label>
            <div>
              <label className="text-xs text-gray-600">Note (optional)</label>
              <input className="field w-full" value={note} onChange={(e)=>setNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

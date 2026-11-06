import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleSaved } from "@/app/saved/actions";
import { Button } from "@/components/ui";

export function SaveButton({ type, itemKey, title, saved, path, signedIn }: { type: string; itemKey: string; title: string; saved: boolean; path: string; signedIn: boolean }) {
  if (!signedIn) return null;
  return (
    <form action={toggleSaved}>
      <input type="hidden" name="item_type" value={type} /><input type="hidden" name="item_key" value={itemKey} />
      <input type="hidden" name="title" value={title} /><input type="hidden" name="saved" value={String(saved)} /><input type="hidden" name="path" value={path} />
      <Button variant={saved ? "secondary" : "outline"} size="sm" aria-pressed={saved}>{saved ? <BookmarkCheck /> : <Bookmark />}{saved ? "Saved" : "Save"}</Button>
    </form>
  );
}

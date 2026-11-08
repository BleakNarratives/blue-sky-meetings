import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DECLARATIONS, declarationMeta } from "@/convex/protocol";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  X,
} from "lucide-react";

export type SourceRow = {
  _id: Id<"sources">;
  ideaId: Id<"ideas"> | null;
  kind: "link" | "file";
  name: string;
  href: string | null;
  note: string | null;
  declared: "prior" | "context";
  contributor: string;
  createdAt: number;
};

/**
 * A link is a citation; a file is evidence. Both are declared, labelled, and
 * attached to the seat that brought them in.
 */
export function SourcesDialog({
  open,
  onOpenChange,
  roomId,
  idea,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: Id<"rooms">;
  idea: { _id: Id<"ideas">; title: string } | null;
  rows: SourceRow[];
}) {
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const attach = useMutation(api.sources.attach);
  const removeSource = useMutation(api.sources.remove);

  const [kind, setKind] = useState<"link" | "file">("link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [declared, setDeclared] = useState<"prior" | "context">("context");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setUrl("");
    setNote("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (kind === "link" && !url.trim()) return;
    if (kind === "file" && !file) return;

    setPending(true);
    try {
      let storageId: Id<"_storage"> | undefined;
      if (kind === "file" && file) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: file.type ? { "Content-Type": file.type } : undefined,
          body: file,
        });
        if (!response.ok) throw new Error("The file did not upload.");
        const result = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        storageId = result.storageId;
      }

      await attach({
        roomId,
        ideaId: idea?._id,
        kind,
        name: name.trim() || (kind === "file" ? file?.name : undefined),
        url: kind === "link" ? url.trim() : undefined,
        storageId,
        note: note.trim() || undefined,
        declared,
      });

      toast("Declared", {
        description: idea
          ? "It sits beside the idea, labelled. Nobody has to take it on faith."
          : "It sits in the room's record, labelled for what it is.",
      });
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The source was not recorded.",
      );
    } finally {
      setPending(false);
    }
  };

  const remove = async (sourceId: Id<"sources">) => {
    try {
      await removeSource({ sourceId });
      toast("Declaration withdrawn");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "It could not be removed.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <p className="label text-muted-foreground">Declared material</p>
          <DialogTitle className="display text-3xl">
            {idea ? "Sources on this idea" : "Sources for this room"}
          </DialogTitle>
          <DialogDescription>
            {idea ? (
              <>
                What this idea points at, labelled. Prior art is named out loud,
                not smuggled in as common sense.
              </>
            ) : (
              <>
                Context the whole room can see. A link can be a citation or a
                warning; a file can be evidence. Either way, it is declared.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="border border-dashed border-border px-4 py-6 text-center text-xs leading-5 text-muted-foreground">
            Nothing declared yet. The first source is allowed to be small — one
            link that saves everybody an argument.
          </p>
        ) : (
          <div className="flex flex-col border border-border">
            {rows.map((source) => {
              const declaration = declarationMeta(source.declared);
              const Icon = source.kind === "file" ? FileText : Link2;
              return (
                <div
                  key={source._id}
                  className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    {source.href ? (
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-2 text-[0.8125rem] font-medium leading-5 hover:underline underline-offset-4"
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{source.name}</span>
                      </a>
                    ) : (
                      <p className="flex items-center gap-2 text-[0.8125rem] font-medium leading-5">
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{source.name}</span>
                      </p>
                    )}
                    {source.note && (
                      <p className="mt-1 text-[0.72rem] leading-5 text-muted-foreground">
                        {source.note}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="label-sm border border-border px-1.5 py-0.5 text-muted-foreground">
                        {declaration.label}
                      </span>
                      <span className="label-sm text-muted-foreground">
                        {source.contributor}
                      </span>
                      {!source.href && (
                        <span className="label-sm text-muted-foreground">
                          · file no longer resolves
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(source._id)}
                    aria-label={`Remove ${source.name}`}
                    className="shrink-0 border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 border-t border-border pt-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="label text-muted-foreground">Declare something</p>
            <div className="flex border border-border">
              {(["link", "file"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  aria-pressed={kind === option}
                  className={cn(
                    "label-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors",
                    kind === option
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option === "link" ? (
                    <Link2 className="size-3" />
                  ) : (
                    <FileText className="size-3" />
                  )}
                  {option === "link" ? "Link" : "File"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="source-name" className="label">
              What should we call it?
            </Label>
            <Input
              id="source-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                kind === "link"
                  ? "The thing that already proves half of this"
                  : "What the file is, in plain words"
              }
              maxLength={120}
            />
          </div>

          {kind === "link" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="source-url" className="label">
                Where it lives
              </Label>
              <Input
                id="source-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                inputMode="url"
                required
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="label text-muted-foreground">The file</span>
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 border border-dashed px-3 py-3 text-xs leading-5 transition-colors",
                  file
                    ? "border-foreground/40 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/40",
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Paperclip className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {file ? file.name : "Choose a file to attach"}
                  </span>
                </span>
                <span className="label-sm shrink-0">Browse</span>
                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-[0.6875rem] leading-5 text-muted-foreground">
                Stored with the room, not in someone&rsquo;s inbox. Keep it small
                enough to open in a meeting.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="source-note" className="label">
              What it is for <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              id="source-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="One line. What should the room do with this?"
              rows={2}
              maxLength={240}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="label text-muted-foreground">Declared as</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {DECLARATIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={pending}
                  aria-pressed={declared === option.key}
                  onClick={() => setDeclared(option.key)}
                  className={cn(
                    "flex flex-col gap-1 border px-3 py-2.5 text-left transition-colors",
                    declared === option.key
                      ? "border-foreground bg-secondary"
                      : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="label">{option.label}</span>
                  <span className="text-[0.6875rem] leading-4 text-muted-foreground">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={
                pending || (kind === "link" ? !url.trim() : !file)
              }
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Declare it
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The room-level declarations, sitting where "inbound closed" used to be. */
export function SourcesPanel({
  rows,
  canDeclare,
  onOpen,
}: {
  rows: SourceRow[];
  canDeclare: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="mt-4 border border-border bg-secondary/50 px-4 py-4">
      <p className="label flex items-center gap-2 text-muted-foreground">
        <Link2 className="size-3.5" />
        Inbound declared · Outbound closed
      </p>
      <p className="mt-2 text-[0.75rem] leading-5 text-muted-foreground">
        Nothing comes in unannounced. Links and files are declared here, labelled
        prior art or context, and attached to a name. Source material is a
        citation, not an argument.
      </p>

      {rows.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {rows.slice(0, 3).map((source) => {
            const Icon = source.kind === "file" ? FileText : Link2;
            return source.href ? (
              <a
                key={source._id}
                href={source.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-[0.72rem] leading-5 text-foreground hover:underline underline-offset-4"
              >
                <Icon className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{source.name}</span>
                <span className="label-sm ml-auto shrink-0 text-muted-foreground">
                  {declarationMeta(source.declared).label}
                </span>
              </a>
            ) : (
              <p
                key={source._id}
                className="flex items-center gap-2 text-[0.72rem] leading-5"
              >
                <Icon className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{source.name}</span>
              </p>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="label-sm text-muted-foreground">
          {rows.length} declared
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpen}
          disabled={!canDeclare}
          className="h-7 px-2 text-[0.6875rem]"
        >
          <Plus className="size-3" />
          Declare
        </Button>
      </div>
    </div>
  );
}

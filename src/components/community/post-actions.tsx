"use client";

import { BadgeCheck, Send, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm";
import { Textarea } from "@/components/ui/input";
import {
  acceptReplyAction,
  createReplyAction,
  deletePostAction,
  deleteReplyAction,
  requestAiAnswerAction,
} from "@/lib/actions/forum";
import { cn } from "@/lib/utils";

export function ReplyForm({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createReplyAction(postId, text);
          if (!r.ok) return void toast.error(r.error);
          setText("");
          toast.success("Reply posted");
        });
      }}
      className="rounded-2xl border border-border bg-surface p-4"
    >
      <label htmlFor="reply" className="text-sm font-semibold">
        Your answer
      </label>
      <Textarea
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explain step by step. Markdown and $maths$ are supported."
        className="mt-2 min-h-32"
        maxLength={5000}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Be kind and helpful. Answers that get accepted earn you badges.</p>
        <Button type="submit" loading={pending} disabled={text.trim().length < 2}>
          {!pending && <Send />} Post answer
        </Button>
      </div>
    </form>
  );
}

export function AcceptButton({ postId, replyId, accepted }: { postId: string; replyId: string; accepted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={accepted ? "soft" : "ghost"}
      loading={pending}
      onClick={() =>
        start(async () => {
          const ok = await confirmToast(
            accepted
              ? { title: "Remove the accepted mark?", description: "The answer stays; it just isn’t marked as the solution.", confirmLabel: "Remove mark", tone: "danger" }
              : { title: "Accept this answer?", description: "It’s pinned as the solution and its author earns credit.", confirmLabel: "Accept" },
          );
          if (!ok) return;
          const r = await acceptReplyAction(postId, accepted ? null : replyId);
          if (!r.ok) toast.error(r.error);
          else toast.success(accepted ? "Mark removed" : "Answer accepted");
        })
      }
      className={cn(accepted && "bg-success-soft text-success hover:bg-success-soft")}
    >
      {!pending && <BadgeCheck />} {accepted ? "Accepted" : "Accept answer"}
    </Button>
  );
}

export function DeleteButton({ kind, id }: { kind: "post" | "reply"; id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      className="text-muted-foreground hover:text-danger"
      onClick={() =>
        start(async () => {
          const ok = await confirmToast(
            kind === "post"
              ? { title: "Delete this doubt?", description: "All its answers are deleted too. This can’t be undone.", confirmLabel: "Delete", tone: "danger" }
              : { title: "Delete your answer?", description: "This can’t be undone.", confirmLabel: "Delete", tone: "danger" },
          );
          if (!ok) return;
          if (kind === "post") await deletePostAction(id);
          else {
            const r = await deleteReplyAction(id);
            if (!r.ok) toast.error(r.error);
            else toast.success("Answer deleted");
          }
        })
      }
    >
      {!pending && <Trash2 />} Delete
    </Button>
  );
}

export function AskAiButton({ postId }: { postId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="soft"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await requestAiAnswerAction(postId);
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      {!pending && <Sparkles />} {pending ? "AI is writing…" : "Ask AI to answer"}
    </Button>
  );
}

/** After posting with “instant AI answer”, refresh a few times until the answer lands. */
export function AiAnswerPoller({ hasAiReply }: { hasAiReply: boolean }) {
  const router = useRouter();
  const tries = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (hasAiReply) {
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const id = setInterval(() => {
      tries.current += 1;
      if (tries.current > 10) {
        clearInterval(id);
        setGaveUp(true);
        return;
      }
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [hasAiReply, router]);

  if (hasAiReply) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-soft-border bg-brand-soft p-4 text-sm">
      {gaveUp ? (
        <p className="text-muted-foreground">The AI couldn’t answer this one right now — classmates can still help below.</p>
      ) : (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>TestPrep AI is writing an answer…</p>
        </>
      )}
    </div>
  );
}

"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Check,
  Copy,
  History,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, lazy, memo, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/logo";
import { SubjectIcon } from "@/components/subject-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { confirmToast } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteThreadAction } from "@/lib/actions/chat";
import { cn, timeAgo } from "@/lib/utils";

type Thread = { id: string; title: string; updatedAt: string };

// Markdown + KaTeX (~130 KB) loads only when an answer is on screen; a new chat never downloads it up front.
const Markdown = lazy(() => import("@/components/markdown").then((m) => ({ default: m.Markdown })));

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function TutorChat({
  id,
  initialMessages,
  initialPrompt,
  isNew,
  threads: initialThreads,
  userName,
  userImage,
  courseLabel,
  suggestions,
}: {
  courseLabel: string;
  suggestions: { subject: string; label: string; text: string }[];
  id: string;
  initialMessages: UIMessage[];
  initialPrompt?: string;
  isNew: boolean;
  threads: Thread[];
  userName: string;
  userImage: string | null;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const urlSyncedRef = useRef(!isNew);
  const sentInitialRef = useRef(false);

  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat({
    id,
    messages: initialMessages,
    transport: useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []),
    // Batch streamed tokens into ~20 renders a second instead of one per token.
    throttle: 50,
    onFinish: ({ messages: all, message, isError, isAbort }) => {
      // Only a real answer creates/updates a conversation (failed requests aren't saved on the server).
      if (isError || (isAbort && !textOf(message).trim())) return;
      if (!urlSyncedRef.current) {
        urlSyncedRef.current = true;
        window.history.replaceState(null, "", `/tutor/${id}`);
      }
      const first = all.find((m) => m.role === "user");
      setThreads((ts) => {
        const rest = ts.filter((t) => t.id !== id);
        const title = ts.find((t) => t.id === id)?.title ?? (first ? textOf(first).slice(0, 70) : "New conversation");
        return [{ id, title, updatedAt: new Date().toISOString() }, ...rest];
      });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Auto-send a prompt passed via ?q= (from results / dashboard shortcuts)
  useEffect(() => {
    if (!initialPrompt || sentInitialRef.current || initialMessages.length) return;
    sentInitialRef.current = true;
    window.history.replaceState(null, "", "/tutor");
    sendMessage({ text: initialPrompt });
  }, [initialPrompt, initialMessages.length, sendMessage]);

  // Keep the newest message in view while streaming
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || status === "submitted") el.scrollTo({ top: el.scrollHeight, behavior: status === "streaming" ? "auto" : "smooth" });
  }, [messages, status]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (error) clearError();
    sendMessage({ text: t });
    setInput("");
  }

  const errorText =
    error && error.message && error.message.length < 200 && !error.message.trim().startsWith("{")
      ? error.message
      : "Something went wrong while answering. Please try again.";

  const threadList = <ThreadList threads={threads} activeId={id} onDeleted={(tid) => {
    setThreads((ts) => ts.filter((t) => t.id !== tid));
    if (tid === id) router.push("/tutor");
  }} />;

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-surface shadow-soft lg:h-[calc(100dvh-5.5rem)]">
      {/* Threads (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border md:flex">{threadList}</aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Chat history">
                <History />
              </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[70dvh] max-w-sm flex-col p-0">
              <DialogTitle className="sr-only">Chat history</DialogTitle>
              {threadList}
            </DialogContent>
          </Dialog>
          <LogoMark className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">AI Tutor</p>
            <p className="truncate text-xs text-muted-foreground">{courseLabel} · English & Hindi</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/tutor">
              <MessageSquarePlus /> <span className="hidden sm:inline">New chat</span>
            </Link>
          </Button>
        </header>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10">
              <LogoMark className="size-12" />
              <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">Hi {userName}, what shall we learn today?</h2>
              <p className="mt-2 text-muted-foreground">Ask anything from your syllabus — I’ll explain it step by step.</p>
              <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    type="button"
                    onClick={() => submit(s.text)}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-3.5 text-left text-sm transition-colors hover:border-brand/40 hover:bg-brand-soft/50"
                  >
                    {s.subject ? <SubjectIcon subject={s.subject} size="sm" /> : <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-ink" />}
                    <span>
                      <span className="block text-xs font-medium text-muted-foreground">{s.label}</span>
                      <span className="mt-0.5 line-clamp-2">{s.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end gap-3">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] leading-relaxed text-white">
                      {textOf(m)}
                    </div>
                    <Avatar name={userName} src={userImage} size="sm" className="hidden sm:inline-grid" />
                  </div>
                ) : (
                  <AssistantMessage key={m.id} text={textOf(m)} />
                ),
              )}
              {status === "submitted" && (
                <div className="flex gap-3">
                  <LogoMark className="size-8" />
                  <div className="flex items-center gap-1.5 rounded-2xl bg-surface-2 px-4 py-3" aria-label="Tutor is thinking">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm">
                  <p className="flex-1 text-danger">{errorText}</p>
                  <Button size="sm" variant="outline" onClick={() => regenerate()}>
                    <RotateCcw /> Retry
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-border p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-colors focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 4000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Ask any doubt…"
              className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted-foreground/70"
              aria-label="Message"
            />
            {busy ? (
              <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Stop">
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                <ArrowUp />
              </Button>
            )}
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">AI can make mistakes — double-check important facts with your NCERT textbook.</p>
        </footer>
      </section>
    </div>
  );
}

/** Memoised: while an answer streams, only the last message re-renders (earlier ones aren't re-parsed). */
const AssistantMessage = memo(function AssistantMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex gap-3">
      <LogoMark className="size-8" />
      <div className="min-w-0 flex-1">
        <Suspense fallback={<div className="prose-chat whitespace-pre-wrap text-[15px]">{text || "…"}</div>}>
          <Markdown>{text || "…"}</Markdown>
        </Suspense>
        {text && (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-surface-2 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
});

function ThreadList({ threads, activeId, onDeleted }: { threads: Thread[]; activeId: string; onDeleted: (id: string) => void }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <p className="text-sm font-semibold">History</p>
        <Link href="/tutor" className="text-xs font-medium text-brand-ink hover:underline">
          New chat
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {threads.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">Your conversations will appear here.</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id} className="group relative">
                <Link
                  href={`/tutor/${t.id}`}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 pr-9 transition-colors",
                    t.id === activeId ? "bg-brand-soft" : "hover:bg-surface-2",
                  )}
                >
                  <p className={cn("truncate text-sm", t.id === activeId ? "font-medium text-brand-ink" : "text-foreground")}>{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(t.updatedAt)}</p>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirmToast({ title: "Delete this conversation?", description: `“${t.title}” and all its messages are removed for good.`, confirmLabel: "Delete", tone: "danger" });
                    if (!ok) return;
                    await deleteThreadAction(t.id);
                    onDeleted(t.id);
                    toast.success("Conversation deleted");
                  }}
                  className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-surface-3 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

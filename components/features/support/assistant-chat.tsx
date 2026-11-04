"use client";

import { Bot, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { askAssistantAction } from "@/app/support/actions";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "model"; text: string };

/** AI yordamchi bilan suhbat (oyna yopilguncha saqlanadi, oxirgi 12 ta xabar AI'ga yuboriladi). */
export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  function ask(text: string) {
    const q = text.trim();
    if (q.length < 2 || pending) return;
    setError(undefined);
    setQuestion("");
    const history = turns.slice(-12);
    setTurns((t) => [...t, { role: "user", text: q }]);
    start(async () => {
      const res = await askAssistantAction({ question: q, history });
      if (res.answer) setTurns((t) => [...t, { role: "model", text: res.answer! }]);
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3" data-testid="assistant-chat">
      <div className="flex max-h-[45dvh] min-h-40 flex-col gap-2 overflow-y-auto rounded-xl bg-muted/50 p-3">
        {turns.length === 0 ? (
          <div className="flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Bot className="size-4 text-primary" />
              {uz.assistant.intro}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uz.assistant.examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => ask(ex)}
                  className="rounded-full border bg-card px-3 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line",
                turn.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start border bg-card",
              )}
              data-testid={turn.role === "model" ? "assistant-answer" : undefined}
            >
              {turn.text}
            </div>
          ))
        )}
        {pending && (
          <p className="self-start text-sm text-muted-foreground" role="status">
            {uz.assistant.thinking}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={uz.assistant.placeholder}
          aria-label={uz.assistant.placeholder}
          maxLength={1000}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button
          type="submit"
          disabled={pending || question.trim().length < 2}
          aria-label={uz.assistant.ask}
        >
          <Send className="size-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{uz.assistant.disclaimer}</p>
    </div>
  );
}

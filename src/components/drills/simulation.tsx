"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button, Card, CardContent, Alert, Progress, Badge } from "@/components/ui";
import type { Scenario } from "@/content/scenarios";
import { saveSimulation } from "@/app/(app)/drills/actions";
import { cn } from "@/lib/utils";

export function Simulation({ scenario }: { scenario: Scenario }) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof saveSimulation>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = Date.now(); }, []);
  const step = scenario.steps[idx];
  const choice = step?.choices.find((c) => c.id === picks[step.id]);
  const best = step ? Math.max(...step.choices.map((c) => c.points)) : 0;

  function next() {
    setRevealed(false);
    if (idx + 1 < scenario.steps.length) { setIdx(idx + 1); return; }
    start(async () => {
      try { setResult(await saveSimulation(scenario.key, picks, (Date.now() - startedAt.current) / 1000)); }
      catch { setError("Your result couldn't be saved. Check your connection and try again."); }
    });
  }

  if (result) {
    return (
      <Card><CardContent className="pt-6">
        <p className="text-sm text-muted">Your result</p>
        <p className="text-4xl font-semibold text-navy">{result.pct}%</p>
        <p className="text-sm text-muted">{result.score} of {result.max} points · saved to your practice history</p>
        {result.suggestions.length > 0 ? (
          <div className="mt-4"><p className="font-medium">Improvement suggestions</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>
        ) : <Alert tone="success" className="mt-4">Excellent — you chose the safest action at every step.</Alert>}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => { setIdx(0); setPicks({}); setResult(null); startedAt.current = Date.now(); }}>Try again</Button>
          <Link href={`/drills/${scenario.key}?mode=household`} className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm">Run this as a household drill</Link>
          <Link href="/drills" className="inline-flex h-10 items-center px-4 text-sm text-brand-700 underline">All drills</Link>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent className="pt-6">
      <div className="mb-4 flex items-center justify-between text-xs text-muted"><span>Step {idx + 1} of {scenario.steps.length}</span><Badge tone="blue">Practice scenario</Badge></div>
      <Progress value={(idx / scenario.steps.length) * 100} label="Scenario progress" />
      <p className="mt-5 rounded-lg bg-surface p-4 text-sm">{step.situation}</p>
      <fieldset className="mt-4">
        <legend className="font-semibold">{step.prompt}</legend>
        <div className="mt-3 flex flex-col gap-2">
          {step.choices.map((c) => (
            <label key={c.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm",
              revealed && c.points === best ? "border-emerald-400 bg-emerald-50" : revealed && picks[step.id] === c.id ? "border-red-300 bg-red-50" : "border-line has-[:checked]:border-brand-500")}>
              <input type="radio" name={step.id} value={c.id} disabled={revealed} checked={picks[step.id] === c.id} onChange={() => setPicks({ ...picks, [step.id]: c.id })} className="mt-0.5" />{c.text}
            </label>))}
        </div>
      </fieldset>
      {revealed && choice && <Alert tone={choice.points === best ? "success" : "warning"} className="mt-4">{choice.feedback}</Alert>}
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}
      <div className="mt-5">
        {!revealed ? <Button disabled={!picks[step.id]} onClick={() => setRevealed(true)}>Check answer</Button>
          : <Button onClick={next} disabled={pending}>{idx + 1 < scenario.steps.length ? "Next situation" : pending ? "Saving…" : "See results"}</Button>}
      </div>
    </CardContent></Card>
  );
}

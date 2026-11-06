"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";

export interface RepeaterColumn { name: string; label: string; type?: "text" | "select"; options?: { value: string; label: string }[]; width?: string; placeholder?: string; required?: boolean }

/** Editable list of rows; submits as `${prefix}_${col}[]` arrays that the server action zips together. */
export function Repeater({ prefix, columns, initial, addLabel = "Add row", max = 20 }: {
  prefix: string; columns: RepeaterColumn[]; initial: Record<string, string>[]; addLabel?: string; max?: number;
}) {
  const blank = () => Object.fromEntries(columns.map((c) => [c.name, c.options?.[0]?.value ?? ""]));
  const [rows, setRows] = useState<Record<string, string>[]>(initial.length ? initial : [blank()]);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-line bg-surface/50 p-3 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))_auto]" style={{ ["--cols" as string]: columns.length }}>
          {columns.map((c) => {
            const id = `${prefix}-${c.name}-${i}`;
            return (
              <div key={c.name} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-xs font-medium text-muted">{c.label}</label>
                {c.type === "select" ? (
                  <Select id={id} name={`${prefix}_${c.name}[]`} value={row[c.name]} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, [c.name]: e.target.value } : r)))}>
                    {c.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input id={id} name={`${prefix}_${c.name}[]`} value={row[c.name] ?? ""} placeholder={c.placeholder} maxLength={300}
                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, [c.name]: e.target.value } : r)))} />
                )}
              </div>
            );
          })}
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blank()])}><Trash2 /></Button>
          </div>
        </div>
      ))}
      {rows.length < max && <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setRows([...rows, blank()])}><Plus />{addLabel}</Button>}
    </div>
  );
}


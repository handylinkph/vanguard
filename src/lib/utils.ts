import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const php = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(n));

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—";

export const daysBetween = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000);
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysAgoISO = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
export const addDaysISO = (days: number, from = new Date()) => new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10);

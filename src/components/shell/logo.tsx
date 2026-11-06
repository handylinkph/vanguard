import { cn } from "@/lib/utils";
export function Logo({ inverted, className }: { inverted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", inverted ? "text-white" : "text-navy", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <path d="M16 2 4 7v8c0 7.2 5.1 13.4 12 15 6.9-1.6 12-7.8 12-15V7L16 2Z" fill={inverted ? "#ffffff" : "#0b1f3a"} />
        <path d="m10 13 6 9 6-9" fill="none" stroke="#0e9f8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg">Vanguard</span>
    </span>
  );
}

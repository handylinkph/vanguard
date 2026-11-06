import { Home, ClipboardList, Backpack, Gauge, Phone, Users, Wallet, Info, BookOpen, Timer, Sparkles, Map, MessagesSquare, Building2, FileText, Download, Settings, Shield, type LucideIcon } from "lucide-react";
const MAP: Record<string, LucideIcon> = { home: Home, clipboard: ClipboardList, backpack: Backpack, gauge: Gauge, phone: Phone, users: Users, wallet: Wallet, info: Info, book: BookOpen, timer: Timer, sparkles: Sparkles, map: Map, message: MessagesSquare, building: Building2, file: FileText, download: Download, settings: Settings, shield: Shield };
export function NavIcon({ name, className }: { name: string; className?: string }) {
  const I = MAP[name] ?? Home;
  return <I className={className} aria-hidden />;
}

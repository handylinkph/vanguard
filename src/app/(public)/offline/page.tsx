import { OfflineHub } from "@/components/offline/hub";
import { guides } from "@/content/guides";
export const metadata = { title: "Offline access" };
export default function OfflinePage() {
  return <OfflineHub guides={guides.map((g) => ({ key: g.key, title: g.title, tagline: g.tagline }))} />;
}

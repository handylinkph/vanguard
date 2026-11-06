export interface NavItem { href: string; label: string; icon: string }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: "Overview", items: [
    { href: "/dashboard", label: "Home", icon: "home" },
  ] },
  { label: "My Preparedness", items: [
    { href: "/plans", label: "Emergency Plans", icon: "clipboard" },
    { href: "/kits", label: "Emergency Kits", icon: "backpack" },
    { href: "/assessment", label: "Risk Assessment", icon: "gauge" },
    { href: "/contacts", label: "Emergency Contacts", icon: "phone" },
    { href: "/household", label: "Household", icon: "users" },
    { href: "/finance", label: "Financial Preparedness", icon: "wallet" },
  ] },
  { label: "Learn & Practise", items: [
    { href: "/guides", label: "Disaster Information", icon: "info" },
    { href: "/library", label: "Resource Library", icon: "book" },
    { href: "/drills", label: "Drills", icon: "timer" },
    { href: "/assistant", label: "AI Assistant", icon: "sparkles" },
  ] },
  { label: "Connect", items: [
    { href: "/services", label: "Emergency Services", icon: "map" },
    { href: "/community", label: "Community", icon: "message" },
    { href: "/organizations", label: "Businesses & Schools", icon: "building" },
  ] },
  { label: "Records", items: [
    { href: "/incidents", label: "My Incident Records", icon: "file" },
    { href: "/offline", label: "Offline Access", icon: "download" },
    { href: "/settings", label: "Profile & Settings", icon: "settings" },
  ] },
];

export const MOBILE_PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/plans", label: "Plans", icon: "clipboard" },
  { href: "/kits", label: "Kits", icon: "backpack" },
  { href: "/services", label: "Services", icon: "map" },
];

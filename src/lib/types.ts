export interface Profile {
  id: string; full_name: string | null; phone: string | null; region: string | null; city: string | null; barangay: string | null;
  platform_role: "user" | "platform_admin"; disabled: boolean; onboarded: boolean;
  privacy: { share_name_with_groups?: boolean; allow_aggregate_metrics?: boolean };
  created_at: string;
}
export interface Household {
  id: string; name: string; region: string | null; city: string | null; barangay: string | null;
  dwelling_type: string | null; floors: number | null; near_coast: boolean | null; near_river: boolean | null; near_slope: boolean | null;
  notes: string | null; created_by: string;
}
export interface HouseholdMember {
  id: string; household_id: string; user_id: string | null; role: "admin" | "member" | "dependent"; display_name: string;
  relationship: string | null; age_group: "infant" | "child" | "teen" | "adult" | "senior"; needs_assistance: boolean;
  care_notes: string | null; responsibilities: string | null;
}
export interface Contact {
  id: string; owner_id: string; household_id: string | null; name: string; relationship: string | null; phone: string;
  alt_phone: string | null; email: string | null; is_out_of_area: boolean; priority: number; notes: string | null; updated_at: string;
}
export interface PlanSections {
  meeting_places?: { name: string; address?: string; kind: "near" | "far" }[];
  evacuation_destinations?: { name: string; address?: string; route?: string; notes?: string }[];
  responsibilities?: { person: string; task: string }[];
  communication?: { out_of_area_contact?: string; check_in_method?: string; code_words?: string; notes?: string };
  special_considerations?: string;
  notes?: string;
}
export interface Plan {
  id: string; owner_id: string; household_id: string | null; plan_type: "personal" | "household"; hazard: string; title: string;
  status: "draft" | "active" | "archived"; shared_with_household: boolean; sections: PlanSections; current_step: number;
  review_on: string | null; version: number; created_at: string; updated_at: string;
}
export interface PlanItem { id: string; plan_id: string; label: string; phase: "before" | "during" | "after"; done: boolean; assigned_to: string | null; due_on: string | null; sort: number; updated_at: string; version: number }
export interface Kit {
  id: string; owner_id: string; household_id: string | null; name: string; kit_type: "three_day" | "seven_day" | "home" | "go_bag" | "custom";
  days: number; people: { adults: number; children: number; infants: number; seniors: number; pets: number }; needs: string[];
  location_note: string | null; archived: boolean; last_checked_on: string | null; updated_at: string;
}
export interface KitItem {
  id: string; kit_id: string; category: string; name: string; unit: string; qty_needed: number; qty_have: number; packed: boolean;
  essential: boolean; expires_on: string | null; est_unit_cost_php: number | null; notes: string | null; template_key: string | null;
  updated_at: string; version: number;
}
export interface Resource {
  id: string; slug: string; title: string; summary: string; body: string; category: string; hazards: string[]; language: string;
  download_url: string | null; source_name: string; source_url: string | null; reviewed_on: string; review_due_on: string | null;
  published: boolean; updated_at: string;
}
export interface Service {
  id: string; name: string; category: string; phone: string | null; alt_phone: string | null; address: string | null; region: string | null;
  city: string | null; scope: string; lat: number | null; lng: number | null; source_name: string; source_url: string | null;
  verification: "verified" | "unverified"; last_reviewed_on: string; notes: string | null; published: boolean;
}

// Integration tests: real migrations + RLS policies on PostgreSQL 16.
import { afterAll, describe, expect, it } from "vitest";
import { as, createUser, closeDb, rejects, randomUUID, db } from "./helpers";

afterAll(closeDb);

async function makeHousehold(owner: string, name = "Santos Family") {
  const id = randomUUID();
  await as(owner, (q) => q("insert into households (id, name, created_by) values ($1, $2, $3)", [id, name, owner]));
  return id;
}
async function invite(owner: string, hid: string, role = "member") {
  return as(owner, async (q) => (await q("insert into household_invites (household_id, role, created_by) values ($1, $2, $3) returning token", [hid, role, owner])).rows[0].token as string);
}

describe("accounts & profiles", () => {
  it("creates a profile on signup and keeps it private", async () => {
    const a = await createUser("Ana"); const b = await createUser("Ben");
    const own = await as(a, (q) => q("select full_name, platform_role from profiles"));
    expect(own.rows).toEqual([{ full_name: "Ana", platform_role: "user" }]);
    const other = await as(b, (q) => q("select * from profiles where id = $1", [a]));
    expect(other.rowCount).toBe(0);
  });
  it("prevents users from promoting themselves", async () => {
    const a = await createUser();
    await rejects(as(a, (q) => q("update profiles set platform_role = 'platform_admin' where id = $1", [a])), /administrator/);
    await rejects(as(a, (q) => q("update profiles set disabled = true where id = $1", [a])), /administrator/);
  });
});

describe("households", () => {
  it("makes the creator an admin and hides the household from outsiders", async () => {
    const a = await createUser("Ana"); const x = await createUser("Outsider");
    const hid = await makeHousehold(a);
    const m = await as(a, (q) => q("select role from household_members where household_id = $1", [hid]));
    expect(m.rows[0].role).toBe("admin");
    expect((await as(x, (q) => q("select * from households where id = $1", [hid]))).rowCount).toBe(0);
    expect((await as(x, (q) => q("select * from household_members where household_id = $1", [hid]))).rowCount).toBe(0);
  });
  it("lets invited members join via token; anonymous users cannot accept", async () => {
    const a = await createUser(); const b = await createUser("Ben");
    const hid = await makeHousehold(a);
    const token = await invite(a, hid);
    await rejects(as(null, (q) => q("select accept_household_invite($1)", [token])), /permission denied|Sign in/);
    const preview = await as(null, (q) => q("select * from preview_household_invite($1)", [token]));
    expect(preview.rows[0].valid).toBe(true);
    await as(b, (q) => q("select accept_household_invite($1)", [token]));
    expect((await as(b, (q) => q("select name from households where id = $1", [hid]))).rows[0].name).toBe("Santos Family");
    await rejects(as(b, (q) => q("select accept_household_invite($1)", [token])), /already used/);
  });
  it("only admins add dependents; members can't promote themselves", async () => {
    const a = await createUser(); const b = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    await rejects(as(b, (q) => q("insert into household_members (household_id, role, display_name, age_group) values ($1, 'dependent', 'Lola', 'senior')", [hid])), /row-level security/);
    await as(a, (q) => q("insert into household_members (household_id, role, display_name, age_group) values ($1, 'dependent', 'Lola', 'senior')", [hid]));
    await rejects(as(b, (q) => q("update household_members set role = 'admin' where user_id = $1", [b])), /administrators/);
  });
  it("keeps at least one admin while other members remain", async () => {
    const a = await createUser(); const b = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    await rejects(as(a, (q) => q("delete from household_members where household_id = $1 and user_id = $2", [hid, a])), /administrator/);
  });
});

describe("contacts & plans sharing", () => {
  it("separates private and household-shared contacts", async () => {
    const a = await createUser(); const b = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    await as(a, (q) => q("insert into emergency_contacts (owner_id, name, phone) values ($1, 'Private Doc', '0917')", [a]));
    await as(a, (q) => q("insert into emergency_contacts (owner_id, household_id, name, phone) values ($1, $2, 'Tita Rosa', '0918')", [a, hid]));
    const seen = await as(b, (q) => q("select name from emergency_contacts order by name"));
    expect(seen.rows.map((r) => r.name)).toEqual(["Tita Rosa"]);
  });
  it("shares plans only when flagged; members tick items but can't edit the plan", async () => {
    const a = await createUser(); const b = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    const priv = randomUUID(), shared = randomUUID();
    await as(a, async (q) => {
      await q("insert into emergency_plans (id, owner_id, household_id, title, plan_type) values ($1, $2, $3, 'Private', 'household')", [priv, a, hid]);
      await q("insert into emergency_plans (id, owner_id, household_id, title, plan_type, shared_with_household) values ($1, $2, $3, 'Shared', 'household', true)", [shared, a, hid]);
      await q("insert into plan_checklist_items (plan_id, label) values ($1, 'Pack go-bags')", [shared]);
    });
    const plans = await as(b, (q) => q("select title from emergency_plans"));
    expect(plans.rows.map((r) => r.title)).toEqual(["Shared"]);
    const upd = await as(b, (q) => q("update plan_checklist_items set done = true where plan_id = $1 returning version", [shared]));
    expect(upd.rows[0].version).toBe(2);
    const edit = await as(b, (q) => q("update emergency_plans set title = 'Hacked' where id = $1", [shared]));
    expect(edit.rowCount).toBe(0);
    await rejects(as(b, (q) => q("insert into plan_checklist_items (plan_id, label) values ($1, 'x')", [shared])), /row-level security/);
  });
  it("supports optimistic concurrency via version (offline sync)", async () => {
    const a = await createUser();
    const pid = randomUUID();
    await as(a, (q) => q("insert into emergency_plans (id, owner_id, title) values ($1, $2, 'P')", [pid, a]));
    const item = await as(a, async (q) => (await q("insert into plan_checklist_items (plan_id, label) values ($1, 'x') returning id, version", [pid])).rows[0]);
    await as(a, (q) => q("update plan_checklist_items set done = true where id = $1 and version = $2", [item.id, item.version]));
    const stale = await as(a, (q) => q("update plan_checklist_items set done = false where id = $1 and version = $2", [item.id, item.version]));
    expect(stale.rowCount).toBe(0);
  });
});

describe("kits", () => {
  it("lets household members update shared kit quantities", async () => {
    const a = await createUser(); const b = await createUser(); const x = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    const kid = randomUUID();
    await as(a, (q) => q("insert into kits (id, owner_id, household_id, name, kit_type) values ($1, $2, $3, 'Home kit', 'three_day')", [kid, a, hid]));
    await as(a, (q) => q("insert into kit_items (kit_id, category, name, qty_needed) values ($1, 'Water', 'Water', 12)", [kid]));
    const r = await as(b, (q) => q("update kit_items set qty_have = 6 where kit_id = $1", [kid]));
    expect(r.rowCount).toBe(1);
    expect((await as(x, (q) => q("select * from kit_items where kit_id = $1", [kid]))).rowCount).toBe(0);
  });
});

describe("personal incident records", () => {
  it("are visible only to the owner — not household members or platform admins", async () => {
    const a = await createUser(); const b = await createUser(); const admin = await createUser("Admin", { admin: true });
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    await as(a, (q) => q("insert into incident_records (user_id, category, title, occurred_on) values ($1, 'flood', 'Kitchen flooded', '2026-10-01')", [a]));
    expect((await as(a, (q) => q("select * from incident_records"))).rowCount).toBe(1);
    expect((await as(b, (q) => q("select * from incident_records"))).rowCount).toBe(0);
    expect((await as(admin, (q) => q("select * from incident_records"))).rowCount).toBe(0);
    await rejects(as(b, (q) => q("insert into incident_records (user_id, category, title, occurred_on) values ($1, 'flood', 'x', '2026-10-01')", [a])), /row-level security/);
  });
  it("restricts storage objects to the owner's folder", async () => {
    const a = await createUser(); const b = await createUser();
    await as(a, (q) => q("insert into storage.objects (bucket_id, name, owner) values ('incident-files', $1, $2)", [`${a}/inc/photo.jpg`, a]));
    await rejects(as(b, (q) => q("insert into storage.objects (bucket_id, name, owner) values ('incident-files', $1, $2)", [`${a}/inc/evil.jpg`, b])), /row-level security/);
    expect((await as(b, (q) => q("select * from storage.objects where name like $1", [`${a}/%`]))).rowCount).toBe(0);
  });
});

describe("community groups", () => {
  it("enforces membership, coordinator-only announcements and moderation scope", async () => {
    const owner = await createUser("Org"); const mem = await createUser("Mem"); const x = await createUser(); const admin = await createUser("Mod", { admin: true });
    const gid = randomUUID();
    await as(owner, (q) => q("insert into groups (id, name, created_by) values ($1, 'Purok 3', $2)", [gid, owner]));
    const token = await as(owner, async (q) => (await q("insert into group_invites (group_id, created_by) values ($1, $2) returning token", [gid, owner])).rows[0].token);
    await as(mem, (q) => q("select accept_group_invite($1)", [token]));
    expect((await as(x, (q) => q("select * from groups where id = $1", [gid]))).rowCount).toBe(0);
    await rejects(as(mem, (q) => q("insert into group_posts (group_id, author_id, kind, title, body) values ($1, $2, 'announcement', 't', 'b')", [gid, mem])), /row-level security/);
    const postId = await as(mem, async (q) => (await q("insert into group_posts (group_id, author_id, kind, title, body) values ($1, $2, 'discussion', 'Hello', 'Hi all') returning id", [gid, mem])).rows[0].id);
    const otherPost = await as(owner, async (q) => (await q("insert into group_posts (group_id, author_id, kind, title, body) values ($1, $2, 'announcement', 'Drill Saturday', 'Be there') returning id", [gid, owner])).rows[0].id);
    // Admin cannot read private group posts...
    expect((await as(admin, (q) => q("select * from group_posts where group_id = $1", [gid]))).rowCount).toBe(0);
    // ...until one is reported, and then only that one.
    await as(owner, (q) => q("insert into content_reports (group_id, reporter_id, target_type, target_id, reason) values ($1, $2, 'post', $3, 'Spam link')", [gid, owner, postId]));
    const visible = await as(admin, (q) => q("select id from group_posts where group_id = $1", [gid]));
    expect(visible.rows.map((r) => r.id)).toEqual([postId]);
    expect(visible.rows.map((r) => r.id)).not.toContain(otherPost);
    const rid = await as(admin, async (q) => (await q("select report_id from admin_reported_content()")).rows[0].report_id);
    await as(admin, (q) => q("select admin_resolve_report($1, 'hide')", [rid]));
    expect((await as(x, (q) => q("select * from group_posts where id = $1", [postId]))).rowCount).toBe(0);
    const hidden = await as(owner, (q) => q("select hidden from group_posts where id = $1", [postId]));
    expect(hidden.rows[0].hidden).toBe(true);
    const audit = await as(admin, (q) => q("select action from audit_logs where action = 'moderation.hide'"));
    expect(audit.rowCount).toBeGreaterThan(0);
  });
  it("prevents owner role takeover", async () => {
    const owner = await createUser(); const mem = await createUser();
    const gid = randomUUID();
    await as(owner, (q) => q("insert into groups (id, name, created_by) values ($1, 'Group G', $2)", [gid, owner]));
    const token = await as(owner, async (q) => (await q("insert into group_invites (group_id, created_by) values ($1, $2) returning token", [gid, owner])).rows[0].token);
    await as(mem, (q) => q("select accept_group_invite($1)", [token]));
    await as(owner, (q) => q("update group_members set role = 'coordinator' where group_id = $1 and user_id = $2", [gid, mem]));
    await rejects(as(mem, (q) => q("update group_members set role = 'owner' where group_id = $1 and user_id = $2", [gid, mem])), /Ownership/);
  });
});

describe("organizations", () => {
  it("separates admin and member permissions and honours suspension", async () => {
    const a = await createUser(); const m = await createUser(); const admin = await createUser("Admin", { admin: true });
    const oid = randomUUID();
    await as(a, (q) => q("insert into organizations (id, name, org_type, created_by) values ($1, 'Sample School', 'school', $2)", [oid, a]));
    const token = await as(a, async (q) => (await q("insert into org_invites (org_id, created_by) values ($1, $2) returning token", [oid, a])).rows[0].token);
    await as(m, (q) => q("select accept_org_invite($1)", [token]));
    await as(a, (q) => q("insert into org_facilities (org_id, name) values ($1, 'Main building')", [oid]));
    expect((await as(m, (q) => q("select * from org_facilities"))).rowCount).toBe(1);
    await rejects(as(m, (q) => q("insert into org_facilities (org_id, name) values ($1, 'x')", [oid])), /row-level security/);
    await rejects(as(a, (q) => q("update organizations set status = 'suspended' where id = $1", [oid])), /platform administrators/);
    await rejects(as(a, (q) => q("select admin_set_org_status($1, 'suspended')", [oid])), /Not authorized/);
    await as(admin, (q) => q("select admin_set_org_status($1, 'suspended')", [oid]));
    expect((await as(m, (q) => q("select * from org_facilities"))).rowCount).toBe(0);
    // Platform admin cannot read the org's plan contents.
    expect((await as(admin, (q) => q("select * from org_facilities"))).rowCount).toBe(0);
  });
});

describe("administration", () => {
  it("restricts admin functions and exposes aggregates only", async () => {
    const u = await createUser(); const admin = await createUser("Admin", { admin: true });
    await rejects(as(u, (q) => q("select admin_metrics()")), /Not authorized/);
    await rejects(as(u, (q) => q("select * from admin_list_users()")), /Not authorized/);
    const m = await as(admin, async (q) => (await q("select admin_metrics() as m")).rows[0].m as Record<string, number>);
    expect(m.users_total).toBeGreaterThan(1);
    expect(m).toHaveProperty("kit_items_ready_pct");
    expect((await as(admin, (q) => q("select * from households"))).rowCount).toBe(0);
    expect((await as(admin, (q) => q("select * from emergency_plans"))).rowCount).toBe(0);
    expect((await as(admin, (q) => q("select * from savings_goals"))).rowCount).toBe(0);
  });
  it("manages roles with an audit trail and no self-modification", async () => {
    const u = await createUser(); const admin = await createUser("Admin", { admin: true });
    await rejects(as(admin, (q) => q("select admin_set_user($1, 'user', false)", [admin])), /own role/);
    await as(admin, (q) => q("select admin_set_user($1, 'user', true)", [u]));
    const prof = await (await db()).query("select disabled from profiles where id = $1", [u]);
    expect(prof.rows[0].disabled).toBe(true);
    const audit = await as(admin, (q) => q("select * from audit_logs where action = 'admin.set_user' and target_id = $1", [u]));
    expect(audit.rowCount).toBe(1);
    await rejects(as(u, (q) => q("select * from audit_logs")).then((r) => { if (r.rowCount === 0) throw new Error("hidden"); }), /hidden/);
  });
  it("lets anyone read published content but only admins manage it (audited)", async () => {
    const u = await createUser(); const admin = await createUser("Admin", { admin: true });
    const pub = await as(null, (q) => q("select count(*)::int as n from resources"));
    expect(pub.rows[0].n).toBe(12);
    await rejects(as(u, (q) => q("insert into resources (slug, title, summary, category, source_name, reviewed_on) values ('abc-def', 'Title', 's', 'guide', 'src', '2026-01-01')")), /row-level security/);
    await as(admin, (q) => q("insert into resources (slug, title, summary, category, source_name, reviewed_on) values ('draft-one', 'Draft', 's', 'guide', 'src', '2026-01-01')"));
    expect((await as(null, (q) => q("select * from resources where slug = 'draft-one'"))).rowCount).toBe(0);
    expect((await as(admin, (q) => q("select * from audit_logs where target_type = 'resources' and action = 'insert'"))).rowCount).toBeGreaterThan(0);
  });
});

describe("privacy controls", () => {
  it("exports only the caller's own data", async () => {
    const a = await createUser("Exp A"); const b = await createUser("Exp B");
    await as(b, (q) => q("insert into savings_goals (user_id, name, target_php) values ($1, 'B fund', 1000)", [b]));
    await as(a, (q) => q("insert into savings_goals (user_id, name, target_php) values ($1, 'A fund', 5000)", [a]));
    const e = await as(a, async (q) => (await q("select my_data_export() as e")).rows[0].e as Record<string, unknown[]>);
    expect((e.savings_goals as { name: string }[]).map((g) => g.name)).toEqual(["A fund"]);
  });
  it("account deletion removes personal data but keeps shared households for others", async () => {
    const a = await createUser(); const b = await createUser();
    const hid = await makeHousehold(a);
    { const t = await invite(a, hid, "admin"); await as(b, (q) => q("select accept_household_invite($1)", [t])); }
    await as(a, (q) => q("insert into incident_records (user_id, category, title, occurred_on) values ($1, 'fire', 'x', '2026-01-01')", [a]));
    const c = await db();
    await c.query("delete from auth.users where id = $1", [a]);
    expect((await c.query("select * from incident_records where user_id = $1", [a])).rowCount).toBe(0);
    expect((await as(b, (q) => q("select * from households where id = $1", [hid]))).rowCount).toBe(1);
  });
});

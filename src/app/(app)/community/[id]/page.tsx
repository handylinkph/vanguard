import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone, MessageSquare, ListChecks, CalendarDays, Users, Flag, Trash2, CheckSquare, Square } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Field, Input, Select, Textarea, Alert, EmptyState } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton, FieldError } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";
import * as A from "../actions";
import { fmtDate } from "@/lib/utils";

const TABS = [
  { key: "posts", label: "Announcements & discussion", icon: Megaphone },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "checklist", label: "Shared checklist", icon: CheckSquare },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "members", label: "Members", icon: Users },
];

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params; const { tab = "posts" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: group } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  if (!group) notFound();
  const { data: members } = await supabase.from("group_members").select("user_id, role, display_name, joined_at").eq("group_id", id).order("joined_at");
  const me = (members ?? []).find((m) => m.user_id === user.id);
  if (!me) notFound();
  const isCoord = me.role === "owner" || me.role === "coordinator";
  const nameOf = (uid: string | null) => (members ?? []).find((m) => m.user_id === uid)?.display_name ?? "Former member";
  const suspended = group.status !== "active";

  const tabLink = (t: (typeof TABS)[number]) => (
    <Link key={t.key} href={`/community/${id}?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${tab === t.key ? "bg-navy text-white" : "border border-line bg-white"}`}><t.icon className="size-4" />{t.label}</Link>
  );

  return (
    <>
      <PageHeader title={group.name} eyebrow={`Preparedness group${group.area ? ` · ${group.area}` : ""}`} description={group.description ?? undefined}
        actions={<Badge tone={isCoord ? "navy" : "neutral"}>You: {me.role}</Badge>} />
      {suspended && <Alert tone="error" className="mb-4">This group has been suspended by platform moderators. Content is read-only.</Alert>}
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Group sections">{TABS.map(tabLink)}{isCoord && tabLink({ key: "manage", label: "Manage", icon: Flag })}</nav>

      {tab === "posts" && <Posts groupId={id} isCoord={isCoord} userId={user.id} nameOf={nameOf} suspended={suspended} />}
      {tab === "tasks" && <Tasks groupId={id} isCoord={isCoord} userId={user.id} members={members ?? []} nameOf={nameOf} />}
      {tab === "checklist" && <Checklist groupId={id} isCoord={isCoord} nameOf={nameOf} />}
      {tab === "events" && <Events groupId={id} isCoord={isCoord} />}
      {tab === "members" && (
        <Card><CardHeader><CardTitle>Members ({members?.length})</CardTitle><p className="text-sm text-muted">Only display names are shared with the group. Household details stay private.</p></CardHeader>
          <CardContent><ul className="divide-y divide-line">{(members ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>{m.display_name}{m.user_id === user.id && " (you)"} <Badge tone={m.role === "member" ? "neutral" : "navy"}>{m.role}</Badge></span>
              <span className="flex gap-1">
                {isCoord && m.role !== "owner" && m.user_id !== user.id && <>
                  <InlineAction action={A.setGroupMemberRole} hidden={{ group_id: id, user_id: m.user_id, role: m.role === "coordinator" ? "member" : "coordinator" }}><Button size="sm" variant="ghost">{m.role === "coordinator" ? "Make member" : "Make coordinator"}</Button></InlineAction>
                  <InlineAction action={A.removeGroupMember} hidden={{ group_id: id, user_id: m.user_id }} confirm={`Remove ${m.display_name}?`}><Button size="sm" variant="ghost" className="text-red-700">Remove</Button></InlineAction>
                </>}
                {m.user_id === user.id && m.role !== "owner" && <InlineAction action={A.removeGroupMember} hidden={{ group_id: id, user_id: m.user_id }} confirm="Leave this group?"><Button size="sm" variant="ghost">Leave group</Button></InlineAction>}
              </span>
            </li>))}</ul></CardContent></Card>
      )}
      {tab === "manage" && isCoord && <Manage groupId={id} group={group} nameOf={nameOf} />}
    </>
  );
}

async function Posts({ groupId, isCoord, userId, nameOf, suspended }: { groupId: string; isCoord: boolean; userId: string; nameOf: (u: string | null) => string; suspended: boolean }) {
  const { supabase } = await requireUser();
  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase.from("group_posts").select("*").eq("group_id", groupId).order("kind").order("created_at", { ascending: false }).limit(50),
    supabase.from("group_comments").select("*").eq("group_id", groupId).order("created_at"),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {(posts ?? []).length === 0 && <EmptyState icon={<MessageSquare />} title="No posts yet" description="Start a discussion about your group's preparedness." />}
        {(posts ?? []).map((p) => (
          <Card key={p.id} className={p.kind === "announcement" ? "border-brand-100 bg-brand-50/40" : ""}><CardContent className="pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">{p.kind === "announcement" ? <Badge tone="navy"><Megaphone className="size-3" />Announcement</Badge> : <Badge>Discussion</Badge>}
                {p.hidden && <Badge tone="red">Hidden by moderator</Badge>}<span className="text-xs text-muted">{nameOf(p.author_id)} · {fmtDate(p.created_at)}</span></div>
              <div className="flex gap-1">
                {(p.author_id === userId || isCoord) && <InlineAction action={A.deletePost} hidden={{ id: p.id, group_id: groupId, type: "post" }} confirm="Delete this post?"><Button variant="ghost" size="icon" aria-label="Delete post"><Trash2 /></Button></InlineAction>}
              </div>
            </div>
            <h3 className="mt-2 font-semibold">{p.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
            <ul className="mt-3 flex flex-col gap-2 border-l-2 border-line pl-3">{(comments ?? []).filter((c) => c.post_id === p.id).map((c) => (
              <li key={c.id} className="text-sm"><span className="font-medium">{nameOf(c.author_id)}</span> <span className="text-xs text-muted">{fmtDate(c.created_at)}</span>{c.hidden && <Badge tone="red" className="ml-1">Hidden</Badge>}
                <p className="whitespace-pre-wrap">{c.body}</p>
                <div className="flex gap-3 text-xs">
                  {(c.author_id === userId || isCoord) && <InlineAction action={A.deletePost} hidden={{ id: c.id, group_id: groupId, type: "comment" }}><button className="text-muted hover:text-red-700">Delete</button></InlineAction>}
                  {c.author_id !== userId && <ReportForm groupId={groupId} type="comment" id={c.id} />}
                </div></li>))}</ul>
            <div className="mt-3 flex flex-wrap items-start gap-3">
              {!suspended && <ActionForm action={A.createComment} resetOnSuccess className="flex flex-1 gap-2">
                <input type="hidden" name="group_id" value={groupId} /><input type="hidden" name="post_id" value={p.id} />
                <label htmlFor={`c-${p.id}`} className="sr-only">Comment</label><Input id={`c-${p.id}`} name="body" placeholder="Write a comment" maxLength={2000} required />
                <SubmitButton size="sm" variant="outline">Reply</SubmitButton></ActionForm>}
              {p.author_id !== userId && <ReportForm groupId={groupId} type="post" id={p.id} />}
            </div>
          </CardContent></Card>))}
      </div>
      {!suspended && <Card className="self-start"><CardHeader><CardTitle>New post</CardTitle></CardHeader><CardContent>
        <ActionForm action={A.createPost} resetOnSuccess className="flex flex-col gap-3">
          <input type="hidden" name="group_id" value={groupId} />
          <Field label="Type" htmlFor="pk"><Select id="pk" name="kind"><option value="discussion">Discussion</option>{isCoord && <option value="announcement">Announcement (coordinators)</option>}</Select></Field>
          <Field label="Title" htmlFor="pt"><Input id="pt" name="title" required maxLength={200} /><FieldError name="title" /></Field>
          <Field label="Message" htmlFor="pb"><Textarea id="pb" name="body" required maxLength={5000} /><FieldError name="body" /></Field>
          <p className="text-xs text-muted">Be respectful. Don&apos;t share others&apos; personal information. Posts are not monitored in real time — never use them to request rescue.</p>
          <SubmitButton size="sm">Post</SubmitButton>
        </ActionForm></CardContent></Card>}
    </div>
  );
}

function ReportForm({ groupId, type, id }: { groupId: string; type: "post" | "comment"; id: string }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted hover:text-red-700"><Flag className="mr-1 inline size-3" />Report</summary>
      <ActionForm action={A.reportContent} className="mt-2 flex gap-2">
        <input type="hidden" name="group_id" value={groupId} /><input type="hidden" name="target_type" value={type} /><input type="hidden" name="target_id" value={id} />
        <label htmlFor={`r-${id}`} className="sr-only">Reason</label><Input id={`r-${id}`} name="reason" placeholder="Reason" required maxLength={500} className="h-8" />
        <SubmitButton size="sm" variant="outline">Send</SubmitButton>
      </ActionForm>
    </details>
  );
}

async function Tasks({ groupId, isCoord, userId, members, nameOf }: { groupId: string; isCoord: boolean; userId: string; members: { user_id: string; display_name: string }[]; nameOf: (u: string | null) => string }) {
  const { supabase } = await requireUser();
  const { data: tasks } = await supabase.from("group_tasks").select("*").eq("group_id", groupId).order("status").order("due_on", { nullsFirst: false });
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Group tasks</CardTitle></CardHeader><CardContent>
        {(tasks ?? []).length === 0 ? <p className="text-sm text-muted">No tasks yet.</p> : (
          <ul className="divide-y divide-line">{tasks!.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div><p className={`font-medium ${t.status === "done" ? "line-through text-muted" : ""}`}>{t.title}</p>
                <p className="text-xs text-muted">{t.assigned_to ? `Assigned to ${nameOf(t.assigned_to)}` : "Unassigned"}{t.due_on ? ` · due ${fmtDate(t.due_on)}` : ""}</p>
                {t.description && <p className="text-xs">{t.description}</p>}</div>
              <div className="flex items-center gap-1">
                <Badge tone={t.status === "done" ? "green" : t.status === "in_progress" ? "blue" : "neutral"}>{t.status.replace("_", " ")}</Badge>
                {(isCoord || t.assigned_to === userId) && t.status !== "done" && <InlineAction action={A.setTaskStatus} hidden={{ id: t.id, group_id: groupId, status: t.status === "open" ? "in_progress" : "done" }}><Button size="sm" variant="outline">{t.status === "open" ? "Start" : "Mark done"}</Button></InlineAction>}
                {isCoord && <InlineAction action={A.deleteTask} hidden={{ id: t.id, group_id: groupId }}><Button size="icon" variant="ghost" aria-label="Delete task"><Trash2 /></Button></InlineAction>}
              </div>
            </li>))}</ul>)}
      </CardContent></Card>
      {isCoord && <Card className="self-start"><CardHeader><CardTitle>Add task</CardTitle></CardHeader><CardContent>
        <ActionForm action={A.saveTask} resetOnSuccess className="flex flex-col gap-3">
          <input type="hidden" name="group_id" value={groupId} />
          <Field label="Task" htmlFor="tt"><Input id="tt" name="title" required maxLength={200} /></Field>
          <Field label="Assign to" htmlFor="ta"><Select id="ta" name="assigned_to"><option value="">Unassigned</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</Select></Field>
          <Field label="Due" htmlFor="td"><Input id="td" name="due_on" type="date" /></Field>
          <Field label="Details" htmlFor="tde"><Textarea id="tde" name="description" maxLength={1000} className="min-h-16" /></Field>
          <SubmitButton size="sm">Add task</SubmitButton>
        </ActionForm></CardContent></Card>}
    </div>
  );
}

async function Checklist({ groupId, isCoord, nameOf }: { groupId: string; isCoord: boolean; nameOf: (u: string | null) => string }) {
  const { supabase } = await requireUser();
  const { data: items } = await supabase.from("group_checklist_items").select("*").eq("group_id", groupId).order("sort").order("created_at");
  const done = (items ?? []).filter((i) => i.done).length;
  return (
    <Card><CardHeader><CardTitle>Shared preparedness checklist</CardTitle><p className="text-sm text-muted">{done} of {items?.length ?? 0} complete — any member can tick items.</p></CardHeader><CardContent>
      <ul className="flex flex-col gap-2">{(items ?? []).map((i) => (
        <li key={i.id}><InlineAction action={A.toggleGroupChecklist} hidden={{ id: i.id, group_id: groupId, done: String(i.done) }}>
          <button className="flex items-center gap-2 text-left text-sm" aria-pressed={i.done}>{i.done ? <CheckSquare className="size-5 text-accent" /> : <Square className="size-5 text-muted" />}
            <span className={i.done ? "text-muted line-through" : ""}>{i.label}</span>{i.done && i.done_by && <span className="text-xs text-muted">— {nameOf(i.done_by)}</span>}</button>
        </InlineAction></li>))}</ul>
      {isCoord && <ActionForm action={A.addGroupChecklist} resetOnSuccess className="mt-4 flex gap-2"><input type="hidden" name="group_id" value={groupId} />
        <label htmlFor="gcl" className="sr-only">New item</label><Input id="gcl" name="label" required maxLength={200} placeholder="New checklist item" /><SubmitButton size="sm">Add</SubmitButton></ActionForm>}
    </CardContent></Card>
  );
}

async function Events({ groupId, isCoord }: { groupId: string; isCoord: boolean }) {
  const { supabase } = await requireUser();
  const { data: events } = await supabase.from("group_events").select("*").eq("group_id", groupId).order("starts_at");
  const now = new Date().toISOString();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Scheduled preparedness events</CardTitle></CardHeader><CardContent>
        {(events ?? []).length === 0 ? <p className="text-sm text-muted">No events scheduled.</p> : (
          <ul className="divide-y divide-line">{events!.map((e) => (
            <li key={e.id} className={`flex items-start justify-between gap-2 py-3 text-sm ${e.starts_at < now ? "opacity-60" : ""}`}>
              <div><p className="font-medium">{e.title} <Badge tone="blue">{e.kind}</Badge></p>
                <p className="text-xs text-muted">{new Date(e.starts_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}{e.location_text ? ` · ${e.location_text}` : ""}</p>
                {e.description && <p className="mt-1">{e.description}</p>}</div>
              {isCoord && <InlineAction action={A.deleteEvent} hidden={{ id: e.id, group_id: groupId }}><Button size="icon" variant="ghost" aria-label="Delete event"><Trash2 /></Button></InlineAction>}
            </li>))}</ul>)}
      </CardContent></Card>
      {isCoord && <Card className="self-start"><CardHeader><CardTitle>Schedule an event</CardTitle></CardHeader><CardContent>
        <ActionForm action={A.saveEvent} resetOnSuccess className="flex flex-col gap-3">
          <input type="hidden" name="group_id" value={groupId} />
          <Field label="Title" htmlFor="et"><Input id="et" name="title" required maxLength={200} placeholder="Community earthquake drill" /></Field>
          <Field label="Type" htmlFor="ek"><Select id="ek" name="kind"><option value="drill">Drill</option><option value="meeting">Meeting</option><option value="training">Training</option><option value="activity">Activity</option></Select></Field>
          <Field label="Date & time (PH time)" htmlFor="es"><Input id="es" name="starts_at" type="datetime-local" required /></Field>
          <Field label="Location" htmlFor="el"><Input id="el" name="location_text" maxLength={200} /></Field>
          <Field label="Details" htmlFor="ed"><Textarea id="ed" name="description" maxLength={2000} className="min-h-16" /></Field>
          <SubmitButton size="sm">Schedule</SubmitButton>
        </ActionForm></CardContent></Card>}
    </div>
  );
}

async function Manage({ groupId, group, nameOf }: { groupId: string; group: { id: string; name: string; description: string | null; area: string | null }; nameOf: (u: string | null) => string }) {
  const { supabase } = await requireUser();
  const [{ data: invites }, { data: reports }] = await Promise.all([
    supabase.from("group_invites").select("*").eq("group_id", groupId).gt("expires_at", new Date().toISOString()),
    supabase.from("content_reports").select("*").eq("group_id", groupId).eq("status", "open").order("created_at", { ascending: false }),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Invitation links</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
        <ActionForm action={A.createGroupInvite} className="flex items-end gap-2"><input type="hidden" name="group_id" value={groupId} />
          <Field label="Max uses" htmlFor="mu"><Input id="mu" name="max_uses" type="number" min={1} max={500} defaultValue={25} className="w-28" /></Field><SubmitButton size="sm">Create link</SubmitButton></ActionForm>
        {(invites ?? []).map((i) => <div key={i.id} className="flex items-center justify-between rounded-lg border border-line p-2 text-xs"><span>{i.uses}/{i.max_uses} used · expires {fmtDate(i.expires_at)}</span><CopyButton text={`/invite/group/${i.token}`} /></div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Reported content ({reports?.length ?? 0})</CardTitle></CardHeader><CardContent>
        {(reports ?? []).length === 0 ? <p className="text-sm text-muted">No open reports.</p> : <ul className="flex flex-col gap-2">{reports!.map((r) => (
          <li key={r.id} className="rounded-lg border border-line p-3 text-sm"><p><Badge tone="amber">{r.target_type}</Badge> reported by {nameOf(r.reporter_id)}: “{r.reason}”</p>
            <div className="mt-2 flex gap-2">
              <InlineAction action={A.resolveReport} hidden={{ id: r.id, action: "hide", group_id: groupId }}><Button size="sm" variant="destructive">Hide content</Button></InlineAction>
              <InlineAction action={A.resolveReport} hidden={{ id: r.id, action: "dismiss", group_id: groupId }}><Button size="sm" variant="outline">Dismiss</Button></InlineAction>
            </div></li>))}</ul>}
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Group details</CardTitle></CardHeader><CardContent>
        <ActionForm action={A.updateGroup} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={group.id} />
          <Field label="Name" htmlFor="mn"><Input id="mn" name="name" defaultValue={group.name} maxLength={120} /></Field>
          <Field label="Area" htmlFor="ma"><Input id="ma" name="area" defaultValue={group.area ?? ""} maxLength={120} /></Field>
          <Field label="Description" htmlFor="md" className="sm:col-span-2"><Textarea id="md" name="description" defaultValue={group.description ?? ""} maxLength={2000} /></Field>
          <SubmitButton size="sm" className="self-start">Save</SubmitButton></ActionForm>
      </CardContent></Card>
    </div>
  );
}

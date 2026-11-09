// SANTECHNITAS PRO · API lygio patikra (naudotojo užklausos prieš PostgREST su RLS).
// Reikia vietinės PostgREST 12.x ir testų DB (žr. docs/DUOMENU-BAZE.md "Testai"). Nenaudoti prieš gamybinį Supabase.
import http from "node:http";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Proxy: /rest/v1/* -> PostgREST (kaip Supabase)
const proxy = http.createServer((req, res) => {
  const p = http.request({ host: "127.0.0.1", port: 3001, path: req.url.replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: "127.0.0.1:3001" } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  req.pipe(p);
}).listen(3002);

const mk = (who) => createClient("http://127.0.0.1:3002", "anon", { global: { headers: { Authorization: `Bearer ${fs.readFileSync(`/tmp/pgrst/${who}.jwt`, "utf8")}` } }, auth: { persistSession: false, autoRefreshToken: false } });
const W = mk("W");
let fails = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}: ${name}${cond ? "" : " " + extra}`); if (!cond) fails++; };
const me = "00000000-0000-0000-0000-0000000000a1";
const TASK_SELECT = "id, title, description, scheduled_date, status, project:projects(id, name, address, order_no), task_checklist_items(id, title, is_done, position)";

let r = await W.from("tasks").select(TASK_SELECT).eq("assigned_to", me).or("status.neq.done,scheduled_date.gte.2026-10-01").order("scheduled_date", { ascending: true, nullsFirst: false }).limit(300);
check("užduočių sąrašo užklausa (or + embed + order)", !r.error && r.data.length === 1 && r.data[0].project?.name === "DTS montavimas" && r.data[0].task_checklist_items.length === 1, JSON.stringify(r.error));

r = await W.from("tasks").select(TASK_SELECT).eq("assigned_to", me).or("scheduled_date.is.null,and(scheduled_date.gte.2026-07-01,scheduled_date.lte.2027-12-01)").limit(500);
check("kalendoriaus užklausa (or su and)", !r.error && r.data.length === 1, JSON.stringify(r.error));

r = await W.from("tasks").select("project:projects(id, name, address)").eq("assigned_to", me).not("project_id", "is", null);
check("mano objektai", !r.error && r.data[0]?.project?.id, JSON.stringify(r.error));

r = await W.from("notes").select("id, body, is_done").eq("author_id", me).order("created_at", { ascending: false }).limit(15);
check("mano pastabos", !r.error && r.data.length >= 1, JSON.stringify(r.error));

r = await W.from("material_requests").select("id, created_at, comment, project:projects(name), items:material_request_items(id, material_name, quantity, unit, status)").eq("employee_id", me).order("created_at", { ascending: false }).limit(10);
check("mano medžiagų prašymai (embed su alias)", !r.error && r.data.length >= 1 && r.data[0].items.length >= 1, JSON.stringify(r.error));

// Pertvarkymai
let t = await W.from("task_checklist_items").update({ is_done: false }).eq("id", (await W.from("task_checklist_items").select("id")).data[0].id).select("id");
check("punkto žymėjimas", !t.error && t.data.length === 1, JSON.stringify(t.error));
t = await W.from("tasks").update({ scheduled_date: "2026-12-24", status: "planned" }).eq("id", "20000000-0000-0000-0000-000000000001").select("id");
check("darbo perkėlimas ir grąžinimas į vykdomus", !t.error && t.data.length === 1, JSON.stringify(t.error));

// Darbo laiko ciklas
const company = (await W.from("company_members").select("company_id").eq("user_id", me).eq("status", "active")).data[0].company_id;
let open = await W.from("time_entries").select("id").eq("user_id", me).is("ended_at", null).maybeSingle();
check("pradžioje neužbaigto įrašo nėra", !open.error && open.data === null, JSON.stringify(open));
const started = new Date(Date.now() - 90 * 60000).toISOString();
let ins = await W.from("time_entries").insert({ company_id: company, user_id: me, started_at: started });
check("darbo pradžia", !ins.error, JSON.stringify(ins.error));
ins = await W.from("time_entries").insert({ company_id: company, user_id: me, started_at: new Date().toISOString() });
check("antra pradžia atmetama (23505)", ins.error?.code === "23505", JSON.stringify(ins.error));
open = await W.from("time_entries").select("id, started_at").eq("user_id", me).is("ended_at", null).maybeSingle();
check("neužbaigtas įrašas randamas", !!open.data?.id);
let br = await W.from("breaks").insert({ company_id: company, time_entry_id: open.data.id, started_at: new Date(Date.now() - 30 * 60000).toISOString() });
check("pertrauka", !br.error, JSON.stringify(br.error));
br = await W.from("breaks").update({ ended_at: new Date(Date.now() - 20 * 60000).toISOString() }).eq("time_entry_id", open.data.id).is("ended_at", null);
check("pertraukos pabaiga", !br.error, JSON.stringify(br.error));
const now = new Date().toISOString();
let up = await W.from("time_entries").update({ ended_at: now }).eq("id", open.data.id);
check("darbo pabaiga", !up.error, JSON.stringify(up.error));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius" }).format(new Date());
let sm = await W.from("time_entry_summary").select("worked_minutes, work_date").eq("user_id", me).eq("work_date", today);
const total = (sm.data ?? []).reduce((s, x) => s + Number(x.worked_minutes), 0);
check(`šiandienos suma iš vaizdo (${total} min.)`, !sm.error && total >= 78, JSON.stringify(sm));

let d = await W.from("days_off").insert({ company_id: company, user_id: me, day: today });
check("šiandien nedirbu", !d.error, JSON.stringify(d.error));
d = await W.from("days_off").insert({ company_id: company, user_id: me, day: today });
check("pakartotinis žymėjimas (23505)", d.error?.code === "23505");
d = await W.from("days_off").delete().eq("user_id", me).eq("day", today);
check("nedarbo žymės atšaukimas", !d.error);

// Medžiagos RPC per API
let rpc = await W.rpc("create_material_request", { p_company_id: company, p_project_id: null, p_comment: null, p_items: [{ name: "Alkūnė", quantity: 4, unit: "vnt." }] });
check("RPC create_material_request per API", !rpc.error && typeof rpc.data === "string", JSON.stringify(rpc.error));
rpc = await W.rpc("create_material_request", { p_company_id: company, p_project_id: null, p_comment: null, p_items: [{ name: "Alkūnė", quantity: 0, unit: "vnt." }] });
check("nulinis kiekis atmetamas", rpc.error?.code === "23514", JSON.stringify(rpc.error));

// Svetima įmonė nieko nemato
const B = mk("B");
const bt = await B.from("tasks").select("id");
check("kita įmonė darbų nemato", !bt.error && bt.data.length === 0);
const bs = await B.from("time_entry_summary").select("id");
check("kita įmonė laiko vaizdo nemato (security_invoker)", !bs.error && bs.data.length === 0);

console.log(fails ? `\n${fails} KLAIDOS` : "\nVISI API TESTAI PRAĖJO");
proxy.close(); process.exit(fails ? 1 : 0);

// Zendo Response — TEST VERSION. Fake data only. Not for real emergencies.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const seed = require('./seed');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = (process.env.ACCESS_CODE || '').trim();
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_VERSION = 5;
const MAX_RESPONDERS = 3; // applies to crisis calls only (event shifts are unlimited)

const ROLES = {
  t1: { label: 'Tier 1 volunteer', short: 'Tier 1', volunteer: true },
  t2: { label: 'Tier 2 volunteer / lead', short: 'Tier 2', volunteer: true },
  coord: { label: 'Coordinator', short: 'Coordinator', oversight: true },
  lcsw: { label: 'LCSW', short: 'LCSW', oversight: true, network: true },
  md: { label: 'MD', short: 'MD', oversight: true, network: true },
  liaison: { label: 'Hospital liaison', short: 'Liaison', oversight: true }
};
const QUICK_ROLES = ['t1', 't2', 'lcsw', 'md', 'liaison']; // 'coord' requires a leadership account
const ACCESS = { admin: { label: 'Admin (program-wide)' }, lead: { label: 'Chapter lead / coordinator' } };
const uid = (n = 8) => crypto.randomBytes(n).toString('hex');
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+$/,'').slice(0, n);

// ---------- storage ----------
const COLORS = ['#AB6B9E', '#4f8a74', '#3f6fb5', '#c98a1b', '#c56a57', '#65206b', '#2f7f8a', '#8a5a2f'];
let db;
function freshData(keepUsers) {
  const now = Date.now();
  const users = keepUsers || {};
  for (const u of Object.values(users)) { u.onDuty = false; u.hours = 0; u.encounters = 0; }
  seedAccounts(users);
  return {
    version: DB_VERSION, seededAt: now, users,
    seq: { bk: 417, les: 212 },
    encounters: seed.history(now),
    events: seedEvents(now, users),
    board: seed.board(now),
    dms: {},
    notifs: [],
    announcements: [],
    zoneUse: {} // zoneId -> [encounterId]
  };
}
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function seedAccounts(users) {
  seed.ACCOUNTS.forEach((a, i) => {
    const prev = users[a.id];
    const salt = (prev && prev.salt) || uid(8);
    users[a.id] = {
      id: a.id, token: (prev && prev.token) || uid(18), username: a.username, salt, pwHash: hashPw(seed.PW[a.pw], salt),
      name: a.name, role: a.role, access: a.access, chapter: a.chapter, active: true, seededAccount: true,
      onDuty: false, hours: 0, encounters: 0, availability: (prev && prev.availability) || [0, 1, 0, 1, 2, 2, 1],
      createdAt: (prev && prev.createdAt) || Date.now(), color: COLORS[i % COLORS.length]
    };
  });
}
function seedEvents(now, users) {
  const evs = seed.events(); const extra = seed.eventSeeds(now);
  for (const ev of evs) {
    ev.leadTeam = []; ev.cancelled = null; ev.briefing = null; ev.createdBy = 'seed';
    const x = extra[ev.id]; if (!x) continue;
    ev.leadTeam = x.leadTeam.slice();
    ev.signups = x.signups.map(([userId, shiftId], i) => { const u = users[userId]; return { userId, name: u.name, role: u.role, shiftId, at: now - (30 - i) * 3600e3 }; });
    if (x.briefing) ev.briefing = JSON.parse(JSON.stringify(x.briefing));
  }
  return evs;
}
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (d.version === DB_VERSION) return d;
  } catch (e) { /* first start */ }
  return freshData();
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); }
    catch (e) { console.error('save failed', e.message); }
  }, 500);
}
db = load();

// ---------- helpers ----------
const online = new Map(); // userId -> Set(socket)
const isOnline = id => (online.get(id) || new Set()).size > 0;
const role = u => ROLES[u.role] || ROLES.t1;
const initials = n => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
function pubUser(u) {
  return { id: u.id, name: u.name, role: u.role, chapter: u.chapter, access: u.access || null, onDuty: !!u.onDuty, online: isOnline(u.id), initials: initials(u.name), color: u.color };
}
// ---------- permissions (all enforced server-side) ----------
const isActive = u => !!u && u.active !== false;
const isAdmin = u => isActive(u) && u.access === 'admin';
const isLead = u => isActive(u) && u.access === 'lead';
const isPriv = u => isAdmin(u) || isLead(u);
const canManageChapter = (u, ch) => isAdmin(u) || (isLead(u) && u.chapter === ch);
const scopeChapters = u => isAdmin(u) ? Object.keys(seed.CHAPTERS) : isLead(u) ? [u.chapter] : [];
const findEv = id => db.events.find(e => e.id === id);
const signedUp = (u, ev) => ev.signups.some(s => s.userId === u.id);
const onLeadTeam = (u, ev) => (ev.leadTeam || []).includes(u.id);
const canBrief = (u, ev) => isActive(u) && (canManageChapter(u, ev.chapter) || onLeadTeam(u, ev));
const partVisibleTo = (p, u) => !!p && (p.recipients === 'all' || (Array.isArray(p.recipients) && p.recipients.includes(u.id)));
function canSeeBriefing(u, ev) {
  if (!ev.briefing || !isActive(u)) return false;
  if (canBrief(u, ev)) return true;
  return signedUp(u, ev) && ['credentials', 'instructions'].some(k => partVisibleTo(ev.briefing[k], u));
}
function userByToken(t) { t = String(t || ''); if (!t) return null; return Object.values(db.users).find(x => x.token === t) || null; }
const findEnc = id => db.encounters.find(e => e.id === id);
const active = e => e.status === 'active';
function canSeeEnc(u, e) {
  const r = role(u);
  if (isAdmin(u)) return true;
  if (r.network) return true;
  if (e.chapter !== u.chapter) return e.responders.some(x => x.userId === u.id);
  return true;
}
function inTeam(u, e) { return e.responders.some(x => x.userId === u.id); }
function canChat(u, e) { return inTeam(u, e) || role(u).oversight; }

function notify(userIds, n) {
  const at = Date.now();
  for (const id of new Set(userIds)) {
    const item = { id: uid(5), to: id, at, read: false, ...n };
    db.notifs.push(item);
    for (const s of online.get(id) || []) s.emit('notify', item);
  }
  if (db.notifs.length > 600) db.notifs = db.notifs.slice(-400);
}
function usersWhere(fn) { return Object.values(db.users).filter(fn); }
function roleUsers(roleId, chapter) {
  let list = usersWhere(u => u.role === roleId && (!chapter || ROLES[roleId].network || u.chapter === chapter));
  if (!list.length && chapter) list = usersWhere(u => u.role === roleId);
  return list;
}
function sysMsg(e, text, channel = 'team', kind = 'system') {
  e.messages.push({ id: uid(5), kind, channel, text: clip(text, 600), at: Date.now() });
}
function alertTargets(e, excludeTeam = true) {
  return usersWhere(u => u.chapter === e.chapter && u.onDuty && role(u).volunteer && !(excludeTeam && inTeam(u, e)));
}
function pingAlert(e) {
  const targets = alertTargets(e);
  for (const u of targets) for (const s of online.get(u.id) || []) s.emit('alert', { id: e.id, type: e.type, place: e.place.name, severity: e.severity });
  return targets.length;
}

// ---------- personalised view ----------
function encView(u, e) {
  const chat = canChat(u, e);
  return { ...e, messages: chat ? e.messages.slice(-200) : [], canChat: chat, mine: inTeam(u, e) };
}
const PARTS = ['credentials', 'instructions'];
function partStatus(ev, x, k) {
  const p = ev.briefing && ev.briefing[k];
  if (!p || !partVisibleTo(p, x)) return 'none';
  const r = ((ev.briefing.receipts || {})[x.id] || {})[k] || {};
  if (r.ackV === p.version) return 'ack';
  if (r.readV === p.version) return r.ackV ? 'seen-updated' : 'seen';
  return r.ackV ? 'sent-updated' : 'sent';
}
function briefingView(u, ev) {
  const b = ev.briefing; if (!b) return null;
  const full = canBrief(u, ev);
  const parts = {};
  for (const k of PARTS) { const p = b[k]; if (p && (full || partVisibleTo(p, u))) parts[k] = { fields: { ...p.fields }, version: p.version, sentAt: p.sentAt, by: p.by, recipients: full ? p.recipients : undefined, myStatus: partStatus(ev, u, k) }; }
  const out = { parts, mine: (b.receipts || {})[u.id] || {} };
  if (full) {
    out.history = (b.history || []).slice(-40).reverse();
  }
  return out;
}
function eventTracking(ev) {
  const seen = new Map();
  for (const s of ev.signups) { const x = db.users[s.userId]; if (!x) continue; const t = seen.get(x.id) || { userId: x.id, name: x.name, role: x.role, online: isOnline(x.id), lead: onLeadTeam(x, ev), shifts: [] }; const sh = ev.shifts.find(z => z.id === s.shiftId); if (sh) t.shifts.push(sh.name); seen.set(x.id, t); }
  return [...seen.values()].map(t => { const x = db.users[t.userId]; return { ...t, parts: Object.fromEntries(PARTS.map(k => [k, partStatus(ev, x, k)])), receipt: ((ev.briefing && ev.briefing.receipts) || {})[x.id] || {} }; });
}
function eventView(u, ev) {
  const { briefing, ...rest } = ev;
  const visible = canSeeBriefing(u, ev); const manage = canManageChapter(u, ev.chapter); const brief = canBrief(u, ev);
  return {
    ...rest, signups: ev.signups.map(s => ({ ...s })), leadTeam: (ev.leadTeam || []).slice(),
    leadTeamNames: (ev.leadTeam || []).map(id => db.users[id] ? db.users[id].name : '?'),
    briefing: visible ? briefingView(u, ev) : null,
    briefingLocked: !!briefing && !visible && (PARTS.some(k => briefing[k])),
    canManage: manage, canBrief: brief,
    tracking: brief ? eventTracking(ev) : undefined
  };
}
function memberView(x) {
  return { ...pubUser(x), active: x.active !== false, username: x.username || null, seededAccount: !!x.seededAccount, createdAt: x.createdAt, hours: x.hours || 0, encounters: x.encounters || 0,
    leadOf: db.events.filter(ev => onLeadTeam(x, ev)).map(ev => ev.id), signups: db.events.filter(ev => signedUp(x, ev)).map(ev => ev.id) };
}
function adminView(u) {
  if (!isPriv(u)) return null;
  const scope = scopeChapters(u);
  const members = usersWhere(x => scope.includes(x.chapter)).map(memberView).sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name));
  const calls = db.encounters.filter(e => scope.includes(e.chapter)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 25)
    .map(e => ({ id: e.id, chapter: e.chapter, type: e.type, status: e.status, place: e.place && e.place.name, createdAt: e.createdAt, responders: e.responders.map(r => r.name), escalated: !!e.escalated, seeded: !!e.seeded }));
  return { scope, isAdmin: isAdmin(u), members, calls, announcements: db.announcements.filter(a => a.chapter === 'all' || scope.includes(a.chapter)).slice(-20).reverse(), assignableRoles: isAdmin(u) ? Object.keys(ROLES) : QUICK_ROLES };
}
function viewFor(u) {
  const ch = seed.CHAPTERS[u.chapter];
  const chapterUsers = usersWhere(x => x.chapter === u.chapter && x.active !== false).map(pubUser);
  const network = usersWhere(x => role(x).network && x.chapter !== u.chapter).map(pubUser);
  const encs = db.encounters.filter(e => canSeeEnc(u, e)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 60).map(e => encView(u, e));
  const zoneUse = {};
  for (const z of ch.safeZones) zoneUse[z.id] = (db.zoneUse[z.id] || []).filter(id => { const e = findEnc(id); return e && active(e); }).length;
  const dms = Object.values(db.dms).filter(t => t.userId === u.id || t.role === u.role).map(t => ({ ...t, messages: t.messages.slice(-100) }));
  return {
    me: { ...pubUser(u), username: u.username || null, isAdmin: isAdmin(u), isLead: isLead(u), hours: u.hours || 0, encounters: u.encounters || 0, availability: u.availability, eventsCount: db.events.filter(ev => ev.signups.some(s => s.userId === u.id)).length },
    chapter: { ...ch, places: undefined }, chapters: Object.values(seed.CHAPTERS).map(c => ({ id: c.id, name: c.name })),
    users: chapterUsers.concat(network), sample: seed.SAMPLE_MEMBERS[u.chapter].filter(s => !usersWhere(x => x.name === s.name).length),
    encounters: encs, zoneUse,
    events: db.events.map(ev => eventView(u, ev)),
    announcements: db.announcements.filter(a => a.chapter === 'all' || a.chapter === u.chapter).slice(-5).reverse(),
    admin: adminView(u), access: ACCESS,
    board: db.board.slice().sort((a, b) => b.at - a.at),
    dms, notifs: db.notifs.filter(n => n.to === u.id).slice(-40),
    alertTypes: seed.ALERT_TYPES, places: ch.places, roles: ROLES, maxResponders: MAX_RESPONDERS,
    serverTime: Date.now(), seededAt: db.seededAt
  };
}
let bTimer = null;
function broadcast() {
  save();
  if (bTimer) return;
  bTimer = setTimeout(() => {
    bTimer = null;
    for (const [id, set] of online) { const u = db.users[id]; if (!u) continue; const v = viewFor(u); for (const s of set) s.emit('state', v); }
  }, 40);
}

// ---------- http ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/api/config', (req, res) => res.json({ codeRequired: !!ACCESS_CODE, roles: ROLES, chapters: Object.values(seed.CHAPTERS).map(c => ({ id: c.id, name: c.name })) }));
app.post('/api/signin', (req, res) => {
  const { name, role: r, chapter, code } = req.body || {};
  if (ACCESS_CODE && String(code || '').trim().toLowerCase() !== ACCESS_CODE.toLowerCase()) return res.status(401).json({ error: 'Wrong access code. Ask your coordinator for the test code.' });
  const nm = clip(String(name || '').trim(), 40);
  if (nm.length < 2) return res.status(400).json({ error: 'Please enter a name (2+ characters). A first name or nickname is fine.' });
  if (r === 'coord') return res.status(400).json({ error: 'Coordinator access needs a leadership account. Use "Admin / Lead sign-in".' });
  if (!ROLES[r] || !QUICK_ROLES.includes(r)) return res.status(400).json({ error: 'Pick a role.' });
  if (!seed.CHAPTERS[chapter]) return res.status(400).json({ error: 'Pick a chapter.' });
  const u = { id: uid(6), token: uid(18), name: nm, role: r, chapter, access: null, active: true, onDuty: false, hours: 0, encounters: 0, availability: [0, 1, 0, 1, 2, 2, 1], createdAt: Date.now(), color: COLORS[Object.keys(db.users).length % COLORS.length] };
  db.users[u.id] = u; save();
  res.json({ token: u.token, id: u.id });
});
// ---------- account (password) sign-in for admins, leads and seeded volunteers ----------
const fails = new Map(); // ip -> {n, until}
app.post('/api/login', (req, res) => {
  const ip = req.ip || 'x'; const f = fails.get(ip) || { n: 0, until: 0 };
  if (f.until > Date.now()) return res.status(429).json({ error: 'Too many wrong attempts. Wait a minute and try again.' });
  const { username, password } = req.body || {};
  const un = String(username || '').trim().toLowerCase();
  const u = Object.values(db.users).find(x => x.username && x.username === un);
  const ok = u && u.pwHash && crypto.timingSafeEqual(Buffer.from(hashPw(password || '', u.salt), 'hex'), Buffer.from(u.pwHash, 'hex'));
  if (!ok) { f.n++; if (f.n >= 8) { f.until = Date.now() + 60e3; f.n = 0; } fails.set(ip, f); return res.status(401).json({ error: 'Wrong username or password.' }); }
  if (u.active === false) return res.status(403).json({ error: 'This account is deactivated. Ask an admin.' });
  fails.delete(ip);
  res.json({ token: u.token, id: u.id, access: u.access || null });
});
function auth(req, res, next) {
  const u = userByToken(req.headers['x-token']);
  if (!u) return res.status(401).json({ error: 'signed out' });
  if (u.active === false) return res.status(403).json({ error: 'This account is deactivated.' });
  req.u = u; next();
}
const needPriv = (req, res, next) => isPriv(req.u) ? next() : res.status(403).json({ error: 'Admins and chapter leads only.' });
const done = (res, body) => { broadcast(); res.json(body || { ok: true }); };
app.get('/api/me', auth, (req, res) => res.json(viewFor(req.u)));

app.get('/api/admin/overview', auth, needPriv, (req, res) => {
  const ch = req.query.chapter;
  if (ch && !canManageChapter(req.u, ch)) return res.status(403).json({ error: 'Not your chapter.' });
  const a = adminView(req.u);
  if (ch) { a.members = a.members.filter(m => m.chapter === ch); a.calls = a.calls.filter(c => c.chapter === ch); }
  res.json({ ...a, events: db.events.filter(ev => canManageChapter(req.u, ev.chapter) && (!ch || ev.chapter === ch)).map(ev => eventView(req.u, ev)) });
});
app.post('/api/admin/users/:id', auth, needPriv, (req, res) => {
  const me = req.u, x = db.users[req.params.id]; const d = req.body || {};
  if (!x || !canManageChapter(me, x.chapter)) return res.status(404).json({ error: 'No such member in your chapter.' });
  if (!isAdmin(me) && x.access && x.id !== me.id) return res.status(403).json({ error: 'Only an admin can change another lead or admin.' });
  if (x.id === me.id && (d.active === false || d.access !== undefined)) return res.status(400).json({ error: "You can't deactivate or demote yourself." });
  if (d.role !== undefined) {
    const allowed = isAdmin(me) ? Object.keys(ROLES) : QUICK_ROLES;
    if (!allowed.includes(d.role)) return res.status(403).json({ error: 'You can’t assign that role.' });
    x.role = d.role; for (const ev of db.events) for (const s of ev.signups) if (s.userId === x.id) s.role = x.role;
  }
  if (d.access !== undefined) {
    if (!isAdmin(me)) return res.status(403).json({ error: 'Only an admin can grant leadership access.' });
    if (![null, 'lead', 'admin'].includes(d.access)) return res.status(400).json({ error: 'Bad access level.' });
    if (d.access && !x.pwHash) return res.status(400).json({ error: 'Leadership access needs a password account (seeded accounts only in this test).' });
    x.access = d.access; if (d.access && x.role !== 'coord') x.role = 'coord';
  }
  if (d.chapter !== undefined) {
    if (!isAdmin(me)) return res.status(403).json({ error: 'Only an admin can move members between chapters.' });
    if (!seed.CHAPTERS[d.chapter]) return res.status(400).json({ error: 'Unknown chapter.' });
    x.chapter = d.chapter;
  }
  if (d.active !== undefined) {
    x.active = !!d.active;
    if (!x.active) { x.onDuty = false; for (const s of online.get(x.id) || []) { s.emit('deactivated'); s.disconnect(true); } }
  }
  done(res, { ok: true, member: memberView(x) });
});
function parseShifts(txt, prev) {
  const lines = String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12);
  return lines.map((l, i) => {
    const [name, time, target] = l.split(',').map(z => (z || '').trim());
    const old = (prev || []).find(s => s.name === name);
    return { id: old ? old.id : 's' + (i + 1) + uid(2), name: clip(name || 'Shift', 40), time: clip(time || '', 40), hours: (old && old.hours) || 4, target: Math.max(1, Math.min(500, parseInt(target, 10) || 6)), seeded: old ? old.seeded : 0 };
  });
}
const GRADS = ['linear-gradient(135deg,#65206b,#AB6B9E)', 'linear-gradient(135deg,#2f5d50,#4f8a74)', 'linear-gradient(135deg,#25406e,#3f6fb5)', 'linear-gradient(135deg,#7a4b12,#c98a1b)'];
function applyEventFields(ev, d) {
  if (d.title !== undefined) { const t = clip(String(d.title).trim(), 80); if (t.length < 3) throw new Error('Title needs 3+ characters.'); ev.title = t; }
  if (d.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new Error('Date must be YYYY-MM-DD.');
    ev.date = d.date; const dt = new Date(d.date + 'T12:00:00Z');
    ev.day = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase().replace(',', '');
  }
  for (const k of ['place', 'time', 'kind']) if (d[k] !== undefined) ev[k] = clip(String(d[k]), 80);
  if (d.shifts !== undefined) { const sh = parseShifts(d.shifts, ev.shifts); if (!sh.length) throw new Error('Add at least one shift.'); const ids = new Set(sh.map(s => s.id)); ev.signups = ev.signups.filter(s => ids.has(s.shiftId)); ev.shifts = sh; }
}
app.post('/api/admin/events', auth, needPriv, (req, res) => {
  const d = req.body || {}; const ch = d.chapter || req.u.chapter;
  if (!canManageChapter(req.u, ch)) return res.status(403).json({ error: 'Not your chapter.' });
  const ev = { id: 'ev' + uid(3), chapter: ch, title: '', date: '', day: '', kind: 'Event', place: '', time: '', tags: ['Test event'], grad: GRADS[db.events.length % GRADS.length], shifts: [], signups: [], leadTeam: [], cancelled: null, briefing: null, createdBy: req.u.name };
  try { applyEventFields(ev, { kind: 'Event', ...d, shifts: d.shifts || 'Sitter, all night, 8' }); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!ev.date) return res.status(400).json({ error: 'Add a date.' });
  db.events.push(ev); db.events.sort((a, b) => a.date.localeCompare(b.date));
  done(res, { ok: true, id: ev.id });
});
app.patch('/api/admin/events/:id', auth, needPriv, (req, res) => {
  const ev = findEv(req.params.id); if (!ev || !canManageChapter(req.u, ev.chapter)) return res.status(404).json({ error: 'No such event in your chapter.' });
  try { applyEventFields(ev, req.body || {}); } catch (e) { return res.status(400).json({ error: e.message }); }
  db.events.sort((a, b) => a.date.localeCompare(b.date));
  done(res);
});
app.post('/api/admin/events/:id/cancel', auth, needPriv, (req, res) => {
  const ev = findEv(req.params.id); if (!ev || !canManageChapter(req.u, ev.chapter)) return res.status(404).json({ error: 'No such event in your chapter.' });
  const restore = !!(req.body && req.body.restore);
  ev.cancelled = restore ? null : { by: req.u.name, at: Date.now(), reason: clip((req.body && req.body.reason) || '', 200) };
  notify(ev.signups.map(s => s.userId).concat(ev.leadTeam || []), { text: restore ? `${ev.title} is back on (test event).` : `${ev.title} was cancelled by ${req.u.name} (test event).`, link: `#/event/${ev.id}`, urgent: !restore, kind: 'event' });
  done(res, { ok: true, cancelled: !!ev.cancelled });
});
app.put('/api/admin/events/:id/lead-team', auth, needPriv, (req, res) => {
  const ev = findEv(req.params.id); if (!ev || !canManageChapter(req.u, ev.chapter)) return res.status(404).json({ error: 'No such event in your chapter.' });
  const ids = Array.isArray(req.body && req.body.userIds) ? [...new Set(req.body.userIds.map(String))] : null;
  if (!ids) return res.status(400).json({ error: 'userIds required' });
  for (const id of ids) { const x = db.users[id]; if (!x || x.active === false || (!isAdmin(req.u) && x.chapter !== ev.chapter)) return res.status(400).json({ error: 'Lead team members must be active members of this chapter.' }); }
  const added = ids.filter(id => !(ev.leadTeam || []).includes(id));
  ev.leadTeam = ids;
  notify(added, { text: `You're on the lead team for ${ev.title}. You can now send credentials and instructions.`, link: `#/brief/${ev.id}`, kind: 'leadteam' });
  done(res, { ok: true, leadTeam: ids });
});
app.post('/api/admin/announce', auth, needPriv, (req, res) => {
  const d = req.body || {}; const ch = d.chapter || req.u.chapter;
  if (ch === 'all' ? !isAdmin(req.u) : !canManageChapter(req.u, ch)) return res.status(403).json({ error: 'Not your chapter.' });
  const text = clip(String(d.text || '').trim(), 500); if (text.length < 3) return res.status(400).json({ error: 'Write a short message.' });
  const a = { id: uid(5), chapter: ch, text, urgent: !!d.urgent, by: req.u.name, at: Date.now() };
  db.announcements.push(a); if (db.announcements.length > 100) db.announcements.shift();
  const to = usersWhere(x => x.active !== false && (ch === 'all' || x.chapter === ch)).map(x => x.id);
  notify(to, { text: `📣 ${req.u.name}: ${text}`, link: '#/home', urgent: a.urgent, kind: 'announce' });
  done(res, { ok: true, sentTo: to.length });
});
function resetDemo(byName) { db = freshData(db.users); io.emit('reset', { by: byName }); console.log('demo data reset by', byName); }
app.post('/api/admin/reset', auth, needPriv, (req, res) => { resetDemo(req.u.name); done(res); });

// ---------- event briefing: credentials + special instructions ----------
const CRED_FIELDS = ['type', 'pickup', 'pickupTime', 'gate', 'contact', 'code', 'notes'];
const briefEv = (req, res) => { const ev = findEv(req.params.id); if (!ev) { res.status(404).json({ error: 'No such event.' }); return null; } return ev; };
function recipientIds(ev, p) { const su = [...new Set(ev.signups.map(s => s.userId))]; return p.recipients === 'all' ? su : su.filter(id => p.recipients.includes(id)); }
app.get('/api/events/:id/briefing', auth, (req, res) => {
  const ev = briefEv(req, res); if (!ev) return;
  if (!canSeeBriefing(req.u, ev) && !canBrief(req.u, ev)) return res.status(403).json({ error: 'Only volunteers signed up for this event (and its lead team) can see credentials.' });
  res.json({ briefing: briefingView(req.u, ev), tracking: canBrief(req.u, ev) ? eventTracking(ev) : undefined });
});
app.post('/api/events/:id/briefing', auth, (req, res) => {
  const ev = briefEv(req, res); if (!ev) return;
  if (!canBrief(req.u, ev)) return res.status(403).json({ error: 'Only the event lead team, chapter leads and admins can send briefings.' });
  if (ev.cancelled) return res.status(400).json({ error: 'This event is cancelled.' });
  const d = req.body || {}; const part = d.part;
  if (!PARTS.includes(part)) return res.status(400).json({ error: 'part must be credentials or instructions' });
  let fields;
  if (part === 'credentials') { fields = {}; for (const k of CRED_FIELDS) fields[k] = clip(String((d.fields || {})[k] || '').trim(), k === 'notes' ? 600 : 160); if (!fields.type && !fields.code) return res.status(400).json({ error: 'Add at least a credential type or code.' }); }
  else { const t = clip(String((d.fields || {}).text || d.text || '').trim(), 2000); if (t.length < 3) return res.status(400).json({ error: 'Write the instructions first.' }); fields = { text: t }; }
  let recipients = 'all';
  if (Array.isArray(d.recipients)) { const su = new Set(ev.signups.map(s => s.userId)); recipients = [...new Set(d.recipients.map(String))].filter(id => su.has(id)); if (!recipients.length) return res.status(400).json({ error: 'Pick at least one signed-up volunteer.' }); }
  ev.briefing = ev.briefing || { receipts: {}, history: [] };
  const prev = ev.briefing[part];
  const p = { fields, version: (prev ? prev.version : 0) + 1, sentAt: Date.now(), by: req.u.name, byId: req.u.id, recipients };
  ev.briefing[part] = p;
  const to = recipientIds(ev, p);
  ev.briefing.history.push({ at: p.sentAt, by: req.u.name, part, kind: prev ? 'updated' : 'sent', version: p.version, to: recipients === 'all' ? 'all signed-up volunteers' : recipients.map(id => db.users[id] ? db.users[id].name : '?').join(', '), count: to.length });
  if (d.notify !== false) notify(to.filter(id => id !== req.u.id), { text: `${part === 'credentials' ? '🎟️ Entry credentials' : '📋 Special instructions'} ${prev ? 'updated' : 'sent'} for ${ev.title} — tap to view & acknowledge.`, link: `#/event/${ev.id}`, urgent: true, kind: 'briefing', event: ev.id });
  done(res, { ok: true, version: p.version, sentTo: to.length });
});
app.post('/api/events/:id/briefing/resend', auth, (req, res) => {
  const ev = briefEv(req, res); if (!ev) return;
  if (!canBrief(req.u, ev)) return res.status(403).json({ error: 'Only the event lead team, chapter leads and admins can resend.' });
  const d = req.body || {}; const parts = PARTS.includes(d.part) ? [d.part] : PARTS;
  const ids = new Set();
  for (const k of parts) { const p = ev.briefing && ev.briefing[k]; if (!p) continue; for (const id of recipientIds(ev, p)) if (d.only !== 'unacked' || partStatus(ev, db.users[id], k) !== 'ack') ids.add(id); }
  ids.delete(req.u.id);
  if (!ids.size) return res.json({ ok: true, sentTo: 0 });
  notify([...ids], { text: `⏰ Reminder from ${req.u.name}: please open and acknowledge the briefing for ${ev.title}.`, link: `#/event/${ev.id}`, urgent: true, kind: 'briefing', event: ev.id });
  ev.briefing.history.push({ at: Date.now(), by: req.u.name, part: parts.length > 1 ? 'both' : parts[0], kind: 'reminder', to: d.only === 'unacked' ? 'not yet acknowledged' : 'all recipients', count: ids.size });
  done(res, { ok: true, sentTo: ids.size });
});
function mark(field) {
  return (req, res) => {
    const ev = briefEv(req, res); if (!ev) return;
    if (!canSeeBriefing(req.u, ev)) return res.status(403).json({ error: 'Not a recipient of this briefing.' });
    const r = ev.briefing.receipts[req.u.id] = ev.briefing.receipts[req.u.id] || {};
    const parts = PARTS.includes((req.body || {}).part) ? [req.body.part] : PARTS;
    for (const k of parts) { const p = ev.briefing[k]; if (!p || !partVisibleTo(p, req.u)) continue; const rr = r[k] = r[k] || {}; if (rr.readV !== p.version) { rr.readV = p.version; rr.readAt = Date.now(); } if (field === 'ack') { rr.ackV = p.version; rr.ackAt = Date.now(); } }
    if (field === 'ack') notify((ev.leadTeam || []).concat(PARTS.map(k => ev.briefing[k] && ev.briefing[k].byId).filter(Boolean)).filter(id => id !== req.u.id), { text: `✅ ${req.u.name} acknowledged the briefing for ${ev.title}.`, link: `#/brief/${ev.id}`, kind: 'ack', quiet: true });
    done(res);
  };
}
app.post('/api/events/:id/briefing/read', auth, mark('read'));
app.post('/api/events/:id/briefing/ack', auth, mark('ack'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist'), { maxAge: '7d' }));
app.use('/fonts', express.static(path.join(__dirname, 'node_modules/@fontsource'), { maxAge: '30d' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, p) { if (/\.(html|js|webmanifest|css)$/.test(p)) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get(/^\/(?!api|socket\.io).*/, (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 20000, pingTimeout: 20000 });

io.use((socket, next) => {
  const t = socket.handshake.auth && socket.handshake.auth.token;
  const u = userByToken(t);
  if (!u || u.active === false) return next(new Error('unauthorized'));
  socket.data.uid = u.id; next();
});

io.on('connection', socket => {
  const me = () => db.users[socket.data.uid];
  if (!online.has(socket.data.uid)) online.set(socket.data.uid, new Set());
  online.get(socket.data.uid).add(socket);
  socket.emit('state', viewFor(me()));
  broadcast();
  socket.on('disconnect', () => { const s = online.get(socket.data.uid); if (s) { s.delete(socket); if (!s.size) online.delete(socket.data.uid); } broadcast(); });

  const on = (name, fn) => socket.on(name, (data, ack) => {
    const u = me();
    if (typeof ack !== 'function') ack = () => {};
    if (!u) return ack({ error: 'signed out' });
    try { const r = fn(u, data || {}); ack(r || { ok: true }); broadcast(); }
    catch (e) { console.error(name, e); ack({ error: 'Something went wrong' }); }
  });

  on('duty', (u, d) => { u.onDuty = !!d.on; return { ok: true }; });
  on('profile', (u, d) => {
    if (Array.isArray(d.availability) && d.availability.length === 7) u.availability = d.availability.map(x => Math.max(0, Math.min(2, x | 0)));
    if (u.access && ((d.chapter && d.chapter !== u.chapter && !isAdmin(u)) || (d.role && d.role !== u.role))) return { error: 'Leadership accounts change role/chapter from the Admin panel.' };
    if (d.chapter && seed.CHAPTERS[d.chapter]) u.chapter = d.chapter;
    if (d.role && d.role !== u.role) { if (!QUICK_ROLES.includes(d.role)) return { error: 'Coordinator access needs a leadership account.' }; u.role = d.role; }
  });

  on('simulate', (u, d) => {
    const ch = seed.CHAPTERS[u.chapter];
    const t = seed.ALERT_TYPES.find(x => x.id === d.type) || seed.ALERT_TYPES[0];
    const place = ch.places[Number.isInteger(d.place) && ch.places[d.place] ? d.place : Math.floor(Math.random() * ch.places.length)];
    db.seq[u.chapter] = (db.seq[u.chapter] || 100) + 1;
    const e = {
      id: `${ch.prefix}-${String(db.seq[u.chapter]).padStart(4, '0')}`, chapter: u.chapter, type: t.label, icon: t.icon,
      severity: ['Low', 'Moderate', 'High'].includes(d.severity) ? d.severity : t.severity,
      place, summary: clip(d.summary || t.summary, 400), tags: t.tags, createdBy: u.name, createdById: u.id, createdAt: Date.now(),
      responders: [], accepting: true, declined: [], messages: [], escalated: false, mdRequested: false, checkin: null,
      status: 'active', closeout: null, handoff: null, signoff: null, backupRequests: 0
    };
    sysMsg(e, `TEST alert created by ${u.name}: ${t.label} at ${place.name}.`);
    db.encounters.push(e);
    const n = pingAlert(e);
    const ov = usersWhere(x => x.id !== u.id && (x.role === 'lcsw' || (x.role === 'coord' && x.chapter === e.chapter)));
    notify(ov.map(x => x.id), { text: `New test alert ${e.id}: ${t.label} · ${place.name}`, link: `#/enc/${e.id}` });
    return { ok: true, id: e.id, notified: n };
  });

  on('accept', (u, d) => {
    const e = findEnc(d.id);
    if (!e || !active(e)) return { error: 'This alert is no longer active.' };
    if (inTeam(u, e)) return { ok: true, already: true };
    if (!role(u).volunteer) return { error: 'Only Tier 1 / Tier 2 volunteers can accept a call.' };
    if (u.chapter !== e.chapter) return { error: 'This alert is for another chapter.' };
    if (!u.onDuty) return { error: 'Go on duty first to accept calls.' };
    if (!e.accepting || e.responders.length >= MAX_RESPONDERS) return { error: `Team is full (${MAX_RESPONDERS}/${MAX_RESPONDERS}). This call is closed to new responders.`, full: true };
    const kind = e.responders.length === 0 ? 'lead' : 'support';
    e.responders.push({ userId: u.id, name: u.name, tier: u.role, kind, status: 'en route', at: Date.now() });
    e.declined = e.declined.filter(x => x !== u.id);
    if (e.responders.length >= MAX_RESPONDERS) e.accepting = false;
    sysMsg(e, `${u.name} accepted as ${kind} · team ${e.responders.length}/${MAX_RESPONDERS}`);
    const team = e.responders.filter(r => r.userId && r.userId !== u.id).map(r => r.userId);
    notify(team, { text: `${u.name} joined ${e.id} as ${kind} (${e.responders.length}/${MAX_RESPONDERS})`, link: `#/enc/${e.id}` });
    if (!e.accepting) for (const x of alertTargets(e)) for (const s of online.get(x.id) || []) s.emit('alertClosed', { id: e.id });
    return { ok: true, kind, count: e.responders.length };
  });
  on('decline', (u, d) => { const e = findEnc(d.id); if (e && !e.declined.includes(u.id)) e.declined.push(u.id); });
  on('leave', (u, d) => {
    const e = findEnc(d.id); if (!e || !active(e) || !inTeam(u, e)) return { error: 'Not on this team' };
    const wasLead = e.responders.find(r => r.userId === u.id).kind === 'lead';
    e.responders = e.responders.filter(r => r.userId !== u.id);
    if (wasLead && e.responders[0]) e.responders[0].kind = 'lead';
    sysMsg(e, `${u.name} left the call · team ${e.responders.length}/${MAX_RESPONDERS}`);
  });
  on('status', (u, d) => { const e = findEnc(d.id); const r = e && e.responders.find(x => x.userId === u.id); if (r) { r.status = d.status === 'on scene' ? 'on scene' : 'en route'; sysMsg(e, `${u.name} is ${r.status}`); } });

  on('backup', (u, d) => {
    const e = findEnc(d.id);
    if (!e || !active(e)) return { error: 'Encounter not active' };
    if (!inTeam(u, e) && !role(u).oversight) return { error: 'Only the team or coordinator can request backup.' };
    if (e.responders.length >= MAX_RESPONDERS) return { error: 'full', full: true };
    e.accepting = true; e.backupRequests++; e.declined = [];
    const n = pingAlert(e);
    sysMsg(e, `${u.name} requested backup · ${MAX_RESPONDERS - e.responders.length} open spot(s) · ${n} on-duty volunteer(s) pinged`);
    return { ok: true, notified: n };
  });
  on('escalate', (u, d) => {
    const e = findEnc(d.id); if (!e || !active(e)) return { error: 'Encounter not active' };
    e.escalated = true;
    sysMsg(e, `${u.name} escalated to coordinator / EMS. (TEST — no real call was placed.)`, 'team', 'alert');
    const tgt = usersWhere(x => x.id !== u.id && ((x.role === 'coord' && x.chapter === e.chapter) || x.role === 'lcsw'));
    notify(tgt.map(x => x.id), { text: `ESCALATION on ${e.id} by ${u.name} — coordinator / EMS requested (test)`, link: `#/enc/${e.id}`, urgent: true });
    return { ok: true, notified: tgt.length };
  });
  on('md', (u, d) => {
    const e = findEnc(d.id); if (!e || !active(e)) return { error: 'Encounter not active' };
    e.mdRequested = true;
    e.messages.push({ id: uid(5), kind: 'md', channel: 'team', userId: u.id, name: u.name, role: u.role, text: clip(d.text || 'Requesting the on-call MD on this encounter.', 600), at: Date.now() });
    const mds = roleUsers('md', e.chapter);
    notify(mds.map(x => x.id), { text: `MD requested on ${e.id} by ${u.name}`, link: `#/enc/${e.id}`, urgent: true });
    return { ok: true, notified: mds.length };
  });
  on('chat', (u, d) => {
    const e = findEnc(d.id); if (!e) return { error: 'Not found' };
    if (!canChat(u, e)) return { error: 'You are not on this encounter.' };
    const text = clip(String(d.text || '').trim(), 1000); if (!text) return { error: 'empty' };
    const channel = ['team', 'lcsw', 'coord'].includes(d.channel) ? d.channel : 'team';
    e.messages.push({ id: uid(5), kind: 'msg', channel, userId: u.id, name: u.name, role: u.role, text, at: Date.now() });
    if (e.messages.length > 400) e.messages = e.messages.slice(-300);
    for (const x of usersWhere(x => x.id !== u.id && (inTeam(x, e) || (role(x).oversight && canSeeEnc(x, e))))) for (const s of online.get(x.id) || []) s.emit('chatPing', { id: e.id, name: u.name });
  });
  on('checkin', (u, d) => {
    const e = findEnc(d.id); if (!e || !active(e)) return { error: 'Encounter not active' };
    const z = seed.CHAPTERS[e.chapter].safeZones.find(z => z.id === d.zone); if (!z) return { error: 'Unknown safe zone' };
    const used = (db.zoneUse[z.id] || []).filter(id => { const x = findEnc(id); return x && active(x) && x.id !== e.id; });
    if (used.length >= z.rooms) return { error: 'No rooms free at this safe zone (test data).' };
    db.zoneUse[z.id] = used.concat(e.id);
    e.checkin = { zoneId: z.id, zoneName: z.name, at: Date.now(), by: u.name };
    sysMsg(e, `${u.name} checked the guest in at ${z.name}.`);
    notify(roleUsers('lcsw', e.chapter).map(x => x.id), { text: `Guest checked in at ${z.name} (${e.id})`, link: `#/enc/${e.id}` });
  });
  on('closeout', (u, d) => {
    const e = findEnc(d.id); if (!e || !active(e)) return { error: 'Encounter not active' };
    if (!inTeam(u, e) && u.role !== 'coord') return { error: 'Only a responder or coordinator can close out.' };
    const outcome = ['home', 'family', 'hospital', 'other'].includes(d.outcome) ? d.outcome : null;
    if (!outcome) return { error: 'Choose where the guest went.' };
    const hosp = outcome === 'hospital' ? seed.CHAPTERS[e.chapter].hospitals.find(h => h.id === d.hospitalId) : null;
    if (outcome === 'hospital' && !hosp) return { error: 'Choose the hospital.' };
    e.closeout = { outcome, hospitalId: hosp ? hosp.id : null, hospitalName: hosp ? hosp.name : null, admitted: !!d.admitted, other: clip(d.other, 120), notes: clip(d.notes, 1500), debrief: !!d.debrief, by: u.name, at: Date.now() };
    e.status = 'review'; e.accepting = false;
    const mins = Math.max(15, Math.round((Date.now() - e.createdAt) / 60000));
    for (const r of e.responders) { const x = r.userId && db.users[r.userId]; if (x) { x.encounters = (x.encounters || 0) + 1; x.hours = Math.round(((x.hours || 0) + mins / 60) * 10) / 10; } }
    sysMsg(e, `Encounter closed out by ${u.name} · outcome: ${outcome}${hosp ? ' (' + hosp.name + ')' : ''}. Awaiting LCSW review.`);
    let liaisons = [];
    if (hosp) {
      e.handoff = { status: 'pending', hospitalName: hosp.name, at: Date.now() };
      liaisons = roleUsers('liaison', e.chapter);
      notify(liaisons.map(x => x.id), { text: `Hospital handoff: ${e.id} → ${hosp.name}. Please accept.`, link: `#/close/${e.id}`, urgent: true });
    }
    notify(roleUsers('lcsw', e.chapter).map(x => x.id), { text: `${e.id} closed out — needs your review & sign-off`, link: `#/close/${e.id}` });
    return { ok: true, liaisonsNotified: liaisons.length };
  });
  on('handoff', (u, d) => {
    const e = findEnc(d.id); if (!e || !e.handoff) return { error: 'No handoff' };
    if (u.role !== 'liaison' && u.role !== 'coord') return { error: 'Only a hospital liaison can accept.' };
    e.handoff = { ...e.handoff, status: 'accepted', liaisonName: u.name, liaisonId: u.id, note: clip(d.note || 'Got it — I\'ll meet them at intake and follow up on aftercare.', 400), at: Date.now() };
    sysMsg(e, `${u.name} (hospital liaison) accepted the handoff to ${e.handoff.hospitalName}.`);
    notify(e.responders.filter(r => r.userId).map(r => r.userId), { text: `${u.name} accepted the hospital handoff for ${e.id}`, link: `#/close/${e.id}` });
  });
  on('signoff', (u, d) => {
    const e = findEnc(d.id); if (!e || e.status !== 'review') return { error: 'Nothing to sign off' };
    if (u.role !== 'lcsw') return { error: 'Only an LCSW can sign off.' };
    e.signoff = { by: u.name, at: Date.now(), comment: clip(d.comment, 400) }; e.status = 'closed';
    sysMsg(e, `Reviewed and signed off by ${u.name}, LCSW.`);
    notify(e.responders.filter(r => r.userId).map(r => r.userId), { text: `${u.name} (LCSW) signed off ${e.id}`, link: `#/close/${e.id}` });
  });

  on('signup', (u, d) => {
    const ev = db.events.find(x => x.id === d.event); if (!ev) return { error: 'Unknown event' };
    const sh = ev.shifts.find(s => s.id === d.shift); if (!sh) return { error: 'Unknown shift' };
    const i = ev.signups.findIndex(s => s.userId === u.id && s.shiftId === sh.id);
    if (i < 0 && ev.cancelled) return { error: 'This event is cancelled.' };
    const wasIn = signedUp(u, ev);
    if (i >= 0) ev.signups.splice(i, 1); // toggle off
    else ev.signups.push({ userId: u.id, name: u.name, role: u.role, shiftId: sh.id, at: Date.now() }); // no cap on event shifts
    if (i < 0 && !wasIn && ev.briefing && PARTS.some(k => ev.briefing[k] && ev.briefing[k].recipients === 'all'))
      notify([u.id], { text: `🎟️ You're signed up for ${ev.title}. Entry credentials & instructions are on the event page — please acknowledge.`, link: `#/event/${ev.id}`, urgent: true, kind: 'briefing', event: ev.id });
    return { ok: true, signedUp: i < 0 };
  });

  on('post', (u, d) => {
    const title = clip(String(d.title || '').trim(), 120); if (title.length < 3) return { error: 'Add a short title.' };
    const p = { id: uid(5), chapter: u.chapter, author: u.name, userId: u.id, cat: clip(d.cat || 'Other', 30), urgent: !!d.urgent, title, body: clip(d.body, 1000), at: Date.now(), replies: [], helpers: [] };
    db.board.push(p); if (db.board.length > 300) db.board.shift();
    return { ok: true, id: p.id };
  });
  on('reply', (u, d) => {
    const p = db.board.find(x => x.id === d.id); if (!p) return { error: 'Post not found' };
    const body = clip(String(d.body || '').trim(), 1000); if (!body) return { error: 'empty' };
    p.replies.push({ id: uid(5), author: u.name, userId: u.id, body, at: Date.now() });
    if (p.userId && p.userId !== u.id) notify([p.userId], { text: `${u.name} replied to "${p.title}"`, link: `#/post/${p.id}` });
  });
  on('help', (u, d) => {
    const p = db.board.find(x => x.id === d.id); if (!p) return { error: 'Post not found' };
    const i = p.helpers.indexOf(u.id);
    if (i >= 0) p.helpers.splice(i, 1); else { p.helpers.push(u.id); if (p.userId && p.userId !== u.id) notify([p.userId], { text: `${u.name} can help with "${p.title}"`, link: `#/post/${p.id}` }); }
  });

  on('dm', (u, d) => {
    const r = d.role; if (!ROLES[r] || !ROLES[r].oversight) return { error: 'bad role' };
    let t;
    if (d.thread) { t = db.dms[d.thread]; if (!t || (t.userId !== u.id && t.role !== u.role)) return { error: 'not found' }; }
    else { const id = `${u.id}:${r}`; t = db.dms[id] || (db.dms[id] = { id, userId: u.id, userName: u.name, chapter: u.chapter, role: r, messages: [] }); }
    const text = clip(String(d.text || '').trim(), 1000);
    if (!text) return { ok: true, thread: t.id };
    t.messages.push({ id: uid(5), userId: u.id, name: u.name, role: u.role, text, at: Date.now() });
    t.updated = Date.now();
    const to = t.userId === u.id ? roleUsers(t.role, t.chapter).map(x => x.id) : [t.userId];
    notify(to.filter(x => x !== u.id), { text: `${u.name}: ${text.slice(0, 80)}`, link: `#/dm/${encodeURIComponent(t.id)}` });
    return { ok: true, thread: t.id };
  });
  on('read', (u) => { for (const n of db.notifs) if (n.to === u.id) n.read = true; });

  on('reset', (u) => {
    if (!isPriv(u)) return { error: 'Only admins and chapter leads can reset demo data.' };
    resetDemo(u.name);
  });
});

server.listen(PORT, () => console.log(`Zendo Response TEST app on :${PORT} (access code ${ACCESS_CODE ? 'required' : 'off'})`));

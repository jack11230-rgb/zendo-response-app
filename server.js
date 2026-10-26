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
const DB_VERSION = 4;
const MAX_RESPONDERS = 3; // applies to crisis calls only (event shifts are unlimited)

const ROLES = {
  t1: { label: 'Tier 1 volunteer', short: 'Tier 1', volunteer: true },
  t2: { label: 'Tier 2 volunteer / lead', short: 'Tier 2', volunteer: true },
  coord: { label: 'Coordinator', short: 'Coordinator', oversight: true },
  lcsw: { label: 'LCSW', short: 'LCSW', oversight: true, network: true },
  md: { label: 'MD', short: 'MD', oversight: true, network: true },
  liaison: { label: 'Hospital liaison', short: 'Liaison', oversight: true }
};
const uid = (n = 8) => crypto.randomBytes(n).toString('hex');
const clip = (s, n) => String(s == null ? '' : s).replace(/\s+$/,'').slice(0, n);

// ---------- storage ----------
let db;
function freshData(keepUsers) {
  const now = Date.now();
  const users = keepUsers || {};
  for (const u of Object.values(users)) { u.onDuty = false; u.hours = 0; u.encounters = 0; }
  return {
    version: DB_VERSION, seededAt: now, users,
    seq: { bk: 417, les: 212 },
    encounters: seed.history(now),
    events: seed.events(),
    board: seed.board(now),
    dms: {},
    notifs: [],
    zoneUse: {} // zoneId -> [encounterId]
  };
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
  return { id: u.id, name: u.name, role: u.role, chapter: u.chapter, onDuty: !!u.onDuty, online: isOnline(u.id), initials: initials(u.name), color: u.color };
}
const COLORS = ['#AB6B9E', '#4f8a74', '#3f6fb5', '#c98a1b', '#c56a57', '#65206b', '#2f7f8a', '#8a5a2f'];
const findEnc = id => db.encounters.find(e => e.id === id);
const active = e => e.status === 'active';
function canSeeEnc(u, e) {
  const r = role(u);
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
function viewFor(u) {
  const ch = seed.CHAPTERS[u.chapter];
  const chapterUsers = usersWhere(x => x.chapter === u.chapter).map(pubUser);
  const network = usersWhere(x => role(x).network && x.chapter !== u.chapter).map(pubUser);
  const encs = db.encounters.filter(e => canSeeEnc(u, e)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 60).map(e => encView(u, e));
  const zoneUse = {};
  for (const z of ch.safeZones) zoneUse[z.id] = (db.zoneUse[z.id] || []).filter(id => { const e = findEnc(id); return e && active(e); }).length;
  const dms = Object.values(db.dms).filter(t => t.userId === u.id || t.role === u.role).map(t => ({ ...t, messages: t.messages.slice(-100) }));
  return {
    me: { ...pubUser(u), hours: u.hours || 0, encounters: u.encounters || 0, availability: u.availability, eventsCount: db.events.filter(ev => ev.signups.some(s => s.userId === u.id)).length },
    chapter: { ...ch, places: undefined }, chapters: Object.values(seed.CHAPTERS).map(c => ({ id: c.id, name: c.name })),
    users: chapterUsers.concat(network), sample: seed.SAMPLE_MEMBERS[u.chapter],
    encounters: encs, zoneUse,
    events: db.events.map(ev => ({ ...ev, signups: ev.signups.map(s => ({ ...s })) })),
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
  if (!ROLES[r]) return res.status(400).json({ error: 'Pick a role.' });
  if (!seed.CHAPTERS[chapter]) return res.status(400).json({ error: 'Pick a chapter.' });
  const u = { id: uid(6), token: uid(18), name: nm, role: r, chapter, onDuty: false, hours: 0, encounters: 0, availability: [0, 1, 0, 1, 2, 2, 1], createdAt: Date.now(), color: COLORS[Object.keys(db.users).length % COLORS.length] };
  db.users[u.id] = u; save();
  res.json({ token: u.token, id: u.id });
});
app.get('/api/me', (req, res) => {
  const t = String(req.headers['x-token'] || '');
  const u = Object.values(db.users).find(x => x.token === t);
  if (!u) return res.status(401).json({ error: 'signed out' });
  res.json(viewFor(u));
});
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
  const u = Object.values(db.users).find(x => x.token === t);
  if (!u) return next(new Error('unauthorized'));
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
    if (d.chapter && seed.CHAPTERS[d.chapter]) u.chapter = d.chapter;
    if (d.role && ROLES[d.role]) u.role = d.role;
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
    if (i >= 0) ev.signups.splice(i, 1); // toggle off
    else ev.signups.push({ userId: u.id, name: u.name, role: u.role, shiftId: sh.id, at: Date.now() }); // no cap on event shifts
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
    if (u.role !== 'coord') return { error: 'Only coordinators can reset demo data.' };
    db = freshData(db.users);
    io.emit('reset', { by: u.name });
    console.log('demo data reset by', u.name);
  });
});

server.listen(PORT, () => console.log(`Zendo Response TEST app on :${PORT} (access code ${ACCESS_CODE ? 'required' : 'off'})`));

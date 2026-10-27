/* Zendo Response TEST — leadership tools: admin panel, event management, event briefings (credentials + instructions).
   Loaded before app.js; app.js looks up XS (screens) and XA (actions). All permissions are enforced on the server. */
'use strict';
const XS = {}; const XA = {};
async function api(method, path, body) {
  try {
    const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'x-token': S.token || '' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: j.error || ('Error ' + r.status), status: r.status };
    return j;
  } catch (e) { return { error: 'Network problem, try again.' }; }
}
const isPrivMe = () => !!(S.state && S.state.admin);
const ACCESS_LABEL = { admin: 'Admin', lead: 'Chapter lead' };
const STATUS = {
  none: ['Not a recipient', 'outline'], sent: ['Sent · not opened', 'coral'], seen: ['Seen · not acked', 'amber'], ack: ['Acknowledged', 'sage'],
  'sent-updated': ['Updated · not opened', 'coral'], 'seen-updated': ['Updated · seen', 'amber']
};
const stChip = (s, tid) => `<span class="chip ${STATUS[s] ? STATUS[s][1] : 'outline'}" ${tid ? `data-testid="${tid}"` : ''} data-status="${s}">${STATUS[s] ? STATUS[s][0] : esc(s)}</span>`;
const chName = id => ((S.state.chapters.find(c => c.id === id) || {}).name || id);
const evById = id => S.state.events.find(e => e.id === id);
function noAccess(back) { return `<div class="screen notab">${hdr('Leaders only', '', back || '#/home')}<div class="wrap"><div class="card"><p class="sm">This area is for admins, chapter leads and event lead teams. Sign in with a leadership account.</p></div></div></div>`; }

/* ---------- ADMIN PANEL ---------- */
XS.admin = function () {
  const a = S.state.admin; if (!a) return noAccess();
  const tab = S.ui.adTab || 'overview'; const chf = S.ui.adCh || 'all';
  const inF = ch => chf === 'all' || ch === chf;
  const members = a.members.filter(m => inF(m.chapter));
  const evs = S.state.events.filter(e => e.canManage && inF(e.chapter)).sort((x, y) => x.date.localeCompare(y.date));
  const calls = a.calls.filter(c => inF(c.chapter));
  const T = (id, label) => `<button class="chip ${tab === id ? 'act' : 'outline'}" data-act="adTab" data-v="${id}" data-testid="adtab-${id}">${label}</button>`;
  let body = '';
  if (tab === 'overview') {
    const live = calls.filter(c => c.status === 'active');
    const stat = (l, v, tid) => `<div class="card" style="flex:1;padding:12px;min-width:30%"><div class="muted xs b">${l}</div><div class="pop" style="font-size:22px;font-weight:600" ${tid ? `data-testid="${tid}"` : ''}>${v}</div></div>`;
    body = `<div class="row" style="gap:8px;flex-wrap:wrap">${stat('MEMBERS', members.filter(m => m.active).length, 'stat-members')}${stat('ONLINE', members.filter(m => m.online).length)}${stat('ON DUTY', members.filter(m => m.onDuty).length)}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${stat('LIVE CALLS', live.length, 'stat-live')}${stat('EVENTS', evs.filter(e => !e.cancelled).length)}${stat('INACTIVE', members.filter(m => !m.active).length)}</div>
    <div class="sec">Upcoming events · briefing status</div>
    <div class="card" style="padding:2px 14px">${evs.slice(0, 6).map(ev => { const t = ev.tracking || []; const ack = t.filter(x => x.parts.credentials === 'ack').length; const sent = !!(ev.briefing && ev.briefing.parts.credentials);
      return `<button ${LI} data-go="#/brief/${ev.id}"><div style="flex:1;min-width:0"><div class="b sm">${esc(ev.title)}${ev.cancelled ? ' <span class="chip coral">Cancelled</span>' : ''}</div><div class="xs muted">${esc(ev.day)} · ${esc(chName(ev.chapter))} · ${t.length} signed up · lead team: ${esc(ev.leadTeamNames.join(', ') || 'none')}</div><div class="xs" style="margin-top:2px;color:${sent ? 'var(--sage)' : 'var(--muted)'};font-weight:600">${sent ? `Credentials sent · ${ack}/${t.length} acknowledged` : 'No credentials sent yet'}</div></div>${ic('cr', 's')}</button>`; }).join('') || '<div class="empty">No events.</div>'}</div>
    <div class="sec">Demo data</div><div class="card"><p class="sm" style="line-height:1.45">Clears every encounter, chat, sign-up, briefing, board post and DM for <b>everyone</b>, then reloads the fake sample data and the seeded test accounts.</p><button class="btn red" style="margin-top:10px" data-act="reset" data-testid="admin-reset">${ic('refresh', 's')} Reset demo data</button></div>`;
  } else if (tab === 'members') {
    body = `<div class="xs muted" style="margin-bottom:6px">${members.length} member${members.length === 1 ? '' : 's'} · tap one to change role, lead access or status</div><div class="card" style="padding:2px 14px">${members.map(m => `<button ${LI} data-act="memberOpen" data-id="${m.id}" data-testid="member-${m.id}">${av(m.name, '', m.online ? true : false, m.color)}<div style="flex:1;min-width:0"><div class="b sm" style="${m.active ? '' : 'text-decoration:line-through;opacity:.6'}">${esc(m.name)}${m.id === S.state.me.id ? ' (you)' : ''}</div><div class="xs muted">${esc(roleLabel(m.role))} · ${esc(chName(m.chapter))}${m.leadOf.length ? ' · event lead ×' + m.leadOf.length : ''}</div></div>
      ${m.access ? `<span class="chip mauve">${ACCESS_LABEL[m.access]}</span>` : ''}${m.active ? '' : '<span class="chip coral" data-testid="inactive">Inactive</span>'}</button>`).join('')}</div>`;
  } else if (tab === 'events') {
    body = `<button class="btn primary" data-go="#/newevent" data-testid="newevent">${ic('plus', 's')} New event</button>
    <div class="card" style="padding:2px 14px;margin-top:10px">${evs.map(ev => `<button ${LI} data-go="#/admin-event/${ev.id}" data-testid="adev-${ev.id}"><div style="flex:1;min-width:0"><div class="b sm">${esc(ev.title)}${ev.cancelled ? ' <span class="chip coral">Cancelled</span>' : ''}</div><div class="xs muted">${esc(ev.day)} · ${esc(ev.time)} · ${esc(chName(ev.chapter))}</div><div class="xs muted">Lead team: ${esc(ev.leadTeamNames.join(', ') || 'not assigned')} · ${new Set(ev.signups.map(s => s.userId)).size} signed up</div></div>${ic('cr', 's')}</button>`).join('') || '<div class="empty">No events.</div>'}</div>`;
  } else if (tab === 'calls') {
    const row = c => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)">${c.status === 'active' ? '<span class="live">LIVE</span>' : c.status === 'review' ? '<span class="live rev">REVIEW</span>' : '<span class="live done">DONE</span>'}<div style="flex:1;min-width:0"><div class="b sm">${esc(c.id)} · ${esc(c.type)}</div><div class="xs muted">${esc(c.place || '')} · ${ago(c.createdAt)} · ${c.responders.length}/${S.state.maxResponders} ${esc(c.responders.join(', '))}${c.escalated ? ' · escalated' : ''}${c.seeded ? ' · sample' : ''}</div></div>${c.status === 'active' || !c.seeded ? `<button class="chip outline" data-go="#/enc/${c.id}">Open</button>` : ''}</div>`;
    const live = calls.filter(c => c.status === 'active');
    body = `<div class="sec" style="margin-top:0">Live now (${live.length})</div><div class="card" style="padding:2px 14px" data-testid="live-calls">${live.map(row).join('') || '<div class="empty">No live test calls.</div>'}</div>
    <div class="sec">Recent</div><div class="card" style="padding:2px 14px">${calls.filter(c => c.status !== 'active').map(row).join('') || '<div class="empty">None yet.</div>'}</div>`;
  } else if (tab === 'announce') {
    const f = S.ui.ann || (S.ui.ann = { chapter: a.isAdmin ? 'all' : S.state.me.chapter, urgent: false });
    body = `<div class="card"><div class="field" style="margin-top:0"><span>Send to</span><div class="opt">${(a.isAdmin ? ['all'].concat(a.scope) : a.scope).map(c => `<button type="button" class="${f.chapter === c ? 'sel' : ''}" data-act="annCh" data-v="${c}">${c === 'all' ? 'All chapters' : esc(chName(c))}</button>`).join('')}</div></div>
    <label class="field"><span>Announcement (no guest names or health info)</span><textarea class="input" id="ann-text" maxlength="500" placeholder="e.g. Training this Sunday moved to 3 PM (test)">${val('ann-text')}</textarea></label>
    <div class="row between" style="padding:4px 0"><div class="b sm">Urgent (loud alert)</div><button class="toggle ${f.urgent ? 'on' : ''}" data-act="annUrgent" aria-label="Urgent"></button></div>
    <div class="err" id="ann-err"></div><button class="btn primary" style="margin-top:8px" data-act="annSend" data-testid="annsend">${ic('send', 's')} Send announcement</button></div>
    <div class="sec">Sent</div><div class="card" style="padding:2px 14px">${a.announcements.map(x => `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div class="sm">${x.urgent ? '<span class="chip coral">Urgent</span> ' : ''}${esc(x.text)}</div><div class="xs muted">${esc(x.by)} · ${x.chapter === 'all' ? 'All chapters' : esc(chName(x.chapter))} · ${ago(x.at)}</div></div>`).join('') || '<div class="empty">No announcements yet.</div>'}</div>`;
  }
  return `<div class="screen notab">${hdr(a.isAdmin ? 'Admin panel' : 'Lead panel', a.isAdmin ? 'Program-wide · all chapters' : esc(chName(S.state.me.chapter)) + ' only', '#/home')}<div class="wrap" data-testid="admin-panel">
  <div class="card row" style="background:var(--mauve-l);border:0;padding:10px 12px">${ic('award', 's')}<div class="xs"><b>${esc(S.state.me.name)}</b> · ${ACCESS_LABEL[S.state.me.access]} · ${a.isAdmin ? 'you can manage every chapter' : 'you can manage your chapter'}. Test data only.</div></div>
  ${a.isAdmin ? `<div class="scroller" style="margin:10px 0 4px">${['all'].concat(a.scope).map(c => `<button class="chip ${chf === c ? 'act' : 'outline'}" data-act="adCh" data-v="${c}" data-testid="adch-${c}">${c === 'all' ? 'All chapters' : esc(chName(c))}</button>`).join('')}</div>` : ''}
  <div class="scroller" style="margin:8px 0 12px">${T('overview', 'Overview')}${T('members', 'Members')}${T('events', 'Events')}${T('calls', 'Calls')}${T('announce', 'Announce')}</div>
  ${body}<p class="disclaimer" style="margin-top:12px">TEST VERSION · fictional people and events · permissions are enforced on the server</p></div></div>`;
};
Object.assign(XA, {
  adTab(el) { S.ui.adTab = el.dataset.v; render(true); },
  adCh(el) { S.ui.adCh = el.dataset.v; render(); },
  annCh(el) { S.ui.ann.chapter = el.dataset.v; render(); },
  annUrgent() { S.ui.ann.urgent = !S.ui.ann.urgent; render(); },
  async annSend() {
    const r = await api('POST', '/api/admin/announce', { chapter: S.ui.ann.chapter, text: S.drafts['ann-text'] || '', urgent: S.ui.ann.urgent });
    if (r.error) { $('#ann-err').textContent = r.error; return; }
    delete S.drafts['ann-text']; toast(`Announcement sent to ${r.sentTo} member${r.sentTo === 1 ? '' : 's'}`); render();
  },
  memberOpen(el) {
    const a = S.state.admin; const m = a.members.find(x => x.id === el.dataset.id); if (!m) return;
    const self = m.id === S.state.me.id; const locked = !a.isAdmin && m.access && !self;
    modal(`<h3 style="font-size:17px">${esc(m.name)}</h3><div class="xs muted" style="margin-top:2px">${esc(chName(m.chapter))}${m.username ? ' · login: ' + esc(m.username) : ' · quick-start tester'} · ${m.online ? 'online' : 'offline'}</div>
    ${locked ? '<p class="sm" style="margin:12px 0">Only an admin can change another lead or admin.</p>' : `
    <div class="field"><span>Role / tier</span><div class="opt">${a.assignableRoles.map(k => `<button type="button" class="${m.role === k ? 'sel' : ''}" data-act="memSet" data-id="${m.id}" data-k="role" data-v="${k}" data-testid="mrole-${k}">${esc(roleLabel(k))}</button>`).join('')}</div></div>
    ${a.isAdmin && !self ? `<div class="field"><span>Leadership access</span><div class="opt">${[['', 'None'], ['lead', 'Chapter lead'], ['admin', 'Admin']].map(([k, l]) => `<button type="button" class="${(m.access || '') === k ? 'sel' : ''}" data-act="memSet" data-id="${m.id}" data-k="access" data-v="${k}" data-testid="macc-${k || 'none'}">${l}</button>`).join('')}</div>${m.username ? '' : '<div class="xs muted" style="margin-top:4px">Quick-start testers have no password, so they can’t get lead access.</div>'}</div>
    <div class="field"><span>Chapter</span><div class="opt">${S.state.chapters.map(c => `<button type="button" class="${m.chapter === c.id ? 'sel' : ''}" data-act="memSet" data-id="${m.id}" data-k="chapter" data-v="${c.id}">${esc(c.name)}</button>`).join('')}</div></div>` : ''}
    ${m.leadOf.length ? `<div class="xs muted" style="margin:8px 0">Event lead team: ${m.leadOf.map(id => esc((evById(id) || {}).title || id)).join(', ')}</div>` : ''}
    ${self ? '' : `<button class="btn ${m.active ? 'red' : 'sage'}" style="margin-top:12px" data-act="memSet" data-id="${m.id}" data-k="active" data-v="${m.active ? '0' : '1'}" data-testid="mactive">${m.active ? 'Deactivate member' : 'Reactivate member'}</button>`}`}
    <button class="btn ghost" style="margin-top:8px" data-act="closeModal">Close</button>`);
  },
  async memSet(el) {
    const k = el.dataset.k; let v = el.dataset.v;
    if (k === 'access') v = v || null; if (k === 'active') v = v === '1';
    const r = await api('POST', '/api/admin/users/' + el.dataset.id, { [k]: v });
    if (r.error) { toast(r.error, { urgent: true }); return; }
    closeModal(); toast(`${r.member.name}: ${k === 'active' ? (v ? 'reactivated' : 'deactivated') : k + ' updated'}`);
  }
});

/* ---------- EVENT MANAGEMENT ---------- */
function eventForm(ev, isNew) {
  const p = isNew ? 'ne' : 'ee-' + ev.id; const shifts = ev ? ev.shifts.map(s => `${s.name}, ${s.time}, ${s.target}`).join('\n') : 'Sitter, 10 PM – 2 AM, 8\nShift Lead, 9:30 PM – 2 AM, 2';
  const a = S.state.admin; const chs = a.scope;
  return `${isNew && chs.length > 1 ? `<div class="field"><span>Chapter</span><div class="opt">${chs.map(c => `<button type="button" class="${(S.ui.neCh || S.state.me.chapter) === c ? 'sel' : ''}" data-act="neCh" data-v="${c}">${esc(chName(c))}</button>`).join('')}</div></div>` : ''}
  <label class="field"><span>Title</span><input class="input" id="${p}-title" maxlength="80" value="${val(p + '-title', ev ? ev.title : '')}" placeholder="e.g. Rooftop Sunset Session (test)"></label>
  <div class="row" style="gap:8px"><label class="field" style="flex:1"><span>Date</span><input class="input" type="date" id="${p}-date" value="${val(p + '-date', ev ? ev.date : '')}"></label><label class="field" style="flex:1"><span>Time</span><input class="input" id="${p}-time" maxlength="80" value="${val(p + '-time', ev ? ev.time : '')}" placeholder="9 PM – 3 AM"></label></div>
  <label class="field"><span>Place (fictional)</span><input class="input" id="${p}-place" maxlength="80" value="${val(p + '-place', ev ? ev.place : '')}" placeholder="Neighborhood"></label>
  <div class="field"><span>Kind</span><div class="opt">${['Parties', 'Festivals', 'Community', 'Trainings'].map(k => `<button type="button" class="${(S.drafts[p + '-kind'] || (ev ? ev.kind : 'Parties')) === k ? 'sel' : ''}" data-act="evKind" data-p="${p}" data-v="${k}">${k}</button>`).join('')}</div></div>
  <label class="field"><span>Shifts · one per line: name, time, target (no cap, target is a goal)</span><textarea class="input" id="${p}-shifts" rows="3">${val(p + '-shifts', shifts)}</textarea></label>`;
}
const formVals = (p, ev) => ({ title: S.drafts[p + '-title'] ?? (ev && ev.title), date: S.drafts[p + '-date'] ?? (ev && ev.date), time: S.drafts[p + '-time'] ?? (ev && ev.time) ?? '', place: S.drafts[p + '-place'] ?? (ev && ev.place) ?? '', kind: S.drafts[p + '-kind'] || (ev ? ev.kind : 'Parties'), shifts: S.drafts[p + '-shifts'] ?? (ev ? ev.shifts.map(s => `${s.name}, ${s.time}, ${s.target}`).join('\n') : 'Sitter, 10 PM – 2 AM, 8\nShift Lead, 9:30 PM – 2 AM, 2') });
const clearForm = p => { for (const k of Object.keys(S.drafts)) if (k.startsWith(p + '-')) delete S.drafts[k]; };
XS.newevent = function () {
  if (!isPrivMe()) return noAccess();
  return `<div class="screen notab">${hdr('New event', 'Test event · visible to the chapter', '#/admin')}<div class="wrap">${eventForm(null, true)}<div class="err" id="ne-err"></div><button class="btn primary" style="margin-top:8px" data-act="neCreate" data-testid="necreate">Create event</button></div></div>`;
};
XS['admin-event'] = function (r) {
  const ev = evById(r.id); if (!ev || !ev.canManage) return noAccess('#/admin');
  const p = 'ee-' + ev.id; const sel = S.ui.lt && S.ui.lt.ev === ev.id ? S.ui.lt.ids : ev.leadTeam;
  const cands = S.state.admin.members.filter(m => m.active && m.chapter === ev.chapter);
  const su = new Set(ev.signups.map(s => s.userId));
  return `<div class="screen notab">${hdr(esc(ev.title), esc(ev.day) + ' · ' + esc(chName(ev.chapter)), '#/admin')}<div class="wrap">
  ${ev.cancelled ? `<div class="card" style="background:var(--coral-l);border-color:#f3cfc6"><b>Cancelled</b> by ${esc(ev.cancelled.by)} · ${ago(ev.cancelled.at)}</div>` : ''}
  <div class="sec" style="margin-top:4px">Event lead team</div>
  <div class="card" data-testid="leadteam-card"><p class="xs muted" style="margin-bottom:6px">Lead team members can send entry credentials and special instructions to volunteers for this event.</p>
  ${cands.map(m => `<button ${LI} data-act="ltToggle" data-ev="${ev.id}" data-id="${m.id}" data-testid="lt-${m.id}" aria-pressed="${sel.includes(m.id)}"><span class="chk ${sel.includes(m.id) ? 'on' : ''}" style="width:22px;height:22px;border-radius:6px;border:2px solid var(--plum);display:inline-flex;align-items:center;justify-content:center;background:${sel.includes(m.id) ? 'var(--plum)' : 'transparent'};color:#fff;flex:none">${sel.includes(m.id) ? '✓' : ''}</span><div style="flex:1;min-width:0"><div class="b sm">${esc(m.name)}</div><div class="xs muted">${esc(roleLabel(m.role))}${su.has(m.id) ? ' · signed up' : ''}${m.access ? ' · ' + ACCESS_LABEL[m.access] : ''}</div></div></button>`).join('')}
  <button class="btn primary" style="margin-top:10px" data-act="ltSave" data-ev="${ev.id}" data-testid="ltsave">Save lead team (${sel.length})</button>
  <button class="btn ghost" style="margin-top:8px" data-go="#/brief/${ev.id}" data-testid="open-brief-admin">${ic('send', 's')} Open event briefing</button></div>
  <div class="sec">Edit details</div><div class="card">${eventForm(ev, false)}<div class="err" id="ee-err"></div><button class="btn primary" style="margin-top:8px" data-act="eeSave" data-ev="${ev.id}" data-testid="eesave">Save changes</button></div>
  <button class="btn ${ev.cancelled ? 'sage' : 'red'}" style="margin-top:12px" data-act="evCancel" data-ev="${ev.id}" data-testid="evcancel">${ev.cancelled ? 'Restore event' : 'Cancel event'}</button>
  <p class="disclaimer" style="margin-top:10px">Cancelling notifies everyone signed up (test). Events have no volunteer cap.</p></div></div>`;
};
Object.assign(XA, {
  neCh(el) { S.ui.neCh = el.dataset.v; render(); },
  evKind(el) { S.drafts[el.dataset.p + '-kind'] = el.dataset.v; render(); },
  async neCreate() {
    const r = await api('POST', '/api/admin/events', { chapter: S.ui.neCh || S.state.me.chapter, ...formVals('ne') });
    if (r.error) { $('#ne-err').textContent = r.error; return; }
    clearForm('ne'); toast('Event created'); location.hash = '#/admin-event/' + r.id;
  },
  async eeSave(el) {
    const ev = evById(el.dataset.ev); const p = 'ee-' + ev.id;
    const r = await api('PATCH', '/api/admin/events/' + ev.id, formVals(p, ev));
    if (r.error) { $('#ee-err').textContent = r.error; return; }
    clearForm(p); toast('Event saved');
  },
  ltToggle(el) {
    const ev = evById(el.dataset.ev); if (!S.ui.lt || S.ui.lt.ev !== ev.id) S.ui.lt = { ev: ev.id, ids: ev.leadTeam.slice() };
    const ids = S.ui.lt.ids; const i = ids.indexOf(el.dataset.id); if (i >= 0) ids.splice(i, 1); else ids.push(el.dataset.id); render();
  },
  async ltSave(el) {
    const ev = evById(el.dataset.ev); const ids = S.ui.lt && S.ui.lt.ev === ev.id ? S.ui.lt.ids : ev.leadTeam;
    const r = await api('PUT', `/api/admin/events/${ev.id}/lead-team`, { userIds: ids });
    if (r.error) { toast(r.error, { urgent: true }); return; }
    S.ui.lt = null; toast(`Lead team saved (${r.leadTeam.length})`);
  },
  evCancel(el) {
    const ev = evById(el.dataset.ev); const restore = !!ev.cancelled;
    confirmBox(restore ? 'Restore this event?' : 'Cancel this event?', restore ? 'Everyone signed up will be told it is back on (test).' : 'Everyone signed up and the lead team will be notified (test).', restore ? 'Restore' : 'Cancel event', async () => { const r = await api('POST', `/api/admin/events/${ev.id}/cancel`, { restore }); if (r.error) toast(r.error); else toast(r.cancelled ? 'Event cancelled' : 'Event restored'); }, !restore);
  }
});

/* ---------- EVENT BRIEFING (lead team) ---------- */
const CRED = [['type', 'Credential type', 'e.g. Wristband, lanyard, QR ticket'], ['pickup', 'Pickup location', 'Where volunteers collect it'], ['pickupTime', 'Pickup time', 'e.g. Fri 9:15 PM'], ['gate', 'Entry gate / door', 'e.g. Gate C staff entrance'], ['contact', 'On-site contact', 'Name + how to reach'], ['code', 'Code / ticket # (fake for testing)', 'e.g. ZEN-TEST-1234']];
function recipPicker(ev, part) {
  const st = (S.ui.br = S.ui.br || {})[ev.id + part] || (S.ui.br[ev.id + part] = { mode: (ev.briefing && ev.briefing.parts[part] && Array.isArray(ev.briefing.parts[part].recipients)) ? 'some' : 'all', ids: (ev.briefing && ev.briefing.parts[part] && Array.isArray(ev.briefing.parts[part].recipients)) ? ev.briefing.parts[part].recipients.slice() : [] });
  const t = ev.tracking || [];
  return `<div class="field"><span>Send to</span><div class="opt"><button type="button" class="${st.mode === 'all' ? 'sel' : ''}" data-act="brMode" data-k="${ev.id + part}" data-v="all" data-testid="${part}-to-all">All signed-up (${t.length})</button><button type="button" class="${st.mode === 'some' ? 'sel' : ''}" data-act="brMode" data-k="${ev.id + part}" data-v="some" data-testid="${part}-to-some">Selected volunteers</button></div>
  ${st.mode === 'some' ? `<div style="margin-top:6px">${t.map(x => `<button ${LI} data-act="brPick" data-k="${ev.id + part}" data-id="${x.userId}" data-testid="${part}-pick-${x.userId}"><span style="width:20px;height:20px;border-radius:5px;border:2px solid var(--plum);display:inline-flex;align-items:center;justify-content:center;background:${st.ids.includes(x.userId) ? 'var(--plum)' : 'transparent'};color:#fff;flex:none;font-size:12px">${st.ids.includes(x.userId) ? '✓' : ''}</span><div class="sm" style="flex:1">${esc(x.name)} <span class="xs muted">· ${esc(x.shifts.join(', '))}</span></div></button>`).join('')}</div>` : ''}
  <div class="xs muted" style="margin-top:4px">${st.mode === 'all' ? 'Volunteers who sign up later get this automatically.' : 'Only the selected volunteers will see this part.'}</div></div>`;
}
XS.brief = function (r) {
  const ev = evById(r.id); if (!ev || !ev.canBrief) return noAccess('#/event/' + (r.id || ''));
  const tab = S.ui.brTab || 'cred'; const b = ev.briefing || { parts: {}, history: [] }; const t = ev.tracking || [];
  const cp = b.parts.credentials; const ip = b.parts.instructions;
  const cnt = k => ({ ack: t.filter(x => x.parts[k] === 'ack').length, rec: t.filter(x => x.parts[k] !== 'none').length });
  const T = (id, label) => `<button class="chip ${tab === id ? 'act' : 'outline'}" data-act="brTab" data-v="${id}" data-testid="brtab-${id}">${label}</button>`;
  let body = '';
  if (tab === 'cred') {
    const f = cp ? cp.fields : {};
    body = `<div class="card" data-testid="cred-composer"><div class="xs muted">${cp ? `Current: v${cp.version} · sent by ${esc(cp.by)} · ${ago(cp.sentAt)}` : 'Not sent yet'}</div>
    ${CRED.map(([k, l, ph]) => `<label class="field"><span>${l}</span><input class="input" id="cr-${ev.id}-${k}" maxlength="160" placeholder="${esc(ph)}" value="${val(`cr-${ev.id}-${k}`, f[k] || '')}"></label>`).join('')}
    <label class="field"><span>Notes</span><textarea class="input" id="cr-${ev.id}-notes" maxlength="600" rows="2" placeholder="ID needed, what to show at the gate…">${val(`cr-${ev.id}-notes`, f.notes || '')}</textarea></label>
    ${recipPicker(ev, 'credentials')}<div class="err" id="br-err"></div>
    <button class="btn primary" style="margin-top:8px" data-act="brSend" data-ev="${ev.id}" data-part="credentials" data-testid="send-credentials">${ic('send', 's')} ${cp ? `Send update (v${cp.version + 1})` : 'Send credentials'}</button>
    <p class="xs muted" style="margin-top:6px">Recipients get a live alert and must tap “Acknowledge”. Updating requires a fresh acknowledgement.</p></div>`;
  } else if (tab === 'instr') {
    body = `<div class="card" data-testid="instr-composer"><div class="xs muted">${ip ? `Current: v${ip.version} · sent by ${esc(ip.by)} · ${ago(ip.sentAt)}` : 'Not sent yet'}</div>
    <label class="field"><span>Special instructions</span><textarea class="input" id="in-${ev.id}" maxlength="2000" rows="6" placeholder="Where to meet, what to bring, schedule changes…">${val('in-' + ev.id, ip ? ip.fields.text : '')}</textarea></label>
    ${recipPicker(ev, 'instructions')}<div class="err" id="br-err"></div>
    <button class="btn primary" style="margin-top:8px" data-act="brSend" data-ev="${ev.id}" data-part="instructions" data-testid="send-instructions">${ic('send', 's')} ${ip ? `Send update (v${ip.version + 1})` : 'Send instructions'}</button></div>`;
  } else if (tab === 'acks') {
    const c1 = cnt('credentials'), c2 = cnt('instructions');
    body = `<div class="row" style="gap:8px"><div class="card" style="flex:1;padding:12px"><div class="muted xs b">CREDENTIALS ACKED</div><div class="pop" style="font-size:22px;font-weight:600" data-testid="ack-count-cred">${c1.ack}/${c1.rec}</div></div><div class="card" style="flex:1;padding:12px"><div class="muted xs b">INSTRUCTIONS ACKED</div><div class="pop" style="font-size:22px;font-weight:600" data-testid="ack-count-instr">${c2.ack}/${c2.rec}</div></div></div>
    <div class="sec">Signed-up volunteers (${t.length})</div><div class="card" style="padding:2px 14px" data-testid="ack-table">${t.map(x => `<div style="padding:9px 0;border-bottom:1px solid var(--line)" data-testid="ack-row-${x.userId}"><div class="row">${av(x.name, 'sm', x.online)}<div style="flex:1;min-width:0"><div class="b sm">${esc(x.name)}${x.lead ? ' <span class="chip mauve">Lead team</span>' : ''}</div><div class="xs muted">${esc(roleLabel(x.role))} · ${esc(x.shifts.join(', '))}</div></div></div>
      <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><span class="xs muted" style="width:72px">Credentials</span>${stChip(x.parts.credentials, 'st-cred-' + x.userId)}${x.receipt.credentials && x.receipt.credentials.ackAt && x.parts.credentials === 'ack' ? `<span class="xs muted">${ago(x.receipt.credentials.ackAt)}</span>` : ''}</div>
      <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap"><span class="xs muted" style="width:72px">Instructions</span>${stChip(x.parts.instructions, 'st-instr-' + x.userId)}${x.receipt.instructions && x.receipt.instructions.ackAt && x.parts.instructions === 'ack' ? `<span class="xs muted">${ago(x.receipt.instructions.ackAt)}</span>` : ''}</div></div>`).join('') || '<div class="empty">Nobody signed up yet.</div>'}</div>
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary sm" style="flex:1" data-act="brResend" data-ev="${ev.id}" data-only="unacked" data-testid="remind-unacked">${ic('bell', 's')} Remind un-acked</button><button class="btn ghost sm" style="flex:1" data-act="brResend" data-ev="${ev.id}" data-only="all" data-testid="resend-all">Resend to all</button></div>`;
  } else {
    body = `<div class="card" style="padding:2px 14px" data-testid="brief-history">${(b.history || []).map(h => `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div class="sm"><b>${esc(h.by)}</b> ${h.kind === 'reminder' ? 'sent a reminder' : h.kind} ${h.part === 'both' ? 'briefing' : esc(h.part)}${h.version ? ' v' + h.version : ''}</div><div class="xs muted">to ${esc(h.to)} (${h.count}) · ${ago(h.at)} · ${tm(h.at)}</div></div>`).join('') || '<div class="empty">Nothing sent yet.</div>'}</div>`;
  }
  return `<div class="screen notab">${hdr('Event briefing', esc(ev.title) + ' · ' + esc(ev.day), '#/event/' + ev.id)}<div class="wrap" data-testid="brief-screen">
  <div class="card row" style="background:var(--mauve-l);border:0;padding:10px 12px">${ic('award', 's')}<div class="xs">Lead team: <b>${esc(ev.leadTeamNames.join(', ') || 'not assigned')}</b>. Only volunteers signed up for this event can see what you send. Use fake codes in this test.</div></div>
  ${ev.cancelled ? '<div class="card" style="margin-top:8px;background:var(--coral-l)"><b>This event is cancelled.</b></div>' : ''}
  <div class="scroller" style="margin:10px 0 12px">${T('cred', 'Credentials')}${T('instr', 'Instructions')}${T('acks', `Acks ${cnt('credentials').ack}/${t.length}`)}${T('hist', 'History')}</div>
  ${body}<p class="disclaimer" style="margin-top:12px">TEST VERSION · fake credentials only</p></div></div>`;
};
Object.assign(XA, {
  brTab(el) { S.ui.brTab = el.dataset.v; render(true); },
  brMode(el) { S.ui.br[el.dataset.k].mode = el.dataset.v; render(); },
  brPick(el) { const st = S.ui.br[el.dataset.k]; const i = st.ids.indexOf(el.dataset.id); if (i >= 0) st.ids.splice(i, 1); else st.ids.push(el.dataset.id); render(); },
  async brSend(el) {
    const ev = evById(el.dataset.ev); const part = el.dataset.part; const st = S.ui.br[ev.id + part];
    const cur = ev.briefing && ev.briefing.parts[part] ? ev.briefing.parts[part].fields : {};
    let fields;
    if (part === 'credentials') { fields = {}; for (const [k] of CRED.concat([['notes']])) { const id = `cr-${ev.id}-${k}`; fields[k] = S.drafts[id] != null ? S.drafts[id] : (cur[k] || ''); } }
    else fields = { text: S.drafts['in-' + ev.id] != null ? S.drafts['in-' + ev.id] : (cur.text || '') };
    el.disabled = true;
    const r = await api('POST', `/api/events/${ev.id}/briefing`, { part, fields, recipients: st.mode === 'all' ? 'all' : st.ids });
    el.disabled = false;
    if (r.error) { const e = $('#br-err'); if (e) e.textContent = r.error; return; }
    for (const k of Object.keys(S.drafts)) if (k.startsWith(`cr-${ev.id}-`) || k === 'in-' + ev.id) delete S.drafts[k];
    toast(`${part === 'credentials' ? 'Credentials' : 'Instructions'} v${r.version} sent to ${r.sentTo} volunteer${r.sentTo === 1 ? '' : 's'}`);
  },
  async brResend(el) { const r = await api('POST', `/api/events/${el.dataset.ev}/briefing/resend`, { only: el.dataset.only }); toast(r.error || (r.sentTo ? `Reminder sent to ${r.sentTo}` : 'Everyone has already acknowledged')); },
  async brAck(el) { const r = await api('POST', `/api/events/${el.dataset.ev}/briefing/ack`, {}); toast(r.error || 'Acknowledged · your lead team can see it'); }
});

/* ---------- volunteer-facing briefing card (used on the event page) ---------- */
const readSent = new Set();
function briefingCard(ev) {
  let html = '';
  if (ev.cancelled) html += `<div class="card" style="margin-top:10px;background:var(--coral-l);border-color:#f3cfc6" data-testid="ev-cancelled"><b>This event was cancelled</b><div class="xs muted">by ${esc(ev.cancelled.by)} · ${ago(ev.cancelled.at)} (test)</div></div>`;
  if (ev.leadTeamNames.length) html += `<div class="xs muted" style="margin-top:10px">Event lead team: <b>${esc(ev.leadTeamNames.join(', '))}</b></div>`;
  if (ev.canBrief) html += `<button class="btn primary" style="margin-top:10px" data-go="#/brief/${ev.id}" data-testid="open-brief">${ic('send', 's')} Event briefing · send credentials & instructions</button>`;
  const b = ev.briefing;
  if (b && (b.parts.credentials || b.parts.instructions)) {
    const c = b.parts.credentials, i = b.parts.instructions;
    const mineParts = [c, i].filter(p => p && p.myStatus !== 'none');
    const needAck = mineParts.some(p => p.myStatus !== 'ack');
    const unread = mineParts.some(p => /^sent/.test(p.myStatus));
    const key = ev.id + ':' + mineParts.map(p => p.version).join(',');
    if (unread && !readSent.has(key)) { readSent.add(key); setTimeout(() => api('POST', `/api/events/${ev.id}/briefing/read`, {}), 300); }
    const F = (l, v, big) => v ? `<div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06)"><div class="xs muted b" style="letter-spacing:.4px;text-transform:uppercase">${l}</div><div class="${big ? 'pop' : 'sm'}" style="${big ? 'font-size:20px;font-weight:700;letter-spacing:1px' : ''}" ${big ? 'data-testid="cred-code"' : ''}>${esc(v)}</div></div>` : '';
    html += `<div class="card" style="margin-top:10px;border:2px solid var(--plum)" data-testid="briefing-card">
      <div class="row between"><div class="b">🎟️ Your event briefing</div>${needAck ? '<span class="chip coral" data-testid="brief-status">Please acknowledge</span>' : '<span class="chip sage" data-testid="brief-status">✓ Acknowledged</span>'}</div>
      ${c ? `<div class="sec" style="margin-top:8px">Entry credentials · v${c.version}</div>${F('Credential', c.fields.type)}${F('Code / ticket', c.fields.code, true)}${F('Pick up at', c.fields.pickup)}${F('Pickup time', c.fields.pickupTime)}${F('Entry gate', c.fields.gate)}${F('On-site contact', c.fields.contact)}${F('Notes', c.fields.notes)}<div class="xs muted" style="margin-top:4px">Sent by ${esc(c.by)} · ${ago(c.sentAt)}</div>` : ''}
      ${i ? `<div class="sec">Special instructions · v${i.version}</div><div class="sm" style="white-space:pre-wrap;line-height:1.45" data-testid="instr-text">${esc(i.fields.text)}</div><div class="xs muted" style="margin-top:4px">Sent by ${esc(i.by)} · ${ago(i.sentAt)}</div>` : ''}
      ${needAck ? `<button class="btn primary" style="margin-top:12px" data-act="brAck" data-ev="${ev.id}" data-testid="ack-brief">${ic('check', 's')} Acknowledge — I've got it</button>` : ''}
      <p class="xs muted" style="margin-top:8px">Only volunteers signed up for this event can see this. Fake test credentials.</p></div>`;
  } else if (ev.briefingLocked) {
    html += `<div class="card" style="margin-top:10px;background:var(--sand-l)" data-testid="briefing-locked">🔒 <b>Entry credentials & instructions</b><div class="sm muted" style="margin-top:4px">${ev.signups.some(s => s.userId === S.state.me.id) ? 'The lead team has not sent a briefing to you yet. You will get an alert when they do.' : 'The lead team has sent a briefing for this event. Sign up for a shift to see it.'}</div></div>`;
  }
  return html;
}

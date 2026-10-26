/* Zendo Response — TEST VERSION client. Fake data only. Not for real emergencies. */
(function () {
'use strict';
const S = { token: localStorage.getItem('zr_token'), state: null, socket: null, drafts: {}, ui: { chatTab: 'team', evFilter: 'All', boardFilter: 'All', hospTab: 'psych', close: {}, zone: {}, redflags: {} }, config: null };
const app = document.getElementById('app');
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${(window.ICONS || {})[n] || ''}</svg>`;
const ini = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const COLORS = ['#AB6B9E', '#4f8a74', '#3f6fb5', '#c98a1b', '#c56a57', '#65206b', '#2f7f8a', '#8a5a2f'];
const colorFor = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const av = (name, cls = '', dot, color) => `<div class="av ${cls}" style="background:${color || colorFor(name)}">${esc(ini(name))}${dot === true ? '<span class="on"></span>' : dot === false ? '<span class="off"></span>' : ''}</div>`;
const tm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const ago = t => { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 24) return h + ' hr' + (h > 1 ? 's' : '') + ' ago'; const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : d + ' days ago'; };
const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(v => String(v).padStart(2, '0')).join(':'); };
const roleLabel = r => ((S.state && S.state.roles[r]) || (S.config && S.config.roles[r]) || { label: r }).label;
const roleShort = r => ((S.state && S.state.roles[r]) || { short: r }).short;
const isVol = r => r === 't1' || r === 't2';
const isOversight = r => !isVol(r);
const OUTCOMES = { home: ['Home', 'safely', 'home2'], family: ['Family', 'or friend', 'family'], hospital: ['Hospital', 'escalated', 'hosp'], other: ['Other', 'specify', 'more'] };
const LI = 'class="li" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);text-align:left"';

const bar = $('#testbar');
const setBar = () => document.documentElement.style.setProperty('--bar', bar.offsetHeight + 'px');
setBar(); window.addEventListener('resize', setBar);
if (window.ResizeObserver) new ResizeObserver(setBar).observe(bar);

let actx = null;
function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } }
document.addEventListener('pointerdown', unlockAudio, { passive: true });
function beep(seq) {
  try {
    if (!actx || actx.state !== 'running') return; let t = actx.currentTime + 0.02;
    for (const [f, d] of seq) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02); t += d + 0.08; }
  } catch (e) { }
}
const vib = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };
const alertSound = () => { beep([[880, .18], [660, .18], [880, .18], [660, .18], [988, .35]]); vib([300, 120, 300, 120, 600]); };
const softSound = () => { beep([[740, .12], [988, .16]]); vib(120); };
function sysNotify(title, body, link) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: link, data: { link }, vibrate: [300, 120, 300] }));
  } catch (e) { }
}

function toast(text, opts = {}) {
  const el = document.createElement('div'); el.className = 'toast' + (opts.urgent ? ' urgent' : '');
  el.innerHTML = `<div style="flex:1">${esc(text)}</div>${opts.link ? '<b style="white-space:nowrap">Open ›</b>' : ''}`;
  if (opts.link) el.onclick = () => { location.hash = opts.link; el.remove(); };
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), opts.ms || 5000);
}
function modal(html) { $('#modalbox').innerHTML = html; $('#modal').classList.add('show'); }
function closeModal() { $('#modal').classList.remove('show'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function testDial(what) {
  modal(`<div class="row" style="gap:12px;align-items:flex-start"><div class="ricon" style="background:var(--coral-l);color:var(--red)">${ic('phone')}</div><div><h3 style="font-size:17px">Test mode: no call placed</h3>
  <p class="sm" style="margin-top:6px;line-height:1.45">In the real app this button would dial <b>${esc(what)}</b>. This is a TEST VERSION with fake data, so nothing was dialed.</p>
  <p class="sm" style="margin-top:8px;line-height:1.45;color:var(--red);font-weight:600">If this is a real emergency, close this app and call 911 (or call/text 988) from your phone now.</p></div></div>
  <button class="btn primary" style="margin-top:14px" data-act="closeModal" data-testid="dialok">Got it</button>`);
}
function confirmBox(title, text, okLabel, onOk, danger) {
  modal(`<h3 style="font-size:17px">${esc(title)}</h3><p class="sm" style="margin:8px 0 14px;line-height:1.45">${text}</p>
  <div class="row"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn ${danger ? 'red' : 'primary'}" id="okbtn">${esc(okLabel)}</button></div>`);
  $('#okbtn').onclick = () => { closeModal(); onOk(); };
}

function emit(name, data) {
  return new Promise(res => {
    if (!S.socket || !S.socket.connected) { toast('Not connected, retrying…'); return res({ error: 'offline' }); }
    S.socket.timeout(10000).emit(name, data || {}, (err, r) => res(err ? { error: 'Timed out, try again' } : (r || {})));
  });
}
function connect() {
  if (S.socket) S.socket.disconnect();
  const sock = S.socket = io({ auth: { token: S.token }, transports: ['websocket', 'polling'] });
  const conn = $('#conn');
  sock.on('connect', () => conn.classList.remove('show'));
  sock.on('disconnect', () => { conn.textContent = 'Reconnecting…'; conn.classList.add('show'); });
  sock.on('connect_error', err => {
    if (err && err.message === 'unauthorized') { signOut(true); return; }
    conn.textContent = 'Connecting… (free test server can take ~1 min to wake)'; conn.classList.add('show');
  });
  sock.on('state', v => { S.state = v; render(); });
  sock.on('alert', a => {
    alertSound();
    sysNotify('TEST crisis alert · ' + a.type, a.place + ' · ' + a.severity, '#/alert/' + a.id);
    const r = route();
    if (r.name === 'enc' || r.name === 'close' || r.name === 'dm') toast(`New TEST alert: ${a.type} · ${a.place}`, { urgent: true, link: '#/alert/' + a.id, ms: 9000 });
    else location.hash = '#/alert/' + a.id;
  });
  sock.on('alertClosed', a => { const r = route(); if (r.name === 'alert' && r.id === a.id) toast('This call is now full (3/3) and closed to new responders.'); });
  sock.on('notify', n => { (n.urgent ? alertSound : softSound)(); toast(n.text, { urgent: n.urgent, link: n.link, ms: 7000 }); sysNotify('Zendo Response (test)', n.text, n.link); });
  sock.on('chatPing', p => { const r = route(); if (!(r.name === 'enc' && r.id === p.id)) { softSound(); toast(`${p.name} posted in ${p.id} chat`, { link: '#/enc/' + p.id }); } });
  sock.on('reset', p => { toast(`Demo data was reset by ${p.by}.`); location.hash = '#/home'; });
}
function signOut(expired) {
  localStorage.removeItem('zr_token'); S.token = null; S.state = null; if (S.socket) { S.socket.disconnect(); S.socket = null; }
  if (expired) toast('Your test session ended (the test server was reset). Please sign in again.', { ms: 7000 });
  location.hash = '#/signin'; render();
}
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.nav) location.hash = e.data.nav; });

function route() {
  const h = location.hash.replace(/^#\/?/, ''); const [name, id, sub] = h.split('/').map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  return { name: name || 'home', id, sub };
}
window.addEventListener('hashchange', () => render(true));

const me = () => S.state.me;
const encs = () => S.state.encounters;
const enc = id => encs().find(e => e.id === id);
const myActive = () => encs().find(e => e.status === 'active' && e.mine);
const chUsers = () => S.state.users.filter(u => u.chapter === me().chapter);
const openAlerts = () => encs().filter(e => e.status === 'active' && e.chapter === me().chapter && e.accepting && !e.mine && e.responders.length < S.state.maxResponders);
const unread = () => S.state.notifs.filter(n => !n.read).length;
const live = u => u.online && u.onDuty;
function clinicians() {
  const us = S.state.users.filter(u => isOversight(u.role) && (u.role === 'lcsw' || u.role === 'md' || u.chapter === me().chapter));
  const order = { lcsw: 0, md: 1, coord: 2, liaison: 3 };
  return us.sort((a, b) => (order[a.role] - order[b.role]) || (b.onDuty - a.onDuty));
}

let lastKey = '';
function render(routeChanged) {
  if (!S.token) { renderSignin(); return; }
  if (!S.state) { app.innerHTML = '<div class="empty" style="padding-top:90px">Connecting to the test server…<br><span class="xs">Free test servers sleep when idle. The first load can take up to a minute.</span></div>'; return; }
  const r = route(); const key = location.hash; const same = key === lastKey && !routeChanged;
  const scrollY = window.scrollY;
  const fe = document.activeElement; const fid = fe && fe.id; let sel = null;
  try { if (fid && fe.selectionStart != null) sel = [fe.selectionStart, fe.selectionEnd]; } catch (e) { }
  const chatEl = $('.chat'); const atBottom = !chatEl || chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 60; const chatScroll = chatEl && chatEl.scrollTop;
  const screens = { home, alerts, alert: alertScreen, enc: encounter, er, safe, close: closeout, help, res: resCard, cat: resCat, events, event: eventDetail, chapter, board, post, newpost: newPost, profile, dm, simulate, signin: home };
  const fn = screens[r.name] || home;
  let html;
  try { html = fn(r); } catch (e) { console.error(e); html = `<div class="wrap"><p class="err" style="padding-top:30px">Something went wrong showing this screen.</p><button class="btn primary" data-go="#/home">Go home</button></div>`; }
  if (html === null) return;
  app.innerHTML = html;
  if (fid && same) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
  window.scrollTo(0, same ? scrollY : 0);
  const c2 = $('.chat'); if (c2) c2.scrollTop = (!same || atBottom) ? c2.scrollHeight : chatScroll;
  lastKey = key;
  mountMaps(); tick();
  if (r.name === 'alerts' && unread()) emit('read');
}
function tabbar(active) {
  const al = (S.state ? openAlerts().length + unread() : 0);
  const t = (id, label, icon) => `<button class="tab ${active === id ? 'act' : ''}" data-go="#/${id}" aria-label="${label}">${ic(icon)}<span>${label}</span>${id === 'alerts' && al ? `<span class="badge">${al}</span>` : ''}</button>`;
  return `<nav class="tabbar">${t('home', 'Home', 'home')}${t('alerts', 'Alerts', 'bell')}${t('help', 'Help', 'life')}${t('events', 'Events', 'cal')}${t('chapter', 'Chapter', 'users')}${t('board', 'Board', 'board')}</nav>`;
}
const topbar = () => `<div class="topbar"><div class="wordmark">Zendo Response</div><span class="concept test">Test version</span></div>`;
const hdr = (title, sub, back) => `<div class="hdr"><button class="back" ${back ? `data-go="${back}"` : 'data-act="back"'} aria-label="Back">${ic('cl')}</button><div style="flex:1;min-width:0"><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
const val = (id, d = '') => esc(S.drafts[id] != null ? S.drafts[id] : d);

const maps = {};
function mountMaps() {
  const seen = new Set();
  document.querySelectorAll('[data-map]').forEach(slot => {
    const k = slot.dataset.map; seen.add(k); let m = maps[k];
    if (!m && window.L) {
      const el = document.createElement('div'); el.style.cssText = 'width:100%;height:100%'; slot.appendChild(el);
      const cfg = JSON.parse(slot.dataset.cfg); const it = !!cfg.interactive;
      const map = L.map(el, { zoomControl: it, dragging: it, scrollWheelZoom: false, touchZoom: it, doubleClickZoom: it, boxZoom: false, keyboard: false }).setView(cfg.center, cfg.zoom || 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      const pts = [];
      for (const mk of cfg.markers || []) { pts.push([mk.lat, mk.lng]); L.marker([mk.lat, mk.lng], { icon: L.divIcon({ className: '', html: `<div class="${mk.kind === 'guest' ? 'gpin' : mk.kind === 'hosp' ? 'hpin' : 'zpin'}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindTooltip(mk.label, { direction: 'top', offset: [0, -8] }); }
      if (cfg.line && cfg.line.length > 1) L.polyline(cfg.line, { color: '#65206b', weight: 4, dashArray: '2 9', lineCap: 'round' }).addTo(map);
      if (cfg.fit && pts.length > 1) map.fitBounds(pts, { padding: [36, 36], maxZoom: 16 });
      m = maps[k] = { el, map };
      setTimeout(() => map.invalidateSize(), 80);
    } else if (m) { slot.appendChild(m.el); setTimeout(() => m.map.invalidateSize(), 0); }
  });
  for (const k in maps) if (!seen.has(k)) { try { maps[k].map.remove(); } catch (e) { } delete maps[k]; }
}
const dropMaps = () => { for (const k in maps) { try { maps[k].map.remove(); } catch (e) { } delete maps[k]; } };
const mapSlot = (key, cfg, cls = 'map', style = '') => `<div class="${cls}" style="${style}" data-map="${esc(key)}" data-cfg="${esc(JSON.stringify(cfg))}"></div>`;

function tick() { document.querySelectorAll('[data-since]').forEach(el => { el.textContent = dur(Date.now() - Number(el.dataset.since)); }); }
setInterval(tick, 1000);
setInterval(() => { if (S.state && !(document.activeElement && document.activeElement.matches('input,textarea,select'))) render(); }, 60000);

/* ========== SCREENS ========== */
function renderSignin() {
  if (!S.config) {
    app.innerHTML = '<div class="empty" style="padding-top:90px">Waking the test server… this can take up to a minute on the free plan.</div>';
    fetch('/api/config').then(r => r.json()).then(c => { S.config = c; renderSignin(); }).catch(() => setTimeout(renderSignin, 3000)); return;
  }
  const c = S.config; const f = S.ui.signin || (S.ui.signin = { role: 't1', chapter: 'bk' });
  app.innerHTML = `<div class="screen notab">${topbar()}<div class="wrap">
  <div class="signin-hero"><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.8;font-weight:700">Volunteer test drill</div>
  <h1 style="font-size:23px;font-weight:600;margin-top:4px">Try Zendo Response</h1>
  <p class="sm" style="opacity:.9;margin-top:6px;line-height:1.45">A working test version for Zendo Project volunteers. Everything here is <b>fake data</b>. Do not enter real guest names or any health information.</p></div>
  <form id="signin" autocomplete="off">
  <label class="field"><span>Your name (first name or nickname)</span><input class="input" id="si-name" maxlength="40" placeholder="e.g. Maya R." value="${val('si-name')}"></label>
  <div class="field"><span>Role for this test</span><div class="opt">${Object.entries(c.roles).map(([k, r]) => `<button type="button" class="${f.role === k ? 'sel' : ''}" data-act="siRole" data-v="${k}">${esc(r.label)}</button>`).join('')}</div></div>
  <div class="field"><span>Chapter</span><div class="opt">${c.chapters.map(ch => `<button type="button" class="${f.chapter === ch.id ? 'sel' : ''}" data-act="siChapter" data-v="${ch.id}">${esc(ch.name)}</button>`).join('')}</div></div>
  ${c.codeRequired ? `<label class="field"><span>Test access code (from your coordinator)</span><input class="input" id="si-code" autocapitalize="none" autocorrect="off" placeholder="access code" value="${val('si-code')}"></label>` : ''}
  <div class="err" id="si-err"></div>
  <button class="btn primary" type="submit" style="margin-top:12px" data-testid="signin">Start testing ${ic('cr', 's')}</button>
  <p class="disclaimer" style="margin-top:12px;line-height:1.5">No passwords. Your name and role are only stored on the test server and are wiped when it resets. Not for real emergencies. In an emergency call 911 or 988.</p>
  </form></div></div>`;
  $('#signin').onsubmit = async ev => {
    ev.preventDefault(); unlockAudio();
    const body = { name: $('#si-name').value, role: f.role, chapter: f.chapter, code: $('#si-code') ? $('#si-code').value : '' };
    const btn = ev.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const r = await fetch('/api/signin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json();
      if (!r.ok) { $('#si-err').textContent = j.error || 'Could not sign in'; btn.disabled = false; return; }
      S.token = j.token; localStorage.setItem('zr_token', j.token); S.drafts = {}; location.hash = '#/home'; connect(); render();
    } catch (e) { $('#si-err').textContent = 'Network problem. The test server may be waking up, try again in a few seconds.'; btn.disabled = false; }
  };
}

function home() {
  const m = me(), ch = S.state.chapter, users = chUsers(), max = S.state.maxResponders;
  const vols = users.filter(u => isVol(u.role) && live(u));
  const t2 = vols.filter(u => u.role === 't2').length;
  const act = encs().filter(e => e.status === 'active' && e.chapter === m.chapter);
  const mine = myActive();
  const z = ch.safeZones[0]; const zFree = z.rooms - (S.state.zoneUse[z.id] || 0);
  const hr = new Date().getHours(); const part = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
  const day = new Date().toLocaleDateString([], { weekday: 'long' });
  const cl = clinicians(); const vol = isVol(m.role); const oa = openAlerts();
  const nextEv = S.state.events.filter(e => e.chapter === m.chapter).sort((a, b) => a.date.localeCompare(b.date))[0];
  const clRow = (u, i) => `<div class="row" style="padding:10px 0;${i < cl.length - 1 ? 'border-bottom:1px solid var(--line)' : ''}">${av(u.name, '', live(u), u.color)}<div style="flex:1;min-width:0"><div class="b">${esc(u.name)}${u.role === 'lcsw' ? ', LCSW' : u.role === 'md' ? ', MD' : ''}${u.id === m.id ? ' (you)' : ''}</div><div class="xs muted">${esc(roleLabel(u.role))} · ${live(u) ? 'on call' : u.online ? 'signed in · off call' : 'offline'}</div></div>
     ${u.id === m.id ? '' : u.role === 'md' ? `<button class="chip blue" data-act="ask" data-role="md">${ic('phone', 'xs')} Call</button>` : u.role === 'lcsw' ? `<button class="chip sage" data-act="ask" data-role="lcsw">${ic('msg', 'xs')} Chat</button>` : `<button class="chip outline" data-act="ask" data-role="${u.role}" aria-label="Message">${ic('msg', 'xs')}</button>`}</div>`;
  return `<div class="screen">${topbar()}<div class="wrap">
  <div class="row between" style="margin:0 0 10px"><div><div class="muted sm">${day} ${part} · ${esc(ch.borough)}</div><h1 style="font-size:23px;font-weight:600;letter-spacing:-.3px">Hi, ${esc(m.name.split(' ')[0])} <span style="color:var(--mauve)">✦</span></h1></div>
  <button data-go="#/profile" style="border:0;background:none" aria-label="Profile">${av(m.name, 'lg', undefined, 'linear-gradient(135deg,#AB6B9E,#65206b)')}</button></div>
  ${mine ? `<button class="card row" data-go="#/enc/${mine.id}" style="width:100%;margin-bottom:10px;background:var(--coral-l);border-color:#f3cfc6;text-align:left"><span class="live">LIVE</span><div style="flex:1"><div class="b">You're on ${esc(mine.id)}</div><div class="xs muted">${esc(mine.place.name)} · ${mine.responders.length}/${max} responders</div></div>${ic('cr', 's')}</button>` : ''}
  ${oa.length && vol ? `<button class="card row" data-go="#/alert/${oa[0].id}" style="width:100%;margin-bottom:10px;background:#2a0f2e;color:#fff;border:0;text-align:left">${ic('bell')}<div style="flex:1"><div class="b">Open alert: ${esc(oa[0].type)}</div><div class="xs" style="opacity:.8">${esc(oa[0].place.name)} · ${oa[0].responders.length}/${max} responders</div></div>${ic('cr', 's')}</button>` : ''}
  <div class="card" style="background:linear-gradient(135deg,#65206b,#8a3b8c);color:#fff;border:none;padding:16px">
   <div class="row between"><div><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.75;font-weight:700">Your status</div>
   <div class="pop" style="font-size:21px;font-weight:600;margin-top:2px" data-testid="dutylabel">${m.onDuty ? (vol ? 'On duty' : 'On call') : (vol ? 'Off duty' : 'Off call')}</div>
   <div style="font-size:12px;opacity:.85;margin-top:2px">${esc(ch.short)} chapter · ${m.onDuty ? (vol ? 'receiving crisis alerts' : 'available to the team') : 'not receiving alerts'}</div></div>
   <button class="toggle ${m.onDuty ? 'on' : ''}" data-act="duty" data-testid="duty" aria-label="Toggle on duty" aria-pressed="${m.onDuty}"></button></div>
   <div class="row" style="margin-top:13px;gap:8px;flex-wrap:wrap">
    <span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${ic('pin', 'xs')} ${esc(ch.short)}</span>
    <span class="chip" style="background:rgba(255,255,255,.16);color:#fff">${ic('award', 'xs')} ${esc(roleLabel(m.role))}</span></div>
  </div>
  <div class="row" style="gap:10px;margin-top:12px;align-items:stretch">
   <div class="card" style="flex:1;padding:12px"><div class="muted xs b">ON DUTY</div><div class="pop" style="font-size:22px;font-weight:600" data-testid="ondutycount">${vols.length}</div><div class="xs" style="color:var(--sage);font-weight:600">● ${t2} T2 · ${vols.length - t2} T1</div></div>
   <div class="card" style="flex:1;padding:12px"><div class="muted xs b">ACTIVE</div><div class="pop" style="font-size:22px;font-weight:600" data-testid="activecount">${act.length}</div><div class="xs" style="color:var(--plum);font-weight:600">${act.length ? act.slice(0, 3).map(e => e.responders.length + '/' + max).join(' · ') + ' resp.' : 'no live calls'}</div></div>
   <button class="card" style="flex:1;padding:12px;text-align:left" data-go="#/safe/${mine ? mine.id : '-'}"><div class="muted xs b">SAFE ZONE</div><div class="pop" style="font-size:22px;font-weight:600">${zFree}<span style="font-size:13px"> free</span></div><div class="xs" style="color:var(--sage);font-weight:600">${esc(z.name.split(' ').slice(0, 2).join(' '))}</div></button>
  </div>
  <button class="btn primary" style="margin-top:12px" data-go="#/simulate" data-testid="simulate">${ic('zap', 's')} Simulate crisis (test)</button>
  <div class="sec" style="margin-top:16px">Clinical team on call <a data-go="#/chapter">View chapter</a></div>
  <div class="card" style="padding:4px 14px">${cl.length ? cl.map(clRow).join('') : `<div class="empty">No LCSW, MD or coordinator signed in yet.<br>For a drill, ask someone to sign in as <b>LCSW</b> and <b>Coordinator</b>.</div>`}</div>
  ${nextEv ? `<div class="sec" style="margin-top:14px">Next up</div>
  <button class="card row" style="padding:12px;width:100%;text-align:left" data-go="#/event/${nextEv.id}"><div style="width:44px;height:48px;border-radius:12px;background:var(--mauve-l);color:var(--plum);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none"><div class="xs bb">${esc(nextEv.day.split(' ')[1])}</div><div class="pop" style="font-size:17px;font-weight:600;line-height:1">${esc(nextEv.day.split(' ')[2])}</div></div>
  <div style="flex:1"><div class="b">${esc(nextEv.title)}</div><div class="xs muted">${esc(nextEv.place)} · ${esc(nextEv.shifts[0].name)} shift ${esc(nextEv.shifts[0].time)}</div></div>${ic('cr', 's')}</button>` : ''}
  </div>${tabbar('home')}</div>`;
}

function encRow(e, extra = '') {
  const m = me(); const max = S.state.maxResponders;
  const href = e.status === 'active' ? ((e.mine || isOversight(m.role)) ? '#/enc/' : '#/alert/') : '#/close/';
  return `<button ${LI} data-go="${href}${e.id}">
   <div class="ricon" style="background:${e.status === 'active' ? 'var(--coral-l)' : 'var(--sand-l)'};color:${e.status === 'active' ? 'var(--red)' : 'var(--ink2)'}">${ic(e.icon || 'heart', 's')}</div>
   <div style="flex:1;min-width:0"><div class="b sm">${esc(e.id)} · ${esc(e.type)}</div><div class="xs muted">${esc(e.place.name)} · ${ago(e.createdAt)} · ${e.responders.length}/${max}${e.closeout ? ' · ' + esc(OUTCOMES[e.closeout.outcome][0]) : ''}</div></div>${extra}${ic('cr', 's')}</button>`;
}
const encStatus = e => e.status === 'active' ? '<span class="live">LIVE</span>' : e.status === 'review' ? '<span class="live rev">REVIEW</span>' : '<span class="live done">SIGNED</span>';
function alerts() {
  const m = me(); const all = encs();
  const oa = isVol(m.role) ? openAlerts() : [];
  const activeList = all.filter(e => e.status === 'active' && (e.mine || isOversight(m.role) || e.chapter === m.chapter));
  const review = all.filter(e => e.status === 'review');
  const handoffs = all.filter(e => e.handoff && e.handoff.status === 'pending');
  const hist = all.filter(e => e.status !== 'active');
  const dms = S.state.dms.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const box = inner => `<div class="card list" style="padding:2px 14px">${inner}</div>`;
  return `<div class="screen">${topbar()}<div class="wrap">
  <h1 style="font-size:26px;font-weight:600">Alerts</h1><div class="muted sm" style="margin-bottom:10px">Live calls, messages and history · ${esc(S.state.chapter.short)}</div>
  <button class="btn primary" data-go="#/simulate">${ic('zap', 's')} Simulate crisis (test)</button>
  ${oa.length ? `<div class="sec">Open alerts <span class="chip coral">${oa.length}</span></div>${box(oa.map(e => encRow(e)).join(''))}` : ''}
  <div class="sec">Active encounters</div>${box(activeList.length ? activeList.map(e => encRow(e, encStatus(e))).join('') : '<div class="empty">No live calls right now. Tap “Simulate crisis” to start a drill.</div>')}
  ${m.role === 'lcsw' || m.role === 'coord' ? `<div class="sec">Needs LCSW review</div>${box(review.length ? review.map(e => encRow(e, encStatus(e))).join('') : '<div class="empty">Nothing waiting for sign-off.</div>')}` : ''}
  ${m.role === 'liaison' || m.role === 'coord' ? `<div class="sec">Hospital handoffs</div>${box(handoffs.length ? handoffs.map(e => encRow(e, '<span class="chip coral">Pending</span>')).join('') : '<div class="empty">No pending handoffs.</div>')}` : ''}
  <div class="sec">Messages</div>${box(dms.length ? dms.map(t => { const last = t.messages[t.messages.length - 1]; return `<button ${LI} data-go="#/dm/${encodeURIComponent(t.id)}">${av(t.userId === m.id ? roleShort(t.role) : t.userName, 'sm')}<div style="flex:1;min-width:0"><div class="b sm">${t.userId === m.id ? 'You ↔ on-call ' + esc(roleLabel(t.role)) : esc(t.userName) + ' → ' + esc(roleLabel(t.role))}</div><div class="xs muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.name + ': ' + last.text) : 'No messages yet'}</div></div>${ic('cr', 's')}</button>`; }).join('') : '<div class="empty">Use “Ask LCSW” or “Ask MD” on the Help tab to start a direct chat.</div>')}
  <div class="sec">Activity</div>${box(S.state.notifs.length ? S.state.notifs.slice().reverse().slice(0, 15).map(n => `<button ${LI} data-go="${esc(n.link || '#/alerts')}"><span style="width:8px;height:8px;border-radius:50%;background:${n.urgent ? 'var(--red)' : 'var(--mauve)'};flex:none"></span><div style="flex:1"><div class="sm">${esc(n.text)}</div><div class="xs muted">${ago(n.at)}</div></div></button>`).join('') : '<div class="empty">No notifications yet.</div>')}
  <div class="sec">Encounter history</div>${box(hist.length ? hist.map(e => encRow(e, encStatus(e))).join('') : '<div class="empty">No closed encounters yet.</div>')}
  </div>${tabbar('alerts')}</div>`;
}

function alertScreen(r) {
  const e = enc(r.id); const m = me(); const max = S.state.maxResponders;
  if (!e) return `<div class="screen notab">${hdr('Alert not found', 'It may have been reset', '#/home')}<div class="wrap"><button class="btn primary" data-go="#/home">Home</button></div></div>`;
  const n = e.responders.length; const full = n >= max || !e.accepting;
  const ord = n === 0 ? 'lead' : (n + 1) + (n === 1 ? 'nd' : 'rd') + ' of ' + max;
  let cta;
  if (e.mine) cta = `<button class="btn white" data-go="#/enc/${e.id}">${ic('check')} You're on this call · open encounter</button>`;
  else if (e.status !== 'active') cta = `<button class="btn white" data-go="#/close/${e.id}">This alert is closed · view summary</button>`;
  else if (full) cta = `<button class="btn white" disabled data-testid="full">${ic('lock')} Team full · ${n}/${max} · closed to others</button>`;
  else if (!isVol(m.role)) cta = `<button class="btn white" data-go="#/enc/${e.id}">${ic('eye')} Open encounter (oversight view)</button>`;
  else if (e.chapter !== m.chapter) cta = `<button class="btn white" disabled>Alert is for another chapter</button>`;
  else if (!m.onDuty) cta = `<button class="btn white" data-act="dutyAccept" data-id="${e.id}" data-testid="accept">Go on duty & accept · ${ord}</button>`;
  else cta = `<button class="btn white" data-act="accept" data-id="${e.id}" data-testid="accept">${ic('check')} Accept & respond · ${ord}</button>`;
  const slots = []; for (let i = 0; i < max; i++) { const x = e.responders[i]; slots.push(x ? `<div class="slot">${av(x.name, 'sm')}<div class="b" style="margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.name)}</div><div class="xs" style="opacity:.75">${x.kind === 'lead' ? 'Lead' : 'Support'} · ${roleShort(x.tier)}</div></div>` : `<div class="slot open"><div style="width:28px;height:28px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.5);margin:0 auto;display:flex;align-items:center;justify-content:center">${ic('plus', 'xs')}</div><div class="b" style="margin-top:4px">Open spot</div><div class="xs" style="opacity:.75">${i === 0 ? 'Lead' : 'Support'}</div></div>`); }
  const sevC = { Low: 'sage', Moderate: 'amber', High: 'coral' }[e.severity] || 'coral';
  return `<div class="alertscreen">
  <div style="text-align:center"><span class="chip" style="background:rgba(255,255,255,.12);color:#fff">${ic('bell', 'xs')} ${e.status === 'active' ? 'Crisis alert (TEST)' : 'Alert (closed)'} · ${tm(e.createdAt)}</span></div>
  <div class="pulse"><i>${ic(e.icon || 'heart', 'l')}</i></div>
  <h1 style="text-align:center;font-size:22px;font-weight:600;line-height:1.2">${esc(e.type)}</h1>
  <div style="text-align:center;opacity:.75;font-size:13px;margin-top:4px">Simulated by ${esc(e.createdBy || 'test')} · ${esc(e.id)}</div>
  <div class="card" style="margin-top:14px;padding:0;overflow:hidden;color:var(--ink)">
   ${mapSlot('alert-' + e.id, { center: [e.place.lat, e.place.lng], zoom: 15, markers: [{ lat: e.place.lat, lng: e.place.lng, kind: 'guest', label: 'Guest (fake location)' }] }, 'map', 'border-radius:0')}
   <div style="padding:12px 14px"><div class="row between"><div><div class="b" style="font-size:15.5px">${esc(e.place.name)}</div><div class="xs muted">${esc(e.place.area)} · fake location</div></div><span class="chip ${sevC}">${esc(e.severity)}</span></div>
   <p class="sm" style="margin-top:8px;line-height:1.45;color:var(--ink2)">${esc(e.summary)}</p>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">${(e.tags || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
  </div>
  <div class="dark-card" style="margin-top:12px"><div class="row between" style="margin-bottom:9px"><div class="row" style="gap:8px"><span class="xs bb" style="letter-spacing:.8px">RESPONDERS</span><span class="chip" style="background:#fff;color:var(--plum);padding:2px 9px" data-testid="count">${n}/${max}</span></div><span class="xs" style="opacity:.75">Up to ${max} can accept${full ? ' · full' : ' · ' + (max - n) + ' spot' + (max - n === 1 ? '' : 's') + ' left'}</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">${slots.join('')}</div></div>
  <div style="margin-top:14px">${cta}</div>
  <div class="row" style="margin-top:10px"><button class="btn glass" data-act="decline" data-id="${e.id}">${e.mine || !isVol(m.role) ? 'Back' : "Can't respond"}</button><button class="btn glass" data-act="dial" data-what="the person who reported this (fake)">${ic('phone', 's')} Call reporter</button></div>
  </div>`;
}

function chatMsgs(list, m) {
  return list.map(x => {
    if (x.kind === 'system' || x.kind === 'alert') return `<div class="sys ${x.kind === 'alert' ? 'alert' : ''}">${tm(x.at)} · ${esc(x.text)}</div>`;
    const mine = x.userId === m.id;
    const col = x.role === 'lcsw' ? 'var(--sage)' : x.role === 'md' ? 'var(--blue)' : x.role === 'coord' ? 'var(--plum)' : 'var(--mauve)';
    return `<div class="msgrow" style="${mine ? 'justify-content:flex-end' : ''}">${mine ? '' : av(x.name, 'sm')}<div class="msg ${mine ? 'me' : 'them'} ${x.kind === 'md' ? 'md' : ''}">${mine ? '' : `<div class="who" style="color:${col}">${esc(x.name)} · ${esc(roleShort(x.role))}${x.kind === 'md' ? ' · MD request' : ''}</div>`}${x.kind === 'md' && mine ? '<b>MD request · </b>' : ''}${esc(x.text)}</div></div>`;
  }).join('');
}
function encounter(r) {
  const e = enc(r.id); const m = me(); const max = S.state.maxResponders;
  if (!e) return `<div class="screen notab">${hdr('Encounter not found', '', '#/alerts')}<div class="wrap"><button class="btn primary" data-go="#/alerts">Alerts</button></div></div>`;
  if (!e.canChat) { if (S.pending === e.id && Date.now() - S.pendingAt < 6000) return `<div class="screen notab">${hdr('Joining ' + esc(e.id) + '…', '', '#/home')}<div class="empty">Joining the team…</div></div>`; location.replace('#/alert/' + e.id); return null; }
  if (e.status !== 'active') { location.replace('#/close/' + e.id); return null; }
  const lcsws = S.state.users.filter(u => u.role === 'lcsw' && live(u));
  const myR = e.responders.find(x => x.userId === m.id);
  const tab = S.ui.chatTab;
  const mates = []; for (let i = 0; i < max; i++) { const x = e.responders[i]; mates.push(x ? `<div class="mate">${av(x.name, 'sm', true)}<div style="min-width:0"><div class="nm">${esc(x.name.split(' ')[0])}${x.userId === m.id ? ' · you' : ''}</div><div class="xs muted">${x.kind === 'lead' ? 'Lead' : 'Support'} · ${roleShort(x.tier).replace('Tier ', 'T')}</div><div class="xs b" style="color:${x.status === 'on scene' ? 'var(--sage)' : 'var(--amber)'}">${x.status === 'on scene' ? 'On scene' : 'En route'}</div></div></div>` : `<div class="mate open">${e.accepting ? 'Open · paging…' : 'Open spot'}</div>`); }
  const msgs = e.messages.filter(x => x.channel === tab || (tab === 'team' && !x.channel));
  const emptyTxt = tab === 'lcsw' ? 'Private thread between the team and the on-call LCSW.' : tab === 'coord' ? 'Thread between the team and the chapter coordinator.' : 'No messages yet.';
  const chatHtml = tab === 'help' ? helpInline() : `<div class="chat" data-testid="chat">${msgs.length ? chatMsgs(msgs, m) : `<div class="empty">${emptyTxt}</div>`}</div>`;
  const canClose = e.mine || m.role === 'coord';
  const fullTeam = e.responders.length >= max;
  return `<div class="screen notab">
  <div class="hdr"><button class="back" data-go="#/home" aria-label="Back">${ic('cl')}</button><div style="flex:1;min-width:0"><div class="row" style="gap:8px"><h2>Encounter #${esc(e.id)}</h2><span class="live">LIVE</span></div><div class="sub">${myR ? (myR.status === 'on scene' ? 'On scene' : 'En route') : 'Oversight view'} · ${esc(e.place.name)} · <span data-since="${e.createdAt}">00:00:00</span></div></div></div>
  <div class="wrap">
  <div class="card row" style="background:${lcsws.length ? 'var(--sage-l)' : 'var(--amber-l)'};border-color:transparent;padding:11px 13px">${ic('eye', 's')}<div class="sm" style="flex:1"><b>${lcsws.length ? esc(lcsws.map(u => u.name).join(', ')) + ', LCSW' : 'No LCSW on call yet'}</b> ${lcsws.length ? 'is overseeing this encounter remotely' : '· chat is still logged for review'}</div><span class="xs b" style="color:var(--sage)">Clinical</span></div>
  ${e.escalated ? `<div class="card row" style="background:var(--coral-l);border-color:#f2cfc7;margin-top:8px;padding:10px 13px" data-testid="escalated">${ic('alert', 's')}<div class="sm b" style="color:var(--red)">Escalated to coordinator / EMS (test)</div></div>` : ''}
  ${e.checkin ? `<div class="card row" style="margin-top:8px;padding:10px 13px">${ic('shield', 's')}<div class="sm">Guest checked in at <b>${esc(e.checkin.zoneName)}</b> · ${tm(e.checkin.at)}</div></div>` : ''}
  <div class="row between" style="margin:12px 0 7px"><div class="row" style="gap:8px"><span class="xs bb muted" style="letter-spacing:.8px">RESPONDER TEAM</span><span class="chip mauve" style="padding:2px 9px" data-testid="teamcount">${e.responders.length}/${max}</span></div><span class="xs muted">max ${max} per call</span></div>
  <div class="team">${mates.join('')}</div>
  ${myR ? `<div class="row" style="margin-top:8px;gap:8px"><button class="chip ${myR.status === 'on scene' ? 'sage' : 'amber'}" data-act="status" data-id="${e.id}" data-v="${myR.status === 'on scene' ? 'en route' : 'on scene'}">${ic('pin', 'xs')} ${myR.status === 'on scene' ? "I'm on scene ✓" : 'Mark me on scene'}</button><button class="chip outline" data-act="leave" data-id="${e.id}">Leave call</button></div>` : ''}
  <div class="pill-tabs" style="margin-top:12px">${[['team', 'Team chat'], ['lcsw', 'LCSW'], ['coord', 'Coordinator'], ['help', 'Help']].map(([k, l]) => `<div class="${tab === k ? 'act' : ''}" data-act="chatTab" data-v="${k}" role="button">${l}</div>`).join('')}</div>
  ${chatHtml}
  <div class="actions" style="margin-top:8px">
   ${fullTeam ? `<button class="act amber" data-act="escalate" data-id="${e.id}" data-testid="escalate">${ic('alert', 's')}${e.escalated ? 'Escalate again' : 'Escalate coord / EMS'}</button>` : `<button class="act" data-act="backup" data-id="${e.id}" data-testid="backup">${ic('userplus', 's')}Request backup</button>`}
   <button class="act mauve" data-go="#/help">${ic('life', 's')}Quick help</button>
   <button class="act blue" data-act="md" data-id="${e.id}" data-testid="callmd">${ic('steth', 's')}Call MD on call</button>
   <button class="act" data-go="#/safe/${e.id}">${ic('shield', 's')}Safe zone</button>
   <button class="act coral" data-go="#/er/${e.id}">${ic('hosp', 's')}Hospitals & 911</button>
  </div>
  ${tab === 'help' ? '' : `<form class="composer" style="margin-top:9px" data-form="chat" data-id="${e.id}"><input id="chat-${e.id}" placeholder="${tab === 'lcsw' ? 'Message LCSW…' : tab === 'coord' ? 'Message coordinator…' : 'Message team…'}" value="${val('chat-' + e.id)}" autocomplete="off" maxlength="1000" enterkeyhint="send"><button class="send" type="submit" aria-label="Send">${ic('send', 's')}</button></form>`}
  <div class="row" style="margin-top:9px;gap:8px"><button class="btn red" style="flex:1" data-act="dial" data-what="911" data-testid="dial911">${ic('phone', 's')} 911</button><button class="btn ghost" style="flex:1.2" data-act="dial" data-what="the 988 Suicide & Crisis Lifeline">${ic('phone', 's')} 988</button>${canClose ? `<button class="btn dark" style="flex:1.4" data-go="#/close/${e.id}" data-testid="closeout">Close out ${ic('cr', 's')}</button>` : ''}</div>
  <p class="disclaimer" style="margin-top:7px">Backup fills open responder spots first · at ${max}/${max} it escalates to coordinator / EMS · test mode never dials</p>
  </div></div>`;
}
function helpInline() {
  const pick = ['f1', 'p1', 'p2', 's2', 'd1'].map(id => RESOURCES.find(x => x.id === id));
  return `<div style="padding:8px 0"><div class="card list" style="padding:2px 14px">${pick.map(resItem).join('')}</div>
  <div class="row" style="margin-top:8px"><button class="btn sage sm" style="flex:1" data-act="ask" data-role="lcsw">Ask LCSW</button><button class="btn sm" style="flex:1;background:var(--blue);color:#fff" data-act="ask" data-role="md">Ask MD</button><button class="btn ghost sm" style="flex:1" data-go="#/help">All guides</button></div></div>`;
}

function er(r) {
  const e = enc(r.id); const ch = S.state.chapter; const tab = S.ui.hospTab;
  const list = ch.hospitals.filter(h => h.kind === tab);
  return `<div class="screen notab">${hdr('Emergency & hospitals', e ? `Nearest to Encounter #${esc(e.id)} · fictional list` : `${esc(ch.short)} · fictional list`)}<div class="wrap">
  <div class="grid2"><button class="card" style="background:var(--red);color:#fff;border:0;text-align:left;box-shadow:0 8px 20px rgba(200,55,45,.3)" data-act="dial" data-what="911" data-testid="dial911"><div class="row between">${ic('phone', 'l')}<span class="xs b">Life threat</span></div><div class="pop" style="font-size:28px;font-weight:700;margin-top:8px">Call 911</div><div class="xs" style="opacity:.9">Test: shows what would happen</div></button>
  <button class="card" style="text-align:left" data-act="dial" data-what="the 988 Suicide & Crisis Lifeline"><div class="row between" style="color:var(--plum)">${ic('msg', 'l')}<span class="xs b muted">Call/Text</span></div><div class="pop" style="font-size:28px;font-weight:700;margin-top:8px;color:var(--plum)">988</div><div class="xs muted">Suicide & Crisis Lifeline</div></button></div>
  <div class="card row" style="margin-top:10px;background:var(--amber-l);border-color:#eedcb4;padding:11px 13px">${ic('alert', 's')}<div class="sm"><b>Escalate if:</b> chest pain, seizure, overheating, unresponsive, or risk of harm to self/others.</div></div>
  <div class="pill-tabs" style="margin:12px 0">${[['psych', 'Psych ER'], ['er', 'Emergency'], ['urgent', 'Urgent care'], ['detox', 'Detox']].map(([k, l]) => `<div class="${tab === k ? 'act' : ''}" data-act="hospTab" data-v="${k}" role="button">${l}</div>`).join('')}</div>
  ${list.map((h, i) => `<div class="card" style="margin-bottom:10px;${i === 0 ? 'border:1.5px solid var(--plum)' : ''}"><div class="row between" style="align-items:flex-start"><div><div class="b" style="font-size:15.5px">${esc(h.name)}</div><div class="xs muted">${esc(h.desc)}</div></div><div style="text-align:right;flex:none"><div class="pop b" style="font-size:16px">${esc(h.dist)}</div><div class="xs muted">${esc(h.drive)}</div></div></div>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin:8px 0">${h.tags.map(t => `<span class="chip ${t.startsWith('Liaison') ? 'sage' : t.includes('Psych') ? 'mauve' : ''}">${esc(t)}</span>`).join('')}</div>
   <div class="row"><button class="btn ${i === 0 ? 'primary' : 'ghost'} sm" style="flex:1" data-act="fakeDir" data-n="${esc(h.name)}">${ic('nav', 's')} Directions</button><button class="btn ghost sm" style="flex:1" data-act="dial" data-what="${esc(h.name)} triage (fictional)">${ic('phone', 's')} Call triage</button></div>
   <div class="xs muted" style="margin-top:7px">${esc(h.note)}</div></div>`).join('')}
  <p class="disclaimer">All hospitals here are fictional test data.</p></div></div>`;
}

function safe(r) {
  const e = enc(r.id); const ch = S.state.chapter; const m = me();
  const zi = S.ui.zone[r.id] || 0; const z = ch.safeZones[zi] || ch.safeZones[0];
  const used = S.state.zoneUse[z.id] || 0; const free = Math.max(0, z.rooms - used);
  const markers = ch.safeZones.map(x => ({ lat: x.lat, lng: x.lng, kind: 'zone', label: x.name }));
  if (e) markers.push({ lat: e.place.lat, lng: e.place.lng, kind: 'guest', label: 'Guest (fake)' });
  const canCheck = e && e.status === 'active' && (e.mine || m.role === 'coord');
  return `<div class="screen notab">${hdr('Safe zones', `${ch.safeZones.length} near ${esc(ch.short)}${e ? ' · Encounter #' + esc(e.id) : ''}`)}
  ${mapSlot('safe-' + ch.id + '-' + (e ? e.id : 'x') + '-' + zi, { center: ch.center, zoom: 15, interactive: true, fit: true, markers, line: e ? [[e.place.lat, e.place.lng], [z.lat, z.lng]] : null }, 'fullmap')}
  <div class="sheet"><div style="width:40px;height:4px;border-radius:2px;background:var(--line);margin:0 auto 12px"></div>
  <div class="scroller" style="margin-bottom:10px">${ch.safeZones.map((x, i) => `<button class="chip ${i === zi ? 'act' : 'outline'}" data-act="zone" data-id="${esc(r.id)}" data-v="${i}">${esc(x.name)}</button>`).join('')}</div>
  <div class="xs bb" style="color:var(--sage);letter-spacing:.8px">${zi === 0 ? 'NEAREST SAFE ZONE' : 'SAFE ZONE'} · ${free ? 'OPEN' : 'FULL'}</div>
  <h2 style="font-size:21px;font-weight:600;margin-top:3px">${esc(z.name)}</h2><div class="xs muted">${esc(z.where)}</div>
  <div class="kv"><div><b>${free} of ${z.rooms}</b><small>rooms free</small></div><div><b>${esc(z.hours)}</b><small>hours (fake)</small></div><div><b>${zi === 0 ? '0.4' : '1.2'} mi</b><small>approx.</small></div></div>
  <div class="row" style="flex-wrap:wrap;gap:6px">${z.amenities.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>
  <div class="card row" style="margin-top:12px;padding:10px 12px;background:var(--cream)">${av(z.host, 'sm', true)}<div class="sm" style="flex:1"><b>${esc(z.host)}</b> is hosting tonight</div></div>
  ${e && e.checkin ? `<div class="card row" style="margin-top:10px;background:var(--sage-l);border-color:#cfe5da" data-testid="checkedin">${ic('check', 's')}<div class="sm">Guest checked in at <b>${esc(e.checkin.zoneName)}</b> at ${tm(e.checkin.at)} by ${esc(e.checkin.by)}</div></div>` : ''}
  <div class="row" style="margin-top:12px"><button class="btn ghost" style="flex:1" data-act="fakeDir" data-n="${esc(z.name)}">${ic('nav', 's')} Directions</button>
  ${canCheck && !e.checkin ? `<button class="btn sage" style="flex:1.3" data-act="checkin" data-id="${e.id}" data-zone="${z.id}" ${free ? '' : 'disabled'} data-testid="checkin">${ic('check', 's')} Check in guest</button>` : ''}</div>
  <p class="disclaimer" style="margin-top:9px">Check-in notifies the LCSW and logs arrival time to the encounter · locations are fictional</p></div></div>`;
}

function closeout(r) {
  const e = enc(r.id); const m = me(); const max = S.state.maxResponders;
  if (!e) return `<div class="screen notab">${hdr('Not found', '', '#/alerts')}</div>`;
  const ch = S.state.chapter; const names = e.responders.map((x, i) => esc(x.name.split(' ')[0]) + (i === 0 ? ' (lead)' : '')).join(', ');
  const team = `<div class="card row" style="padding:10px 12px"><div class="row" style="gap:0">${e.responders.map((x, i) => `<div style="margin-left:${i ? -8 : 0}px">${av(x.name, 'sm')}</div>`).join('') || av('?', 'sm')}</div><div class="sm" style="flex:1"><b>Responders ${e.responders.length}/${max}</b> · ${names || 'none'}</div></div>`;
  if (e.status === 'active') {
    if (!(e.mine || m.role === 'coord')) { location.replace('#/enc/' + e.id); return null; }
    const f = S.ui.close[e.id] || (S.ui.close[e.id] = { outcome: null, hospitalId: ch.hospitals[0].id, admitted: true, debrief: true });
    const liaisons = S.state.users.filter(u => u.role === 'liaison');
    return `<div class="screen notab">${hdr('Close out encounter', `#${esc(e.id)} · <span data-since="${e.createdAt}"></span> · ${e.responders.length} responder${e.responders.length === 1 ? '' : 's'}`, '#/enc/' + e.id)}<div class="wrap">
    ${team}
    <div class="b" style="margin:14px 0 8px">Where did the guest go?</div>
    <div class="grid4">${Object.entries(OUTCOMES).map(([k, [l, s, icn]]) => `<button class="tile ${f.outcome === k ? 'sel' : ''}" data-act="outcome" data-id="${e.id}" data-v="${k}" data-testid="out-${k}">${ic(icn)}${l}<small>${s}</small></button>`).join('')}</div>
    ${f.outcome === 'hospital' ? `<label class="field"><span>Hospital (fictional)</span><select class="input" id="co-hosp-${e.id}" data-act-change="hosp" data-id="${e.id}">${ch.hospitals.map(h => `<option value="${h.id}" ${f.hospitalId === h.id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></label>
     <div class="row" style="gap:8px"><button class="chip ${f.admitted ? 'coral' : 'outline'}" data-act="admitted" data-id="${e.id}">${f.admitted ? 'Admitted · voluntary' : 'Not admitted / ER visit'}</button></div>
     <div class="card" style="margin-top:10px;background:linear-gradient(135deg,#fff,#f8eef6);border-color:#ead6e6"><div class="xs bb" style="color:var(--plum);letter-spacing:.8px">${ic('swap', 'xs')} HOSPITAL LIAISON HANDOFF</div><p class="sm" style="margin-top:6px">On submit, ${liaisons.length ? 'hospital liaison <b>' + esc(liaisons.map(u => u.name).join(', ')) + '</b>' : 'hospital liaisons (none signed in yet)'} will be notified to accept the handoff.</p></div>` : ''}
    ${f.outcome === 'other' ? `<label class="field"><span>Other (specify)</span><input class="input" id="co-other-${e.id}" maxlength="120" value="${val('co-other-' + e.id)}" placeholder="e.g. left with event staff"></label>` : ''}
    <label class="field"><span>Brief notes · <span style="font-weight:500">no names or identifiers</span></span><textarea class="input" id="co-notes-${e.id}" maxlength="1500" placeholder="What helped, how they were when you parted. No names.">${val('co-notes-' + e.id)}</textarea></label>
    <div class="row between" style="padding:6px 0"><div class="row sm">${ic('heart', 's')} <b>Team debrief</b> · all responders, tomorrow</div><button class="toggle ${f.debrief ? 'on' : ''}" data-act="debrief" data-id="${e.id}" aria-label="Team debrief"></button></div>
    <div class="row sm muted" style="padding:4px 0">${ic('eye', 's')} LCSW review & sign-off happens after you submit.</div>
    <div class="err" id="co-err"></div>
    <button class="btn primary" style="margin-top:10px" data-act="submitClose" data-id="${e.id}" data-testid="submitclose">Submit & close encounter</button>
    </div></div>`;
  }
  const c = e.closeout || {}; const h = e.handoff;
  const ol = (OUTCOMES[c.outcome] || ['—'])[0];
  const canHand = m.role === 'liaison' || m.role === 'coord';
  return `<div class="screen notab">${hdr('Encounter #' + esc(e.id), `${esc(e.type)} · ${new Date(e.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${tm(e.createdAt)}`, '#/alerts')}<div class="wrap">
  <div class="row" style="gap:8px;margin-bottom:10px">${e.status === 'review' ? '<span class="live rev" data-testid="status">AWAITING LCSW REVIEW</span>' : '<span class="live done" data-testid="status">REVIEWED & SIGNED</span>'}${e.seeded ? '<span class="chip">seeded sample</span>' : ''}</div>
  ${team}
  <div class="card" style="margin-top:10px"><div class="row between"><div class="b">Outcome</div><span class="chip ${c.outcome === 'hospital' ? 'coral' : 'sage'}">${esc(ol)}</span></div>
  ${c.hospitalName ? `<div class="sm" style="margin-top:6px">${esc(c.hospitalName)}${c.admitted ? ' · admitted (voluntary)' : ''}</div>` : ''}${c.other ? `<div class="sm" style="margin-top:6px">${esc(c.other)}</div>` : ''}
  <div class="divider"></div><div class="xs bb muted">ANONYMOUS NOTES</div><p class="sm" style="margin-top:4px;line-height:1.45;white-space:pre-wrap">${esc(c.notes || '—')}</p>
  <div class="xs muted" style="margin-top:6px">Closed by ${esc(c.by || '—')}${c.at ? ' · ' + tm(c.at) : ''}${e.checkin ? ' · safe zone: ' + esc(e.checkin.zoneName) : ''}${e.escalated ? ' · escalated' : ''}${c.debrief ? ' · debrief scheduled' : ''}</div></div>
  ${h ? `<div class="card" style="margin-top:10px;background:linear-gradient(135deg,#fff,#f8eef6);border-color:#ead6e6" data-testid="handoff"><div class="row between"><div class="xs bb" style="color:var(--plum);letter-spacing:.8px">${ic('swap', 'xs')} HOSPITAL LIAISON HANDOFF</div><span class="chip ${h.status === 'accepted' ? 'sage' : 'coral'}">${h.status === 'accepted' ? 'Accepted' : 'Pending'}</span></div>
   ${h.status === 'accepted' ? `<div class="row" style="margin-top:8px">${av(h.liaisonName, '', true)}<div><div class="b">${esc(h.liaisonName)}</div><div class="xs muted">Hospital liaison · ${esc(h.hospitalName || c.hospitalName || '')}</div></div></div><p class="sm" style="margin-top:8px;line-height:1.45">“${esc(h.note)}”</p>`
      : `<p class="sm" style="margin-top:6px">Waiting for a hospital liaison to accept the handoff to ${esc(h.hospitalName)}.</p>${canHand ? `<label class="field"><span>Note to the team</span><input class="input" id="ho-${e.id}" value="${val('ho-' + e.id, "Got it, I'll meet them at intake and follow up on aftercare.")}" maxlength="400"></label><button class="btn primary" data-act="handoff" data-id="${e.id}" data-testid="accepthandoff">Accept handoff</button>` : ''}`}</div>` : ''}
  <div class="card" style="margin-top:10px"><div class="row between"><div class="row sm">${ic('check', 's')} <b>LCSW review</b></div>${e.signoff ? `<span class="xs muted">${tm(e.signoff.at)}</span>` : ''}</div>
  ${e.signoff ? `<p class="sm" style="margin-top:6px" data-testid="signedby">Reviewed by <b>${esc(e.signoff.by)}</b>${e.signoff.by.includes('LCSW') ? '' : ', LCSW'}${e.signoff.comment ? ': “' + esc(e.signoff.comment) + '”' : ''}</p>`
      : m.role === 'lcsw' ? `<label class="field"><span>Review comment (optional)</span><input class="input" id="so-${e.id}" value="${val('so-' + e.id)}" maxlength="400" placeholder="e.g. Good call on the safe zone."></label><button class="btn sage" data-act="signoff" data-id="${e.id}" data-testid="signoff">${ic('check', 's')} Review & sign off</button>` : '<p class="sm muted" style="margin-top:6px">Waiting for the on-call LCSW to review and sign off.</p>'}</div>
  ${e.messages.length ? `<div class="sec">Encounter log</div><div class="card" style="padding:8px 12px;max-height:260px;overflow:auto">${e.messages.map(x => `<div class="xs" style="padding:3px 0"><span class="muted">${tm(x.at)}</span> ${x.name ? '<b>' + esc(x.name) + ':</b> ' : ''}${esc(x.text)}</div>`).join('')}</div>` : ''}
  </div></div>`;
}

function resItem(x) {
  const c = RES_CATS[x.cat];
  return `<button ${LI} data-go="#/res/${x.id}"><div class="ricon" style="background:${c.bg};color:${c.fg}">${x.n ? `<b class="pop">${x.n}</b>` : ic(c.icon, 's')}</div><div style="flex:1;min-width:0"><div class="b sm">${esc(x.title)}${x.placeholder ? ' <span class="chip amber" style="padding:1px 7px">placeholder</span>' : ''}${x.concept ? ' <span class="chip" style="padding:1px 7px">concept</span>' : ''}</div><div class="xs muted">${esc(x.short)}</div></div>${ic('cr', 's')}</button>`;
}
function help() {
  const q = (S.drafts['res-q'] || '').trim().toLowerCase();
  const hits = q ? RESOURCES.filter(x => (x.title + ' ' + x.short + ' ' + x.body.replace(/<[^>]+>/g, ' ')).toLowerCase().includes(q)) : [];
  return `<div class="screen">${topbar()}<div class="wrap">
  <h1 style="font-size:26px;font-weight:600">Quick help</h1><div class="muted sm" style="margin-bottom:10px">Guides for the moment you need them</div>
  <div class="searchbox">${ic('search', 's')}<input id="res-q" placeholder="Search guides, e.g. breathing, 911, panic" value="${val('res-q')}" autocomplete="off" data-testid="ressearch"></div>
  ${q ? `<div class="sec">${hits.length} result${hits.length === 1 ? '' : 's'}</div><div class="card list" style="padding:2px 14px">${hits.length ? hits.map(resItem).join('') : '<div class="empty">No guides match. Try “breathing”, “911” or “safe”.</div>'}</div>` : `
  <button class="card row" data-go="#/res/f1" style="width:100%;margin-top:12px;background:var(--coral-l);border-color:#f3cfc6;text-align:left">${ic('alert')}<div style="flex:1"><div class="b" style="color:var(--red)">Red flags: call 911 if…</div><div class="xs muted">Unresponsive, seizure, chest pain, overheating, harm</div></div>${ic('cr', 's')}</button>
  <div class="row" style="margin-top:10px"><button class="btn sage" style="flex:1" data-act="ask" data-role="lcsw" data-testid="asklcsw">${ic('msg', 's')} Ask LCSW</button><button class="btn" style="flex:1;background:var(--blue);color:#fff" data-act="ask" data-role="md" data-testid="askmd">${ic('steth', 's')} Ask MD</button></div>
  <div class="sec">The Four Principles</div>
  <div class="grid2">${RESOURCES.filter(x => x.cat === 'principles').map(x => `<button class="princ" data-go="#/res/${x.id}"><b class="pop">${x.n}</b><div class="b sm">${esc(x.title)}</div><div class="xs muted">${esc(x.short)}</div></button>`).join('')}</div>
  <div class="sec">Browse</div>
  <div class="grid2">${Object.entries(RES_CATS).filter(([k]) => k !== 'principles').map(([k, c]) => `<button class="res-card" data-go="#/cat/${k}"><div class="ricon" style="background:${c.bg};color:${c.fg}">${ic(c.icon, 's')}</div><div class="b sm" style="margin-top:8px">${esc(c.label)}</div><div class="xs muted">${RESOURCES.filter(x => x.cat === k).length} · ${esc(c.sub)}</div></button>`).join('')}</div>`}
  <p class="disclaimer" style="margin-top:14px">General guidance written for this test. Not clinical advice. Placeholder items must be checked by Zendo's clinical team.</p>
  </div>${tabbar('help')}</div>`;
}
function resCard(r) {
  const x = RESOURCES.find(y => y.id === r.id); if (!x) return `<div class="screen notab">${hdr('Not found', '', '#/help')}</div>`;
  const c = RES_CATS[x.cat];
  return `<div class="screen notab">${hdr(esc(x.title), esc(c.label))}<div class="wrap">
  ${x.placeholder ? '<div class="card placeholder sm" style="margin-bottom:10px">Placeholder content for the test. Zendo clinical team to replace and verify.</div>' : ''}
  <div class="card prose">${x.body}</div>
  ${x.cat === 'escalation' ? `<div class="row" style="margin-top:10px"><button class="btn red" style="flex:1" data-act="dial" data-what="911">${ic('phone', 's')} 911 (test)</button><button class="btn ghost" style="flex:1" data-act="dial" data-what="the 988 Suicide & Crisis Lifeline">988 (test)</button></div>` : ''}
  <div class="row" style="margin-top:10px"><button class="btn sage sm" style="flex:1" data-act="ask" data-role="lcsw">Ask LCSW</button><button class="btn sm" style="flex:1;background:var(--blue);color:#fff" data-act="ask" data-role="md">Ask MD</button></div>
  </div></div>`;
}
function resCat(r) {
  const c = RES_CATS[r.id]; if (!c) return `<div class="screen notab">${hdr('Not found', '', '#/help')}</div>`;
  return `<div class="screen notab">${hdr(esc(c.label), esc(c.sub))}<div class="wrap"><div class="card list" style="padding:2px 14px">${RESOURCES.filter(x => x.cat === r.id).map(resItem).join('')}</div></div></div>`;
}

function dm(r) {
  const t = S.state.dms.find(x => x.id === r.id); const m = me();
  if (!t) return `<div class="screen notab">${hdr('Conversation', 'starting…', '#/help')}<div class="empty">Opening chat…</div></div>`;
  const mine = t.userId === m.id;
  const on = S.state.users.filter(u => u.role === t.role && live(u));
  const title = mine ? 'On-call ' + roleLabel(t.role) : esc(t.userName);
  const sub = mine ? (on.length ? esc(on.map(u => u.name).join(', ')) + ' on call' : 'Nobody on call yet · they will see it when they sign in') : 'Asked the on-call ' + esc(roleLabel(t.role));
  return `<div class="screen notab">${hdr(title, sub, '#/alerts')}<div class="wrap">
  <div class="chat" data-testid="dmchat" style="min-height:260px">${t.messages.length ? chatMsgs(t.messages.map(x => ({ ...x, kind: 'msg' })), m) : `<div class="empty">Ask a question. No guest names or identifying details.</div>`}</div>
  <form class="composer" style="margin-top:9px" data-form="dm" data-id="${esc(t.id)}" data-role="${t.role}"><input id="dm-${esc(t.id)}" placeholder="Message…" value="${val('dm-' + t.id)}" autocomplete="off" maxlength="1000" enterkeyhint="send"><button class="send" type="submit" aria-label="Send">${ic('send', 's')}</button></form>
  <p class="disclaimer" style="margin-top:7px">Test chat · fake data only</p></div></div>`;
}

const shiftCount = (ev, sh) => (sh.seeded || 0) + ev.signups.filter(s => s.shiftId === sh.id).length;
const iAmIn = (ev, sh) => ev.signups.some(s => s.shiftId === sh.id && s.userId === me().id);
function shiftRow(ev, sh) {
  const n = shiftCount(ev, sh); const mine = iAmIn(ev, sh); const pct = Math.min(100, Math.round(n / sh.target * 100));
  return `<div class="row" style="padding:10px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:0"><div class="b sm">${esc(sh.name)} · ${esc(sh.time)}</div>
   <div class="xs muted" data-testid="count-${ev.id}-${sh.id}">${n} signed up · target ${sh.target}${n >= sh.target ? ' · target met, more welcome' : ''}</div>
   <div style="height:5px;border-radius:3px;background:var(--sand-l);margin-top:5px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${n >= sh.target ? 'var(--sage)' : 'var(--mauve)'}"></div></div></div>
   <button class="btn sm ${mine ? 'sage' : 'primary'}" style="width:auto;flex:none;padding:9px 14px" data-act="signup" data-ev="${ev.id}" data-sh="${sh.id}" data-testid="signup-${ev.id}-${sh.id}">${mine ? ic('check', 's') + ' Signed up' : 'Sign up'}</button></div>`;
}
function evCard(ev) {
  const mineAny = ev.shifts.some(sh => iAmIn(ev, sh));
  return `<div class="evcard card" style="padding:0;overflow:hidden;margin-bottom:12px" data-testid="event-${ev.id}">
  <button class="evhead" data-go="#/event/${ev.id}" style="background:${ev.grad};color:#fff;border:0;width:100%;text-align:left;padding:14px"><div class="xs bb" style="opacity:.85;letter-spacing:.8px">${esc(ev.day)} · ${esc(ev.time)}</div><div class="pop" style="font-size:18px;font-weight:600;margin-top:3px">${esc(ev.title)}</div><div class="xs" style="opacity:.9">${esc(ev.place)} · ${esc(ev.kind)}${mineAny ? ' · ✓ you\'re signed up' : ''}</div></button>
  <div style="padding:2px 14px 4px">${ev.shifts.map(sh => shiftRow(ev, sh)).join('')}</div></div>`;
}
function events() {
  const m = me(); const f = S.ui.evFilter;
  const list = S.state.events.filter(e => e.chapter === m.chapter && (f === 'All' || e.kind === f || (f === 'Mine' && e.signups.some(s => s.userId === m.id)))).sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="screen">${topbar()}<div class="wrap">
  <h1 style="font-size:26px;font-weight:600">Events</h1><div class="muted sm" style="margin-bottom:10px">Upcoming shifts · ${esc(S.state.chapter.short)} · no sign-up limit</div>
  <div class="scroller" style="margin-bottom:12px">${['All', 'Mine', 'Parties', 'Festivals', 'Community', 'Trainings'].map(k => `<button class="chip ${f === k ? 'act' : 'outline'}" data-act="evFilter" data-v="${k}">${k === 'Mine' ? 'My shifts' : k}</button>`).join('')}</div>
  ${list.length ? list.map(evCard).join('') : '<div class="empty">No events match this filter.</div>'}
  <p class="disclaimer">Events are fictional. Shift targets are a soft staffing goal, so anyone can sign up.</p>
  </div>${tabbar('events')}</div>`;
}
function eventDetail(r) {
  const ev = S.state.events.find(e => e.id === r.id); if (!ev) return `<div class="screen notab">${hdr('Not found', '', '#/events')}</div>`;
  const users = S.state.users;
  return `<div class="screen notab">${hdr(esc(ev.title), esc(ev.day) + ' · ' + esc(ev.time), '#/events')}<div class="wrap">
  <div class="card" style="background:${ev.grad};color:#fff;border:0"><div class="pop" style="font-size:20px;font-weight:600">${esc(ev.title)}</div><div class="sm" style="opacity:.9;margin-top:3px">${esc(ev.place)} · ${esc(ev.kind)} · fictional event</div><div class="row" style="flex-wrap:wrap;gap:6px;margin-top:9px">${ev.tags.map(t => `<span class="chip" style="background:rgba(255,255,255,.18);color:#fff">${esc(t)}</span>`).join('')}</div></div>
  <div class="card" style="margin-top:10px;padding:4px 14px 6px">${ev.shifts.map(sh => shiftRow(ev, sh) + `<div class="xs muted" style="padding:0 0 8px">${ev.signups.filter(s => s.shiftId === sh.id).map(s => esc(s.name)).join(', ') || 'No app sign-ups yet'}${sh.seeded ? ` · +${sh.seeded} sample (fake)` : ''}</div>`).join('')}</div>
  <p class="disclaimer" style="margin-top:10px">Tap again to cancel your sign-up. Sign-ups are saved on the test server until it resets.</p></div></div>`;
}

function chapter() {
  const m = me(); const ch = S.state.chapter; const users = chUsers().sort((a, b) => (live(b) - live(a)) || (b.online - a.online));
  const net = S.state.users.filter(u => u.chapter !== m.chapter);
  const urow = u => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)">${av(u.name, '', live(u) ? true : u.online ? undefined : false, u.color)}<div style="flex:1;min-width:0"><div class="b sm">${esc(u.name)}${u.id === m.id ? ' (you)' : ''}</div><div class="xs muted">${esc(roleLabel(u.role))}</div></div><span class="chip ${live(u) ? 'sage' : u.online ? '' : 'outline'}">${live(u) ? (isVol(u.role) ? 'On duty' : 'On call') : u.online ? 'Online' : 'Offline'}</span></div>`;
  return `<div class="screen">${topbar()}<div class="wrap">
  <h1 style="font-size:26px;font-weight:600">${esc(ch.short)}</h1><div class="muted sm" style="margin-bottom:10px">${esc(ch.name)} chapter · live roster</div>
  <div class="row" style="gap:10px"><div class="card" style="flex:1;padding:12px"><div class="muted xs b">SIGNED IN</div><div class="pop" style="font-size:22px;font-weight:600">${users.filter(u => u.online).length}</div></div><div class="card" style="flex:1;padding:12px"><div class="muted xs b">ON DUTY</div><div class="pop" style="font-size:22px;font-weight:600">${users.filter(live).length}</div></div><div class="card" style="flex:1;padding:12px"><div class="muted xs b">TEST USERS</div><div class="pop" style="font-size:22px;font-weight:600">${users.length}</div></div></div>
  <div class="sec">Test volunteers & team</div><div class="card" style="padding:2px 14px">${users.map(urow).join('') || '<div class="empty">Nobody yet.</div>'}</div>
  ${net.length ? `<div class="sec">Network clinicians (all chapters)</div><div class="card" style="padding:2px 14px">${net.map(urow).join('')}</div>` : ''}
  <div class="sec">Sample members (fake, not real people)</div><div class="card" style="padding:2px 14px">${S.state.sample.map(s => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)">${av(s.name, '', false)}<div style="flex:1"><div class="b sm">${esc(s.name)}</div><div class="xs muted">${esc(roleLabel(s.role))} · sample</div></div><span class="chip outline">Sample</span></div>`).join('')}</div>
  <button class="btn ghost" style="margin-top:12px" data-go="#/profile">${ic('user', 's')} My profile & settings</button>
  </div>${tabbar('chapter')}</div>`;
}

function postCard(p) {
  const m = me(); const mine = p.helpers.includes(m.id);
  return `<div class="card" style="margin-bottom:10px" data-testid="post"><button data-go="#/post/${p.id}" style="border:0;background:none;text-align:left;width:100%;padding:0">
  <div class="row between"><div class="row" style="gap:6px">${p.urgent ? '<span class="chip coral">Urgent</span>' : ''}<span class="chip mauve">${esc(p.cat)}</span></div><span class="xs muted">${ago(p.at)}</span></div>
  <div class="b" style="margin-top:7px">${esc(p.title)}</div><div class="sm muted" style="margin-top:3px;line-height:1.4">${esc(p.body)}</div>
  <div class="xs muted" style="margin-top:6px">${esc(p.author)}${p.userId ? '' : ' (sample)'} · ${p.chapter === 'bk' ? 'Brooklyn' : 'Manhattan'}</div></button>
  <div class="row" style="margin-top:9px"><button class="btn sm ${mine ? 'sage' : 'ghost'}" style="flex:1" data-act="help" data-id="${p.id}" data-testid="canhelp">${mine ? ic('check', 's') + ' You can help' : ic('thumb', 's') + ' I can help'} · ${p.helpers.length}</button><button class="btn ghost sm" style="flex:1" data-go="#/post/${p.id}">${ic('msg', 's')} ${p.replies.length} repl${p.replies.length === 1 ? 'y' : 'ies'}</button></div></div>`;
}
const BOARD_CATS = ['Detox & rehab', 'Therapy', 'Housing', 'Language', 'Supplies', 'Other'];
function board() {
  const f = S.ui.boardFilter;
  const list = S.state.board.filter(p => f === 'All' || (f === 'Urgent' ? p.urgent : p.cat === f));
  return `<div class="screen">${topbar()}<div class="wrap">
  <div class="row between"><div><h1 style="font-size:26px;font-weight:600">Resource board</h1><div class="muted sm">Ask the network · both chapters</div></div><button class="btn primary sm" style="width:auto" data-go="#/newpost" data-testid="newpost">${ic('plus', 's')} Post</button></div>
  <div class="scroller" style="margin:12px 0">${['All', 'Urgent', ...BOARD_CATS].map(k => `<button class="chip ${f === k ? 'act' : 'outline'}" data-act="boardFilter" data-v="${esc(k)}">${esc(k)}</button>`).join('')}</div>
  ${list.length ? list.map(postCard).join('') : '<div class="empty">Nothing here yet.</div>'}
  <p class="disclaimer">No guest names or identifying details · test data only</p>
  </div>${tabbar('board')}</div>`;
}
function newPost() {
  const f = S.ui.np || (S.ui.np = { cat: 'Other', urgent: false });
  return `<div class="screen notab">${hdr('New request', 'Visible to both test chapters', '#/board')}<div class="wrap">
  <label class="field"><span>Title</span><input class="input" id="np-title" maxlength="120" placeholder="e.g. Detox bed tonight" value="${val('np-title')}"></label>
  <label class="field"><span>Details · no names or identifiers</span><textarea class="input" id="np-body" maxlength="1000" placeholder="What do you need?">${val('np-body')}</textarea></label>
  <div class="field"><span>Category</span><div class="opt">${BOARD_CATS.map(c => `<button type="button" class="${f.cat === c ? 'sel' : ''}" data-act="npCat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
  <div class="row between" style="padding:6px 0"><div class="b sm">Mark as urgent</div><button class="toggle ${f.urgent ? 'on' : ''}" data-act="npUrgent" aria-label="Urgent"></button></div>
  <div class="err" id="np-err"></div>
  <button class="btn primary" style="margin-top:10px" data-act="submitPost" data-testid="submitpost">Post request</button></div></div>`;
}
function post(r) {
  const p = S.state.board.find(x => x.id === r.id); if (!p) return `<div class="screen notab">${hdr('Post not found', '', '#/board')}</div>`;
  return `<div class="screen notab">${hdr('Request', esc(p.cat), '#/board')}<div class="wrap">${postCard(p)}
  <div class="sec">Replies</div><div class="card" style="padding:2px 14px">${p.replies.length ? p.replies.map(x => `<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line);align-items:flex-start">${av(x.author, 'sm')}<div style="flex:1"><div class="xs"><b>${esc(x.author)}</b>${x.userId ? '' : ' (sample)'} · <span class="muted">${ago(x.at)}</span></div><div class="sm" style="margin-top:2px;line-height:1.4">${esc(x.body)}</div></div></div>`).join('') : '<div class="empty">No replies yet.</div>'}</div>
  <form class="composer" style="margin-top:10px" data-form="reply" data-id="${p.id}"><input id="reply-${p.id}" placeholder="Reply…" value="${val('reply-' + p.id)}" autocomplete="off" maxlength="1000"><button class="send" type="submit" aria-label="Send">${ic('send', 's')}</button></form>
  </div></div>`;
}

function profile() {
  const m = me(); const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const lvl = ['Off', 'Maybe', 'Free'];
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="screen notab">${hdr('Profile', 'Test account', '#/home')}<div class="wrap">
  <div class="card" style="text-align:center;padding:18px">${av(m.name, 'xl', undefined, 'linear-gradient(135deg,#AB6B9E,#65206b)')}<div class="pop" style="font-size:20px;font-weight:600;margin-top:8px">${esc(m.name)}</div><div class="sm muted">${esc(roleLabel(m.role))} · ${esc(S.state.chapter.short)}</div></div>
  <div class="row" style="gap:10px;margin-top:10px"><div class="card" style="flex:1;padding:12px;text-align:center"><div class="pop" style="font-size:22px;font-weight:600" data-testid="hours">${m.hours}</div><div class="xs muted">hours</div></div><div class="card" style="flex:1;padding:12px;text-align:center"><div class="pop" style="font-size:22px;font-weight:600" data-testid="enccount">${m.encounters}</div><div class="xs muted">encounters</div></div><div class="card" style="flex:1;padding:12px;text-align:center"><div class="pop" style="font-size:22px;font-weight:600">${m.eventsCount}</div><div class="xs muted">shifts</div></div></div>
  <div class="sec">Weekly availability</div><div class="card"><div class="week">${m.availability.map((v, i) => `<button class="${['', 'maybe', 'on'][v]}" data-act="avail" data-i="${i}" aria-label="${days[i]} ${lvl[v]}"><b>${days[i]}</b><small>${lvl[v]}</small></button>`).join('')}</div><div class="xs muted" style="margin-top:6px">Tap a day to cycle Off → Maybe → Free</div></div>
  <div class="sec">Test settings</div><div class="card list" style="padding:2px 14px">
   <button ${LI} data-act="switchRole">${ic('swap', 's')}<div style="flex:1"><div class="b sm">Switch role</div><div class="xs muted">${esc(roleLabel(m.role))}</div></div>${ic('cr', 's')}</button>
   <button ${LI} data-act="switchChapter">${ic('pin', 's')}<div style="flex:1"><div class="b sm">Switch chapter</div><div class="xs muted">${esc(S.state.chapter.name)}</div></div>${ic('cr', 's')}</button>
   <button ${LI} data-act="notifs">${ic('bell', 's')}<div style="flex:1"><div class="b sm">Phone notifications</div><div class="xs muted">${perm === 'granted' ? 'On (while the app is open or in the background)' : perm === 'denied' ? 'Blocked in browser settings' : perm === 'unsupported' ? 'Install to Home Screen first (iPhone)' : 'Tap to allow'}</div></div>${ic('cr', 's')}</button>
   <button ${LI} data-act="testSound">${ic('volume', 's')}<div style="flex:1"><div class="b sm">Test alert sound & vibration</div><div class="xs muted">Tap once so your phone allows sound</div></div>${ic('cr', 's')}</button>
   ${standalone ? '' : `<button ${LI} data-act="install">${ic('plus', 's')}<div style="flex:1"><div class="b sm">Install on this phone</div><div class="xs muted">Add Zendo Response to your Home Screen</div></div>${ic('cr', 's')}</button>`}
   <button ${LI} data-act="signout">${ic('logout', 's')}<div style="flex:1"><div class="b sm">Sign out</div></div></button>
  </div>
  ${m.role === 'coord' ? `<div class="sec">Coordinator admin</div><div class="card"><p class="sm" style="line-height:1.45">Clears every encounter, chat, sign-up, board post and DM, then reloads the fake sample data. Signed-in testers stay signed in.</p><button class="btn red" style="margin-top:10px" data-act="reset" data-testid="reset">${ic('refresh', 's')} Reset demo data</button></div>` : ''}
  <p class="disclaimer" style="margin-top:12px">TEST VERSION · fake data only · data is wiped when the test server restarts</p>
  </div></div>`;
}

function simulate() {
  const m = me(); const f = S.ui.sim || (S.ui.sim = { type: S.state.alertTypes[0].id, severity: null, place: -1 });
  const t = S.state.alertTypes.find(x => x.id === f.type); const sev = f.severity || t.severity;
  const onDuty = S.state.users.filter(u => u.chapter === m.chapter && isVol(u.role) && live(u) && u.id !== m.id).length;
  return `<div class="screen notab">${hdr('Simulate a crisis', 'Sends a TEST alert to on-duty volunteers', '#/home')}<div class="wrap">
  <div class="card row" style="background:var(--amber-l);border-color:#eedcb4">${ic('alert', 's')}<div class="sm">Drill only. This alerts <b>${onDuty}</b> on-duty volunteer${onDuty === 1 ? '' : 's'} in ${esc(S.state.chapter.short)}. Up to ${S.state.maxResponders} can accept.</div></div>
  <div class="field"><span>Type</span><div class="card list" style="padding:2px 12px">${S.state.alertTypes.map(a => `<button ${LI} data-act="simType" data-v="${a.id}"><div class="ricon" style="background:${f.type === a.id ? 'var(--plum)' : 'var(--mauve-l)'};color:${f.type === a.id ? '#fff' : 'var(--plum)'}">${ic(a.icon, 's')}</div><div style="flex:1"><div class="b sm">${esc(a.label)}</div><div class="xs muted">${esc(a.severity)}</div></div>${f.type === a.id ? ic('check', 's') : ''}</button>`).join('')}</div></div>
  <div class="field"><span>Severity</span><div class="opt">${['Low', 'Moderate', 'High'].map(s => `<button type="button" class="${sev === s ? 'sel' : ''}" data-act="simSev" data-v="${s}">${s}</button>`).join('')}</div></div>
  <label class="field"><span>Location (fake)</span><select class="input" id="sim-place" data-act-change="simPlace"><option value="-1">Random spot in ${esc(S.state.chapter.short)}</option>${S.state.places.map((p, i) => `<option value="${i}" ${f.place === i ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
  <label class="field"><span>What the reporter said (fake)</span><textarea class="input" id="sim-summary" maxlength="400">${val('sim-summary', t.summary)}</textarea></label>
  <button class="btn primary" style="margin-top:6px" data-act="simGo" data-testid="simgo">${ic('zap', 's')} Send test alert</button>
  </div></div>`;
}

/* ========== ACTIONS ========== */
const ROLE_ORDER = ['t1', 't2', 'coord', 'lcsw', 'md', 'liaison'];
async function doAccept(id) {
  const r = await emit('accept', { id });
  if (r.error) { toast(r.error, { urgent: !!r.full }); render(); return; }
  S.pending = id; S.pendingAt = Date.now();
  toast(r.already ? "You're already on this call." : `You're on ${id} as ${r.kind} (${r.count}/${S.state.maxResponders})`);
  location.hash = '#/enc/' + id;
}
const A = {
  closeModal,
  back() { if (history.length > 1) history.back(); else location.hash = '#/home'; },
  siRole(el) { S.ui.signin.role = el.dataset.v; saveSigninDraft(); renderSignin(); },
  siChapter(el) { S.ui.signin.chapter = el.dataset.v; saveSigninDraft(); renderSignin(); },
  async duty() {
    const on = !me().onDuty; const r = await emit('duty', { on });
    if (!r.error) { toast(on ? (isVol(me().role) ? 'On duty · you will get crisis alerts for ' + S.state.chapter.short : 'On call') : 'Off duty'); if (on) { unlockAudio(); askNotif(); } }
  },
  async dutyAccept(el) { await emit('duty', { on: true }); doAccept(el.dataset.id); },
  accept(el) { doAccept(el.dataset.id); },
  async decline(el) { const e = enc(el.dataset.id); if (e && !e.mine && isVol(me().role) && e.status === 'active') emit('decline', { id: e.id }); location.hash = '#/home'; },
  dial(el) { testDial(el.dataset.what || '911'); },
  fakeDir(el) { modal(`<h3 style="font-size:17px">Directions (test)</h3><p class="sm" style="margin:8px 0 14px;line-height:1.45">In the real app this would open walking directions to <b>${esc(el.dataset.n)}</b> in Maps. This place is fictional.</p><button class="btn primary" data-act="closeModal">OK</button>`); },
  chatTab(el) { S.ui.chatTab = el.dataset.v; render(); },
  hospTab(el) { S.ui.hospTab = el.dataset.v; render(); },
  zone(el) { S.ui.zone[el.dataset.id] = Number(el.dataset.v); render(); },
  status(el) { emit('status', { id: el.dataset.id, status: el.dataset.v }); },
  leave(el) { confirmBox('Leave this call?', 'Your spot opens up for another volunteer. Let your team know in chat first.', 'Leave call', async () => { await emit('leave', { id: el.dataset.id }); location.hash = '#/home'; }, true); },
  async backup(el) {
    const r = await emit('backup', { id: el.dataset.id });
    if (r.full) toast('Team is full (3/3). Use Escalate to coordinator / EMS.'); else if (r.error) toast(r.error); else toast(`Backup requested · ${r.notified} on-duty volunteer${r.notified === 1 ? '' : 's'} pinged`);
  },
  escalate(el) { confirmBox('Escalate to coordinator / EMS?', 'This notifies the chapter coordinator and on-call LCSW (test). <b>No real call is placed.</b> If anyone is in real danger, call 911 from your phone.', 'Escalate (test)', async () => { const r = await emit('escalate', { id: el.dataset.id }); if (!r.error) toast(`Escalated · ${r.notified} coordinator/LCSW notified (test)`, { urgent: true }); else toast(r.error); }, true); },
  async md(el) { const r = await emit('md', { id: el.dataset.id }); if (r.error) toast(r.error); else toast(r.notified ? `On-call MD notified (${r.notified})` : 'Request posted. No MD signed in yet, so they will see it on sign-in.'); },
  async checkin(el) { const r = await emit('checkin', { id: el.dataset.id, zone: el.dataset.zone }); if (r.error) toast(r.error); else toast('Guest checked in · LCSW notified'); },
  async ask(el) { const r = await emit('dm', { role: el.dataset.role }); if (r.thread) location.hash = '#/dm/' + encodeURIComponent(r.thread); else toast(r.error || 'Could not open chat'); },
  outcome(el) { S.ui.close[el.dataset.id].outcome = el.dataset.v; render(); },
  admitted(el) { const f = S.ui.close[el.dataset.id]; f.admitted = !f.admitted; render(); },
  debrief(el) { const f = S.ui.close[el.dataset.id]; f.debrief = !f.debrief; render(); },
  submitClose(el, force) {
    const id = el.dataset.id; const f = S.ui.close[id]; const err = $('#co-err');
    if (!f.outcome) { err.textContent = 'Choose where the guest went.'; return; }
    const notes = S.drafts['co-notes-' + id] || '';
    if (!force && /\b(mr|mrs|ms|miss|name is|named|called)\b|\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(notes)) {
      confirmBox('Possible name in notes', 'Your notes might include a name. Notes must stay anonymous. Remove any names or identifying details, or submit anyway if it is not a name.', 'Submit anyway', () => A.submitClose(el, true)); return;
    }
    (async () => {
      const r = await emit('closeout', { id, outcome: f.outcome, hospitalId: f.hospitalId, admitted: f.admitted, debrief: f.debrief, notes, other: S.drafts['co-other-' + id] || '' });
      if (r.error) { const e2 = $('#co-err'); if (e2) e2.textContent = r.error; return; }
      delete S.drafts['co-notes-' + id]; delete S.drafts['co-other-' + id];
      toast(f.outcome === 'hospital' ? `Closed · ${r.liaisonsNotified} hospital liaison${r.liaisonsNotified === 1 ? '' : 's'} notified · LCSW review requested` : 'Closed · sent for LCSW review');
      render(true);
    })();
  },
  async handoff(el) { const id = el.dataset.id; const r = await emit('handoff', { id, note: S.drafts['ho-' + id] || $('#ho-' + id).value }); if (r.error) toast(r.error); else toast('Handoff accepted · team notified'); },
  async signoff(el) { const id = el.dataset.id; const r = await emit('signoff', { id, comment: S.drafts['so-' + id] || '' }); if (r.error) toast(r.error); else toast('Signed off · team notified'); },
  evFilter(el) { S.ui.evFilter = el.dataset.v; render(); },
  async signup(el) { const r = await emit('signup', { event: el.dataset.ev, shift: el.dataset.sh }); if (r.error) toast(r.error); else toast(r.signedUp ? "You're signed up" : 'Sign-up cancelled'); },
  boardFilter(el) { S.ui.boardFilter = el.dataset.v; render(); },
  npCat(el) { S.ui.np.cat = el.dataset.v; render(); },
  npUrgent() { S.ui.np.urgent = !S.ui.np.urgent; render(); },
  async submitPost() {
    const r = await emit('post', { title: S.drafts['np-title'] || '', body: S.drafts['np-body'] || '', cat: S.ui.np.cat, urgent: S.ui.np.urgent });
    if (r.error) { $('#np-err').textContent = r.error; return; }
    delete S.drafts['np-title']; delete S.drafts['np-body']; S.ui.np = null; toast('Posted to the resource board'); location.hash = '#/post/' + r.id;
  },
  help(el) { emit('help', { id: el.dataset.id }); },
  simType(el) { S.ui.sim.type = el.dataset.v; S.ui.sim.severity = null; delete S.drafts['sim-summary']; render(); },
  simSev(el) { S.ui.sim.severity = el.dataset.v; render(); },
  async simGo(el) {
    el.disabled = true; unlockAudio();
    const f = S.ui.sim; const t = S.state.alertTypes.find(x => x.id === f.type);
    const r = await emit('simulate', { type: f.type, severity: f.severity || t.severity, place: f.place >= 0 ? f.place : undefined, summary: S.drafts['sim-summary'] || t.summary });
    el.disabled = false;
    if (r.error) { toast(r.error); return; }
    delete S.drafts['sim-summary'];
    toast(`Test alert ${r.id} sent to ${r.notified} on-duty volunteer${r.notified === 1 ? '' : 's'}`);
    location.hash = (isVol(me().role) ? '#/alert/' : '#/enc/') + r.id;
  },
  avail(el) { const a = me().availability.slice(); const i = Number(el.dataset.i); a[i] = (a[i] + 1) % 3; emit('profile', { availability: a }); },
  notifs() { askNotif(true); },
  testSound() { unlockAudio(); setTimeout(alertSound, 60); toast('Played the alert sound. If you heard nothing, check silent mode.'); },
  switchRole() { modal(`<h3 style="font-size:17px">Switch role (test)</h3><div class="opt" style="margin:12px 0">${ROLE_ORDER.map(k => `<button type="button" class="${me().role === k ? 'sel' : ''}" data-act="setRole" data-v="${k}">${esc(roleLabel(k))}</button>`).join('')}</div><button class="btn ghost" data-act="closeModal">Cancel</button>`); },
  async setRole(el) { closeModal(); await emit('profile', { role: el.dataset.v }); toast('Role: ' + roleLabel(el.dataset.v)); },
  switchChapter() { modal(`<h3 style="font-size:17px">Switch chapter (test)</h3><div class="opt" style="margin:12px 0">${S.state.chapters.map(c => `<button type="button" class="${me().chapter === c.id ? 'sel' : ''}" data-act="setChapter" data-v="${c.id}">${esc(c.name)}</button>`).join('')}</div><button class="btn ghost" data-act="closeModal">Cancel</button>`); },
  async setChapter(el) { closeModal(); dropMaps(); await emit('profile', { chapter: el.dataset.v }); S.ui.sim = null; toast('Chapter switched'); },
  install() {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    modal(`<h3 style="font-size:17px">Install on your phone</h3><div class="sm" style="margin:10px 0 14px;line-height:1.55">${ios ? '<b>iPhone (Safari):</b><br>1. Tap the Share button (square with an arrow).<br>2. Scroll and tap <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>, then open Zendo Response from your Home Screen.' : '<b>Android (Chrome):</b><br>1. Tap the ⋮ menu (top right).<br>2. Tap <b>Install app</b> or <b>Add to Home screen</b>.<br>3. Open Zendo Response from your home screen.'}</div><button class="btn primary" data-act="closeModal">Got it</button>`);
  },
  signout() { confirmBox('Sign out?', 'Your test account stays on the server until it resets, but you will need to sign in again as a new tester.', 'Sign out', () => signOut()); },
  reset() { confirmBox('Reset all demo data?', 'This clears every test encounter, chat, sign-up, board post and DM for <b>everyone</b>, then reloads the fake sample data.', 'Reset demo data', async () => { const r = await emit('reset'); if (r.error) toast(r.error); }, true); }
};
const CHANGE = {
  hosp(el) { S.ui.close[el.dataset.id].hospitalId = el.value; },
  simPlace(el) { S.ui.sim.place = Number(el.value); }
};
function saveSigninDraft() { ['si-name', 'si-code'].forEach(id => { const el = document.getElementById(id); if (el) S.drafts[id] = el.value; }); }
function askNotif(explicit) {
  if (!('Notification' in window)) { if (explicit) toast('Notifications need the app installed to your Home Screen (iPhone, iOS 16.4+).'); return; }
  if (Notification.permission === 'default') Notification.requestPermission().then(p => { if (explicit || p === 'granted') toast(p === 'granted' ? 'Notifications on' : 'Notifications not allowed'); render(); });
  else if (explicit) toast(Notification.permission === 'granted' ? 'Notifications are already on' : 'Notifications are blocked in your browser settings');
}

/* ========== LISTENERS ========== */
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act],[data-go]'); if (!el || el.disabled) return;
  if (el.dataset.act && A[el.dataset.act]) { ev.preventDefault(); A[el.dataset.act](el); return; }
  if (el.dataset.go) { ev.preventDefault(); if (location.hash === el.dataset.go) render(true); else location.hash = el.dataset.go; }
});
document.addEventListener('change', ev => { const el = ev.target.closest('[data-act-change]'); if (el && CHANGE[el.dataset.actChange]) CHANGE[el.dataset.actChange](el); });
let qTimer = null;
document.addEventListener('input', ev => {
  const el = ev.target; if (!el.id) return;
  S.drafts[el.id] = el.value;
  if (el.id === 'res-q') { clearTimeout(qTimer); qTimer = setTimeout(() => render(), 200); }
});
document.addEventListener('submit', async ev => {
  const f = ev.target.closest('[data-form]'); if (!f) return; ev.preventDefault();
  const kind = f.dataset.form; const id = f.dataset.id; const key = (kind === 'chat' ? 'chat-' : kind === 'dm' ? 'dm-' : 'reply-') + id;
  const input = document.getElementById(key); const text = (input ? input.value : S.drafts[key] || '').trim(); if (!text) return;
  S.drafts[key] = ''; if (input) input.value = '';
  let r;
  if (kind === 'chat') r = await emit('chat', { id, text, channel: S.ui.chatTab === 'help' ? 'team' : S.ui.chatTab });
  else if (kind === 'dm') r = await emit('dm', { role: f.dataset.role, thread: id, text });
  else r = await emit('reply', { id, body: text });
  if (r && r.error && r.error !== 'empty') { toast(r.error); S.drafts[key] = text; render(); }
  const again = document.getElementById(key); if (again) again.focus({ preventScroll: true });
});
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });

/* ========== BOOT ========== */
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { }));
if (S.token) connect();
if (!location.hash) history.replaceState(null, '', S.token ? '#/home' : '#/signin');
render();
})();

// All data in this file is FAKE and for testing only.
const CHAPTERS = {
  bk: {
    id: 'bk', name: 'Brooklyn – Coney Island', short: 'Coney Island', borough: 'Brooklyn', prefix: 'CI',
    center: [40.5755, -73.9790], est: 'Est. 2026', baseEncounters: 37, resolvedPct: 89,
    places: [
      { name: 'Boardwalk near W 12th St', area: 'Coney Island', lat: 40.5726, lng: -73.9810 },
      { name: 'Surf Ave & Stillwell Ave', area: 'Coney Island', lat: 40.5753, lng: -73.9813 },
      { name: 'Mermaid Ave & W 17th St', area: 'Coney Island', lat: 40.5772, lng: -73.9858 },
      { name: 'Brighton Beach boardwalk', area: 'Brighton Beach', lat: 40.5752, lng: -73.9605 },
      { name: 'Neptune Ave & W 6th St', area: 'Coney Island', lat: 40.5800, lng: -73.9739 },
      { name: 'Riegelmann Boardwalk at W 21st St', area: 'Coney Island', lat: 40.5714, lng: -73.9885 }
    ],
    safeZones: [
      { id: 'sz-bk-1', name: 'Mermaid Ave Calm Room', where: 'Inside a fictional community center · 2nd floor', lat: 40.5779, lng: -73.9832, rooms: 3, hours: '24/7', amenities: ['Dim lighting', 'Water & snacks', 'Blankets', 'Quiet · no music', 'Restroom', 'Wheelchair access'], host: 'Theo Banks (Tier 1, sample)' },
      { id: 'sz-bk-2', name: 'Brighton Quiet Space', where: 'Fictional church hall · ground floor', lat: 40.5779, lng: -73.9612, rooms: 2, hours: '8 PM – 6 AM', amenities: ['Water', 'Blankets', 'Quiet', 'Restroom'], host: 'Kwame Owusu (Tier 1, sample)' }
    ],
    hospitals: [
      { id: 'h-bk-1', name: 'South Shore Medical Center', kind: 'psych', desc: 'Psychiatric ER (CPEP) · 24/7', dist: '1.1 mi', drive: '6 min drive', tags: ['Psych ER', 'Liaison on file', 'Spanish'], note: 'Fictional hospital · moderate wait' },
      { id: 'h-bk-2', name: 'Bayview Behavioral Health', kind: 'psych', desc: 'Crisis stabilization center · walk-in', dist: '2.4 mi', drive: '11 min drive', tags: ['Voluntary only', 'No ID required'], note: 'Fictional · peer-friendly' },
      { id: 'h-bk-3', name: 'Kings Harbor Hospital', kind: 'er', desc: 'Emergency department · Level II trauma', dist: '3.0 mi', drive: '13 min drive', tags: ['ER', 'Psych consult'], note: 'Fictional · wait time not reported' },
      { id: 'h-bk-4', name: 'Neptune Urgent Care', kind: 'urgent', desc: 'Urgent care · 8 AM – 11 PM', dist: '0.8 mi', drive: '4 min drive', tags: ['Urgent care'], note: 'Fictional · not for psychiatric emergencies' },
      { id: 'h-bk-5', name: 'Sheepshead Recovery House', kind: 'detox', desc: 'Detox & withdrawal management', dist: '3.6 mi', drive: '15 min drive', tags: ['Detox', 'Overnight intake'], note: 'Fictional · call ahead' }
    ]
  },
  les: {
    id: 'les', name: 'Manhattan – Lower East Side', short: 'Lower East Side', borough: 'Manhattan', prefix: 'LE',
    center: [40.7170, -73.9870], est: 'Est. 2026', baseEncounters: 22, resolvedPct: 86,
    places: [
      { name: 'Seward Park, Canal St side', area: 'Lower East Side', lat: 40.7145, lng: -73.9890 },
      { name: 'Ludlow St & Rivington St', area: 'Lower East Side', lat: 40.7205, lng: -73.9883 },
      { name: 'Allen St & Delancey St', area: 'Lower East Side', lat: 40.7190, lng: -73.9905 },
      { name: 'East River Park track', area: 'Lower East Side', lat: 40.7155, lng: -73.9760 },
      { name: 'Orchard St & Stanton St', area: 'Lower East Side', lat: 40.7213, lng: -73.9895 },
      { name: 'Essex St & Grand St', area: 'Lower East Side', lat: 40.7165, lng: -73.9875 }
    ],
    safeZones: [
      { id: 'sz-les-1', name: 'Rivington Calm Room', where: 'Fictional settlement house · basement', lat: 40.7198, lng: -73.9860, rooms: 3, hours: '24/7', amenities: ['Dim lighting', 'Water & snacks', 'Blankets', 'Quiet', 'Restroom'], host: 'Sofía Gutiérrez (Tier 1, sample)' },
      { id: 'sz-les-2', name: 'Grand St Rest Space', where: 'Fictional library annex · ground floor', lat: 40.7158, lng: -73.9845, rooms: 2, hours: '7 PM – 5 AM', amenities: ['Water', 'Quiet', 'Wheelchair access'], host: 'Ben Ortega (Tier 2, sample)' }
    ],
    hospitals: [
      { id: 'h-les-1', name: 'Bowery General Hospital', kind: 'psych', desc: 'Psychiatric ER (CPEP) · 24/7', dist: '0.9 mi', drive: '5 min drive', tags: ['Psych ER', 'Liaison on file', 'Mandarin', 'Spanish'], note: 'Fictional · moderate wait' },
      { id: 'h-les-2', name: 'Eastside Crisis Respite', kind: 'psych', desc: 'Crisis respite · walk-in', dist: '1.3 mi', drive: '7 min drive', tags: ['Voluntary only', 'Peer staff'], note: 'Fictional · usually no wait' },
      { id: 'h-les-3', name: 'Lower Manhattan Medical', kind: 'er', desc: 'Emergency department', dist: '1.8 mi', drive: '9 min drive', tags: ['ER'], note: 'Fictional' },
      { id: 'h-les-4', name: 'Delancey Urgent Care', kind: 'urgent', desc: 'Urgent care · 8 AM – 10 PM', dist: '0.4 mi', drive: '2 min drive', tags: ['Urgent care'], note: 'Fictional · not for psychiatric emergencies' },
      { id: 'h-les-5', name: 'Hester St Detox Center', kind: 'detox', desc: 'Detox & withdrawal management', dist: '1.1 mi', drive: '6 min drive', tags: ['Detox'], note: 'Fictional · call ahead' }
    ]
  }
};

const ALERT_TYPES = [
  { id: 'psy', label: 'Difficult psychedelic experience', icon: 'heart', severity: 'Moderate', summary: 'Adult, ~20s, conscious & breathing. Frightened, says "it won\'t stop." Friend is with them.', tags: ['Psilocybin (reported)', '~2 hrs in', 'English'] },
  { id: 'panic', label: 'Panic / anxiety attack', icon: 'wind', severity: 'Low', summary: 'Guest hyperventilating near the entrance, says their heart is racing. Alert and talking.', tags: ['No substance reported', 'English'] },
  { id: 'event', label: 'Overwhelmed guest at event', icon: 'music', severity: 'Moderate', summary: 'Guest crying and disoriented by the speakers, separated from friends. Staff asked for a sitter.', tags: ['Unknown substance', 'Loud venue'] },
  { id: 'intox', label: 'Intoxication with distress', icon: 'alert', severity: 'High', summary: 'Guest very drowsy, slurring, friend worried. Responds to voice. Watch red flags closely.', tags: ['Alcohol (reported)', 'Check breathing'] },
  { id: 'grief', label: 'Emotional crisis / grief', icon: 'moon', severity: 'Moderate', summary: 'Adult sitting alone on a bench, tearful, says they just got bad news and do not want to go home.', tags: ['No substance reported', 'Spanish'] }
];

const SAMPLE_MEMBERS = {
  bk: [
    { name: 'Maya Rivera', role: 't2' }, { name: 'Andre Silva', role: 't2' }, { name: 'Lena Feldman', role: 't1' },
    { name: 'Theo Banks', role: 't1' }, { name: 'Kwame Owusu', role: 't1' }
  ],
  les: [
    { name: 'Sofía Gutiérrez', role: 't1' }, { name: 'Ben Ortega', role: 't2' }, { name: 'Mei Chen', role: 't1' }, { name: 'Jonah Weiss', role: 't1' }
  ]
};

function events() {
  return [
    { id: 'ev1', chapter: 'bk', title: 'Halloween Warehouse Party', date: '2026-10-30', day: 'FRI OCT 30', kind: 'Parties', place: 'Bushwick', time: '10 PM – 4 AM', tags: ['Sitter', 'Shift Lead', '~1,200 guests'], grad: 'linear-gradient(110deg,#65206b,#c56a57)',
      shifts: [{ id: 's1', name: 'Sitter', time: '10 PM – 2 AM', hours: 4, target: 6, seeded: 4 }, { id: 's2', name: 'Shift Lead', time: '10 PM – 4 AM', hours: 6, target: 2, seeded: 1 }] },
    { id: 'ev2', chapter: 'bk', title: 'Sound Bath on the Boardwalk', date: '2026-11-07', day: 'SAT NOV 7', kind: 'Community', place: 'Coney Island', time: '7 PM – 11 PM', tags: ['Sitter', 'Outdoor', 'Beginner-friendly'], grad: 'linear-gradient(110deg,#4f8a74,#AB6B9E)',
      shifts: [{ id: 's1', name: 'Sitter', time: '7 PM – 11 PM', hours: 4, target: 6, seeded: 3 }] },
    { id: 'ev3', chapter: 'bk', title: 'Gowanus Loft Rave', date: '2026-11-14', day: 'SAT NOV 14', kind: 'Parties', place: 'Gowanus', time: '11 PM – 6 AM', tags: ['Sitter', 'Shift Lead', 'Overnight'], grad: 'linear-gradient(110deg,#2a1f3d,#3f6fb5)',
      shifts: [{ id: 's1', name: 'Sitter', time: '11 PM – 3 AM', hours: 4, target: 8, seeded: 5 }, { id: 's2', name: 'Shift Lead', time: '11 PM – 6 AM', hours: 7, target: 2, seeded: 1 }] },
    { id: 'ev4', chapter: 'bk', title: 'SIT Practice Circle', date: '2026-11-22', day: 'SUN NOV 22', kind: 'Trainings', place: 'Coney Island', time: '2 PM – 5 PM', tags: ['Training', 'All tiers'], grad: 'linear-gradient(110deg,#c98a1b,#E1D2BA)',
      shifts: [{ id: 's1', name: 'Participant', time: '2 PM – 5 PM', hours: 3, target: 20, seeded: 9 }] },
    { id: 'ev5', chapter: 'les', title: 'Ludlow Basement Show', date: '2026-10-31', day: 'SAT OCT 31', kind: 'Parties', place: 'Lower East Side', time: '9 PM – 3 AM', tags: ['Sitter', 'Shift Lead', '~400 guests'], grad: 'linear-gradient(110deg,#65206b,#c56a57)',
      shifts: [{ id: 's1', name: 'Sitter', time: '9 PM – 1 AM', hours: 4, target: 4, seeded: 2 }, { id: 's2', name: 'Shift Lead', time: '9 PM – 3 AM', hours: 6, target: 1, seeded: 0 }] },
    { id: 'ev6', chapter: 'les', title: 'Harm Reduction Street Fair', date: '2026-11-08', day: 'SUN NOV 8', kind: 'Community', place: 'Seward Park', time: '12 PM – 5 PM', tags: ['Info table', 'Outdoor'], grad: 'linear-gradient(110deg,#4f8a74,#AB6B9E)',
      shifts: [{ id: 's1', name: 'Info table', time: '12 PM – 5 PM', hours: 5, target: 5, seeded: 2 }] },
    { id: 'ev7', chapter: 'les', title: 'Winter Solstice Festival', date: '2026-12-19', day: 'SAT DEC 19', kind: 'Festivals', place: 'East River Park', time: '4 PM – 12 AM', tags: ['Sitter', 'Shift Lead', 'Outdoor'], grad: 'linear-gradient(110deg,#2a1f3d,#3f6fb5)',
      shifts: [{ id: 's1', name: 'Sitter', time: '4 PM – 8 PM', hours: 4, target: 10, seeded: 3 }, { id: 's2', name: 'Shift Lead', time: '4 PM – 12 AM', hours: 8, target: 2, seeded: 0 }] }
  ].map(e => ({ ...e, signups: [] }));
}

function board(now) {
  const h = 3600e3;
  return [
    { id: 'p1', chapter: 'bk', author: 'Andre Silva', userId: null, cat: 'Detox & rehab', urgent: true, title: 'Detox bed tonight — adult male, alcohol', body: 'Guest from last night\'s (fake) encounter is ready for detox. Anyone know a place in Brooklyn/Queens taking intakes after midnight?', at: now - 0.2 * h,
      replies: [{ id: 'r1', author: 'Lena Feldman', userId: null, body: 'The crisis center (fictional) does overnight intake — call their triage line first, ask for the peer desk.', at: now - 0.1 * h }], helpers: ['seed1', 'seed2', 'seed3'] },
    { id: 'p2', chapter: 'les', author: 'Sofía Gutiérrez', userId: null, cat: 'Therapy', urgent: false, title: 'Spanish-speaking therapist, sliding scale', body: 'Looking for an integration-informed therapist who speaks Spanish. Telehealth OK.', at: now - 2 * h, replies: [], helpers: ['seed1', 'seed2'] },
    { id: 'p3', chapter: 'bk', author: 'Kwame Owusu', userId: null, cat: 'Housing', urgent: false, title: 'Short-term shelter for young adult (19)', body: 'Safe, LGBTQ+-affirming youth housing options?', at: now - 26 * h, replies: [], helpers: ['seed1'] },
    { id: 'p4', chapter: 'les', author: 'Mei Chen', userId: null, cat: 'Language', urgent: false, title: 'Cantonese speaker for Saturday shift?', body: 'Ludlow show expects a lot of Cantonese-speaking guests. Anyone able to join as a sitter?', at: now - 30 * h, replies: [], helpers: [] }
  ];
}

function history(now) {
  const h = 3600e3;
  const mk = (id, chapter, type, place, outcome, hosp, ago, names) => ({
    id, chapter, type, severity: 'Moderate', place, summary: 'Fake seeded encounter for the history list.', tags: [], createdBy: null, createdAt: now - ago * h,
    needed: names.length, responders: names.map((n, i) => ({ userId: null, name: n.n, tier: n.t, kind: i === 0 ? 'lead' : 'support', status: 'on scene', at: now - ago * h })),
    accepting: false, declined: [], messages: [], escalated: false, mdRequested: false, checkin: null, status: 'closed',
    closeout: { outcome, hospitalId: hosp, hospitalName: hosp ? CHAPTERS[chapter].hospitals.find(x => x.id === hosp).name : null, admitted: !!hosp, notes: 'Seeded sample notes — no names.', by: names[0].n, at: now - (ago - 1.2) * h, debrief: true },
    handoff: hosp ? { status: 'accepted', hospitalName: CHAPTERS[chapter].hospitals.find(x => x.id === hosp).name, liaisonName: 'Priya Nair (sample)', note: 'Met them at intake (sample).', at: now - (ago - 1.3) * h } : null,
    signoff: { by: 'Dana Whitfield, LCSW (sample)', at: now - (ago - 2) * h }, seeded: true
  });
  return [
    mk('CI-0416', 'bk', 'Difficult psychedelic experience', { name: 'Surf Ave & Stillwell Ave', area: 'Coney Island', lat: 40.5753, lng: -73.9813 }, 'home', null, 22, [{ n: 'Maya Rivera', t: 't2' }, { n: 'Lena Feldman', t: 't1' }]),
    mk('CI-0415', 'bk', 'Intoxication with distress', { name: 'Brighton Beach boardwalk', area: 'Brighton Beach', lat: 40.5752, lng: -73.9605 }, 'hospital', 'h-bk-1', 50, [{ n: 'Andre Silva', t: 't2' }, { n: 'Theo Banks', t: 't1' }, { n: 'Kwame Owusu', t: 't1' }]),
    mk('LE-0211', 'les', 'Panic / anxiety attack', { name: 'Ludlow St & Rivington St', area: 'Lower East Side', lat: 40.7205, lng: -73.9883 }, 'family', null, 30, [{ n: 'Ben Ortega', t: 't2' }, { n: 'Mei Chen', t: 't1' }])
  ];
}

module.exports = { CHAPTERS, ALERT_TYPES, SAMPLE_MEMBERS, events, board, history };

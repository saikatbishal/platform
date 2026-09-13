const {
  StationBoard, BoardBracket, PlatformCanopy, Button, BoardChip, VersionBadge, Sheet,
  StatBar, MilestoneList, StationPicker, TextField, SelectField, FieldNote,
  SignInButton, UserMenu,
} = window.PlatformDesignSystem_1d54fc;

const STATIONS = window.PF_STATIONS;
const byCode = Object.fromEntries(STATIONS.map((s) => [s.code, s]));

/* Great-circle distance, as the crow flies. The app says so rather than
   hiding that it undercounts. */
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const [x1,y1] = a.lonlat, [x2,y2] = b.lonlat;
  const dLat = (y2-y1)*r, dLon = (x2-x1)*r;
  const h = Math.sin(dLat/2)**2 + Math.cos(y1*r)*Math.cos(y2*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
const fmt = (n) => Math.round(n).toLocaleString('en-IN');

function statsFor(journeys) {
  let total = 0, longest = 0;
  const codes = new Set(), states = new Set();
  for (const j of journeys) {
    const a = byCode[j.fromCode], b = byCode[j.toCode];
    if (!a || !b) continue;
    const d = km(a, b);
    total += d; longest = Math.max(longest, d);
    codes.add(a.code); codes.add(b.code); states.add(a.state); states.add(b.state);
  }
  return { km: total, longest, stations: codes.size, states: states.size };
}

function SignInBoard({ onSignIn, onDismiss }) {
  return (
    <section aria-label="Sign in" style={{
      position:'relative', width:'100%', maxWidth:384, overflow:'hidden',
      borderRadius:'var(--radius-sm)', border:'var(--border-hair) solid var(--line)',
      background:'var(--surface)', boxShadow:'var(--shadow-sheet)',
    }}>
      <PlatformCanopy />
      <button type="button" onClick={onDismiss} aria-label="Take the board down and look at the map"
        style={{ position:'absolute', top:0, right:0, zIndex:10, display:'grid', placeItems:'center',
                 height:44, width:44, background:'none', border:'none', cursor:'pointer', color:'var(--ink-faint)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div style={{ position:'relative', padding:'36px 20px 20px' }}>
        <BoardBracket />
        <StationBoard devanagari="प्लेटफ़ॉर्म" latin="Platform" regional="প্ল্যাটফর্ম" code="PF" zone="EST 2026" />
        <h1 style={{ margin:'20px 0 0', fontFamily:'var(--font-display)', fontSize:'var(--text-lg)',
                     lineHeight:1.35, fontWeight:'var(--weight-black)', letterSpacing:'-0.01em', color:'var(--ink)' }}>
          Your rail life, on one map.
        </h1>
        <p style={{ margin:'6px 0 16px', fontSize:'var(--text-sm)', lineHeight:'var(--leading-sm)', color:'var(--ink-soft)' }}>
          Log a journey in fifteen seconds and watch India fill in. The map behind
          this board is a preview with sample journeys.
        </p>
        <SignInButton mode="google" onSignIn={onSignIn} />
      </div>
    </section>
  );
}

function AddJourneyForm({ onAdd, onClose }) {
  const [from, setFrom] = React.useState(null);
  const [to, setTo] = React.useState(null);
  const [qF, setQF] = React.useState('');
  const [qT, setQT] = React.useState('');
  const [train, setTrain] = React.useState('');
  const [date, setDate] = React.useState('2026-09-10');
  const [note, setNote] = React.useState('');
  const [times, setTimes] = React.useState(false);

  const search = (q, exclude) => !q ? [] : STATIONS
    .filter((s) => s.code !== exclude && (s.code.toLowerCase().startsWith(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase())))
    .slice(0, 6);

  const ready = from && to && from.code !== to.code;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onAdd({ fromCode: from.code, toCode: to.code, travelledOn: date, trainNumber: train || null, note: note || null }); }}
      style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <StationPicker label="From" value={from} query={qF} onQuery={setQF} results={search(qF, to?.code)} onPick={(h) => { setFrom(h); setQF(''); }} />
      <StationPicker label="To" value={to} query={qT} onQuery={setQT} results={search(qT, from?.code)} onPick={(h) => { setTo(h); setQT(''); }} />
      {!from || !to
        ? <div><span style={{ display:'block', marginBottom:6, fontSize:'var(--text-label)', fontWeight:600, letterSpacing:'var(--tracking-label)', textTransform:'uppercase', color:'var(--ink-faint)' }}>Train</span>
            <FieldNote waiting>Pick both stations and the trains that run between them appear here.</FieldNote></div>
        : <SelectField label="Train" optional value={train} onChange={setTrain}
            options={[{ value:'', label:'Not recorded — draw the shortest path' },
              ...window.PF_TRAINS.map((t) => ({ value:t.number, label:`${t.number} · ${t.name} — ${t.stops} stops` }))]} />}
      <TextField label="Travelled on" type="date" value={date} max="2026-09-10" onChange={setDate} />
      {times
        ? <div style={{ display:'flex', flexDirection:'column', gap:12, padding:12, borderRadius:'var(--radius-sm)', border:'var(--border-hair) solid var(--line)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'var(--text-label)', fontWeight:600, letterSpacing:'var(--tracking-label)', textTransform:'uppercase', color:'var(--ink-faint)' }}>Departure &amp; arrival — optional</span>
              <Button variant="quiet" onClick={() => setTimes(false)}>Remove</Button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}><TextField label="Departed" type="time" value="" onChange={() => {}} /></div>
              <div style={{ flex:1 }}><TextField label="Arrived" type="time" value="" onChange={() => {}} /></div>
            </div>
            <Button variant="quiet" style={{ alignSelf:'flex-start' }}>Arrived: same day</Button>
          </div>
        : <Button variant="quiet" onClick={() => setTimes(true)} style={{ alignSelf:'flex-start' }}>+ Add departure &amp; arrival times</Button>}
      <TextField label="Note" optional placeholder="Overnight, top bunk." value={note} onChange={setNote} />
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <Button variant="primary" type="submit" disabled={!ready} style={{ flex:1 }}>Log journey</Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </form>
  );
}

function PassportCardView({ journeys, stats, onClose }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ borderRadius:'var(--radius-sm)', border:'var(--border-hair) solid var(--line)', overflow:'hidden', background:'var(--ground)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:44, background:'var(--board)' }}>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'var(--text-lg)', letterSpacing:'var(--tracking-board)', color:'var(--board-ink)' }}>PLATFORM</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'var(--text-label)', letterSpacing:'var(--tracking-code)', color:'var(--board-ink)' }}>YOUR RAIL LIFE, ON ONE MAP</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:16, alignItems:'center' }}>
          <div style={{ position:'relative', height:180 }}>
            <IndiaMap journeys={journeys} stations={STATIONS} seaPaused />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[[fmt(stats.km),'Kilometres'],[String(stats.stations),'Stations'],[String(stats.states),'States']].map(([v,l]) => (
              <div key={l}>
                <div className="tabular" style={{ fontSize:'var(--text-2xl)', lineHeight:1, color:'var(--cream)' }}>{v}</div>
                <div style={{ marginTop:5, fontSize:'var(--text-label)', fontWeight:600, letterSpacing:'var(--tracking-label)', textTransform:'uppercase', color:'var(--ink-faint)' }}>{l}</div>
              </div>
            ))}
            <div style={{ fontSize:'var(--text-sm)', color:'var(--ink)' }}>10 September 2026</div>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <Button variant="primary" style={{ flex:1 }}>Download</Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function App() {
  const [signedIn, setSignedIn] = React.useState(false);
  const [boardUp, setBoardUp] = React.useState(true);
  const [own, setOwn] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [picked, setPicked] = React.useState(null);

  const showingSamples = own.length === 0 && !signedIn;
  const journeys = showingSamples ? window.PF_SAMPLE_JOURNEYS : own;
  const stats = statsFor(journeys);

  const milestones = [
    { id:'km', label:'1,000 km', achieved: stats.km >= 1000,
      detail: stats.km >= 1000 ? `${fmt(stats.km)} km — past 1,000` : `${fmt(stats.km)} km of 1,000` },
    { id:'st', label:'10 stations', achieved: stats.stations >= 10,
      detail: stats.stations >= 10 ? `${stats.stations} stations — past 10` : `${stats.stations} of 10 stations` },
    { id:'sta', label:'5 states', achieved: stats.states >= 5,
      detail: stats.states >= 5 ? `${stats.states} states — past 5` : `${stats.states} of 5 states` },
    { id:'lh', label:'A journey over 24 hours', achieved:false, detail:'Log departure and arrival times to check' },
  ];

  return (
    <main style={{ position:'relative', height:'100%', width:'100%', overflow:'hidden', background:'var(--ground)' }}>
      <IndiaMap journeys={journeys} stations={STATIONS} onPickStation={setPicked} />

      <header style={{ position:'absolute', top:12, left:12, pointerEvents:'none' }}>
        <VersionBadge name="Platform" version={showingSamples ? 'Sample' : 'v0.1'} />
      </header>

      {signedIn
        ? <div style={{ position:'absolute', top:12, right:12 }}>
            <UserMenu user={{ name:'Saikat Bishal', email:'saikat@example.com' }} onSignOut={() => { setSignedIn(false); setOwn([]); setBoardUp(true); }} />
          </div>
        : <div style={{ position:'absolute', top:56, right:16, display:'flex', justifyContent:'flex-end' }}>
            {boardUp
              ? <SignInBoard onSignIn={() => setSignedIn(true)} onDismiss={() => setBoardUp(false)} />
              : <BoardChip code="PF" onClick={() => setBoardUp(true)}>Sign in</BoardChip>}
          </div>}

      <div style={{ position:'absolute', bottom:12, left:12, display:'flex', flexDirection:'column', gap:8, alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:8 }}>
          <Button size="sm" onClick={() => setSheet('milestones')}>Milestones</Button>
          <Button size="sm" onClick={() => setSheet('passport')}>Passport card</Button>
        </div>
        <Button onClick={() => setSheet('add')}>+ Log a journey</Button>
        <StatBar stats={[
          { label:'Kilometres', value: fmt(stats.km) },
          { label:'Stations', value: String(stats.stations) },
          { label:'States', value: String(stats.states) },
          { label:'Longest', value: fmt(stats.longest) },
          ...(showingSamples ? [{ label:'Sample', value:'—', tone:'warn' }] : []),
        ]} />
      </div>

      {picked && (
        <div style={{ position:'absolute', bottom:12, right:12, width:260 }}>
          <StationBoard size="sm" latin={picked.name} code={picked.code} zone={picked.state} />
          <Button size="sm" onClick={() => setPicked(null)} style={{ marginTop:8 }}>Close</Button>
        </div>
      )}

      <Sheet open={sheet === 'add'} title="Log a journey" onClose={() => setSheet(null)}>
        <AddJourneyForm onClose={() => setSheet(null)}
          onAdd={(j) => { setOwn((v) => [...v, { ...j, id: 'u' + v.length }]); setSheet(null); }} />
      </Sheet>
      <Sheet open={sheet === 'milestones'} title="Milestones" onClose={() => setSheet(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <MilestoneList milestones={milestones} />
          <Button onClick={() => setSheet(null)} style={{ alignSelf:'flex-start' }}>Close</Button>
        </div>
      </Sheet>
      <Sheet open={sheet === 'passport'} title="Passport card" width={620} onClose={() => setSheet(null)}>
        <PassportCardView journeys={journeys} stats={stats} onClose={() => setSheet(null)} />
      </Sheet>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

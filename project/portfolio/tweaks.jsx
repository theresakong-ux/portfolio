/* tweaks.jsx — live palette switching (60:30:10, red stays the 10%) plus a
   couple of tasteful motion toggles. Mounts into #tweaks-root. */
const { useEffect } = React;

const TK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "conservatory",
  "field": true,
  "autoWalk": true
}/*EDITMODE-END*/;

function PaletteSwatch({ name, def, active, onPick }) {
  return (
    <button onClick={() => onPick(name)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: '9px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 6,
        border: active ? '1.5px solid #c96442' : '1px solid rgba(0,0,0,.1)',
        background: active ? 'rgba(201,100,66,.06)' : '#fff', transition: 'all .15s',
      }}>
      <span style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }}>
        {def.swatch.map((c, i) => (
          <span key={i} style={{ width: i === 2 ? 12 : 20, height: 24, background: c }} />
        ))}
      </span>
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: '#29261b' }}>{def.label}</span>
      {active && <span style={{ marginLeft: 'auto', color: '#c96442', fontSize: 13 }}>✓</span>}
    </button>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TK_DEFAULTS);

  useEffect(() => { window.TKapplyPalette(t.palette); }, [t.palette]);
  useEffect(() => {
    const cv = document.getElementById('constellation');
    if (cv) cv.style.display = t.field ? '' : 'none';
  }, [t.field]);
  useEffect(() => {
    document.documentElement.dataset.autowalk = t.autoWalk ? '1' : '0';
  }, [t.autoWalk]);

  const P = window.TK_PALETTES;
  return (
    <TweaksPanel>
      <TweakSection label="Color system" />
      <div style={{ padding: '2px 2px 6px' }}>
        <div style={{ fontSize: 11.5, color: '#8a8377', marginBottom: 10, lineHeight: 1.4 }}>
          60 : 30 : 10 — surface · anchor · <span style={{ color: '#c96442', fontWeight: 600 }}>your red</span> stays the 10%.
        </div>
        {Object.entries(P).map(([name, def]) => (
          <PaletteSwatch key={name} name={name} def={def} active={t.palette === name}
            onPick={(n) => setTweak('palette', n)} />
        ))}
      </div>
      <TweakSection label="Motion" />
      <TweakToggle label="Constellation field" value={t.field} onChange={(v) => setTweak('field', v)} />
      <TweakToggle label="Auto-walk case steps" value={t.autoWalk} onChange={(v) => setTweak('autoWalk', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);

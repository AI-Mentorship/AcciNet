'use client';

type Props = {
  name: string;
  klass: string;
  oneway: string;
  mid: [number, number]; // [lng, lat]
  isInter: boolean;
};

function fallbackName(name: string, klass: string) {
  if (name && name.trim()) return name.trim();
  const k = klass ? klass.replace(/_/g, ' ') : 'road';
  return k.charAt(0).toUpperCase() + k.slice(1);
}

export default function SegmentCard({ name, klass, oneway, mid, isInter }: Props) {
  const label = fallbackName(name, klass);
  const coordStr = `${mid[1].toFixed(5)}, ${mid[0].toFixed(5)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coordStr);
    } catch {}
  };

  return (
    <>
      {/* Kill MapLibre popup chrome just for this card */}
      <style>{`
        .maplibregl-popup-content:has(.seg-card),
        .maplibregl-popup.seg-popup .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .maplibregl-popup-tip { display: none !important; }

        .seg-card {
          --seg-accent: #1a73e8;
          --bg: rgba(255,255,255,0.86);
          --fg: #0f1115;
          --muted: #4b5563;
          --border: rgba(0,0,0,0.08);
          --chip-bg: rgba(26,115,232,0.10);
          --code-bg: rgba(15,17,21,0.06);
          -webkit-backdrop-filter: saturate(140%) blur(8px);
          backdrop-filter: saturate(140%) blur(8px);
          background: var(--bg);
          color: var(--fg);
          border-radius: 14px;
          border: 1px solid var(--border);
          box-shadow:
            0 1px 5px rgba(0,0,0,0.16),
            0 1px 0 rgba(255,255,255,0.6) inset;
          padding: 12px 14px;
          min-width: 240px;
        }
        .seg-card[data-accent="inter"] {
          --seg-accent: #ff3b30;
          --chip-bg: rgba(255,59,48,0.12);
        }
        .seg-row {
          display: flex; align-items: center; gap: 10px;
        }
        .seg-title {
          font-weight: 700; letter-spacing: .1px; color: var(--fg); flex: 1;
        }
        .seg-badge {
          font-size: 11px; color: var(--muted);
          padding: 2px 6px; border: 1px solid var(--border);
          border-radius: 999px; background: var(--chip-bg);
        }
        .seg-divider {
          height: 1px; background: var(--border); margin: 8px 0;
        }
        .seg-dot {
          width: 8px; height: 8px; border-radius: 999px;
          background: var(--seg-accent);
          box-shadow: 0 0 0 2px rgba(0,0,0,.05);
        }
        .seg-label {
          font-size: 12px; color: var(--muted);
        }
        .seg-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px; background: var(--code-bg);
          padding: 2px 6px; border-radius: 6px;
        }
        .seg-copy {
          margin-left: auto; font-size: 12px; cursor: pointer;
          user-select: none; color: var(--seg-accent);
          border: 1px solid var(--border); border-radius: 6px;
          padding: 2px 6px;
        }
        .seg-copy:hover { filter: brightness(1.05); }

        @media (prefers-color-scheme: dark) {
          .seg-card {
            --bg: rgba(18,20,24,0.78);
            --fg: #e8eaed;
            --muted: #9aa4b2;
            --border: rgba(255,255,255,0.10);
            --code-bg: rgba(255,255,255,0.07);
            box-shadow:
              0 3px 10px rgba(0,0,0,0.45),
              0 0 0 1px rgba(255,255,255,0.03) inset;
          }
          .seg-badge { color: #cbd5e1; }
        }
      `}</style>

      <div
        className="seg-card"
        data-accent={isInter ? 'inter' : 'regular'}
        style={{ ['--seg-accent' as any]: isInter ? '#ff3b30' : '#1a73e8' }}
      >
        <div className="seg-row" style={{ marginBottom: 6 }}>
          <div className="seg-title">{label}</div>
          <span className="seg-badge">{klass || 'n/a'}</span>
        </div>

        <div className="seg-row" style={{ marginBottom: 6 }}>
          <span className="seg-label">Oneway:</span>
          <b style={{ fontSize: 12 }}>{oneway || 'n/a'}</b>
          <span className="seg-dot" title={isInter ? 'Intersection' : 'Segment'} />
        </div>

        <div className="seg-divider" />

        <div className="seg-row">
          <span className="seg-label">Segment center:</span>
          <code className="seg-code">{coordStr}</code>
          <span className="seg-copy" onClick={copy} title="Copy coordinates">
            Copy
          </span>
        </div>
      </div>
    </>
  );
}







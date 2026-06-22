import { useState } from 'react';
import { boidConfig } from '@/components/canvas/CardSphere';

type ConfigKey = keyof typeof boidConfig;

interface SliderDef {
  key: ConfigKey;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'BOID_SPEED',      label: 'Speed',            min: 0.05, max: 0.5,  step: 0.01,   precision: 2 },
  { key: 'BOID_SEP_W',      label: 'Separation',       min: 0,    max: 0.3,  step: 0.005,  precision: 3 },
  { key: 'BOID_ALIGN_W',    label: 'Alignment',        min: 0,    max: 0.3,  step: 0.005,  precision: 3 },
  { key: 'BOID_BOUNDS_W',   label: 'Boundary',         min: 0,    max: 0.15, step: 0.005,  precision: 3 },
  { key: 'BOID_NOISE',      label: 'Noise',            min: 0,    max: 0.01, step: 0.0002, precision: 4 },
  { key: 'BOID_VIEW_W',     label: 'View attraction',  min: 0,    max: 30,   step: 0.5,    precision: 1 },
  { key: 'BOID_CARD_SCALE', label: 'Card scale',       min: 0.1,  max: 1.0,  step: 0.05,   precision: 2 },
  { key: 'ORIENT_LERP',     label: 'Orient lerp',      min: 0.01, max: 0.3,  step: 0.005,  precision: 3 },
];

export function BoidDebugPanel() {
  const [values, setValues] = useState<Record<ConfigKey, number>>({ ...boidConfig });

  const update = (key: ConfigKey, raw: string) => {
    const value = parseFloat(raw);
    boidConfig[key] = value;
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.82)',
      color: '#e8e8e8',
      padding: '10px 14px 12px',
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 11,
      zIndex: 9999,
      width: 260,
      userSelect: 'none',
      pointerEvents: 'auto',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em', color: '#aaa' }}>
        BOID DEBUG
      </div>
      {SLIDERS.map(({ key, label, min, max, step, precision }) => (
        <div key={key} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span>{label}</span>
            <span style={{ color: '#7cf' }}>{values[key].toFixed(precision)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[key]}
            onChange={e => update(key, e.target.value)}
            style={{ width: '100%', accentColor: '#7cf', cursor: 'pointer' }}
          />
        </div>
      ))}
    </div>
  );
}

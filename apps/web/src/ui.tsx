import { useState, type ReactNode } from 'react';

export function Section({
  id,
  title,
  kicker,
  children,
}: {
  id: string;
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="section" id={id}>
      <h2>{title}</h2>
      {kicker ? <p className="kicker">{kicker}</p> : null}
      {children}
    </section>
  );
}

export function Replay({ children, label }: { children: (key: number) => ReactNode; label: string }) {
  const [key, setKey] = useState(0);
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{label}</strong>
        <button className="replay" type="button" onClick={() => setKey((n) => n + 1)}>
          Replay
        </button>
      </div>
      {children(key)}
    </div>
  );
}

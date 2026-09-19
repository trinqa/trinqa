import {
  accessibilityFlags,
  colorDistribution,
  colors,
  componentInventory,
  homeTokens,
  motion,
  motionPatterns,
  outliers,
  primitiveColor,
  primitiveMotion,
  primitiveRadius,
  primitiveShadow,
  primitiveSpace,
  primitiveType,
  radius,
  screenTokens,
  semanticTypography,
  spacing,
  usage,
  walletColors,
} from '@trinqa/tokens';
import { useMemo, useState } from 'react';

import { contrastRatio, formatRatio } from './lib/contrast';
import { Replay, Section } from './ui';

const NAV = [
  ['overview', '00 Overview'],
  ['color', '01 Color'],
  ['type', '02 Typography'],
  ['spacing', '03 Spacing'],
  ['radius', '04 Radius'],
  ['borders', '05 Borders'],
  ['elevation', '06 Elevation'],
  ['icons', '07 Icons'],
  ['components', '08 Components'],
  ['financial', '09 Financial'],
  ['motion', '10 Motion'],
  ['interaction', '11 Interaction'],
  ['anatomy', '12 Anatomy'],
  ['a11y', '13 Accessibility'],
  ['explorer', '14 Explorer'],
  ['distribution', '15 Distribution'],
] as const;

const COLOR_GROUPS = [
  {
    title: 'Surfaces — 4-layer stack',
    items: [
      ['colors.background', colors.background, 'canvas #F3F3F3'],
      ['colors.surface', colors.surface, 'surface (elevated) #FFFFFF'],
      ['colors.surfaceSecondary', colors.surfaceSecondary, 'surfaceSecondary (muted) #F5F5F5'],
      ['colors.surfaceLayer', colors.surfaceLayer, 'surfaceLayer (inset) #F2F2F2'],
      ['walletColors.bodyStart', walletColors.bodyStart, 'wallet surface (inverse)'],
    ],
  },
  {
    title: 'Text',
    items: [
      ['colors.textPrimary', colors.textPrimary, 'textPrimary'],
      ['colors.textSecondary', colors.textSecondary, 'textSecondary'],
      ['walletColors.textPrimary', walletColors.textPrimary, 'textInverse'],
      ['walletColors.textTertiary', walletColors.textTertiary, 'textTertiary'],
    ],
  },
  {
    title: 'Borders',
    items: [
      ['colors.borderStrong', colors.borderStrong, 'borderStrong'],
    ],
  },
  {
    title: 'Action (CTA cyan — excluded from palette reduction)',
    items: [
      ['colors.action', colors.action, 'action.primary #08AFD3'],
      ['colors.actionPrimaryDark', colors.actionPrimaryDark, 'action.primaryDark'],
      ['colors.actionPrimaryDarker', colors.actionPrimaryDarker, 'action.primaryDarker'],
      ['colors.selection', colors.selection, 'selection fill'],
    ],
  },
  {
    title: 'Other / wallet',
    items: [
      ['walletColors.silver0', walletColors.silver0, 'card peek'],
      ['walletColors.pocket0', walletColors.pocket0, 'wallet pocket'],
      ['colors.merchantLogo', colors.merchantLogo, 'merchant mark'],
      ['colors.merchantLogoAccent', colors.merchantLogoAccent, 'merchant mark'],
    ],
  },
] as const;

const TYPE_SAMPLES: Array<[keyof typeof semanticTypography, string]> = [
  ['pageTitle', 'Activity'],
  ['amountHero', '1,240.00'],
  ['amountDisplay', '12.40'],
  ['amountCurrency', '$'],
  ['sectionTitle', 'Recent'],
  ['kicker', 'Total Earned'],
  ['label', 'Maya Chen'],
  ['body', 'Everything that happened to your money.'],
  ['caption', 'Today · Card'],
  ['footnote', 'Add Money'],
  ['fine', 'Current strategy'],
  ['micro', 'USD'],
];

const ICONS = [
  ['house', 'Home'],
  ['wallet', 'Wallet'],
  ['chart', 'Earn'],
  ['bars', 'Activity'],
  ['person', 'Profile'],
  ['chevron', 'Row'],
];

const TOKEN_ROWS = [
  ...Object.entries(primitiveColor).map(([name, value]) => ({
    kind: 'Color',
    name: `primitiveColor.${name}`,
    value: String(value),
    aliases: name,
    used: usage[`colors.${name}` as keyof typeof usage]?.join(', ') ?? 'see inventory',
  })),
  ...Object.entries(colors).map(([name, value]) => ({
    kind: 'Color',
    name: `colors.${name}`,
    value: String(value),
    aliases: name,
    used: usage[`colors.${name}` as keyof typeof usage]?.join(', ') ?? 'theme consumers',
  })),
  ...Object.entries(primitiveType.sizes).map(([name, value]) => ({
    kind: 'Typography',
    name: `primitiveType.sizes.${name}`,
    value: `${value}px`,
    aliases: name,
    used: 'SwiftUI font() / StyleSheet',
  })),
  ...Object.entries(spacing).map(([name, value]) => ({
    kind: 'Spacing',
    name: `spacing.${name}`,
    value: String(value),
    aliases: name,
    used: usage[`spacing.${name}` as keyof typeof usage]?.join(', ') ?? 'layout',
  })),
  ...Object.entries(radius).map(([name, value]) => ({
    kind: 'Radius',
    name: `radius.${name}`,
    value: String(value),
    aliases: name,
    used: 'cards / controls / buttons',
  })),
  ...Object.entries(primitiveShadow).map(([name, value]) => ({
    kind: 'Shadow',
    name: `primitiveShadow.${name}`,
    value: JSON.stringify(value),
    aliases: name,
    used: name === 'wallet' ? 'AccountCardStack' : 'card chrome',
  })),
  ...Object.entries(primitiveMotion.duration).map(([name, value]) => ({
    kind: 'Motion',
    name: `motion.duration.${name}`,
    value: `${value}ms`,
    aliases: name,
    used: usage[`motion.duration.${name}` as keyof typeof usage]?.join(', ') ?? 'timeout',
  })),
  ...Object.entries(primitiveMotion.navigation).map(([name, value]) => ({
    kind: 'Motion',
    name: `motion.navigation.${name}`,
    value: String(value),
    aliases: name,
    used: 'expo-router Stack.Screen',
  })),
  {
    kind: 'Layout',
    name: 'spacing.screenHorizontal',
    value: String(spacing.screenHorizontal),
    aliases: 'screen inset',
    used: 'Home / Wallet / flow shells',
  },
  {
    kind: 'Layout',
    name: 'homeTokens.layout.walletBaseHeight',
    value: String(homeTokens.layout.walletBaseHeight),
    aliases: 'wallet',
    used: 'AccountCardStack',
  },
  {
    kind: 'Layout',
    name: 'screenTokens.addMoney.contentWidth',
    value: String(screenTokens.addMoney.contentWidth),
    aliases: 'flow width',
    used: 'Add money / shared flow width',
  },
  {
    kind: 'Layout',
    name: 'screenTokens.activity.segmentHeight',
    value: String(screenTokens.activity.segmentHeight),
    aliases: 'segment',
    used: 'Activity segmented control',
  },
];

export function DesignSystemPage() {
  return (
    <div className="lab">
      <nav className="lab-nav">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <main className="lab-main">
        <Overview />
        <Color />
        <Type />
        <Spacing />
        <Geometry />
        <Borders />
        <Elevation />
        <Icons />
        <Components />
        <Financial />
        <Motion />
        <Interaction />
        <Anatomy />
        <A11y />
        <Explorer />
        <Distribution />
      </main>
    </div>
  );
}

function Overview() {
  return (
    <Section id="overview" title="Trinqa Design System" kicker="Extracted from the current mobile product. Not a proposal.">
      <div className="grid grid-4">
        <div className="card stat">
          <b>{Object.keys(primitiveColor).length}</b>
          <span>primitive colors</span>
        </div>
        <div className="card stat">
          <b>{Object.keys(semanticTypography).length}</b>
          <span>type styles</span>
        </div>
        <div className="card stat">
          <b>{Object.keys(primitiveSpace).length}</b>
          <span>spacing values</span>
        </div>
        <div className="card stat">
          <b>{Object.keys(primitiveRadius).length}</b>
          <span>radius values</span>
        </div>
        <div className="card stat">
          <b>{motionPatterns.length}</b>
          <span>motion primitives</span>
        </div>
        <div className="card stat">
          <b>{componentInventory.length}</b>
          <span>shared components</span>
        </div>
        <div className="card stat">
          <b>{outliers.length}</b>
          <span>explicit outliers</span>
        </div>
        <div className="card stat">
          <b>0</b>
          <span>haptics in source</span>
        </div>
      </div>
    </Section>
  );
}

function Color() {
  return (
    <Section id="color" title="01 Color" kicker="Every current palette value. No proposed replacements.">
      {COLOR_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 17, margin: '0 0 12px' }}>{group.title}</h3>
          <div className="grid grid-4">
            {group.items.map(([token, value, role]) => (
              <div className="swatch" key={token}>
                <div className="swatch-chip" style={{ background: value }} />
                <div className="swatch-meta">
                  <strong>{token}</strong>
                  <span>{value}</span>
                  <span>{role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <h3 style={{ fontSize: 17, margin: '0 0 12px' }}>All primitive values</h3>
      <div className="grid grid-4">
        {Object.entries(primitiveColor).map(([name, value]) => (
          <div className="swatch" key={name}>
            <div className="swatch-chip" style={{ background: value }} />
            <div className="swatch-meta">
              <strong>primitiveColor.{name}</strong>
              <span>{value}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Type() {
  return (
    <Section id="type" title="02 Typography" kicker="system-ui / San Francisco. Roles with px sizes and weights (medium/semibold/bold only — no regular/400 in product).">
      {TYPE_SAMPLES.map(([token, sample]) => {
        const spec = semanticTypography[token];
        return (
          <div className="type-row" key={token}>
            <div className="type-meta">
              <strong>{token}</strong>
              <br />
              {primitiveType.family} {spec.size}px/{spec.lineHeight}px w{spec.weight}
            </div>
            <div style={{ fontSize: spec.size, fontWeight: Number(spec.weight), lineHeight: `${spec.lineHeight}px` }}>
              {sample}
            </div>
          </div>
        );
      })}
    </Section>
  );
}

function Spacing() {
  const values = Object.entries(primitiveSpace);
  return (
    <Section id="spacing" title="03 Spacing" kicker="Actual numeric values found in theme and layout constants.">
      <div className="card">
        <div className="scale-row">
          {values.map(([name, value]) => (
            <div key={name}>
              <div className="scale-block" style={{ width: value, height: value }} />
              <div className="scale-label">
                {name}
                <br />
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Geometry() {
  return (
    <Section id="radius" title="04 Radius & Geometry" kicker="Side-by-side from actual radius tokens.">
      <div className="grid grid-4">
        {Object.entries(radius).map(([name, value]) => (
          <div className="card" key={name}>
            <div className="geom" style={{ borderRadius: value === 999 ? 999 : value }}>
              {name} {value}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Borders() {
  return (
    <Section id="borders" title="05 Borders & Dividers">
      <div className="grid grid-2">
        <div className="card">
          <div style={{ height: 48, border: `0.5px solid ${colors.borderStrong}` }} />
          <p className="note">hairline 0.5 · {colors.borderStrong}</p>
        </div>
        <div className="card">
          <div style={{ height: 48, border: `1px solid ${colors.borderStrong}` }} />
          <p className="note">standard 1 · {colors.borderStrong}</p>
        </div>
        <div className="card">
          <div className="row" style={{ gap: 8 }}>
            <span className="note">Today</span>
            <div style={{ flex: 1, height: 1, background: colors.borderStrong, opacity: 0.7 }} />
          </div>
          <p className="note">date section divider · opacity 0.7</p>
        </div>
      </div>
    </Section>
  );
}

function Elevation() {
  // Helper: alpha-hex shadows (shortcut, rowLift, seam, surface)
  const alphaBox = (s: { offsetY: number; radius: number; color: string }) =>
    `0 ${s.offsetY}px ${s.radius}px ${s.color}`;
  // Helper: opacity-based shadows (card, wallet)
  const opacityBox = (s: { offsetY: number; radius: number; opacity: number }) =>
    `0 ${s.offsetY}px ${s.radius}px rgba(17,17,17,${s.opacity})`;

  const elevRows = [
    {
      label: 'primitiveShadow.surface',
      desc: 'Inline cards · sheet chrome',
      token: `y${primitiveShadow.surface.offsetY} r${primitiveShadow.surface.radius} ${primitiveShadow.surface.color}`,
      shadow: alphaBox(primitiveShadow.surface),
    },
    {
      label: 'primitiveShadow.shortcut',
      desc: 'Home shortcuts · secondary buttons',
      token: `y${primitiveShadow.shortcut.offsetY} r${primitiveShadow.shortcut.radius} ${primitiveShadow.shortcut.color}`,
      shadow: alphaBox(primitiveShadow.shortcut),
    },
    {
      label: 'primitiveShadow.rowLift',
      desc: 'Recent inner-card lift',
      token: `y${primitiveShadow.rowLift.offsetY} r${primitiveShadow.rowLift.radius} ${primitiveShadow.rowLift.color}`,
      shadow: alphaBox(primitiveShadow.rowLift),
    },
    {
      label: 'primitiveShadow.seam',
      desc: 'Layer seam · card edge',
      token: `y${primitiveShadow.seam.offsetY} r${primitiveShadow.seam.radius} ${primitiveShadow.seam.color}`,
      shadow: alphaBox(primitiveShadow.seam),
    },
    {
      label: 'primitiveShadow.card',
      desc: 'Card ambient elevation',
      token: `y${primitiveShadow.card.offsetY} r${primitiveShadow.card.radius} opacity ${primitiveShadow.card.opacity}`,
      shadow: opacityBox(primitiveShadow.card),
    },
    {
      label: 'primitiveShadow.wallet',
      desc: 'AccountCardStack',
      token: `y${primitiveShadow.wallet.offsetY} r${primitiveShadow.wallet.radius} opacity ${primitiveShadow.wallet.opacity}`,
      shadow: opacityBox(primitiveShadow.wallet),
    },
  ] as const;

  return (
    <Section id="elevation" title="06 Elevation" kicker="Most of the product is flat. Elevation is local. Shortcut ≈ rowLift — same geometry, different alpha.">
      <div className="grid grid-3">
        <div className="card" style={{ boxShadow: 'none' }}>
          Flat surface
          <p className="note">Default lists, tabs, forms</p>
        </div>
        {elevRows.map((row) => (
          <div className="card" key={row.label} style={{ boxShadow: row.shadow }}>
            <strong style={{ fontSize: 12 }}>{row.label}</strong>
            <p className="note" style={{ marginTop: 4 }}>{row.desc}</p>
            <p className="note" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.token}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Icons() {
  return (
    <Section id="icons" title="07 Iconography" kicker="SF Symbols in product. Web glyphs are stand-ins, not replacements.">
      <div className="grid grid-4">
        {ICONS.map(([glyph, role]) => (
          <div className="card icon-tile" key={role}>
            <div className="icon-glyph">{glyph[0]?.toUpperCase()}</div>
            {role}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Components() {
  return (
    <Section id="components" title="08 Components" kicker="Visual rules from shared tokens. Native implementation stays native.">
      <div className="grid grid-2">
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <button className="cta" type="button">
            Add money
          </button>
          <button className="cta-secondary" type="button">
            Done
          </button>
        </div>
        <div className="wallet">
          <span className="note" style={{ color: walletColors.textTertiary }}>
            Everyday
          </span>
          <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.5 }}>1,240.00 USD</div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div className="tx">
            <div className="tx-icon">A</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Amazon</div>
              <div className="note">Today · Card</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>−24.90</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', gap: 8 }}>
          <span className="pill">7D</span>
          <span className="pill selected">1M</span>
          <span className="pill">1Y</span>
        </div>
        <div className="card">
          <div className="note">Amount</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>120.00</div>
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="note">Fee</span>
            <strong>0.40</strong>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="note">Arrival</span>
            <strong>Instant</strong>
          </div>
        </div>
        <div className="card">
          <div className="note">Details trigger</div>
          <div className="row">
            <strong style={{ flex: 1 }}>Transaction</strong>
            <span className="note">›</span>
          </div>
        </div>
        <div className="card">
          <div className="note">Sheet preview</div>
          <div style={{ height: 88, borderRadius: 20, background: colors.surfaceLayer, marginTop: 8 }} />
        </div>
        <div className="card">
          <div style={{ fontSize: 17, fontWeight: 600 }}>Money sent</div>
          <p className="note">Success state · FlowSuccessState</p>
        </div>
        <div className="card">
          <div className="note">Processing</div>
          <div style={{ width: 18, height: 18, border: '2px solid #08AFD3', borderTopColor: 'transparent', borderRadius: 99, marginTop: 8 }} />
        </div>
      </div>
    </Section>
  );
}

function Financial() {
  // Money format in product: {amount} {symbol} — symbol after
  const rows = [
    ['Wallet balance', '1,240.00 USD', colors.textPrimary],
    ['Recipient', 'Maya Chen', colors.textPrimary],
    ['Fee', '0.40 USD', colors.textPrimary],
    ['Arrival', 'Instant', colors.textPrimary],
    ['Transaction status', 'Completed', colors.success],
    ['Transaction metadata', 'Today · 14:22', colors.textSecondary],
    ['Deposit', '+200.00 USD', colors.textPrimary],
    ['Withdraw', '−80.00 USD', colors.textPrimary],
    ['Pay', '−24.90 USD', colors.textPrimary],
    ['Earn', '+1.12 USD', colors.success],
  ] as const;
  return (
    <Section id="financial" title="09 Financial Patterns">
      <div className="grid grid-2">
        {rows.map(([label, value, color]) => (
          <div className="card row" key={label} style={{ justifyContent: 'space-between' }}>
            <span className="note">{label}</span>
            <strong style={{ color }}>{value}</strong>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Motion() {
  return (
    <Section
      id="motion"
      title="10 Motion"
      kicker="Only patterns present in source. Native sheet/tab/picker timing is system-owned."
    >
      <div className="grid grid-2">
        <Replay label="Onboarding ready · 850ms delay">
          {(key) => (
            <div className="demo-stage">
              <div key={key} className="demo-card fade-in" style={{ ['--d' as string]: `${motion.duration.onboardingReady}ms` }}>
                Ready
              </div>
            </div>
          )}
        </Replay>
        <Replay label="Flow processing · 1400ms">
          {(key) => (
            <div className="demo-stage">
              <div key={key} className="demo-card fade-in" style={{ ['--d' as string]: `${motion.duration.flowProcessing}ms` }}>
                Processing
              </div>
            </div>
          )}
        </Replay>
        <Replay label="Navigation fade · expo-router fade">
          {(key) => (
            <div className="demo-stage">
              <div key={key} className="demo-card fade-in">
                Fade
              </div>
            </div>
          )}
        </Replay>
        <Replay label="Flow push · slide_from_right">
          {(key) => (
            <div className="demo-stage">
              <div key={key} className="demo-card slide-in">
                Push
              </div>
            </div>
          )}
        </Replay>
        <Replay label="Sheet present · native analogue">
          {(key) => (
            <div className="demo-stage">
              <div key={key} className="demo-card sheet-in" style={{ top: 48, width: 200 }}>
                Details
              </div>
            </div>
          )}
        </Replay>
        <div className="card">
          <strong>Disabled opacity</strong>
          <p className="note">PrimaryActionButton · {motion.opacity.disabled}</p>
          <button className="cta" disabled type="button" style={{ marginTop: 12, width: '100%' }}>
            Continue
          </button>
        </div>
      </div>
      <p className="note" style={{ marginTop: 16 }}>
        Fade / slide / sheet replays are web analogues. Source does not define easing curves or springs.
      </p>
      <div className="grid" style={{ marginTop: 20 }}>
        {motionPatterns.map((pattern) => (
          <div className="card" key={pattern.id}>
            <strong>{pattern.name}</strong>
            <p className="note">
              {pattern.trigger} · {pattern.property} · {String(pattern.duration)} · {pattern.easing}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Interaction() {
  const [selected, setSelected] = useState('1M');
  return (
    <Section id="interaction" title="11 Interaction" kicker="States that exist in the product. No haptics found.">
      <div className="grid grid-2">
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <button className="cta" type="button">
            Default
          </button>
          <button className="cta" disabled type="button">
            Disabled
          </button>
        </div>
        <div className="card" style={{ display: 'flex', gap: 8 }}>
          {['7D', '1M', '1Y'].map((item) => (
            <button
              key={item}
              className={item === selected ? 'pill selected' : 'pill'}
              type="button"
              onClick={() => setSelected(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Anatomy() {
  return (
    <Section id="anatomy" title="12 Screen Anatomy" kicker="Token-based layout maps. No screenshots.">
      <div className="grid grid-3">
        <div>
          <div className="phone">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: colors.surface }} />
              <div style={{ width: 44, height: 44, borderRadius: 22, background: colors.surface }} />
            </div>
            <div className="wallet" style={{ height: 120 }} />
            <div className="row" style={{ marginTop: 12, gap: 4 }}>
              <div style={{ flex: 1, height: 48, background: colors.surface, borderRadius: 12 }} />
              <div style={{ flex: 1, height: 48, background: colors.surface, borderRadius: 12 }} />
              <div style={{ flex: 1, height: 48, background: colors.surface, borderRadius: 12 }} />
            </div>
            <div style={{ marginTop: 16, background: colors.surface, borderRadius: 16, height: 180 }} />
          </div>
          <div className="phone-label">Home · 18 inset · wallet 23 r · shortcuts 64h</div>
        </div>
        <div>
          <div className="phone">
            <div style={{ height: 30, width: 140, background: colors.surface, borderRadius: 8, marginBottom: 8 }} />
            <div className="note">Your money this month</div>
            <div style={{ height: 44, background: colors.surface, borderRadius: 11, margin: '12px 0' }} />
            <div style={{ height: 220, background: colors.surface, borderRadius: 16 }} />
          </div>
          <div className="phone-label">Activity · title 30 · segment 44</div>
        </div>
        <div>
          <div className="phone" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ background: colors.surface, borderRadius: 20, padding: 16 }}>
              <div className="note">Amazon</div>
              <div style={{ fontSize: 21, fontWeight: 600, margin: '8px 0 16px' }}>−24.90</div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="note">Status</span>
                <span>Completed</span>
              </div>
            </div>
          </div>
          <div className="phone-label">Transaction details · fitToContents sheet</div>
        </div>
      </div>
    </Section>
  );
}

function A11y() {
  const pairs = [
    [colors.textPrimary, colors.background, 'primary on canvas'],
    [colors.textSecondary, colors.background, 'secondary on canvas'],
    [colors.textInverse, colors.action, 'inverse on CTA'],
    [colors.action, colors.surface, 'cyan on surface'],
    [colors.success, colors.surface, 'success on surface'],
  ] as const;
  return (
    <Section id="a11y" title="13 Accessibility" kicker="Flags only. No automatic redesign.">
      <div className="grid grid-2">
        {pairs.map(([fg, bg, label]) => {
          const ratio = contrastRatio(fg, bg);
          return (
            <div className="flag" key={label}>
              <strong>{label}</strong>
              <span className="note">
                {fg} on {bg} · {formatRatio(ratio)} · {(ratio ?? 0) >= 4.5 ? 'AA body' : 'below AA body'}
              </span>
            </div>
          );
        })}
        {accessibilityFlags.map((flag) => (
          <div className="flag" key={flag.id}>
            <strong>{flag.id}</strong>
            <span className="note">
              {flag.issue} · {flag.usedFor}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Explorer() {
  const [kind, setKind] = useState('All');
  const [query, setQuery] = useState('');
  const kinds = ['All', 'Color', 'Typography', 'Spacing', 'Radius', 'Shadow', 'Motion', 'Layout'];
  const rows = useMemo(
    () =>
      TOKEN_ROWS.filter((row) => (kind === 'All' || row.kind === kind) && row.name.toLowerCase().includes(query.toLowerCase())),
    [kind, query],
  );
  return (
    <Section id="explorer" title="14 Token Explorer">
      <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tokens" />
      <div className="explorer-filters">
        {kinds.map((item) => (
          <button key={item} className={item === kind ? 'pill selected' : 'pill'} type="button" onClick={() => setKind(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="token-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Aliases</th>
              <th>Where used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.value}</td>
                <td>{row.aliases}</td>
                <td>{row.used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Distribution() {
  return (
    <Section id="distribution" title="15 Color Distribution" kicker={colorDistribution.method}>
      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div className="bar" style={{ height: 36, border: '0.5px solid #E5E5E5' }}>
          {colorDistribution.current.map((slice) => (
            <span
              key={slice.token}
              title={`${slice.role} ${slice.percent}%`}
              style={{
                width: `${slice.percent}%`,
                background: slice.value.includes('/') ? colors.success : slice.value,
                boxShadow: 'inset 0 0 0 0.5px rgb(17 17 17 / 0.12)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-2">
        {colorDistribution.current.map((slice) => (
          <div className="card row" key={slice.token} style={{ justifyContent: 'space-between' }}>
            <span>
              {slice.role}
              <br />
              <span className="note">
                {slice.token} · {slice.value}
              </span>
            </span>
            <strong>{slice.percent}%</strong>
          </div>
        ))}
      </div>
      <h3 style={{ margin: '28px 0 12px', fontSize: 17 }}>60 / 30 / 10 target model</h3>
      <div className="grid grid-3">
        <div className="slot">60 — Dominant surface</div>
        <div className="slot">30 — Supporting brand/neutral</div>
        <div className="slot">10 — Accent</div>
      </div>
    </Section>
  );
}

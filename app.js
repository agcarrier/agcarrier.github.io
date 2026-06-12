const { useState, useEffect, useRef } = React;

// ── Pixel Bird ────────────────────────────────────────────────────
const PIGEON_GRID = [
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,1,1,0],
  [0,1,1,1,1,0,0,1,1,2,1],
  [0,1,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,0,0,0,0],
  [0,1,1,1,1,0,0,0,0,0,0],
  [1,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0],
];

function PixelBird({ size = 24, fg = '#f1f1ef', accent = '#9bff5b', ariaLabel = 'Carrier Pigeon mark' }) {
  const cell = 96 / 11;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={ariaLabel} style={{ display: 'block', flex: '0 0 auto' }}>
      {PIGEON_GRID.flatMap((row, y) => row.map((v, x) => v ? (
        <rect key={`${x}-${y}`} x={x * cell + 0.3} y={y * cell + 0.3} width={cell - 0.6} height={cell - 0.6} rx={0.8} fill={v === 2 ? accent : fg} />
      ) : null))}
    </svg>
  );
}

// ── Courier Graph ─────────────────────────────────────────────────
function CourierGraph({ nodeCount = 110, speed = 0.16, threshold = 160, lineAlpha = 0.10, nodeAlpha = 0.35, packetRate = 0.008, packetSpeed = 0.01, color = '#f1f1ef', signal = '#9bff5b' }) {
  const canvasRef = useRef(null);
  const cfgRef = useRef({});
  cfgRef.current = { nodeCount, speed, threshold, lineAlpha, nodeAlpha, packetRate, packetSpeed, color, signal };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.floor(canvas.clientWidth  * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    if (prefersReduced) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.strokeStyle = '#f1f1ef';
      ctx.globalAlpha = 0.04;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      return () => window.removeEventListener('resize', resize);
    }

    const W = () => canvas.clientWidth;
    const H = () => canvas.clientHeight;

    function newNode() {
      const cfg = cfgRef.current;
      return { x: Math.random() * W(), y: Math.random() * H(), vx: (Math.random() - 0.5) * cfg.speed * 2, vy: (Math.random() - 0.5) * cfg.speed * 2, r: 1.4 + Math.random() * 0.6 };
    }

    const nodes = Array.from({ length: cfgRef.current.nodeCount }, newNode);
    const livePackets = [];

    function spawnPacket() {
      const cfg = cfgRef.current;
      const i = (Math.random() * nodes.length) | 0;
      const a = nodes[i];
      const candidates = [];
      for (let j = 0; j < nodes.length; j++) {
        if (j !== i && Math.hypot(a.x - nodes[j].x, a.y - nodes[j].y) < cfg.threshold) candidates.push(j);
      }
      if (candidates.length) livePackets.push({ from: i, to: candidates[(Math.random() * candidates.length) | 0], p: 0 });
    }

    const REF_AREA = 1440 * 900;
    function effectiveNodeCount() {
      return Math.min(cfgRef.current.nodeCount, Math.max(20, Math.round(cfgRef.current.nodeCount * (Math.max(1, W() * H()) / REF_AREA))));
    }
    function reconcileNodes() {
      const target = effectiveNodeCount();
      while (nodes.length < target) nodes.push(newNode());
      if (nodes.length > target) nodes.length = target;
    }

    let raf;
    function draw() {
      const cfg = cfgRef.current;
      reconcileNodes();
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = cfg.color;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < cfg.threshold) {
            ctx.globalAlpha = (1 - d / cfg.threshold) * cfg.lineAlpha;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }

      ctx.fillStyle = cfg.color;
      ctx.globalAlpha = cfg.nodeAlpha;
      for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }

      if (Math.random() < cfg.packetRate) spawnPacket();
      for (let k = livePackets.length - 1; k >= 0; k--) {
        const pk = livePackets[k];
        pk.p += cfg.packetSpeed;
        if (pk.p >= 1 || !nodes[pk.from] || !nodes[pk.to]) { livePackets.splice(k, 1); continue; }
        const a = nodes[pk.from], b = nodes[pk.to];
        const x = a.x + (b.x - a.x) * pk.p, y = a.y + (b.y - a.y) * pk.p;
        const trail = 0.18;
        const tx = a.x + (b.x - a.x) * Math.max(0, pk.p - trail), ty = a.y + (b.y - a.y) * Math.max(0, pk.p - trail);
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, 'rgba(155,255,91,0)'); grad.addColorStop(1, cfg.signal);
        ctx.strokeStyle = grad; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = cfg.signal;
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none', zIndex: 0 }} />;
}

// ── Hero Video Background ─────────────────────────────────────────
function HeroVideo() {
  return (
    <>
      <video
        autoPlay muted loop playsInline
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 0 }}
        src="/hero-bg.mp4"
      />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,12,13,0.55)', pointerEvents: 'none', zIndex: 1 }} />
    </>
  );
}

// ── Shared atoms ──────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(12px)', transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, font: '500 11px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--paper)', opacity: 0.7 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
      {children}
    </span>
  );
}

function SectionHead({ num, name, theme, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap', paddingBottom: 16, marginBottom: 40, borderBottom: '1px solid var(--ink-3)' }}>
      <span style={{ font: '500 12px var(--font-mono)', letterSpacing: '0.2em', color: 'var(--muted)' }}>{num}</span>
      <span style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--paper)' }}>{name}</span>
      {theme && <span style={{ font: '400 14px var(--font-sans)', color: 'var(--muted)' }}>{theme}</span>}
      {count && <span style={{ marginLeft: 'auto', font: '500 11px var(--font-mono)', letterSpacing: '0.14em', color: 'var(--muted)' }}>{count}</span>}
    </div>
  );
}

function Btn({ children, primary = false, href, onClick, arrow = false, type = 'button', disabled = false }) {
  const [hov, setHov] = useState(false);
  const style = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    font: '500 11px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '11px 18px', borderRadius: 0, cursor: disabled ? 'not-allowed' : 'pointer', textDecoration: 'none',
    border: `1px solid ${primary && hov && !disabled ? 'var(--signal)' : 'var(--paper)'}`,
    background: primary ? (hov && !disabled ? 'var(--signal)' : 'var(--paper)') : (hov && !disabled ? 'var(--paper)' : 'transparent'),
    color: primary ? 'var(--ink)' : (hov && !disabled ? 'var(--ink)' : 'var(--paper)'),
    opacity: disabled ? 0.5 : 1,
    transition: 'transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease',
    transform: hov && !disabled ? 'translateY(-1px)' : 'translateY(0)',
  };
  const Tag = href ? 'a' : 'button';
  return (
    <Tag href={href} onClick={onClick} type={href ? undefined : type} disabled={href ? undefined : disabled} style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
      {arrow && <span style={{ display: 'inline-block', transform: hov && !disabled ? 'translateX(3px)' : 'translateX(0)', transition: 'transform .18s ease' }}>→</span>}
    </Tag>
  );
}

// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section data-screen-label="01 Hero" className="cp-hero" style={{ position: 'relative', zIndex: 2, padding: '180px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <FadeIn>
        <div style={{ marginBottom: 28 }}>
          <Eyebrow>Independent AI Studio · <span style={{ color: 'var(--signal)' }}>Lafayette, LA</span></Eyebrow>
        </div>
      </FadeIn>
      <FadeIn delay={80}>
        <h1 style={{ font: '600 clamp(56px, 8vw, 104px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 28px', maxWidth: '14ch', textWrap: 'balance', color: 'var(--paper)' }}>
          Quiet AI that{' '}
          <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>carries</span>{' '}
          the message.
        </h1>
      </FadeIn>
      <FadeIn delay={160}>
        <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 24px' }}>
          Calm tech, no hype — practical AI tools, websites, and agents built for small businesses by someone who's been keeping systems running for years.
        </p>
      </FadeIn>
      <FadeIn delay={240}>
        <p style={{ font: '400 17px/1.6 var(--font-sans)', color: 'var(--signal)', maxWidth: '52ch', margin: '0 0 44px', fontStyle: 'italic' }}>
          We start with your problem — not the technology.
        </p>
      </FadeIn>
      <FadeIn delay={320}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 56 }}>
          <Btn primary arrow href="#services">See services</Btn>
        </div>
      </FadeIn>
    </section>
  );
}

// ── Speed Callout ─────────────────────────────────────────────────
function SpeedCallout() {
  return (
    <div style={{ position: 'relative', zIndex: 2, borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)', background: 'var(--ink-2)' }}>
      <div className="cp-speed-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 48px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '48px 64px', alignItems: 'center' }}>
        <div>
          <div className="cp-speed-headline" style={{ font: '600 clamp(64px, 10vw, 120px)/1.0 var(--font-sans)', letterSpacing: '-0.05em', color: 'var(--signal)', whiteSpace: 'nowrap' }}>One afternoon.</div>
          <div style={{ font: '500 12px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 10 }}>That's all it takes</div>
        </div>
        <div className="cp-speed-right" style={{ borderLeft: '1px solid var(--ink-3)', paddingLeft: 48 }}>
          <p style={{ font: '400 20px/1.6 var(--font-sans)', color: 'var(--paper)', margin: '0 0 12px', maxWidth: '44ch' }}>
            A website that used to take <span style={{ textDecoration: 'line-through', opacity: 0.4 }}>6–8 weeks</span> now ships in an afternoon.
          </p>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', margin: 0, maxWidth: '44ch' }}>
            AI doesn't just speed things up — it changes what's possible on a small business budget. More capability, faster delivery, without the agency price tag.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Pain Points ───────────────────────────────────────────────────
const PAIN_POINTS = [
  { icon: '📞', text: 'I keep missing calls and losing leads after hours.',                    service: 'AI Agents & Receptionist', href: '/services/ai-agents' },
  { icon: '🌐', text: 'My website looks outdated — or I don\'t have one at all.',             service: 'Web Design',               href: '/services/web-design' },
  { icon: '🔁', text: 'My staff answers the same questions a hundred times a week.',          service: 'Knowledge Base',           href: '/services/knowledge-base' },
  { icon: '⏱️', text: 'I\'m drowning in tasks that should just handle themselves.',           service: 'Business Automation',      href: '/services/business-automation' },
  { icon: '💸', text: 'I can\'t afford to hire, but I\'m running out of hours.',              service: 'AI Agents & Receptionist', href: '/services/ai-agents' },
  { icon: '🤷', text: 'I know AI could help my business — I just don\'t know where to start.', service: 'Business Automation',    href: '/services/business-automation' },
];

function PainPointCard({ icon, text, service, href }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={href} style={{ textDecoration: 'none', display: 'block' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        padding: '32px 28px', height: '100%', background: hov ? 'var(--ink-3)' : 'var(--ink-2)',
        border: `1px solid ${hov ? 'var(--signal)' : 'var(--ink-3)'}`,
        display: 'flex', flexDirection: 'column', gap: 14,
        transition: 'background .2s ease, border-color .2s ease, transform .2s ease',
        transform: hov ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'pointer', position: 'relative',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</span>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--paper)', opacity: hov ? 1 : 0.8, margin: 0, fontStyle: 'italic', transition: 'opacity .2s ease' }}>{text}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hov ? 1 : 0.45, transform: hov ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity .2s ease, transform .2s ease', marginTop: 'auto' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
          <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--signal)' }}>→ {service}</span>
        </div>
      </div>
    </a>
  );
}

function PainPoints() {
  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', borderTop: '1px solid var(--ink-3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <h2 style={{ font: '600 clamp(36px, 5vw, 56px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: '0 0 16px', textWrap: 'balance' }}>Sound familiar?</h2>
            <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', margin: 0, maxWidth: '52ch', marginLeft: 'auto', marginRight: 'auto' }}>We start with your problem — AI is just how we solve it faster.</p>
          </div>
        </FadeIn>
        <FadeIn delay={80}>
          <div className="cp-pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PAIN_POINTS.map((p, i) => <PainPointCard key={i} {...p} />)}
          </div>
        </FadeIn>
        <FadeIn delay={160}>
          <p style={{ font: '500 15px var(--font-sans)', color: 'var(--signal)', textAlign: 'center', margin: '40px 0 0' }}>If any of these hit close to home, you're in the right place.</p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Services ──────────────────────────────────────────────────────
const SERVICES = [
  { id: '001', name: 'Web Design',             desc: 'A local agency might quote you $4,000–$10,000 and a 6-week timeline. We use AI to undercut both without cutting corners. Fast, modern, built to convert — and optimized for search from day one.',             tags: ['Fast Delivery', 'Modern Design', 'AI-Built', 'SEO'], href: '/services/web-design' },
  { id: '002', name: 'AI Agents & Receptionist', desc: 'AI agents work around the clock so you don\'t have to. They answer calls, qualify leads, book appointments, and handle FAQs automatically — at 3am or during your busiest hour. Never lose a customer to voicemail again.', tags: ['Voice AI', '24/7', 'Lead Capture'], href: '/services/ai-agents' },
  { id: '003', name: 'Business Automation',    desc: 'Most small businesses are still doing manually what AI can handle in seconds. I map your workflows, find the bottlenecks, and deploy AI tools that free your team to focus on what actually grows the business.',             tags: ['Workflow', 'Implementation', 'Strategy'], href: '/services/business-automation' },
  { id: '004', name: 'Knowledge Base',         desc: 'Your business already has the answers — they\'re just buried in emails, docs, and your team\'s heads. I build private AI systems trained on your content so staff and customers get instant, accurate answers around the clock.', tags: ['Private AI', 'Instant Answers', 'RAG'], href: '/services/knowledge-base' },
];

function ServiceCard({ id, name, desc, tags, href }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 18, paddingTop: 28, paddingBottom: 28, paddingRight: 4, paddingLeft: hov ? 16 : 4, borderBottom: '1px solid var(--ink-3)', background: hov ? 'var(--ink-2)' : 'transparent', transition: 'background .2s ease, padding-left .2s ease', cursor: href ? 'pointer' : 'default' }}>
      <span style={{ font: '500 12px var(--font-mono)', letterSpacing: '0.1em', color: hov && href ? 'var(--signal)' : hov ? 'var(--signal)' : 'var(--muted)', paddingTop: 6, transition: 'color .2s ease' }}>{id}</span>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
          <h3 style={{ font: '600 22px var(--font-sans)', letterSpacing: '-0.015em', margin: 0, color: 'var(--paper)' }}>{name}</h3>
          {href && <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--signal)', opacity: hov ? 1 : 0.45, transition: 'opacity .2s ease' }}>Learn more →</span>}
        </div>
        <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--muted)', margin: 0, maxWidth: '60ch' }}>{desc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14 }}>
          {tags.map(t => (
            <span key={t} style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--ink-3)', paddingBottom: 3 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
  return href ? <a href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</a> : inner;
}

function Services() {
  return (
    <section id="services" data-screen-label="02 Services" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn><SectionHead num="02" name="Services" theme="Your problems, solved." count={`${SERVICES.length} / Offered`} /></FadeIn>
        <FadeIn>
          <div style={{ borderTop: '1px solid var(--ink-3)' }}>
            {SERVICES.map(s => <ServiceCard key={s.id} {...s} />)}
          </div>
        </FadeIn>
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28, flexWrap: 'wrap', gap: 16 }}>
            <p style={{ font: '400 14px var(--font-sans)', color: 'var(--muted)', margin: 0 }}>Looking for something else? I tailor every engagement.</p>
            <Btn arrow href="#contact">Start a project</Btn>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Work ──────────────────────────────────────────────────────────
const PROJECTS = [
  { id: '001', name: 'AAVA Rescue',  role: 'Website',  desc: 'Marketing site and donation flow for an animal rescue org. Built in a day, live the same week.',  href: 'https://aavarescue.com', preview: 'https://image.thum.io/get/width/600/crop/380/https://aavarescue.com' },
  { id: '002', name: 'Roux',         role: 'Mockup',   desc: 'Concept site for a modern Cajun fine-dining restaurant. Full hero treatment, editorial typography, dark and rich.',  href: 'https://roux.carrierpigeonai.dev', preview: 'https://image.thum.io/get/width/600/crop/380/https://roux.carrierpigeonai.dev' },
];

function WorkCard({ id, name, role, desc, href, preview }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="cp-work-card" style={{ position: 'relative', border: `1px solid ${hov ? 'var(--signal)' : 'var(--ink-3)'}`, background: 'var(--ink)', color: 'var(--paper)', transition: 'border-color .2s ease', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: hov ? 'var(--signal)' : 'var(--ink-3)', transition: 'background .2s ease' }} />
      <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', background: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {preview && <img src={preview} alt={`${name} preview`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: hov ? 'none' : 'grayscale(0.2)', transition: 'filter .3s ease, transform .4s ease', transform: hov ? 'scale(1.02)' : 'scale(1)' }} />}
        <span style={{ position: 'absolute', top: 10, left: 10, font: '500 10px var(--font-mono)', letterSpacing: '0.16em', color: 'var(--paper)', mixBlendMode: 'difference' }}>{id}</span>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--signal)' }}>{role}</span>
        <h3 style={{ font: '600 19px/1.2 var(--font-sans)', letterSpacing: '-0.02em', margin: 0, color: 'var(--paper)' }}>{name}</h3>
        <p style={{ font: '400 13px/1.55 var(--font-sans)', color: 'var(--muted)', margin: '2px 0 0' }}>{desc}</p>
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.1em', color: hov ? 'var(--signal)' : 'var(--muted)', transition: 'color .2s ease' }}>VIEW SITE →</span>
        </div>
      </div>
    </div>
  );
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</a>;
}

function DemoGalleryBanner() {
  const [hov, setHov] = useState(false);
  return (
    <a href="https://demos.carrierpigeonai.dev" target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', textDecoration: 'none', color: 'var(--paper)', border: `1px solid ${hov ? 'var(--signal)' : 'var(--ink-3)'}`, background: 'var(--ink)', padding: '20px 28px', transition: 'border-color .2s ease' }}>
      <span style={{ font: '400 15px/1.5 var(--font-sans)', color: 'var(--muted)' }}>
        Looking for something smaller? <span style={{ color: 'var(--paper)' }}>Browse the live demo gallery</span> — booking, invoicing, and marketing tools for local businesses.
      </span>
      <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: hov ? 'var(--signal)' : 'var(--muted)', transition: 'color .2s ease', flexShrink: 0 }}>View demos →</span>
    </a>
  );
}

function Work() {
  return (
    <section id="work" data-screen-label="03 Work" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn><SectionHead num="03" name="Work" theme="Built and shipped." count="2 / Active" /></FadeIn>
        <FadeIn>
          <div className="cp-work-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            {PROJECTS.map(p => <WorkCard key={p.id} {...p} />)}
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          <div style={{ marginTop: 18 }}><DemoGalleryBanner /></div>
        </FadeIn>
        <FadeIn delay={160}>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--muted)', marginTop: 20, textAlign: 'right' }}>More case studies in progress — check back soon.</p>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Founder ───────────────────────────────────────────────────────
function Founder() {
  return (
    <section id="founder" data-screen-label="05 Founder" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn><SectionHead num="05" name="Founder" theme="The person behind Carrier Pigeon AI." /></FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 64, alignItems: 'start' }} className="cp-founder-grid">
          <FadeIn>
            <div style={{ aspectRatio: '4 / 5', background: 'var(--ink-2)', border: '1px solid var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <PixelBird size={240} />
              <span style={{ position: 'absolute', bottom: 18, left: 18, font: '500 10px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Andrew Carrier · Founder</span>
              <span style={{ position: 'absolute', bottom: 18, right: 18, font: '500 10px var(--font-mono)', letterSpacing: '0.16em', color: 'var(--signal)' }}>EST. 2026</span>
            </div>
          </FadeIn>
          <FadeIn delay={120}>
            <div>
              <p style={{ font: '500 12px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--signal)', margin: '0 0 16px' }}>A note from the founder</p>
              <h2 style={{ font: '600 clamp(36px, 4vw, 52px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>From networks to neural nets.</h2>
              <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--paper)', opacity: 0.78, margin: '0 0 16px', maxWidth: '60ch' }}>
                I'm Andrew Carrier — 38, with years in IT infrastructure and network administration. After a career keeping systems running, I became fascinated by what AI could unlock and started building with it.
              </p>
              <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--paper)', opacity: 0.78, margin: '0 0 32px', maxWidth: '60ch' }}>
                Carrier Pigeon AI is the studio I started to bring that work to small and mid-size businesses. Same instinct as fifteen years of network admin — get the right message to the right place, reliably, without drama.
              </p>
              <div style={{ borderTop: '1px solid var(--ink-3)' }}>
                {[
                  { k: 'Education',    v: 'B.S. Business Administration · University of Louisiana at Lafayette · 2011' },
                  { k: 'Background',   v: 'Network administration & IT systems · 15+ yrs' },
                  { k: 'Focus',        v: 'AI/ML, LLM APIs, agentic workflows, prompt engineering' },
                  { k: 'Goal',         v: 'Practical AI tools that solve real problems' },
                ].map(row => (
                  <div key={row.k} className="cp-founder-bio-row" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, padding: '18px 0', borderBottom: '1px solid var(--ink-3)' }}>
                    <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>{row.k}</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--paper)' }}>{row.v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 24, padding: '22px 0', flexWrap: 'wrap' }}>
                  {[
                    { label: 'GitHub',      href: 'https://github.com/agcarrier' },
                    { label: 'X / Twitter', href: 'https://x.com/agcarrierpigeon' },
                    { label: 'Instagram',   href: 'https://www.instagram.com/acarrierpigeon/' },
                  ].map(s => (
                    <a key={s.label} href={s.href} target={s.href.startsWith('mailto') ? undefined : '_blank'} rel="noopener noreferrer"
                      style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--paper)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                    >{s.label} →</a>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ── Stack ─────────────────────────────────────────────────────────
const STACK_GROUPS = [
  {
    group: 'Models',
    items: [
      { name: 'Claude',  vendor: 'Anthropic', url: 'https://claude.ai' },
      { name: 'ChatGPT', vendor: 'OpenAI',    url: 'https://chatgpt.com' },
      { name: 'Gemini',  vendor: 'Google',    url: 'https://gemini.google.com' },
      { name: 'Grok',    vendor: 'xAI',       url: 'https://grok.com' },
    ],
  },
  {
    group: 'Deploy',
    items: [
      { name: 'GitHub',    vendor: 'Source',  url: 'https://github.com' },
      { name: 'Vercel',    vendor: 'Hosting', url: 'https://vercel.com' },
      { name: 'Hostinger', vendor: 'Hosting', url: 'https://hostinger.com' },
    ],
  },
  {
    group: 'Editors',
    items: [
      { name: 'Cursor', vendor: 'Editor', url: 'https://cursor.com' },
      { name: 'Replit', vendor: 'Editor', url: 'https://replit.com' },
    ],
  },
  {
    group: 'Builders',
    items: [
      { name: 'Lovable', vendor: 'Builder', url: 'https://lovable.dev' },
      { name: 'Bolt',    vendor: 'Builder', url: 'https://bolt.new' },
      { name: 'v0',      vendor: 'Vercel',  url: 'https://v0.dev' },
      { name: 'Framer',  vendor: 'Builder', url: 'https://framer.com' },
      { name: 'Webflow', vendor: 'Builder', url: 'https://webflow.com' },
      { name: 'Stitch',  vendor: 'Google',  url: 'https://stitch.withgoogle.com' },
    ],
  },
  {
    group: 'Design',
    items: [
      { name: 'Figma',  vendor: 'Design', url: 'https://figma.com' },
      { name: 'Relume', vendor: 'Design', url: 'https://relume.io' },
    ],
  },
  {
    group: 'Creative',
    items: [
      { name: 'Midjourney',  vendor: 'Image', url: 'https://midjourney.com' },
      { name: 'Higgsfield',  vendor: 'Video', url: 'https://higgsfield.ai' },
      { name: 'ElevenLabs',  vendor: 'Audio', url: 'https://elevenlabs.io' },
    ],
  },
  {
    group: 'Agents',
    items: [
      { name: 'Manus', vendor: 'Agent', url: 'https://manus.im' },
    ],
  },
  {
    group: 'Forms',
    items: [
      { name: 'Formspree', vendor: 'Forms', url: 'https://formspree.io' },
    ],
  },
  {
    group: 'Database',
    items: [
      { name: 'Supabase', vendor: 'Database', url: 'https://supabase.com' },
    ],
  },
];
const STACK = (() => {
  const arr = [...STACK_GROUPS.flatMap(g => g.items)];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

function Stack() {
  const trackRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startOffset: 0, offset: 0, halfWidth: 0 });

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function startDrag(e) {
    const track = trackRef.current;
    if (!track) return;
    // Grab current animated position
    const matrix = window.getComputedStyle(track).transform;
    const currentX = matrix && matrix !== 'none' ? parseFloat(matrix.split(',')[4]) : 0;
    track.style.animation = 'none';
    track.style.transform = `translateX(${currentX}px)`;
    drag.current = { active: true, startX: getClientX(e), startOffset: currentX, offset: currentX, halfWidth: track.scrollWidth / 2 };
    track.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onDrag(e) {
    if (!drag.current.active) return;
    const d = drag.current;
    let x = d.startOffset + (getClientX(e) - d.startX);
    // Wrap around seamlessly
    const half = d.halfWidth;
    if (x > 0) x -= half;
    if (x < -half) x += half;
    d.offset = x;
    trackRef.current.style.transform = `translateX(${x}px)`;
  }

  function endDrag(e) {
    if (!drag.current.active) return;
    drag.current.active = false;
    const track = trackRef.current;
    if (!track) return;
    track.style.cursor = 'grab';
    // Resume CSS animation from current offset
    const half = drag.current.halfWidth;
    const pct = (Math.abs(drag.current.offset) % half) / half;
    const remaining = (1 - pct) * 45;
    track.style.transform = '';
    track.style.animation = `cp-marquee ${remaining}s linear 1 forwards`;
    track.addEventListener('animationend', () => {
      track.style.animation = 'cp-marquee 45s linear infinite';
    }, { once: true });
  }

  return (
    <section id="stack" data-screen-label="04 Stack" style={{ position: 'relative', zIndex: 2, padding: '64px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingLeft: 48, paddingRight: 48 }}>
        <FadeIn><SectionHead num="04" name="Stack" theme="Tools of the trade." count={`${STACK.length} / Daily`} /></FadeIn>
      </div>
      <FadeIn>
        <div style={{ position: 'relative', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div style={{ overflow: 'hidden', cursor: 'grab' }}
            onMouseDown={startDrag}
            onMouseMove={onDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={startDrag}
            onTouchMove={onDrag}
            onTouchEnd={endDrag}
          >
            <div ref={trackRef} style={{ display: 'flex', animation: 'cp-marquee 45s linear infinite', willChange: 'transform' }} className="cp-marquee-track">
              {[...STACK, ...STACK].map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 32px', borderRight: '1px solid var(--ink-3)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .2s ease', userSelect: 'none' }}
                  onMouseEnter={e => { if (!drag.current.active) e.currentTarget.style.background = 'var(--ink-2)'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={e => { if (drag.current.active) e.preventDefault(); }}
                >
                  <span style={{ font: '600 13px var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--paper)' }}>{s.name}</span>
                  <span style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>{s.vendor}</span>
                </a>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to right, var(--ink-1) 0%, transparent 8%, transparent 92%, var(--ink-1) 100%)' }} />
        </div>
      </FadeIn>
      <style>{`
        @keyframes cp-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}

// ── Contact ───────────────────────────────────────────────────────
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xjgzyeol';

// ── Per-page SEO meta ─────────────────────────────────────────────
const PAGE_META = {
  '/': {
    title: 'Carrier Pigeon AI — Calm AI for small business',
    description: 'Carrier Pigeon AI builds practical AI tools, websites, and agents for small and mid-size businesses in Lafayette and beyond.',
  },
  '/services/web-design': {
    title: 'AI Web Design for Small Businesses | Carrier Pigeon AI',
    description: 'Professional, modern websites built with AI — launched faster than traditional agencies and priced for small businesses. Starting at $799.',
  },
  '/services/ai-agents': {
    title: 'AI Receptionist & Voice Agents for Small Business | Carrier Pigeon AI',
    description: 'AI agents that answer calls, qualify leads, and book appointments 24/7 — so you never lose a customer to voicemail again. Starting at $149/mo.',
  },
  '/services/business-automation': {
    title: 'Business Process Automation with AI | Carrier Pigeon AI',
    description: 'Stop doing manually what AI can handle in seconds. We map your workflows, find the bottlenecks, and deploy AI tools that free your team.',
  },
  '/services/knowledge-base': {
    title: 'Private AI Knowledge Base for Small Business | Carrier Pigeon AI',
    description: 'A private AI trained on your business content — so staff and customers get instant, accurate answers around the clock without pulling anyone away.',
  },
};

// ── Demo API ──────────────────────────────────────────────────────
const DEMO_API = 'https://carrier-pigeon-api-gold.vercel.app';

const DEMO_BUSINESSES = [
  { label: 'HVAC',        name: 'Riverside HVAC',   type: 'HVAC heating and cooling service' },
  { label: 'Dental',      name: 'Lakeside Dental',  type: 'dental and orthodontic practice' },
  { label: 'Real Estate', name: 'Summit Realty',    type: 'residential real estate agency' },
  { label: 'Salon & Spa', name: 'Luxe Studio',      type: 'hair salon and day spa' },
];

const KB_SAMPLE = `RIVERSIDE HVAC — Knowledge Base

SERVICES
- Central air conditioning: installation, repair, maintenance
- Heating: furnace installation, repair, tune-ups
- Heat pumps: installation and repair
- Indoor air quality: air purifiers, humidifiers, UV systems
- Emergency repairs: 24/7 for maintenance contract customers

PRICING
- Diagnostic service call: $89 (waived with completed repair)
- AC tune-up: $129/unit
- Furnace tune-up: $99/unit
- Emergency after-hours fee: $150 + parts/labor
- Free estimates on new installations

HOURS
Monday–Friday: 7:00am – 6:00pm
Saturday: 8:00am – 2:00pm
Sunday: Closed (emergency calls for contract customers only)

WARRANTIES
- Parts: 1-year manufacturer warranty
- Labor: 90-day guarantee
- New installations: 5-year labor warranty
- Maintenance contract: covers all tune-up costs + 15% off repairs

COVERAGE AREA
Greater River Valley area including Oak Ridge, Cedar Falls, and Millbrook.

FAQS
Q: What brands do you service?
A: All major brands — Carrier, Lennox, Trane, Rheem, Goodman, Daikin, and more.

Q: How do I sign up for a maintenance plan?
A: Call (555) 100-2345 or ask any technician. Plans start at $129/year per unit.

Q: How quickly can you come out?
A: Same-day for emergencies. Scheduled service is usually within 1–2 business days.

Q: Do you offer financing?
A: Yes, 12-month same-as-cash financing on new installations over $2,000. Ask about it during your estimate.`;

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: 'var(--ink-2)',
  border: '1px solid var(--ink-3)', color: 'var(--paper)', outline: 'none',
  font: '400 15px var(--font-sans)', padding: '11px 14px', borderRadius: 0,
  appearance: 'none', WebkitAppearance: 'none', transition: 'border-color .15s ease',
};

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
      {children}
    </div>
  );
}

// ── Voice helpers ─────────────────────────────────────────────────
function pickBestVoice(voices) {
  const tests = [
    v => /google us english/i.test(v.name),
    v => /microsoft.*aria.*online/i.test(v.name),
    v => /microsoft.*jenny.*online/i.test(v.name),
    v => /microsoft.*guy.*online/i.test(v.name),
    v => /microsoft.*online/i.test(v.name) && v.lang === 'en-US',
    v => /samantha.*enhanced/i.test(v.name),
    v => /ava.*premium/i.test(v.name),
    v => /enhanced/i.test(v.name) && v.lang.startsWith('en'),
    v => /premium/i.test(v.name) && v.lang.startsWith('en'),
    v => /samantha/i.test(v.name),
    v => /karen/i.test(v.name),
    v => v.lang === 'en-US',
    v => v.lang.startsWith('en'),
  ];
  for (const test of tests) {
    const match = voices.find(test);
    if (match) return match;
  }
  return voices[0] || null;
}

// ── Contact Voice Agent ───────────────────────────────────────────
function ContactVoiceAgent() {
  const [msgs, setMsgs] = React.useState([
    { role: 'assistant', content: "Hey! I'm the Carrier Pigeon intake agent. What brings you here today — are you looking to get a project started?" }
  ]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [voices, setVoices] = React.useState([]);
  const [selectedVoice, setSelectedVoice] = React.useState('');
  const recRef = React.useRef(null);
  const msgsRef = React.useRef(null);

  React.useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis?.getVoices() || [];
      const eng = all.filter(v => v.lang.startsWith('en'));
      setVoices(eng);
      if (eng.length && !selectedVoice) {
        const best = pickBestVoice(eng);
        if (best) setSelectedVoice(best.name);
      }
    }
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88;
    u.pitch = 0.95;
    u.volume = 1.0;
    const pick = voices.find(v => v.name === selectedVoice) || pickBestVoice(voices);
    if (pick) u.voice = pick;
    window.speechSynthesis.speak(u);
  }

  async function send(text) {
    const t = (text || input).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setErr(null);
    try {
      const d = await callDemoAPI({ mode: 'contact', messages: next });
      const reply = d.content;
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch (e) {
      setErr(e.message || 'Agent unavailable — email andrew@carrierpigeonai.dev directly.');
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr('Voice input requires Chrome or Edge — or just type below.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    window.speechSynthesis?.cancel();
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false;
    r.onresult = e => { send(e.results[0][0].transcript); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  }

  async function submitTranscript() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const transcript = msgs
      .map(m => `${m.role === 'assistant' ? 'Agent' : 'Visitor'}: ${m.content}`)
      .join('\n\n');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: 'New voice conversation — Carrier Pigeon AI',
          source: 'Voice Agent (Contact Page)',
          transcript,
        }),
      });
      if (res.ok) setSubmitted(true);
      else setErr('Failed to send — email andrew@carrierpigeonai.dev directly.');
    } catch {
      setErr('Failed to send — email andrew@carrierpigeonai.dev directly.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = msgs.filter(m => m.role === 'user').length >= 2;

  if (submitted) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'var(--ink-2)', border: '1px solid var(--ink-3)' }}>
        <PixelBird size={72} />
        <p style={{ font: '600 20px/1.3 var(--font-sans)', color: 'var(--paper)', margin: 0 }}>Pigeon sent.</p>
        <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', margin: 0, maxWidth: '32ch' }}>Andrew has the full conversation — he'll be in touch within 24 hours.</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)' }}>
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--ink-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
        <span style={{ font: '500 11px var(--font-mono)', color: 'var(--paper)', letterSpacing: '0.06em' }}>Carrier Pigeon · Project Intake</span>
      </div>
      {/* Messages */}
      <div ref={msgsRef} style={{ height: 280, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%', padding: '9px 13px',
              background: m.role === 'user' ? 'var(--signal)' : 'var(--ink-3)',
              color: m.role === 'user' ? 'var(--ink)' : 'var(--paper)',
              font: '400 13px/1.5 var(--font-sans)',
            }}>{m.content}</div>
          </div>
        ))}
        {busy && <DemoTyping label="Typing…" />}
      </div>
      {err && <div style={{ padding: '6px 18px', font: '400 12px var(--font-sans)', color: '#e55', background: 'rgba(238,85,85,0.08)' }}>{err}</div>}
      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--ink-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={toggleMic} title={listening ? 'Stop listening' : 'Use microphone'} style={{
          width: 36, height: 36, flexShrink: 0, border: `1px solid ${listening ? 'var(--signal)' : 'var(--ink-3)'}`,
          background: listening ? 'rgba(155,255,91,0.12)' : 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="11" rx="3" fill={listening ? '#9bff5b' : '#7a7a76'}/>
            <path d="M5 10a7 7 0 0 0 14 0" stroke={listening ? '#9bff5b' : '#7a7a76'} strokeWidth="2" strokeLinecap="round" fill="none"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke={listening ? '#9bff5b' : '#7a7a76'} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke={listening ? '#9bff5b' : '#7a7a76'} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder={listening ? 'Listening…' : 'Type a message or use the mic…'}
          disabled={busy || listening}
          style={{ flex: 1, background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', padding: '8px 12px', font: '400 13px var(--font-sans)', outline: 'none' }}
        />
        <button onClick={() => send()} disabled={busy || !input.trim()} style={{
          padding: '8px 16px', background: 'var(--signal)', color: 'var(--ink)', border: 'none',
          font: '500 12px var(--font-mono)', letterSpacing: '0.1em', cursor: busy || !input.trim() ? 'default' : 'pointer',
          opacity: busy || !input.trim() ? 0.4 : 1, transition: 'opacity .15s',
        }}>Send</button>
      </div>
      {/* Submit */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)' }}>
          {canSubmit ? 'Ready to send your conversation to Andrew?' : 'Chat a bit, then submit when you\'re done.'}
        </span>
        <button onClick={submitTranscript} disabled={!canSubmit || submitting} style={{
          padding: '7px 16px', background: 'transparent', border: `1px solid ${canSubmit ? 'var(--signal)' : 'var(--ink-3)'}`,
          color: canSubmit ? 'var(--signal)' : 'var(--muted)', font: '500 11px var(--font-mono)', letterSpacing: '0.12em',
          cursor: canSubmit ? 'pointer' : 'default', transition: 'all .15s', textTransform: 'uppercase',
        }}>{submitting ? 'Sending…' : 'Send to Andrew →'}</button>
      </div>
    </div>
  );
}

function Contact() {
  return (
    <section id="contact" data-screen-label="06 Contact" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn><SectionHead num="06" name="Contact" theme="Let's build something." /></FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="cp-contact-grid">
          <FadeIn>
            <div>
              <h2 style={{ font: '600 clamp(40px, 5vw, 64px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>
                Have a project in{' '}
                <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>flight</span>?
              </h2>
              <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--muted)', margin: '0 0 12px', maxWidth: '46ch' }}>Tell me about your project. The agent below will take notes and send everything to Andrew — no forms, no commitment.</p>
              <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', margin: '0 0 32px', maxWidth: '46ch' }}>
                <span style={{ color: 'var(--signal)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>📍 Lafayette, LA</span>
                {' '}— locally owned and operated, serving businesses in Acadiana and beyond.
              </p>
              <a href="mailto:andrew@carrierpigeonai.dev" style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>Or email directly → andrew@carrierpigeonai.dev</a>
            </div>
          </FadeIn>
          <FadeIn delay={120}>
            <ContactVoiceAgent />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="cp-footer" style={{ position: 'relative', zIndex: 2, padding: '40px 48px', borderTop: '1px solid var(--ink-3)', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PixelBird size={20} />
        <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--paper)' }}>Carrier Pigeon AI</span>
      </div>
      <span style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.12em', color: 'var(--muted)' }}>© 2026 · Built by Andrew Carrier · Calm AI for small business</span>
    </footer>
  );
}

// ── Scroll Progress & Nav ─────────────────────────────────────────
function ScrollProgressBar() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => { const t = document.documentElement.scrollHeight - window.innerHeight; setP(t > 0 ? (window.scrollY / t) * 100 : 0); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000, height: 2, width: `${p}%`, background: 'var(--signal)', transition: 'width .08s linear', pointerEvents: 'none' }} />;
}

const NAV_SERVICES = [
  { name: 'Web Design',           sub: 'Fast, modern sites built to convert',           href: '/services/web-design' },
  { name: 'AI Agents',            sub: '24/7 voice & chat — never miss a lead',         href: '/services/ai-agents' },
  { name: 'Business Automation',  sub: 'Cut busywork, free your team',                  href: '/services/business-automation' },
  { name: 'Knowledge Base',       sub: 'Private AI trained on your content',            href: '/services/knowledge-base' },
];

function Nav() {
  const [open, setOpen]           = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [svcOpen, setSvcOpen]     = useState(false); // mobile services accordion
  const [svcHov, setSvcHov]       = useState(false); // desktop dropdown
  const closeTimer                = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown with a small delay so moving into the menu doesn't flicker
  const openDropdown  = () => { clearTimeout(closeTimer.current); setSvcHov(true); };
  const closeDropdown = () => { closeTimer.current = setTimeout(() => setSvcHov(false), 120); };

  const isHome = window.location.pathname === '/';
  const anchor = id => isHome ? `#${id}` : `/#${id}`;
  const otherLinks = ['Work', 'Stack', 'Contact'];

  const linkStyle = { font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s ease' };

  return (
    <>
      <nav className="cp-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', borderBottom: scrolled ? '1px solid var(--ink-3)' : '1px solid transparent', background: scrolled ? 'rgba(12,12,13,0.78)' : 'rgba(12,12,13,0.42)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', transition: 'background .2s ease, border-color .2s ease' }}>

        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }} aria-label="Carrier Pigeon AI home">
          <PixelBird size={28} />
          <span style={{ font: '600 14px var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--paper)' }}>Carrier Pigeon AI</span>
        </a>

        {/* Desktop links */}
        <div className="cp-nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>

          {/* Services dropdown trigger */}
          <div style={{ position: 'relative' }} onMouseEnter={openDropdown} onMouseLeave={closeDropdown}>
            <button style={{ ...linkStyle, background: 'none', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: svcHov ? 'var(--paper)' : 'var(--muted)', transition: 'color .15s ease', padding: 0 }}>
              Services
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: svcHov ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s ease', marginTop: 1 }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
              </svg>
            </button>

            {/* Dropdown panel */}
            {svcHov && (
              <div onMouseEnter={openDropdown} onMouseLeave={closeDropdown}
                style={{ position: 'absolute', top: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)', width: 280, background: 'var(--ink-2)', border: '1px solid var(--ink-3)', padding: '8px 0', zIndex: 200 }}>
                {/* Arrow notch */}
                <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', width: 9, height: 9, background: 'var(--ink-2)', border: '1px solid var(--ink-3)', borderBottom: 'none', borderRight: 'none', rotate: '45deg' }} />
                {NAV_SERVICES.map(s => (
                  <a key={s.href} href={s.href}
                    style={{ display: 'block', padding: '12px 20px', textDecoration: 'none', transition: 'background .12s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ font: '600 12px var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--paper)', marginBottom: 2 }}>{s.name}</div>
                    <div style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)' }}>{s.sub}</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Demos (external) */}
          <a href="https://demos.carrierpigeonai.dev" target="_blank" rel="noopener noreferrer" style={linkStyle}
            onMouseEnter={e => e.target.style.color = 'var(--paper)'}
            onMouseLeave={e => e.target.style.color = 'var(--muted)'}
          >Demos</a>

          {/* Other nav links */}
          {otherLinks.map(l => (
            <a key={l} href={anchor(l.toLowerCase())} style={linkStyle}
              onMouseEnter={e => e.target.style.color = 'var(--paper)'}
              onMouseLeave={e => e.target.style.color = 'var(--muted)'}
            >{l}</a>
          ))}
        </div>

        {/* CTA + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="cp-nav-cta"><Btn arrow href={anchor('contact')}>Send a Pigeon</Btn></div>
          <button className="cp-hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu"
            style={{ display: 'none', background: 'none', border: 0, cursor: 'pointer', padding: 6, color: 'var(--paper)', lineHeight: 0 }}>
            {open
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
            }
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className="cp-mobile-menu" style={{ position: 'fixed', top: 60, left: 0, right: 0, zIndex: 99, background: 'rgba(12,12,13,0.97)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderBottom: '1px solid var(--ink-3)', padding: '12px 24px 28px', display: 'none', flexDirection: 'column', transform: open ? 'translateY(0)' : 'translateY(-110%)', transition: 'transform .28s cubic-bezier(0.4,0,0.2,1)', pointerEvents: open ? 'auto' : 'none' }}>

        {/* Services accordion */}
        <button onClick={() => setSvcOpen(o => !o)}
          style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--paper)', background: 'none', border: 0, borderBottom: '1px solid var(--ink-3)', padding: '18px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left' }}>
          Services
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" style={{ transform: svcOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s ease', flexShrink: 0 }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
          </svg>
        </button>
        {svcOpen && (
          <div style={{ borderBottom: '1px solid var(--ink-3)' }}>
            {NAV_SERVICES.map(s => (
              <a key={s.href} href={s.href} onClick={() => setOpen(false)}
                style={{ display: 'block', font: '500 12px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', padding: '14px 0 14px 16px', borderTop: '1px solid var(--ink-3)' }}>
                {s.name}
              </a>
            ))}
          </div>
        )}

        {/* Demos (external) */}
        <a href="https://demos.carrierpigeonai.dev" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
          style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--paper)', textDecoration: 'none', padding: '18px 0', borderBottom: '1px solid var(--ink-3)' }}
        >Demos</a>

        {/* Other mobile links */}
        {otherLinks.map(l => (
          <a key={l} href={anchor(l.toLowerCase())} onClick={() => setOpen(false)}
            style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--paper)', textDecoration: 'none', padding: '18px 0', borderBottom: '1px solid var(--ink-3)' }}
          >{l}</a>
        ))}
        <div style={{ marginTop: 24 }}><Btn primary arrow href={anchor('contact')} onClick={() => setOpen(false)}>Send a Pigeon</Btn></div>
      </div>
    </>
  );
}

// ── Web Design Page ───────────────────────────────────────────────
const WD_STEPS = [
  { num: '01', title: 'Discovery',  desc: 'A 30-minute call to understand your business, goals, and what makes you different. We ask the right questions — who your customers are, what you want the site to accomplish, and what your competitors are doing. No jargon, no sales pitch.' },
  { num: '02', title: 'Design',     desc: 'AI-accelerated design means you see real pages the same day — hero, about, services, contact — built around your brand, your colors, your vibe. Not wireframes. Not mockups. Actual pages you can react to.' },
  { num: '03', title: 'Review',     desc: 'You give feedback, we refine until it\'s exactly right. We don\'t disappear after the first draft — we\'re available to jump on a call, walk through changes together, and iterate until you\'re genuinely proud of it.' },
  { num: '04', title: 'Launch',     desc: 'Live on your domain with SEO baked in from day one. We point your domain, submit your sitemap to Google, set up Search Console, and make sure everything is working before we call it done.' },
];

const WD_INCLUDES = [
  'Custom design tailored to your brand — not a generic template',
  'Mobile-friendly layout that looks great on phones, tablets, and desktops',
  'SEO built in — page titles, meta descriptions, sitemap, and Google Search Console setup',
  'Contact form connected directly to your business email',
  'Fast load times optimized for Core Web Vitals',
  'Google Analytics setup so you can see where visitors come from',
  'Copywriting assistance — we can draft your page content from your discovery call',
  '30 days of post-launch support included',
];

const WD_INDUSTRIES = [
  'Restaurants & Food', 'Contractors & Trades', 'Salons & Spas',
  'Medical & Dental', 'Real Estate', 'Retail Shops',
  'Professional Services', 'Nonprofits',
];

const WD_TIERS = [
  { name: 'Starter',  price: '$799',    desc: 'Everything you need to exist and look professional online.',  features: ['1–3 pages', 'Mobile-friendly', 'Contact form', 'Basic SEO', 'Domain connection'],                                                                   featured: false },
  { name: 'Standard', price: '$1,499',  desc: 'The full package. Most clients choose this.',                  features: ['Up to 6 pages', 'Full SEO optimization', 'Google Analytics', 'Content assistance', '30 days support', 'Everything in Starter'],                  featured: true  },
  { name: 'Premium',  price: '$2,499+', desc: 'For bigger projects that need more.',                          features: ['Unlimited pages', 'E-commerce ready', 'Content writing included', 'Priority support', 'Custom integrations', 'Everything in Standard'], featured: false },
];

const WD_FAQS = [
  { q: 'How long does it take?',                    a: 'Most sites launch within a day or two of the discovery call. Complex projects with e-commerce or many pages may take a bit longer — but never weeks. Traditional agencies take 4–8 weeks for the same work.' },
  { q: 'Do I need to provide content?',             a: 'Nope. We can write your page copy with you, or draft it entirely based on what you tell us in the discovery call. You review and approve everything before it goes live.' },
  { q: 'What if I already have a domain?',          a: 'No problem at all. We\'ll connect your existing domain to the new site. If you don\'t have one yet, we\'ll help you pick and register one — usually $12–15/year.' },
  { q: 'Can you make updates after launch?',        a: 'Yes — the 30-day support window covers any tweaks after launch. After that, ongoing maintenance packages start at $99/month and include updates, security patches, and priority support.' },
  { q: 'Do you build online stores?',               a: 'Yes, e-commerce is available on the Premium tier. Tell us about your products and volume and we\'ll give you an accurate quote.' },
  { q: 'Will my site show up on Google?',           a: 'Every site we build includes SEO from day one — proper page titles, meta descriptions, fast load times, mobile optimization, and sitemap submission to Google Search Console. You\'ll also get a Google Business Profile walkthrough so you show up in local searches.' },
  { q: 'What platform do you build on?',            a: 'We choose the right tool for your needs. Most small business sites are built as fast, modern static sites. Larger or content-heavy sites may use WordPress. Either way, you own the site and hosting outright.' },
  { q: 'Will I be able to update it myself?',       a: 'Yes. We build your site so you can make basic content changes — text, photos, prices — without needing a developer. And if you ever get stuck, we\'re one email away.' },
  { q: 'Is hosting included in the price?',         a: 'Hosting isn\'t bundled into the build price, but we\'ll configure fast, reliable hosting for you. Most small business sites run $15–25/month on the platforms we use.' },
  { q: 'What do you need from me to get started?',  a: 'Just 30 minutes of your time for a discovery call, and any existing branding you have — logo, colors, photos. If you don\'t have those yet, we can work around it. We handle everything else.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--ink-3)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, padding: '22px 0', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ font: '500 16px var(--font-sans)', color: 'var(--paper)', letterSpacing: '-0.01em' }}>{q}</span>
        <span style={{ font: '500 20px var(--font-mono)', color: 'var(--signal)', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform .2s ease', display: 'block' }}>+</span>
      </button>
      {open && <p style={{ font: '400 15px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 22px', maxWidth: '70ch' }}>{a}</p>}
    </div>
  );
}

// ── Related Services ─────────────────────────────────────────────
const ALL_SERVICES = [
  { name: 'Web Design',              short: 'Fast, modern websites built to convert — SEO-optimized from day one.',                  href: '/services/web-design',            tag: 'From $799' },
  { name: 'AI Agents',               short: '24/7 voice and chat agents that answer calls, capture leads, and book appointments.',    href: '/services/ai-agents',             tag: 'From $149/mo' },
  { name: 'Business Automation',     short: 'Map your workflows, cut the busywork, and deploy AI tools that free your team.',        href: '/services/business-automation',   tag: 'From $799' },
  { name: 'Knowledge Base',          short: 'A private AI trained on your content — instant answers for staff and customers.',       href: '/services/knowledge-base',        tag: 'From $999' },
];

function RelatedServices({ current }) {
  const others = ALL_SERVICES.filter(s => s.href !== current);
  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '80px 48px', borderTop: '1px solid var(--ink-3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <p style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--signal)', margin: '0 0 32px' }}>Also offered</p>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--ink-3)' }}>
          {others.map((s, i) => (
            <FadeIn key={s.href} delay={i * 60}>
              <a href={s.href} style={{ display: 'block', padding: '28px 24px', background: 'var(--ink)', textDecoration: 'none', transition: 'background .15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ink)'}>
                <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: 10 }}>{s.tag}</div>
                <h3 style={{ font: '600 18px var(--font-sans)', letterSpacing: '-0.02em', color: 'var(--paper)', margin: '0 0 8px' }}>{s.name} →</h3>
                <p style={{ font: '400 13px/1.6 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>{s.short}</p>
              </a>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function WebDesignPage() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--font-sans)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ScrollProgressBar />
      <CourierGraph />
      <Nav />
      <main>
        {/* Hero */}
        <section className="cp-service-hero" style={{ position: 'relative', zIndex: 2, padding: '160px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', marginBottom: 32, transition: 'color .15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--paper)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>← Back to home</a>
          </FadeIn>
          <FadeIn delay={40}><div style={{ marginBottom: 24 }}><Eyebrow>Service 01 · <span style={{ color: 'var(--signal)' }}>Web Design</span></Eyebrow></div></FadeIn>
          <FadeIn delay={80}>
            <h1 style={{ font: '600 clamp(48px, 7vw, 96px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', maxWidth: '16ch', textWrap: 'balance', color: 'var(--paper)' }}>
              A website that works as <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>hard</span> as you do.
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 40px' }}>
              Professional, modern, and built to bring in business — launched faster than you'd expect and priced for small businesses, not agencies.
            </p>
          </FadeIn>
          <FadeIn delay={220}><Btn primary arrow href="#wd-contact">Start your project</Btn></FadeIn>
        </section>

        <WebDesignBriefDemo />

        {/* Problem */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '80px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-service-problem-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'center' }}>
            <FadeIn><h2 style={{ font: '600 clamp(32px, 4vw, 48px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: 0, textWrap: 'balance' }}>Most small business websites are costing them customers.</h2></FadeIn>
            <FadeIn delay={100}>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>In Acadiana and across Louisiana, most small businesses either have an outdated website or none at all — and it's costing them real customers. Studies show 75% of people judge a business's credibility based on its website design alone. If your site looks old, loads slow, or doesn't show up on Google, potential customers are quietly choosing your competitor instead.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>Traditional web agencies want $4,000–$10,000 and weeks of back-and-forth meetings. DIY builders like Squarespace look generic and still take hours to set up right. Neither option was built for the busy small business owner who just needs something professional that works.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>AI changes that equation entirely. We design, write, and launch your site in a fraction of the time — at a price that makes sense for a small business, without cutting corners on quality or results.</p>
            </FadeIn>
          </div>
        </section>

        {/* Process */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="01" name="Process" theme="Simple. Fast. No surprises." /></FadeIn>
            <div className="cp-process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--ink-3)', borderLeft: '1px solid var(--ink-3)' }}>
              {WD_STEPS.map((s, i) => (
                <FadeIn key={s.num} delay={i * 80}>
                  <div style={{ padding: '36px 28px', borderRight: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)', minHeight: 220 }}>
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.2em', color: 'var(--signal)', marginBottom: 20 }}>{s.num}</div>
                    <h3 style={{ font: '600 20px var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--paper)', margin: '0 0 12px' }}>{s.title}</h3>
                    <p style={{ font: '400 14px/1.65 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Included + Who it's for */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-includes-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <FadeIn>
              <SectionHead num="02" name="What's Included" theme="" />
              <div>
                {WD_INCLUDES.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--ink-3)' }}>
                    <span style={{ color: 'var(--signal)', font: '600 14px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--paper)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <SectionHead num="03" name="Who It's For" theme="" />
              <p style={{ font: '400 15px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 24px' }}>If you run a local business and need a professional online presence, this is for you. We especially serve:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                {WD_INDUSTRIES.map(ind => (
                  <span key={ind} style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper)', border: '1px solid var(--ink-3)', padding: '8px 14px' }}>{ind}</span>
                ))}
              </div>
              <div style={{ padding: '24px', background: 'var(--ink-2)', borderLeft: '2px solid var(--signal)' }}>
                <p style={{ font: '400 13px var(--font-sans)', color: 'var(--muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>Ongoing support available</p>
                <p style={{ font: '600 16px var(--font-sans)', color: 'var(--paper)', margin: 0 }}>Keep your site fast, secure, and up to date — starting at <span style={{ color: 'var(--signal)' }}>$99/month</span>.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Pricing */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="04" name="Pricing" theme="Transparent. No surprises." /></FadeIn>
            <FadeIn delay={80}>
              <div className="cp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {WD_TIERS.map(t => (
                  <div key={t.name} style={{ padding: '40px 32px', background: t.featured ? 'var(--ink-2)' : 'transparent', border: `1px solid ${t.featured ? 'var(--signal)' : 'var(--ink-3)'}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {t.featured && <span style={{ position: 'absolute', top: -1, left: 32, font: '500 10px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'var(--signal)', color: 'var(--ink)', padding: '4px 10px' }}>Most popular</span>}
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{t.name}</div>
                    <div style={{ font: '600 clamp(36px, 4vw, 48px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', color: t.featured ? 'var(--signal)' : 'var(--paper)', marginBottom: 12 }}>{t.price}</div>
                    <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--muted)', margin: '0 0 28px' }}>{t.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 32 }}>
                      {t.features.map(f => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--signal)', font: '600 12px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                          <span style={{ font: '400 13px var(--font-sans)', color: 'var(--paper)', opacity: 0.8 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Btn primary={t.featured} arrow href="#wd-contact">{t.featured ? 'Get started' : 'Choose plan'}</Btn>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* FAQ */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <FadeIn><SectionHead num="05" name="FAQ" theme="Common questions, straight answers." /></FadeIn>
            <FadeIn delay={80}>
              <div style={{ borderTop: '1px solid var(--ink-3)' }}>
                {WD_FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Contact */}
        <RelatedServices current="/services/web-design" />
        <section id="wd-contact" className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', borderTop: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="cp-contact-grid">
              <FadeIn>
                <div>
                  <h2 style={{ font: '600 clamp(40px, 5vw, 64px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>
                    Ready to stop losing customers to a <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>bad first impression</span>?
                  </h2>
                  <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--muted)', margin: '0 0 32px', maxWidth: '46ch' }}>Tell me about your project. The agent below will take notes and send everything to Andrew — no forms, no commitment.</p>
                  <a href="mailto:andrew@carrierpigeonai.dev" style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>Or email directly → andrew@carrierpigeonai.dev</a>
                </div>
              </FadeIn>
              <FadeIn delay={120}>
                <ContactVoiceAgent />
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────
function App() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--font-sans)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ScrollProgressBar />
      <HeroVideo />
      <Nav />
      <main>
        <Hero />
        <SpeedCallout />
        <PainPoints />
        <Services />
        <Work />
        <Stack />
        <Founder />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

// ── Demo Helpers ─────────────────────────────────────────────────
function DemoLiveBadge() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Live Demo</div>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', animation: 'pulse 2s ease-in-out infinite' }} />
    </div>
  );
}

function DemoStarterBtn({ label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ font: '400 12px var(--font-sans)', padding: '4px 10px', background: 'transparent', border: '1px solid var(--ink-3)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .15s', lineHeight: 1.4 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--signal)'; e.currentTarget.style.color = 'var(--paper)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-3)'; e.currentTarget.style.color = 'var(--muted)'; }}>
      "{label}"
    </button>
  );
}

function DemoChatBubble({ role, content, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '78%', padding: '9px 13px',
        background: role === 'user' ? 'var(--signal)' : 'var(--ink-3)',
        color: role === 'user' ? 'var(--ink)' : 'var(--paper)',
        font: '400 13.5px/1.55 var(--font-sans)',
      }}>
        {label && <div style={{ font: '500 9px var(--font-mono)', letterSpacing: '0.14em', color: 'var(--signal)', marginBottom: 5 }}>{label}</div>}
        {content}
      </div>
    </div>
  );
}

function DemoTyping({ label = 'typing…' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ padding: '9px 13px', background: 'var(--ink-3)', color: 'var(--muted)', font: '400 12px var(--font-mono)' }}>{label}</div>
    </div>
  );
}

function DemoError({ msg }) {
  if (!msg) return null;
  return <div style={{ padding: '8px 20px', background: 'rgba(229,85,85,0.08)', borderTop: '1px solid rgba(229,85,85,0.18)', font: '400 12px var(--font-sans)', color: '#e55' }}>{msg}</div>;
}

async function callDemoAPI(payload) {
  const r = await fetch(`${DEMO_API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || `HTTP ${r.status}`);
  }
  return r.json();
}

// ── Send to Andrew Panel ──────────────────────────────────────────
// Reusable panel that appears after any demo output.
// Starts as a single button, expands to optional name/email, collapses to success.
function SendToAndrewPanel({ mode, output, input }) {
  const [phase, setPhase]   = React.useState('idle');  // idle | form | sending | sent
  const [name,  setName]    = React.useState('');
  const [email, setEmail]   = React.useState('');
  const [err,   setErr]     = React.useState(null);

  async function send() {
    setPhase('sending');
    setErr(null);
    try {
      const r = await fetch(`${DEMO_API}/api/send-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, output, input: input || '', name, email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setPhase('sent');
    } catch (e) {
      setErr(e.message || 'Something went wrong — try again.');
      setPhase('form');
    }
  }

  if (phase === 'sent') {
    return (
      <div style={{ marginTop: 14, padding: '14px 18px', background: 'rgba(155,255,91,0.07)', border: '1px solid rgba(155,255,91,0.25)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ font: '400 13px var(--font-sans)', color: 'var(--signal)' }}>✓</span>
        <span style={{ font: '400 13px var(--font-sans)', color: 'var(--paper)' }}>Sent. Andrew will take a look.</span>
      </div>
    );
  }

  if (phase === 'idle') {
    return (
      <div style={{ marginTop: 14 }}>
        <button onClick={() => setPhase('form')} style={{
          padding: '9px 18px', background: 'transparent', border: '1px solid var(--ink-3)',
          color: 'var(--muted)', font: '500 12px var(--font-sans)', cursor: 'pointer', transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--signal)'; e.currentTarget.style.color = 'var(--paper)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-3)'; e.currentTarget.style.color = 'var(--muted)'; }}>
          Send this to Andrew →
        </button>
      </div>
    );
  }

  // form | sending
  return (
    <div style={{ marginTop: 14, padding: '18px 20px', background: 'var(--ink-2)', border: '1px solid var(--ink-3)' }}>
      <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Send to Andrew — no strings attached</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)"
          style={{ flex: 1, minWidth: 140, padding: '9px 12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 13px var(--font-sans)', outline: 'none' }} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)"
          type="email"
          style={{ flex: 1, minWidth: 180, padding: '9px 12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 13px var(--font-sans)', outline: 'none' }} />
      </div>
      {err && <div style={{ marginBottom: 10, font: '400 12px var(--font-sans)', color: '#e55' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={send} disabled={phase === 'sending'} style={{
          padding: '9px 20px', background: 'var(--signal)', border: 'none', color: 'var(--ink)',
          font: '600 12px var(--font-sans)', cursor: 'pointer', opacity: phase === 'sending' ? 0.6 : 1,
        }}>{phase === 'sending' ? 'Sending…' : 'Send it →'}</button>
        <button onClick={() => { setPhase('idle'); setErr(null); }} style={{
          padding: '9px 14px', background: 'transparent', border: 'none', color: 'var(--muted)',
          font: '400 12px var(--font-sans)', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Voice Receptionist Demo ───────────────────────────────────────
function VoiceReceptionistDemo() {
  const [biz, setBiz] = React.useState(DEMO_BUSINESSES[0]);
  const [msgs, setMsgs] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const [voices, setVoices] = React.useState([]);
  const [selectedVoice, setSelectedVoice] = React.useState('');
  const recRef = React.useRef(null);
  const msgsRef = React.useRef(null);

  // Load available English voices (async — fires after voiceschanged)
  React.useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis?.getVoices() || [];
      const eng = all.filter(v => v.lang.startsWith('en'));
      setVoices(eng);
      if (eng.length && !selectedVoice) {
        const best = pickBestVoice(eng);
        if (best) setSelectedVoice(best.name);
      }
    }
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Reset conversation when business changes
  React.useEffect(() => {
    setMsgs([{ role: 'assistant', content: `Thanks for calling ${biz.name}! How can I help you today?` }]);
    setErr(null);
  }, [biz.name]);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88;
    u.pitch = 0.95;
    u.volume = 1.0;
    const pick = voices.find(v => v.name === selectedVoice) || pickBestVoice(voices);
    if (pick) u.voice = pick;
    window.speechSynthesis.speak(u);
  }

  async function send(text) {
    const t = (text || input).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setErr(null);
    try {
      const d = await callDemoAPI({ mode: 'receptionist', businessName: biz.name, businessType: biz.type, messages: next });
      setMsgs(prev => [...prev, { role: 'assistant', content: d.content }]);
      speak(d.content);
    } catch (e) {
      setErr(e.message || 'Demo unavailable — the API may not be deployed yet.');
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr('Voice input requires Chrome or Edge — or just type below.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    window.speechSynthesis?.cancel();
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false;
    r.onresult = e => { send(e.results[0][0].transcript); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
    recRef.current = r;
    r.start();
    setListening(true);
  }

  const starters = ['What are your hours?', 'I need to book an appointment', 'How much does it cost?', 'Can I get a callback?'];

  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '0 48px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <DemoLiveBadge />
          <h2 style={{ font: '600 clamp(22px, 2.5vw, 32px)/1.1 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: '0 0 10px' }}>Try the receptionist — right now.</h2>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '50ch', margin: '0 0 22px' }}>This is a live AI agent running on real AI. Pick a business type and start a conversation — type or use your mic.</p>

          {/* Business picker */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {DEMO_BUSINESSES.map(b => (
              <button key={b.label} onClick={() => setBiz(b)} style={{
                font: '500 10px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase',
                padding: '7px 13px', background: 'transparent', cursor: 'pointer', transition: 'all .15s',
                border: `1px solid ${biz.label === b.label ? 'var(--signal)' : 'var(--ink-3)'}`,
                color: biz.label === b.label ? 'var(--signal)' : 'var(--muted)',
              }}>{b.label}</button>
            ))}
          </div>

          {/* Chat widget */}
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', maxWidth: 660 }}>
            {/* Header bar */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--ink-3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', flexShrink: 0 }} />
              <span style={{ font: '500 11px var(--font-mono)', color: 'var(--paper)', letterSpacing: '0.06em' }}>Ava · AI Receptionist · {biz.name}</span>
              {voices.length > 0 && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ font: '400 9px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Voice</span>
                  <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} style={{
                    font: '400 11px var(--font-mono)', background: 'var(--ink)', border: '1px solid var(--ink-3)',
                    color: 'var(--paper)', padding: '3px 7px', cursor: 'pointer', outline: 'none', maxWidth: 180,
                  }}>
                    {voices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={msgsRef} style={{ height: 270, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {msgs.map((m, i) => <DemoChatBubble key={i} {...m} />)}
              {busy && <DemoTyping label="Ava is typing…" />}
            </div>

            <DemoError msg={err} />

            {/* Input row */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--ink-3)', display: 'flex', gap: 8 }}>
              <button onClick={toggleMic} title={listening ? 'Stop' : 'Speak'} style={{
                padding: '9px 11px', background: listening ? 'var(--signal)' : 'var(--ink-3)',
                border: 'none', color: listening ? 'var(--ink)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all .15s', fontSize: 14, flexShrink: 0,
              }}>
                {listening ? '⏹' : '🎙'}
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder={listening ? 'Listening…' : 'Type a message or use the mic…'}
                disabled={busy || listening}
                style={{ flex: 1, padding: '9px 12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 13px var(--font-sans)', outline: 'none' }} />
              <button onClick={() => send(input)} disabled={!input.trim() || busy} style={{
                padding: '9px 16px', background: 'var(--signal)', border: 'none', color: 'var(--ink)',
                font: '600 12px var(--font-sans)', cursor: 'pointer', flexShrink: 0,
                opacity: !input.trim() || busy ? 0.4 : 1, transition: 'opacity .15s',
              }}>Send</button>
            </div>
          </div>

          {/* Starter prompts */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)' }}>Try:</span>
            {starters.map(s => <DemoStarterBtn key={s} label={s} onClick={() => send(s)} />)}
          </div>

          {msgs.length > 2 && (
            <SendToAndrewPanel
              mode="receptionist"
              output={msgs.map(m => `${m.role === 'user' ? 'Visitor' : 'Ava'}: ${m.content}`).join('\n\n')}
              input={`Business: ${biz.name} (${biz.type})`}
            />
          )}
        </FadeIn>
      </div>
    </section>
  );
}

// ── Knowledge Base Demo ───────────────────────────────────────────
function KnowledgeBaseDemo() {
  const [tab, setTab] = React.useState('chat');
  const [kb, setKb] = React.useState(KB_SAMPLE);
  const [msgs, setMsgs] = React.useState([{ role: 'assistant', content: 'Ask me anything about Riverside HVAC — services, pricing, hours, warranties, coverage area…' }]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const msgsRef = React.useRef(null);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  async function send(text) {
    const t = (text || input).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next);
    setInput('');
    setBusy(true);
    setErr(null);
    try {
      const d = await callDemoAPI({ mode: 'knowledge', knowledge: kb, messages: next });
      setMsgs(prev => [...prev, { role: 'assistant', content: d.content }]);
    } catch (e) {
      setErr(e.message || 'Demo unavailable — the API may not be deployed yet.');
    } finally {
      setBusy(false);
    }
  }

  const starters = ["What's the price for an AC tune-up?", 'Do you offer emergency service?', 'What areas do you cover?', 'Is there a labor warranty?'];

  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '0 48px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <DemoLiveBadge />
          <h2 style={{ font: '600 clamp(22px, 2.5vw, 32px)/1.1 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: '0 0 10px' }}>Ask the knowledge base — live.</h2>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 22px' }}>This AI only answers from a sample knowledge base — no making things up. Switch to the <strong style={{ color: 'var(--paper)' }}>Knowledge Base</strong> tab to see (or edit) the content it's working from.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--ink-3)', marginBottom: 0, maxWidth: 660 }}>
            {[['chat', '💬 Ask Questions'], ['kb', '📄 Knowledge Base']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                font: '500 10px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
                color: tab === t ? 'var(--signal)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === t ? 'var(--signal)' : 'transparent'}`,
                marginBottom: -1, transition: 'color .15s',
              }}>{label}</button>
            ))}
          </div>

          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', borderTop: 'none', maxWidth: 660 }}>
            {tab === 'chat' ? (
              <>
                <div ref={msgsRef} style={{ height: 270, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {msgs.map((m, i) => <DemoChatBubble key={i} {...m} label={m.role === 'assistant' ? 'KNOWLEDGE BASE' : undefined} />)}
                  {busy && <DemoTyping label="Searching knowledge base…" />}
                </div>
                <DemoError msg={err} />
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--ink-3)', display: 'flex', gap: 8 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                    placeholder="Ask anything about Riverside HVAC…" disabled={busy}
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 13px var(--font-sans)', outline: 'none' }} />
                  <button onClick={() => send(input)} disabled={!input.trim() || busy} style={{
                    padding: '9px 16px', background: 'var(--signal)', border: 'none', color: 'var(--ink)',
                    font: '600 12px var(--font-sans)', cursor: 'pointer', flexShrink: 0,
                    opacity: !input.trim() || busy ? 0.4 : 1,
                  }}>Ask</button>
                </div>
              </>
            ) : (
              <div style={{ padding: '16px 18px' }}>
                <p style={{ font: '400 12px var(--font-sans)', color: 'var(--muted)', margin: '0 0 10px' }}>Edit this content and switch back to "Ask Questions" — the AI will use your updated version live.</p>
                <textarea value={kb} onChange={e => setKb(e.target.value)} rows={14}
                  style={{ width: '100%', padding: '12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 12px var(--font-mono)', outline: 'none', resize: 'vertical', lineHeight: 1.65 }} />
              </div>
            )}
          </div>

          {tab === 'chat' && (
            <>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)' }}>Try:</span>
                {starters.map(s => <DemoStarterBtn key={s} label={s} onClick={() => send(s)} />)}
              </div>
              {msgs.length > 2 && (
                <SendToAndrewPanel
                  mode="knowledge"
                  output={msgs.map(m => `${m.role === 'user' ? 'Visitor' : 'Knowledge Base'}: ${m.content}`).join('\n\n')}
                />
              )}
            </>
          )}
        </FadeIn>
      </div>
    </section>
  );
}

// ── Business Automation Demo ──────────────────────────────────────
function AutomationAnalyzerDemo() {
  const [input, setInput] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  async function analyze(text) {
    const t = (text || input).trim();
    if (!t || busy) return;
    setInput(t);
    setBusy(true);
    setResult(null);
    setErr(null);
    try {
      const d = await callDemoAPI({ mode: 'automation', messages: [{ role: 'user', content: t }] });
      setResult(d.content);
    } catch (e) {
      setErr(e.message || 'Demo unavailable — the API may not be deployed yet.');
    } finally {
      setBusy(false);
    }
  }

  const examples = [
    'I manually text appointment reminders to every client the morning of their visit',
    'Every Monday I copy last week\'s sales from our POS into a Google Sheet for reporting',
    'We answer the same 10 new-customer questions over email every single week',
    'My team manually writes up a quote PDF and emails it to every new inquiry',
  ];

  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '0 48px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <DemoLiveBadge />
          <h2 style={{ font: '600 clamp(22px, 2.5vw, 32px)/1.1 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: '0 0 10px' }}>Describe a task. See the automation plan.</h2>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 22px' }}>Tell us something your team does manually. The AI will show you exactly how to automate it, what tools to use, and what it takes to set up.</p>

          <div style={{ maxWidth: 700 }}>
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', padding: '20px' }}>
              <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Describe a repetitive task</div>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
                placeholder="E.g.: Every morning I manually send reminder texts to clients who have appointments that day…"
                style={{ width: '100%', padding: '12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 14px/1.5 var(--font-sans)', outline: 'none', resize: 'vertical', marginBottom: 14 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => analyze()} disabled={!input.trim() || busy} style={{
                  padding: '10px 22px', background: 'var(--signal)', border: 'none', color: 'var(--ink)',
                  font: '600 13px var(--font-sans)', cursor: 'pointer',
                  opacity: !input.trim() || busy ? 0.4 : 1, transition: 'opacity .15s',
                }}>{busy ? 'Analyzing…' : 'Analyze →'}</button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <span style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)', paddingTop: 5, flexShrink: 0 }}>Examples:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {examples.map((ex, i) => (
                  <button key={i} onClick={() => analyze(ex)} style={{
                    font: '400 12px var(--font-sans)', padding: '4px 10px',
                    background: 'transparent', border: '1px solid var(--ink-3)', color: 'var(--muted)',
                    cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--signal)'; e.currentTarget.style.color = 'var(--paper)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-3)'; e.currentTarget.style.color = 'var(--muted)'; }}>
                    {ex.length > 52 ? ex.slice(0, 50) + '…' : ex}
                  </button>
                ))}
              </div>
            </div>

            {err && <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(229,85,85,0.08)', border: '1px solid rgba(229,85,85,0.18)', font: '400 13px var(--font-sans)', color: '#e55' }}>{err}</div>}

            {busy && (
              <div style={{ marginTop: 14, padding: '24px', background: 'var(--ink-2)', border: '1px solid var(--ink-3)', textAlign: 'center' }}>
                <div style={{ font: '400 13px var(--font-mono)', color: 'var(--muted)' }}>Analyzing your workflow…</div>
              </div>
            )}

            {result && (
              <>
                <div style={{ marginTop: 14, background: 'var(--ink-2)', border: '1px solid var(--signal)', padding: '22px' }}>
                  <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--signal)', marginBottom: 16 }}>Automation Analysis</div>
                  <div style={{ font: '400 14px/1.75 var(--font-sans)', color: 'var(--paper)', whiteSpace: 'pre-wrap' }}>{result}</div>
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--ink-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ font: '400 13px var(--font-sans)', color: 'var(--muted)' }}>Want us to build this for you?</span>
                    <Btn primary arrow href="#ba-contact">Get started</Btn>
                  </div>
                </div>
                <SendToAndrewPanel mode="automation" output={result} input={input} />
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Web Design Brief Demo ─────────────────────────────────────────
function WebDesignBriefDemo() {
  const [step, setStep] = React.useState('input');
  const [input, setInput] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [err, setErr] = React.useState(null);

  async function generate(text) {
    const t = (text || input).trim();
    if (!t) return;
    setInput(t);
    setStep('loading');
    setErr(null);
    try {
      const d = await callDemoAPI({ mode: 'webdesign', messages: [{ role: 'user', content: t }] });
      setResult(d.content);
      setStep('result');
    } catch (e) {
      setErr(e.message || 'Demo unavailable — the API may not be deployed yet.');
      setStep('input');
    }
  }

  const examples = [
    'Local plumbing company, 20 years in business, serving greater Nashville, residential and commercial',
    'Independent yoga studio, 2 locations, group classes and private sessions, mainly female clients 25–45',
    'Family-owned Italian restaurant, 15 years open, dine-in and takeout, downtown location',
  ];

  return (
    <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '0 48px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <DemoLiveBadge />
          <h2 style={{ font: '600 clamp(22px, 2.5vw, 32px)/1.1 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: '0 0 10px' }}>Describe your business. See your site plan.</h2>
          <p style={{ font: '400 15px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 22px' }}>Tell us what your business does in a sentence or two. Our AI will generate a complete website brief — structure, headline, CTAs, and SEO keywords — in seconds.</p>

          <div style={{ maxWidth: 700 }}>
            {step === 'input' && (
              <>
                <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', padding: '20px' }}>
                  <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Tell us about your business</div>
                  <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
                    placeholder="E.g.: Family-owned plumbing company, serving Denver for 20 years, residential and commercial repairs and installs…"
                    style={{ width: '100%', padding: '12px', background: 'var(--ink)', border: '1px solid var(--ink-3)', color: 'var(--paper)', font: '400 14px/1.5 var(--font-sans)', outline: 'none', resize: 'vertical', marginBottom: 14 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => generate()} disabled={!input.trim()} style={{
                      padding: '10px 22px', background: 'var(--signal)', border: 'none', color: 'var(--ink)',
                      font: '600 13px var(--font-sans)', cursor: 'pointer', opacity: !input.trim() ? 0.4 : 1,
                    }}>Generate Site Brief →</button>
                  </div>
                </div>
                {err && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(229,85,85,0.08)', border: '1px solid rgba(229,85,85,0.18)', font: '400 13px var(--font-sans)', color: '#e55' }}>{err}</div>}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <span style={{ font: '400 11px var(--font-sans)', color: 'var(--muted)', paddingTop: 5, flexShrink: 0 }}>Examples:</span>
                  {examples.map((ex, i) => (
                    <button key={i} onClick={() => generate(ex)} style={{
                      font: '400 12px var(--font-sans)', padding: '4px 10px',
                      background: 'transparent', border: '1px solid var(--ink-3)', color: 'var(--muted)',
                      cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--signal)'; e.currentTarget.style.color = 'var(--paper)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-3)'; e.currentTarget.style.color = 'var(--muted)'; }}>
                      {ex.length > 52 ? ex.slice(0, 50) + '…' : ex}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'loading' && (
              <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--ink-2)', border: '1px solid var(--ink-3)' }}>
                <div style={{ font: '400 13px var(--font-mono)', color: 'var(--muted)', marginBottom: 8 }}>Generating your site brief…</div>
                <div style={{ font: '400 12px var(--font-sans)', color: 'var(--muted)', opacity: 0.5 }}>Usually takes 5–10 seconds</div>
              </div>
            )}

            {step === 'result' && result && (
              <>
                <div style={{ background: 'var(--ink-2)', border: '1px solid var(--signal)', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--signal)' }}>Website Brief</div>
                    <button onClick={() => { setStep('input'); setResult(null); setInput(''); }} style={{
                      font: '400 11px var(--font-mono)', padding: '4px 10px', background: 'transparent',
                      border: '1px solid var(--ink-3)', color: 'var(--muted)', cursor: 'pointer',
                    }}>← Start over</button>
                  </div>
                  <div style={{ font: '400 14px/1.8 var(--font-sans)', color: 'var(--paper)', whiteSpace: 'pre-wrap' }}>{result}</div>
                </div>
                <SendToAndrewPanel mode="webdesign" output={result} input={input} />
                <div style={{ marginTop: 14, padding: '18px 22px', background: 'var(--ink-2)', border: '1px solid var(--ink-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ font: '400 14px var(--font-sans)', color: 'var(--muted)' }}>Ready to build this? We can have it live in days.</span>
                  <Btn primary arrow href="#wd-contact">Start your project</Btn>
                </div>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── AI Agents & Receptionist Page ────────────────────────────────
const AA_STEPS = [
  { num: '01', title: 'Discovery',  desc: 'A focused call to understand your business — the calls you get most, your FAQs, how you like to handle bookings, and what tone fits your brand. Every agent is built from scratch for your specific workflows, not copied from a template.' },
  { num: '02', title: 'Build',      desc: 'We configure your agent with your business details, custom scripts, pricing, hours, and service area. If you use a calendar or booking system, we connect it so the agent can check availability and schedule in real time.' },
  { num: '03', title: 'Test',       desc: 'We run through dozens of real-world scenarios — common questions, edge cases, difficult callers — until it handles every situation exactly right. You review and approve every response before anything goes live.' },
  { num: '04', title: 'Deploy',     desc: 'Your agent goes live and starts working immediately — answering calls and messages 24/7, capturing lead information, and booking appointments while you focus on the work. You get a summary of every interaction by email.' },
];

const AA_INCLUDES = [
  '24/7 call and message answering — nights, weekends, holidays',
  'Lead qualification that captures name, number, and job details before you ever pick up',
  'Appointment booking synced directly to your Google, Outlook, or Calendly calendar',
  'Custom FAQ handling trained on your specific services, pricing, and policies',
  'Call and message summaries delivered to your email after every interaction',
  'Smart escalation — knows when to take a message and flag it as urgent',
  'Monthly performance report showing call volume, leads captured, and bookings made',
  'Ongoing tuning included — update hours, pricing, or FAQs anytime',
];

const AA_INDUSTRIES = [
  'Contractors & Trades', 'Medical & Dental', 'Salons & Spas',
  'Real Estate', 'Restaurants & Food', 'Law Offices',
  'Home Services', 'Retail Shops',
];

const AA_TIERS = [
  { name: 'Basic',    price: '$149', period: '/mo', setup: '$199 setup', desc: 'A smart text and chat agent that captures leads and answers questions around the clock.',         features: ['Chat & text agent', 'FAQ handling', 'Lead capture', 'Email summaries', '$199 one-time setup'],                                              featured: false },
  { name: 'Standard', price: '$249', period: '/mo', setup: '$249 setup', desc: 'Voice and chat combined. Books appointments, qualifies leads — even at 2am.',                     features: ['Voice + chat agent', 'Appointment booking', 'Lead qualification', 'Calendar sync', 'Email summaries', '$249 one-time setup'],                featured: true  },
  { name: 'Pro',      price: '$399', period: '/mo', setup: '$299 setup', desc: 'Fully custom agent built around your exact workflows, with CRM and advanced integrations.',       features: ['Fully custom build', 'CRM integration', 'Advanced workflows', 'Priority support', 'Quarterly tuning', '$299 one-time setup'],                featured: false },
];

const AA_FAQS = [
  { q: 'Does it really sound like a real person?',             a: 'Modern AI voice agents are remarkably natural — most callers can\'t tell the difference. We tune the voice, tone, and pacing to match your brand before going live. You\'ll hear it yourself and approve before we flip the switch.' },
  { q: 'What happens when it doesn\'t know the answer?',       a: 'The agent is trained to escalate gracefully — it takes a message, captures the caller\'s name and number, explains that someone will call back shortly, and sends you an immediate notification. No caller gets left hanging.' },
  { q: 'Can it book appointments on my calendar?',             a: 'Yes. We connect it to your existing calendar (Google, Outlook, Calendly, etc.) so it can check real-time availability and book appointments without any manual work on your end.' },
  { q: 'How long does setup take?',                            a: 'Most agents are live within 3–5 business days of the discovery call. More complex builds with custom integrations or multi-location setups may take a few days longer, but never weeks.' },
  { q: 'What do I need to provide to get started?',            a: 'Just 30–45 minutes for a discovery call. We\'ll gather your FAQs, business hours, service area, pricing, booking process, and how you want different types of calls handled. You don\'t need to write a script.' },
  { q: 'Can I make changes after it\'s live?',                 a: 'Absolutely. Your monthly plan includes ongoing updates — business changes, new services, seasonal hours, updated pricing. Just let us know and we\'ll update the agent, usually within 24 hours.' },
  { q: 'What if I already have a receptionist?',               a: 'AI agents work great as backup — handling overflow calls during busy periods, after-hours coverage, and weekend calls. Many clients use an agent to supplement their receptionist rather than replace them.' },
  { q: 'Does it work for texts and web chat too?',             a: 'Yes. The Basic plan covers text and chat. Standard and Pro include voice. We can also add web chat directly to your website so visitors get immediate responses without picking up the phone.' },
  { q: 'What industries does this work best for?',             a: 'Any business that receives inbound calls — contractors, HVAC, plumbers, electricians, dental offices, salons, real estate agents, law offices, restaurants. If you\'re missing calls right now, the agent pays for itself quickly.' },
  { q: 'How does billing work?',                               a: 'There\'s a one-time setup fee to build and configure your agent, then a flat monthly subscription. No per-minute charges, no usage spikes. You know exactly what it costs every month.' },
];

function AgentsPage() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--font-sans)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ScrollProgressBar />
      <CourierGraph />
      <Nav />
      <main>
        {/* Hero */}
        <section className="cp-service-hero" style={{ position: 'relative', zIndex: 2, padding: '160px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', marginBottom: 32, transition: 'color .15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--paper)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>← Back to home</a>
          </FadeIn>
          <FadeIn delay={40}><div style={{ marginBottom: 24 }}><Eyebrow>Service 02 · <span style={{ color: 'var(--signal)' }}>AI Agents & Receptionist</span></Eyebrow></div></FadeIn>
          <FadeIn delay={80}>
            <h1 style={{ font: '600 clamp(48px, 7vw, 96px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', maxWidth: '16ch', textWrap: 'balance', color: 'var(--paper)' }}>
              Never miss a <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>lead</span> again.
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 40px' }}>
              AI agents that answer calls, qualify leads, and book appointments around the clock — so you never lose a customer to voicemail again.
            </p>
          </FadeIn>
          <FadeIn delay={220}><Btn primary arrow href="#aa-contact">Get started</Btn></FadeIn>
        </section>

        <VoiceReceptionistDemo />

        {/* Problem */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '80px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-service-problem-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'center' }}>
            <FadeIn><h2 style={{ font: '600 clamp(32px, 4vw, 48px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: 0, textWrap: 'balance' }}>Every missed call is a missed customer.</h2></FadeIn>
            <FadeIn delay={100}>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>Most small businesses miss calls every single day — during jobs, after hours, on weekends. Each one is a potential customer who didn't leave a voicemail and just called your competitor instead. Studies show that 80% of callers who reach voicemail don't call back.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>Hiring a full-time receptionist costs $1,200–$1,500/month in Lafayette — and they only cover business hours. Answering services use off-script operators who don't know your business. Neither solution captures leads, books appointments, or handles FAQs the way a trained AI agent can.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>An AI agent costs a fraction of that, knows your business inside and out, and never clocks out. It answers on the first ring at 2am the same way it answers at 2pm on a Monday.</p>
            </FadeIn>
          </div>
        </section>

        {/* Process */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="01" name="Process" theme="Up and running in days, not weeks." /></FadeIn>
            <div className="cp-process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--ink-3)', borderLeft: '1px solid var(--ink-3)' }}>
              {AA_STEPS.map((s, i) => (
                <FadeIn key={s.num} delay={i * 80}>
                  <div style={{ padding: '36px 28px', borderRight: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)', minHeight: 220 }}>
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.2em', color: 'var(--signal)', marginBottom: 20 }}>{s.num}</div>
                    <h3 style={{ font: '600 20px var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--paper)', margin: '0 0 12px' }}>{s.title}</h3>
                    <p style={{ font: '400 14px/1.65 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Included + Who it's for */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-includes-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <FadeIn>
              <SectionHead num="02" name="What's Included" theme="" />
              <div>
                {AA_INCLUDES.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--ink-3)' }}>
                    <span style={{ color: 'var(--signal)', font: '600 14px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--paper)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <SectionHead num="03" name="Who It's For" theme="" />
              <p style={{ font: '400 15px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 24px' }}>Any business that relies on calls, appointments, or lead inquiries — and can't afford to miss them:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                {AA_INDUSTRIES.map(ind => (
                  <span key={ind} style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper)', border: '1px solid var(--ink-3)', padding: '8px 14px' }}>{ind}</span>
                ))}
              </div>
              <div style={{ padding: '24px', background: 'var(--ink-2)', borderLeft: '2px solid var(--signal)' }}>
                <p style={{ font: '400 13px var(--font-sans)', color: 'var(--muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>Compare the cost</p>
                <p style={{ font: '600 16px var(--font-sans)', color: 'var(--paper)', margin: 0 }}>A part-time receptionist in Lafayette runs <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>$1,200–$1,500/mo</span>. Our agents start at <span style={{ color: 'var(--signal)' }}>$149/mo</span> — and never take a day off.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Pricing */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="04" name="Pricing" theme="Monthly plans. Cancel anytime." /></FadeIn>
            <FadeIn delay={80}>
              <div className="cp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {AA_TIERS.map(t => (
                  <div key={t.name} style={{ padding: '40px 32px', background: t.featured ? 'var(--ink-2)' : 'transparent', border: `1px solid ${t.featured ? 'var(--signal)' : 'var(--ink-3)'}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {t.featured && <span style={{ position: 'absolute', top: -1, left: 32, font: '500 10px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'var(--signal)', color: 'var(--ink)', padding: '4px 10px' }}>Most popular</span>}
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                      <span style={{ font: '600 clamp(36px, 4vw, 48px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', color: t.featured ? 'var(--signal)' : 'var(--paper)' }}>{t.price}</span>
                      <span style={{ font: '400 16px var(--font-sans)', color: 'var(--muted)' }}>{t.period}</span>
                    </div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 16 }}>{t.setup}</div>
                    <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--muted)', margin: '0 0 28px' }}>{t.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 32 }}>
                      {t.features.map(f => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--signal)', font: '600 12px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                          <span style={{ font: '400 13px var(--font-sans)', color: 'var(--paper)', opacity: 0.8 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Btn primary={t.featured} arrow href="#aa-contact">{t.featured ? 'Get started' : 'Choose plan'}</Btn>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* FAQ */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <FadeIn><SectionHead num="05" name="FAQ" theme="Common questions, straight answers." /></FadeIn>
            <FadeIn delay={80}>
              <div style={{ borderTop: '1px solid var(--ink-3)' }}>
                {AA_FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Contact */}
        <RelatedServices current="/services/ai-agents" />
        <section id="aa-contact" className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', borderTop: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="cp-contact-grid">
              <FadeIn>
                <div>
                  <h2 style={{ font: '600 clamp(40px, 5vw, 64px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>
                    Ready to put your phones on <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>autopilot</span>?
                  </h2>
                  <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--muted)', margin: '0 0 32px', maxWidth: '46ch' }}>Tell me about your business. The agent below will take notes and send everything to Andrew — no forms, no commitment.</p>
                  <a href="mailto:andrew@carrierpigeonai.dev" style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>Or email directly → andrew@carrierpigeonai.dev</a>
                </div>
              </FadeIn>
              <FadeIn delay={120}>
                <ContactVoiceAgent />
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Business Automation Page ──────────────────────────────────────
const BA_STEPS = [
  { num: '01', title: 'Assessment',   desc: 'We walk through your day-to-day operations and map where time and money are leaking. Most businesses are surprised by how much of their work is already automatable — follow-ups, reminders, data entry, scheduling, reporting, and more.' },
  { num: '02', title: 'Identify',     desc: 'We prioritize by impact — the tasks that eat the most hours and carry the least risk to automate go first. You see real time savings fast while we build toward bigger, more complex wins.' },
  { num: '03', title: 'Build',        desc: 'We deploy the right tools for each workflow using platforms like Zapier, Make, n8n, and Claude AI — and connect them to the software you already use. No ripping anything out, no learning a new system.' },
  { num: '04', title: 'Optimize',     desc: 'We monitor performance after launch, fix anything that needs tuning, and document everything we\'ve built. Growth Partner clients get new automations added every month as your business evolves.' },
];

const BA_INCLUDES = [
  'Full workflow audit — we find what\'s automatable before we build anything',
  'Tool selection tailored to your workflows and budget (Zapier, Make, n8n, Claude AI, and more)',
  'Integration with the software you already use — no system replacements required',
  'Staff onboarding so your team knows exactly how each automation works',
  '30-day post-launch monitoring and tuning at no extra charge',
  'Written documentation of every automation so nothing lives only in our heads',
  'Same-day turnaround on minor tweaks during the support window',
  'Expansion roadmap — a prioritized list of future automations to tackle next',
];

const BA_INDUSTRIES = [
  'Contractors & Trades', 'Medical & Dental', 'Real Estate',
  'Restaurants & Food', 'Retail Shops', 'Professional Services',
  'Law Offices', 'Property Management',
];

const BA_TIERS = [
  { name: 'Starter',        price: '$799',    period: '',     setup: 'One-time',   desc: 'Workflow assessment plus up to 2 automations implemented and ready to run.',          features: ['Workflow audit', 'Up to 2 automations', 'Software integration', 'Basic staff training', '30-day support'],                                    featured: false },
  { name: 'Standard',       price: '$1,499',  period: '',     setup: 'One-time',   desc: 'The full build. Up to 5 automations with training so your team can use them confidently.', features: ['Full workflow mapping', 'Up to 5 automations', 'Software integration', 'Staff training session', '30-day support', 'Process documentation'], featured: true  },
  { name: 'Growth Partner', price: '$299',    period: '/mo',  setup: 'Ongoing',    desc: 'Continuous automation expansion — new workflows monthly, monitoring, and priority support.', features: ['Monthly new automations', 'Performance monitoring', 'Priority support', 'Quarterly strategy review', 'Unlimited tweaks'],              featured: false },
];

const BA_FAQS = [
  { q: 'What kinds of tasks can actually be automated?',       a: 'More than most people expect — appointment reminders, follow-up emails, invoice generation, data entry, report creation, lead routing, customer onboarding, social media scheduling, and more. If a task is repetitive and rule-based, there\'s a strong chance AI can handle it.' },
  { q: 'Do I need to change the software I\'m already using?', a: 'Usually not. We work with what you have — Google Workspace, QuickBooks, Outlook, HubSpot, your CRM, your booking system. The goal is to make your existing tools smarter and connect them together, not replace them.' },
  { q: 'How long before we see results?',                      a: 'Most clients see measurable time savings within the first week of go-live. Simpler automations like email follow-ups and appointment reminders often pay for themselves in the first month.' },
  { q: 'Will my staff need a lot of training?',                a: 'No. We design automations to be invisible where possible — they just run in the background. Where staff interaction is needed, we keep it simple and include a training session in every package.' },
  { q: 'What if an automation breaks or stops working?',       a: 'We monitor everything during the 30-day support window and fix issues at no extra charge. Growth Partner clients get ongoing monitoring and same-day fixes indefinitely.' },
  { q: 'How do you decide which tasks to automate first?',     a: 'We prioritize by time-saved-versus-complexity. Tasks that eat the most hours and are low-risk to automate go first. You see results quickly while we build toward bigger, more complex workflows.' },
  { q: 'Is this just Zapier? Can\'t I do this myself?',        a: 'Zapier and Make are tools we often use, but the value is in knowing what to build, how to build it reliably, and how to connect it to your specific setup. Most DIY automations break within weeks because edge cases weren\'t handled. We build them to last.' },
  { q: 'What size business is this right for?',                a: 'Any business with repetitive internal tasks — typically 1 to 50 employees. The smaller the team, the more impact automation has, because everyone is wearing multiple hats. A 5-person shop automating their follow-up emails can reclaim 10+ hours a week.' },
  { q: 'Do you offer ongoing help after the project ends?',    a: 'Yes — the Growth Partner plan gives you a dedicated automation partner who adds new workflows monthly, monitors performance, and handles tweaks as your business changes. It\'s ideal for businesses that want to keep improving over time.' },
];

function AutomationPage() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--font-sans)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ScrollProgressBar />
      <CourierGraph />
      <Nav />
      <main>
        {/* Hero */}
        <section className="cp-service-hero" style={{ position: 'relative', zIndex: 2, padding: '160px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', marginBottom: 32, transition: 'color .15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--paper)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>← Back to home</a>
          </FadeIn>
          <FadeIn delay={40}><div style={{ marginBottom: 24 }}><Eyebrow>Service 03 · <span style={{ color: 'var(--signal)' }}>Business Automation</span></Eyebrow></div></FadeIn>
          <FadeIn delay={80}>
            <h1 style={{ font: '600 clamp(48px, 7vw, 96px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', maxWidth: '16ch', textWrap: 'balance', color: 'var(--paper)' }}>
              Stop doing manually what AI can handle in <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>seconds</span>.
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 40px' }}>
              We map your workflows, find the bottlenecks, and deploy AI tools that free your team to focus on what actually grows the business.
            </p>
          </FadeIn>
          <FadeIn delay={220}><Btn primary arrow href="#ba-contact">Get started</Btn></FadeIn>
        </section>

        <AutomationAnalyzerDemo />

        {/* Problem */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '80px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-service-problem-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'center' }}>
            <FadeIn><h2 style={{ font: '600 clamp(32px, 4vw, 48px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: 0, textWrap: 'balance' }}>Your team is spending hours on work that shouldn't require a human.</h2></FadeIn>
            <FadeIn delay={100}>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>Follow-up emails, appointment reminders, data entry, invoice generation, report creation, lead routing — these tasks eat hours every week that could go toward serving customers and growing the business. For most small businesses, 30–40% of daily work is repetitive enough to automate entirely.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>The problem isn't that the tools don't exist — Zapier, Make, and AI platforms are more capable than ever. The problem is knowing which tasks to automate, how to connect them to your existing software, and how to build them so they don't break the moment something unexpected happens.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>AI doesn't replace your team — it removes the busywork so they can focus on what actually matters. Most clients have their first automation live and saving time within a week of the assessment call.</p>
            </FadeIn>
          </div>
        </section>

        {/* Process */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="01" name="Process" theme="Find it. Build it. Let it run." /></FadeIn>
            <div className="cp-process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--ink-3)', borderLeft: '1px solid var(--ink-3)' }}>
              {BA_STEPS.map((s, i) => (
                <FadeIn key={s.num} delay={i * 80}>
                  <div style={{ padding: '36px 28px', borderRight: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)', minHeight: 220 }}>
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.2em', color: 'var(--signal)', marginBottom: 20 }}>{s.num}</div>
                    <h3 style={{ font: '600 20px var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--paper)', margin: '0 0 12px' }}>{s.title}</h3>
                    <p style={{ font: '400 14px/1.65 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Included + Who it's for */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-includes-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <FadeIn>
              <SectionHead num="02" name="What's Included" theme="" />
              <div>
                {BA_INCLUDES.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--ink-3)' }}>
                    <span style={{ color: 'var(--signal)', font: '600 14px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--paper)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <SectionHead num="03" name="Who It's For" theme="" />
              <p style={{ font: '400 15px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 24px' }}>Any business with repetitive internal tasks, manual follow-ups, or staff doing work that should be automatic:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                {BA_INDUSTRIES.map(ind => (
                  <span key={ind} style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper)', border: '1px solid var(--ink-3)', padding: '8px 14px' }}>{ind}</span>
                ))}
              </div>
              <div style={{ padding: '24px', background: 'var(--ink-2)', borderLeft: '2px solid var(--signal)' }}>
                <p style={{ font: '400 13px var(--font-sans)', color: 'var(--muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>The bottom line</p>
                <p style={{ font: '600 16px var(--font-sans)', color: 'var(--paper)', margin: 0 }}>Most clients recover the cost of this service within the first month — just from hours saved.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Pricing */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="04" name="Pricing" theme="Start once. Grow from there." /></FadeIn>
            <FadeIn delay={80}>
              <div className="cp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {BA_TIERS.map(t => (
                  <div key={t.name} style={{ padding: '40px 32px', background: t.featured ? 'var(--ink-2)' : 'transparent', border: `1px solid ${t.featured ? 'var(--signal)' : 'var(--ink-3)'}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {t.featured && <span style={{ position: 'absolute', top: -1, left: 32, font: '500 10px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'var(--signal)', color: 'var(--ink)', padding: '4px 10px' }}>Most popular</span>}
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                      <span style={{ font: '600 clamp(36px, 4vw, 48px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', color: t.featured ? 'var(--signal)' : 'var(--paper)' }}>{t.price}</span>
                      {t.period && <span style={{ font: '400 16px var(--font-sans)', color: 'var(--muted)' }}>{t.period}</span>}
                    </div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 16 }}>{t.setup}</div>
                    <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--muted)', margin: '0 0 28px' }}>{t.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 32 }}>
                      {t.features.map(f => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--signal)', font: '600 12px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                          <span style={{ font: '400 13px var(--font-sans)', color: 'var(--paper)', opacity: 0.8 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Btn primary={t.featured} arrow href="#ba-contact">{t.featured ? 'Get started' : 'Choose plan'}</Btn>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* FAQ */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <FadeIn><SectionHead num="05" name="FAQ" theme="Common questions, straight answers." /></FadeIn>
            <FadeIn delay={80}>
              <div style={{ borderTop: '1px solid var(--ink-3)' }}>
                {BA_FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Contact */}
        <RelatedServices current="/services/business-automation" />
        <section id="ba-contact" className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', borderTop: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="cp-contact-grid">
              <FadeIn>
                <div>
                  <h2 style={{ font: '600 clamp(40px, 5vw, 64px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>
                    Ready to get your <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>time back</span>?
                  </h2>
                  <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--muted)', margin: '0 0 32px', maxWidth: '46ch' }}>Tell me what's eating your team's time. The agent below will take notes and send everything to Andrew — no forms, no commitment.</p>
                  <a href="mailto:andrew@carrierpigeonai.dev" style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>Or email directly → andrew@carrierpigeonai.dev</a>
                </div>
              </FadeIn>
              <FadeIn delay={120}>
                <ContactVoiceAgent />
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Knowledge Base Page ───────────────────────────────────────────
const KB_STEPS = [
  { num: '01', title: 'Discovery',  desc: 'We identify the questions your team and customers ask most — the ones that get answered the same way dozens of times a week. We also map where your existing knowledge lives so we know what to collect.' },
  { num: '02', title: 'Gather',     desc: 'We collect your existing content — PDFs, Word docs, Google Docs, emails, FAQs, product manuals, policy documents, website pages. If the answer exists somewhere in your business, we find it and bring it in.' },
  { num: '03', title: 'Build',      desc: 'We train a private AI exclusively on your content and configure the interface — a staff-facing portal, a customer-facing web widget, or both. Your data never leaves your environment or touches a public AI model.' },
  { num: '04', title: 'Deploy',     desc: 'Your knowledge base goes live. Staff get instant, accurate answers without pulling a manager aside. Customers get answers at 3am without sending an email. You stop fielding the same questions over and over.' },
];

const KB_INCLUDES = [
  'Private AI trained exclusively on your content — not general web knowledge',
  'Ingestion of any text format — PDFs, Word docs, Google Docs, spreadsheets, emails, web pages',
  'Staff-facing internal portal for instant employee answers and onboarding',
  'Branded customer-facing web widget embeddable on any page (Standard and above)',
  'Fully private and secure — your data is never shared with or used to train any public model',
  'Source citations so users can see exactly where each answer came from',
  '30-day post-launch accuracy monitoring and tuning included',
  'Content update service — add new documents or revise existing ones as your business changes',
];

const KB_INDUSTRIES = [
  'Medical & Dental', 'Law Offices', 'Contractors & Trades',
  'Retail Shops', 'Property Management', 'Professional Services',
  'HR & Internal Teams', 'Restaurants & Food',
];

const KB_TIERS = [
  { name: 'Starter',  price: '$999',   period: '',    setup: 'One-time', desc: 'Staff-facing knowledge base trained on up to 50 documents. Perfect for internal FAQs and onboarding.',         features: ['Up to 50 documents', 'Staff-facing portal', 'Q&A interface', 'Basic analytics', '30-day support'],                                                    featured: false },
  { name: 'Standard', price: '$1,999', period: '',    setup: 'One-time', desc: 'Full build — staff and customer-facing. Up to 200 documents with a branded widget for your website.',          features: ['Up to 200 documents', 'Staff + customer-facing', 'Branded web widget', 'Advanced analytics', '30-day support', 'Everything in Starter'],               featured: true  },
  { name: 'Growth',   price: '$199',   period: '/mo', setup: 'Ongoing',  desc: 'Continuous updates as your content evolves — new docs added monthly, performance monitoring, and priority support.', features: ['Unlimited documents', 'Continuous content updates', 'Performance monitoring', 'Priority support', 'Monthly accuracy review'],                      featured: false },
];

const KB_FAQS = [
  { q: 'Is my data secure and private?',                    a: 'Absolutely. Your knowledge base is trained on your content alone and hosted in a private environment. Your data is never shared with, sold to, or used to train any public AI model — unlike uploading documents to ChatGPT or similar tools.' },
  { q: 'What kinds of documents can it learn from?',        a: 'Almost anything text-based — PDFs, Word docs, Google Docs, spreadsheets, emails, website pages, employee handbooks, product manuals, FAQs, training materials. If it\'s text, we can ingest it.' },
  { q: 'How accurate are the answers?',                     a: 'Very accurate for content it\'s been trained on. It answers only from your documents and won\'t fabricate information. If it doesn\'t have the answer, it says so clearly and can be configured to suggest who to contact instead.' },
  { q: 'Can customers use it on my website?',               a: 'Yes — Standard and Growth plans include a branded chat widget you can embed on any page. Customers type their question and get an instant answer, day or night, without calling or emailing your team.' },
  { q: 'What happens when my content changes?',             a: 'Growth plan clients get monthly content updates as part of the subscription. One-time plan clients can add or update documents at a flat hourly rate. Either way, the knowledge base stays current.' },
  { q: 'How is this different from just using ChatGPT?',    a: 'ChatGPT is trained on the entire internet — which means it can also confidently make things up. Your private knowledge base only knows what you\'ve given it, so answers are accurate, consistent, and specific to your business. It will never tell a customer something that isn\'t true about you.' },
  { q: 'How long does setup take?',                         a: 'Most knowledge bases are live within 5–7 business days of receiving your content. Larger builds with hundreds of documents may take a bit longer, but we\'ll give you a clear timeline upfront.' },
  { q: 'What if my team doesn\'t have organized documentation?', a: 'That\'s very common. We can work from whatever you have — even unstructured emails, old FAQ lists, or a brain-dump call where you walk us through how things work. We help organize and structure it as part of the build.' },
  { q: 'Can it handle follow-up questions in a conversation?', a: 'Yes. The chat interface supports multi-turn conversations — users can ask follow-up questions and the AI understands the context of what was already discussed, just like chatting with a knowledgeable coworker.' },
  { q: 'Who is this built for?',                            a: 'Any business where people spend time answering the same questions repeatedly — dental offices, law firms, contractors, property managers, HR teams, restaurants with complex menus or policies. If someone on your team is the unofficial "answer person," this replaces that bottleneck.' },
];

function KnowledgePage() {
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--paper)', fontFamily: 'var(--font-sans)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ScrollProgressBar />
      <CourierGraph />
      <Nav />
      <main>
        {/* Hero */}
        <section className="cp-service-hero" style={{ position: 'relative', zIndex: 2, padding: '160px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 11px var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', marginBottom: 32, transition: 'color .15s ease' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--paper)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>← Back to home</a>
          </FadeIn>
          <FadeIn delay={40}><div style={{ marginBottom: 24 }}><Eyebrow>Service 04 · <span style={{ color: 'var(--signal)' }}>Knowledge Base</span></Eyebrow></div></FadeIn>
          <FadeIn delay={80}>
            <h1 style={{ font: '600 clamp(48px, 7vw, 96px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', maxWidth: '16ch', textWrap: 'balance', color: 'var(--paper)' }}>
              Your answers, available <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>instantly</span>.
            </h1>
          </FadeIn>
          <FadeIn delay={160}>
            <p style={{ font: '400 18px/1.6 var(--font-sans)', color: 'var(--muted)', maxWidth: '52ch', margin: '0 0 40px' }}>
              A private AI trained on your business content — so staff and customers get instant, accurate answers around the clock without pulling anyone away from real work.
            </p>
          </FadeIn>
          <FadeIn delay={220}><Btn primary arrow href="#kb-contact">Get started</Btn></FadeIn>
        </section>

        <KnowledgeBaseDemo />

        {/* Problem */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '80px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-service-problem-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'center' }}>
            <FadeIn><h2 style={{ font: '600 clamp(32px, 4vw, 48px)/1.05 var(--font-sans)', letterSpacing: '-0.03em', color: 'var(--paper)', margin: 0, textWrap: 'balance' }}>Your team already has the answers. They're just buried.</h2></FadeIn>
            <FadeIn delay={100}>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>Every business accumulates knowledge over time — in employee handbooks, old emails, product docs, policy manuals, training materials. But that knowledge is scattered across folders no one opens, buried in inboxes, or living entirely in one person's head. When that person is busy, on vacation, or leaves — everyone's stuck.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 16px' }}>The result is the same questions getting answered over and over. New employees spending their first weeks asking instead of doing. Customers emailing for information that should be instantly available. Managers pulled away from real work to answer things that are already documented somewhere.</p>
              <p style={{ font: '400 17px/1.7 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>We take everything your business already knows and turn it into a private AI that gives instant, accurate answers — to your staff, your customers, or both — without pulling anyone away from what they should be doing.</p>
            </FadeIn>
          </div>
        </section>

        {/* Process */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="01" name="Process" theme="Your knowledge. Made instantly accessible." /></FadeIn>
            <div className="cp-process-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--ink-3)', borderLeft: '1px solid var(--ink-3)' }}>
              {KB_STEPS.map((s, i) => (
                <FadeIn key={s.num} delay={i * 80}>
                  <div style={{ padding: '36px 28px', borderRight: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)', minHeight: 220 }}>
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.2em', color: 'var(--signal)', marginBottom: 20 }}>{s.num}</div>
                    <h3 style={{ font: '600 20px var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--paper)', margin: '0 0 12px' }}>{s.title}</h3>
                    <p style={{ font: '400 14px/1.65 var(--font-sans)', color: 'var(--muted)', margin: 0 }}>{s.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Included + Who it's for */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div className="cp-includes-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <FadeIn>
              <SectionHead num="02" name="What's Included" theme="" />
              <div>
                {KB_INCLUDES.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--ink-3)' }}>
                    <span style={{ color: 'var(--signal)', font: '600 14px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span style={{ font: '400 15px var(--font-sans)', color: 'var(--paper)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <SectionHead num="03" name="Who It's For" theme="" />
              <p style={{ font: '400 15px/1.7 var(--font-sans)', color: 'var(--muted)', margin: '0 0 24px' }}>Any business where people spend time answering the same questions over and over — from customers, staff, or both:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 36 }}>
                {KB_INDUSTRIES.map(ind => (
                  <span key={ind} style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper)', border: '1px solid var(--ink-3)', padding: '8px 14px' }}>{ind}</span>
                ))}
              </div>
              <div style={{ padding: '24px', background: 'var(--ink-2)', borderLeft: '2px solid var(--signal)' }}>
                <p style={{ font: '400 13px var(--font-sans)', color: 'var(--muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 11 }}>Worth knowing</p>
                <p style={{ font: '600 16px var(--font-sans)', color: 'var(--paper)', margin: 0 }}>Your data stays yours. We never use your content to train public AI models — ever.</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Pricing */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <FadeIn><SectionHead num="04" name="Pricing" theme="Built once. Updated as you grow." /></FadeIn>
            <FadeIn delay={80}>
              <div className="cp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {KB_TIERS.map(t => (
                  <div key={t.name} style={{ padding: '40px 32px', background: t.featured ? 'var(--ink-2)' : 'transparent', border: `1px solid ${t.featured ? 'var(--signal)' : 'var(--ink-3)'}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {t.featured && <span style={{ position: 'absolute', top: -1, left: 32, font: '500 10px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', background: 'var(--signal)', color: 'var(--ink)', padding: '4px 10px' }}>Most popular</span>}
                    <div style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                      <span style={{ font: '600 clamp(36px, 4vw, 48px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', color: t.featured ? 'var(--signal)' : 'var(--paper)' }}>{t.price}</span>
                      {t.period && <span style={{ font: '400 16px var(--font-sans)', color: 'var(--muted)' }}>{t.period}</span>}
                    </div>
                    <div style={{ font: '500 11px var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 16 }}>{t.setup}</div>
                    <p style={{ font: '400 14px/1.6 var(--font-sans)', color: 'var(--muted)', margin: '0 0 28px' }}>{t.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 32 }}>
                      {t.features.map(f => (
                        <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--signal)', font: '600 12px var(--font-mono)', flexShrink: 0, marginTop: 2 }}>✓</span>
                          <span style={{ font: '400 13px var(--font-sans)', color: 'var(--paper)', opacity: 0.8 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                    <Btn primary={t.featured} arrow href="#kb-contact">{t.featured ? 'Get started' : 'Choose plan'}</Btn>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* FAQ */}
        <section className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '96px 48px', background: 'rgba(12,12,13,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--ink-3)', borderBottom: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <FadeIn><SectionHead num="05" name="FAQ" theme="Common questions, straight answers." /></FadeIn>
            <FadeIn delay={80}>
              <div style={{ borderTop: '1px solid var(--ink-3)' }}>
                {KB_FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Contact */}
        <RelatedServices current="/services/knowledge-base" />
        <section id="kb-contact" className="cp-section-pad" style={{ position: 'relative', zIndex: 2, padding: '120px 48px', borderTop: '1px solid var(--ink-3)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }} className="cp-contact-grid">
              <FadeIn>
                <div>
                  <h2 style={{ font: '600 clamp(40px, 5vw, 64px)/1.0 var(--font-sans)', letterSpacing: '-0.04em', margin: '0 0 24px', color: 'var(--paper)', textWrap: 'balance' }}>
                    Ready to stop answering the same <span style={{ background: 'var(--signal)', color: 'var(--ink)', padding: '0 6px', margin: '0 -2px' }}>questions</span> twice?
                  </h2>
                  <p style={{ font: '400 16px/1.65 var(--font-sans)', color: 'var(--muted)', margin: '0 0 32px', maxWidth: '46ch' }}>Tell me what your team or customers ask most. The agent below will take notes and send everything to Andrew — no forms, no commitment.</p>
                  <a href="mailto:andrew@carrierpigeonai.dev" style={{ font: '500 13px var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>Or email directly → andrew@carrierpigeonai.dev</a>
                </div>
              </FadeIn>
              <FadeIn delay={120}>
                <ContactVoiceAgent />
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────
function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

function Root() {
  const path = usePath();

  // Scroll to top on every route change
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  // Update page title, meta description, and canonical URL for SEO
  useEffect(() => {
    const meta = PAGE_META[path] || PAGE_META['/'];
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.description);
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.rel = 'canonical';
      document.head.appendChild(canon);
    }
    canon.href = `https://carrierpigeonai.dev${path}`;
  }, [path]);

  if (path === '/services/web-design')          return <WebDesignPage />;
  if (path === '/services/ai-agents')           return <AgentsPage />;
  if (path === '/services/business-automation') return <AutomationPage />;
  if (path === '/services/knowledge-base')      return <KnowledgePage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);

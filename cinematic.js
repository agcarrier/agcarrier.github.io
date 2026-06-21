import React from "react";
import { createRoot } from "react-dom/client";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1];

// Reveal-on-scroll wrapper. Falls back to a plain fade when reduced motion is on.
function Reveal({ children, delay = 0, y = 24, scale = 1, as = "div", style }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  const from = reduce ? { opacity: 0 } : { opacity: 0, y, scale };
  const to = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  return (
    <Tag
      initial={from}
      whileInView={to}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease, delay }}
      style={style}
    >
      {children}
    </Tag>
  );
}

function Star() {
  return (
    <span className="navStar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0l2.4 7.4H22l-6 4.4 2.3 7.4-6-4.6-6 4.6L8.6 11.8l-6-4.4h7.6z" />
      </svg>
    </span>
  );
}

// ── 1. Hero ──────────────────────────────────────────────
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="hero">
      <motion.video
        className="heroVideo"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_30c6yRkxUog0TZ5432rCR7HN4Pe/hf_20260501_062927_2b8ce586-f555-4610-88ae-b2d3752ede3b.mp4"
        poster="https://playground.bravebrand.com/assets/backgrounds/signal-foundry-painted-city-hero.webp"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease }}
      />
      <div className="heroOverlay" />

      <div className="navWrap">
        <motion.nav
          className="navPill"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
        >
          <span className="navMark"><Star /> Carrier Pigeon AI</span>
          <span className="navLinks">
            <a href="#manifesto">About</a>
            <a href="#work">Work</a>
            <a href="#system">Services</a>
          </span>
          <a href="https://carrierpigeonai.dev/#contact"><button className="navBtn">Start a project</button></a>
        </motion.nav>
      </div>

      <motion.div
        className="timeLabel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease, delay: 0.5 }}
      >
        Lafayette, LA<br />30.22° N · 92.02° W
      </motion.div>

      <motion.div
        className="heroCard"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.45 }}
      >
        <div className="heroEyebrow">Independent AI studio · Lafayette, LA</div>
        <h1>AI that carries your business forward.</h1>
        <p>
          Carrier Pigeon AI builds the websites, agents, and quiet automations that
          let a small business punch far above its size — calm tech, no hype,
          often shipped in a single afternoon.
        </p>
        <a className="heroCta" href="#system">
          See what we build <span className="arrow">→</span>
        </a>
      </motion.div>
    </section>
  );
}

// ── 2. Sky-garden support section ────────────────────────
function SkySection() {
  return (
    <section className="skySection">
      <div className="skyInner">
        <Reveal scale={0.985} y={30}>
          <div className="skyArt">
            <video
              className="skyVideo"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_30c6yRkxUog0TZ5432rCR7HN4Pe/hf_20260501_082435_42398084-1c8d-48e5-a962-fe7c28c124e6.mp4"
              poster="https://playground.bravebrand.com/assets/backgrounds/signal-foundry-sky-garden.webp"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
            <div className="skyTint" />
            <div className="skyOverlayGrid">
              <div className="skyTopRow">
                <span className="skyEyebrow">From problem to working system</span>
                <motion.div
                  className="notifCard"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease, delay: 0.4 }}
                >
                  <span className="notifDot" />
                  <span>
                    <span className="t">Site is live</span>
                    <span className="s">Built and shipped — this afternoon.</span>
                  </span>
                </motion.div>
              </div>
              <div>
                <Reveal y={20} delay={0.1}>
                  <h2 className="skyHeadline">A website that used to take weeks now ships in an afternoon.</h2>
                </Reveal>
                <Reveal y={16} delay={0.2}>
                  <p className="skyAside">
                    AI doesn't just speed things up — it changes what's possible on a
                    small-business budget. More capability, faster delivery, without the
                    agency price tag.
                  </p>
                </Reveal>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── 3. Manifesto ─────────────────────────────────────────
function Manifesto() {
  return (
    <section className="manifesto" id="manifesto">
      <div className="manifestoGrid">
        <Reveal scale={0.96} y={20}>
          <img
            className="pixelFlower"
            src="https://playground.bravebrand.com/assets/backgrounds/signal-foundry-pixel-flower.webp"
            alt=""
            aria-hidden="true"
          />
        </Reveal>
        <div className="manifestoCopy">
          <Reveal y={18}>
            <p>
              We believe the corner shop, the rescue, and the two-person studio deserve
              the same tools the big companies guard behind enterprise contracts.
            </p>
          </Reveal>
          <Reveal y={18} delay={0.08}>
            <p>
              A world where the person who answers the phones, fixes the trucks, and
              closes the books can also have AI working quietly in the background —
              catching the missed call, drafting the follow-up, keeping the lights on.
            </p>
          </Reveal>
          <Reveal y={22} delay={0.16}>
            <p className="big serif">Where running a small business feels as calm as it always should have.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ── 4. System / what we build ────────────────────────────
const CARDS = [
  { n: "01", title: "AI Agents & Receptionist", body: "Answers calls, books jobs, and follows up so no lead slips through after hours." },
  { n: "02", title: "Web Design", body: "A site that ships in an afternoon — built around your brand and your vibe, not a template." },
  { n: "03", title: "Business Automation", body: "The busywork between your tools, handled — quotes, invoices, reminders, follow-ups." },
  { n: "04", title: "Private Knowledge Base", body: "Your documents, searchable in plain English and private to your team. No more digging." },
];

function System() {
  return (
    <section className="system" id="system">
      <div className="systemInner">
        <Reveal y={16}><div className="eyebrow">What we build</div></Reveal>
        <Reveal y={20} delay={0.06}>
          <h2 className="systemHead">A working system, not another idea in a notebook.</h2>
        </Reveal>
        <div className="cardGrid">
          {CARDS.map((c, i) => (
            <Reveal key={c.n} y={26} delay={0.08 * i}>
              <div className="sysCard">
                <div className="sysNum">{c.n}</div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 5. Closing CTA ───────────────────────────────────────
function Closing() {
  return (
    <section className="closing" id="work">
      <div className="closingOverlay" />
      <div className="closingInner">
        <Reveal y={26}>
          <h2 className="closingHead">Practical AI is here. Let's put it to work for you.</h2>
        </Reveal>
        <Reveal y={18} delay={0.1}>
          <a className="closingCta" href="https://carrierpigeonai.dev/#contact">
            Get to know us <span className="arrow">→</span>
          </a>
        </Reveal>
        <footer className="footer">
          <div className="fname">Carrier Pigeon AI</div>
          <hr />
          <div className="ftag">Calm AI for small business — Lafayette, Louisiana.</div>
        </footer>
      </div>
    </section>
  );
}

function App() {
  return (
    <>
      <Hero />
      <SkySection />
      <Manifesto />
      <System />
      <Closing />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);

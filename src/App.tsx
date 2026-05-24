import { useState, useEffect, useCallback } from "react";
import WizardModal from "./components/WizardModal";
import PaymentGate from "./components/PaymentGate";
import LetterBuilder from "./components/LetterBuilder";
import PaymentSuccess from "./components/PaymentSuccess";
import ErrorBoundary from "./components/ErrorBoundary";
import { MentionsLegales, CGV, Confidentialite, APropos } from "./components/LegalPages";
import { claimTypes, type ClaimConfig } from "./lib/claims";
import { usePaymentReturn } from "./hooks/usePaymentReturn";

const STORAGE_KEY = "plaidezy_session";

const trackEvent = (name: string, data: Record<string, unknown> = {}) => {
  try {
    window.dispatchEvent(new CustomEvent("plaidezy:analytics", { detail: { name, ...data } }));
    const w = window as typeof window & { gtag?: (...args: unknown[]) => void; plausible?: (event: string, options?: unknown) => void };
    w.gtag?.("event", name, data);
    w.plausible?.(name, { props: data });
  } catch { /* analytics noop */ }
};


const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  [300, 600, 900].forEach((delay) => {
    setTimeout(() => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("visible");
      });
    }, delay);
  });
};

/* ─── SVG Icon helpers ─── */
function IconPlane() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C20.9 6.1 22 4 22 4s-2.1 1.1-3.5 2.5L15 10l-8.2-1.8c-.4-.1-.8.1-1 .4L4 11l6 3 3 6 2.4-1.8c.3-.2.5-.6.4-1z"/><path d="M2 22l5-5M7 17l-2-2M9 19l-2-2"/></svg>;
}
function IconParking() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>;
}
function IconPackage() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function IconTrain() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 15h.01M15 15h.01"/></svg>;
}
function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconCheck() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconCross() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconChevron() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IconArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
function IconSearch() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IconZap() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IconLock() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconSend() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function IconRefund() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
}
function IconScales() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M5 8l7-5 7 5"/><path d="M5 8c0 3-2 5-2 5h4s-2-2-2-5"/><path d="M19 8c0 3 2 5 2 5h-4s2-2 2-5"/><line x1="2" y1="21" x2="22" y2="21"/></svg>;
}
function IconShieldCheck() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
}
function IconCoins() {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1110.34 18"/><line x1="7" y1="6" x2="7.01" y2="6"/><line x1="16" y1="14" x2="16.01" y2="14"/></svg>;
}

const serviceIcons: Record<string, () => JSX.Element> = {
  plane: IconPlane, parking: IconParking, package: IconPackage,
  train: IconTrain, home: IconHome,
};

const serviceIconClass: Record<string, string> = {
  plane: "plane", parking: "parking", package: "package",
  train: "train", home: "home",
};

const howIcons: Record<string, () => JSX.Element> = {
  search: IconSearch, zap: IconZap, lock: IconLock, send: IconSend,
};

const guaranteeIcons: Record<string, () => JSX.Element> = {
  refund: IconRefund, scales: IconScales, "shield-check": IconShieldCheck,
};

/* ─── NAVIGATION ─── */
function Navigation({ onOpenWizard }: { onOpenWizard: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const h = () => { setScrolled(window.scrollY > 40); setMenuOpen(false); };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <>
      <a href="#main-content" className="skip-link">Aller au contenu principal</a>
      <nav className={`nav-bar${scrolled ? " scrolled" : ""}`} role="navigation" aria-label="Navigation principale">
        <a href="/" className="logo" onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          Plaid<em>ezy</em>
        </a>
        <ul className="nav-links">
          <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo("services"); }}>Cas couverts</a></li>
          <li><a href="#comment" onClick={(e) => { e.preventDefault(); scrollTo("comment"); }}>Comment ça marche</a></li>
          <li><a href="#guides">Guides</a></li>
          <li><a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo("faq"); }}>FAQ</a></li>
        </ul>
        <div className="nav-right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="nav-btn" onClick={onOpenWizard}>Démarrer — 9€</button>
          <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div className="mobile-nav">
          <a href="#services" onClick={() => setMenuOpen(false)}>Cas couverts</a>
          <a href="#comment" onClick={() => setMenuOpen(false)}>Comment ça marche</a>
          <a href="#guides" onClick={() => setMenuOpen(false)}>Guides</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <button className="nav-btn" style={{ borderRadius: "8px" }} onClick={() => { setMenuOpen(false); onOpenWizard(); }}>Démarrer — 9€</button>
        </div>
      )}
    </>
  );
}

/* ─── HERO ─── */
function HeroSection({ onOpenWizard }: { onOpenWizard: () => void }) {
  const items = [
    { icon: "plane", name: "Vol retardé / annulé", desc: "Règlement EU261/2004", badge: "Disponible", live: true },
    { icon: "parking", name: "Amende de stationnement", desc: "Recours administratif", badge: "Disponible", live: true },
    { icon: "package", name: "Colis perdu ou endommagé", desc: "Colissimo, Mondial Relay…", badge: "Disponible", live: true },
    { icon: "home", name: "Caution non rendue", desc: "Mise en demeure", badge: "Disponible", live: true },
  ];
  const Icon = (name: string) => { const C = serviceIcons[name]; return C ? <C /> : null; };

  return (
    <section className="hero" id="main-content">
      <div className="hero-left">
        <div className="hero-eyebrow">
          <IconCoins />
          <span>9€ fixe · Zéro commission</span>
        </div>
        <h1>
          Réclamez ce qui<br />vous <span className="green">appartient.</span>
        </h1>
        <p className="hero-desc">
          Vol annulé, amende injuste, caution bloquée — Plaidezy génère votre lettre juridique en 2 minutes. Pas de commission sur vos gains.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={onOpenWizard}>Vérifier mon droit gratuitement</button>
          <button className="btn-outline" onClick={() => scrollTo("services")}>Voir les cas</button>
        </div>
        <div className="hero-trust">
          {["Vérification gratuite", "9€ fixe si éligible", "Satisfait ou remboursé"].map((t, i) => (
            <span key={i} style={{ display: "contents" }}>
              <span className="trust-item">
                <span className="trust-check"><IconCheck /></span>
                {t}
              </span>
              {i < 2 && <span className="trust-sep" />}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-card-wrap">
        <div className="hero-card">
          <div className="hero-card-header">
            <div className="hch-label">Plaidezy</div>
            <div className="hch-title">5 cas couverts</div>
            <div className="hch-sub">Vos droits, vérifiés en 2 minutes</div>
          </div>
          <div className="hero-card-body">
            {items.map((item, i) => (
              <div className="hcb-item" key={i}>
                <div className={`hcb-icon ${serviceIconClass[item.icon]}`}>
                  {Icon(item.icon)}
                </div>
                <div className="hcb-info">
                  <div className="hcb-name">{item.name}</div>
                  <div className="hcb-desc">{item.desc}</div>
                </div>
                <span className={`hcb-badge ${item.live ? "badge-live" : "badge-soon"}`}>{item.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── SERVICES ─── */
const serviceToClaim: Record<string, string> = {
  plane: "vol", parking: "parking", package: "colis", train: "train", home: "caution",
};

function ServicesSection({ onSelectService }: { onSelectService: (claimId: string) => void }) {
  const services = [
    { icon: "plane", status: "live", locked: false, statusLabel: "Disponible", title: "Vol retardé ou annulé", desc: "Plus de 3h de retard ou annulation moins de 14 jours avant le départ ? Le règlement EU261/2004 vous garantit une indemnisation.", gain: "Jusqu'à 600€ par passager" },
    { icon: "parking", status: "live", locked: false, statusLabel: "Disponible", title: "Amende de stationnement", desc: "PV injuste, zone mal signalisée, horodateur en panne ? De nombreuses amendes sont contestables.", gain: "Annulation de l'amende" },
    { icon: "package", status: "live", locked: false, statusLabel: "Disponible", title: "Colis perdu ou endommagé", desc: "Colissimo, Mondial Relay, DPD… Si votre colis est perdu ou abîmé, vous avez des droits stricts.", gain: "Remboursement intégral" },
    { icon: "train", status: "live", locked: false, statusLabel: "Disponible", title: "Retard SNCF / Eurostar", desc: "Un retard de plus de 30 minutes vous donne droit à une indemnisation G30.", gain: "25% à 75% du billet remboursé" },
    { icon: "home", status: "live", locked: false, statusLabel: "Disponible", title: "Dépôt de garantie non rendu", desc: "Votre propriétaire garde votre caution sans justification ? Il encourt des majorations financières.", gain: "Caution + majorations légales" },
  ];
  const Icon = (name: string) => { const C = serviceIcons[name]; return C ? <C /> : null; };

  return (
    <section className="services-section" id="services">
      <div className="services-header reveal">
        <div>
          <div className="section-label">Cas couverts</div>
          <h2 className="section-h2">Vos droits,<br /><span className="green">tous les cas.</span></h2>
        </div>
        <p>Des situations concrètes, des lois qui vous protègent. Plaidezy connaît les textes et génère la bonne lettre.</p>
      </div>
      <div className="services-grid">
        {services.map((s, i) => (
          <div className={`reveal reveal-delay-${Math.min(i + 1, 5)}`} key={i}>
            <div
              className={`service-card${s.locked ? " locked" : ""}`}
              onClick={() => { if (!s.locked && serviceToClaim[s.icon]) onSelectService(serviceToClaim[s.icon]); }}
              style={!s.locked ? { cursor: "pointer" } : {}}
            >
              <div className="sc-top">
                <div className={`sc-icon ${serviceIconClass[s.icon]}`}>{Icon(s.icon)}</div>
                <span className={`sc-status ${s.status === "live" ? "live" : "bientot"}`}>{s.statusLabel}</span>
              </div>
              <div className="sc-title">{s.title}</div>
              <div className="sc-desc">{s.desc}</div>
              {!s.locked && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="sc-gain">
                    <IconCoins />
                    {s.gain}
                  </span>
                  <span className="sc-cta">Vérifier <IconArrowRight /></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── VERSUS ─── */
function VersusSection() {
  const rows: { label: string; plaidezy: boolean | string; avocat: boolean | string; legaltech: boolean | string | null }[] = [
    { label: "Prix", plaidezy: "9€ fixe", avocat: "25–35% du gain", legaltech: "15–25% du gain" },
    { label: "Délai", plaidezy: "2 minutes", avocat: "3–10 jours", legaltech: "24–72h" },
    { label: "Adapté à chaque cas", plaidezy: true, avocat: true, legaltech: null },
    { label: "Sans commission", plaidezy: true, avocat: false, legaltech: false },
    { label: "Satisfait ou remboursé", plaidezy: true, avocat: false, legaltech: false },
  ];
  const renderCell = (val: boolean | string | null) => {
    if (val === true) return <span className="check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>;
    if (val === false) return <span className="cross"><IconCross /></span>;
    if (val === null) return <span style={{ color: "var(--light)", fontSize: "13px" }}>Partiel</span>;
    return <span className="val">{val}</span>;
  };
  return (
    <section className="versus-section reveal" id="comparaison">
      <div className="versus-inner">
        <div className="versus-header">
          <div>
            <div className="section-label">Comparaison</div>
            <h2 className="section-h2">Pourquoi<br /><span className="green">Plaidezy ?</span></h2>
          </div>
          <p>Les alternatives coûtent cher ou prennent du temps. Plaidezy fait les deux mieux.</p>
        </div>
        <div className="versus-table">
          <div className="vt-header">
            <div className="vth" />
            <div className="vth us">Plaidezy<span className="versus-badge">Recommandé</span></div>
            <div className="vth">Avocat</div>
            <div className="vth">LegalTech</div>
          </div>
          {rows.map((row, i) => (
            <div className="vt-row" key={i}>
              <div className="vt-cell label">{row.label}</div>
              <div className="vt-cell us-col">{renderCell(row.plaidezy)}</div>
              <div className="vt-cell">{renderCell(row.avocat)}</div>
              <div className="vt-cell">{renderCell(row.legaltech)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorksSection() {
  const steps = [
    { num: "01", icon: "search", title: "Décrivez votre situation", desc: "En quelques mots, sans jargon juridique.", badge: "Gratuit" },
    { num: "02", icon: "zap", title: "Évaluation de votre situation", desc: "On vérifie automatiquement les critères applicables à votre cas.", badge: "< 30 sec" },
    { num: "03", icon: "lock", title: "Payez si éligible", desc: "9€ uniquement si vous avez un droit à faire valoir.", badge: "9€" },
    { num: "04", icon: "send", title: "Recevez votre lettre", desc: "PDF prêt à envoyer avec les articles de loi exacts.", badge: "2 min" },
  ];
  const Icon = (name: string) => { const C = howIcons[name]; return C ? <C /> : null; };

  return (
    <section className="how-section reveal" id="comment">
      <div className="how-header">
        <div className="section-label" style={{ justifyContent: "center" }}>Le processus</div>
        <h2 className="section-h2">En <span className="green">4 étapes.</span></h2>
      </div>
      <div className="how-grid">
        {steps.map((step, i) => (
          <div className="how-card" key={i}>
            <div className="hc-num">{step.num}</div>
            <div className="hc-icon-wrap">{Icon(step.icon)}</div>
            <div className="hc-title">{step.title}</div>
            <div className="hc-desc">{step.desc}</div>
            <span className="hc-badge">{step.badge}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── LETTER PREVIEW ─── */
function LetterPreviewSection({ onOpenWizard }: { onOpenWizard: () => void }) {
  const checkItems = ["Articles de loi exacts (numéro, alinéa)", "Délai de réponse imposé à l'entreprise", "Montant précis réclamé selon votre cas", "Ton juridique professionnel", "PDF prêt à envoyer"];
  return (
    <section className="letter-section reveal" id="lettre">
      <div className="letter-inner">
        <div className="letter-left">
          <div className="section-label">La lettre</div>
          <h2 className="section-h2" style={{ marginBottom: "16px" }}>Pas un modèle.<br /><span className="green">Votre lettre.</span></h2>
          <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--muted)", marginBottom: "24px" }}>
            Chaque lettre est générée selon votre situation : la bonne loi, le bon montant, le bon délai.
          </p>
          <ul>
            {checkItems.map((text, i) => (
              <li key={i}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="letter-mockup">
          <div className="letter-header-row">
            <span className="letter-sender">Expéditeur</span>
            <span className="letter-dest">Destinataire</span>
          </div>
          <div className="letter-date">
            Pau, le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="letter-title-line">LETTRE DE RÉCLAMATION — MISE EN DEMEURE</div>
          <div className="letter-body">
            <p>Madame, Monsieur,</p>
            <p style={{ marginTop: "10px" }}>
              Je me permets de vous contacter suite à <span className="redacted">██████████████</span>. Conformément au règlement (CE) n°261/2004, article 7§1, je suis en droit de prétendre à une indemnisation de <strong>400,00 €</strong>.
            </p>
            <p style={{ marginTop: "10px" }}>
              En l'absence de réponse satisfaisante de votre part dans un délai de <strong>30 jours</strong>…
            </p>
          </div>
          <div className="letter-footer-actions">
            <button className="letter-cta-small" onClick={onOpenWizard}>Générer ma lettre — 9€</button>
            <span className="letter-badge-small">PDF prêt en 2 min</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── GUARANTEES ─── */
function GuaranteesSection() {
  const cards = [
    { icon: "refund", title: "Satisfait ou remboursé", text: "Pas satisfait ? On vous rembourse les 9€ sans question, dans les 7 jours.", featured: true },
    { icon: "scales", title: "Fondée sur les textes", text: "La lettre s’appuie sur les références utiles à votre situation. Pas un modèle générique — du personnalisé.", featured: false },
    { icon: "shield-check", title: "Zéro commission", text: "9€ fixe, quel que soit le montant récupéré. Vos 400€ restent 100% les vôtres.", featured: false },
  ];
  const Icon = (name: string) => { const C = guaranteeIcons[name]; return C ? <C /> : null; };

  return (
    <section className="testi-section" id="garanties">
      <div style={{ textAlign: "center", marginBottom: "48px" }} className="reveal">
        <div className="section-label" style={{ justifyContent: "center" }}>Nos engagements</div>
        <h2 className="section-h2">Ce qu'on vous<br /><span className="green">garantit.</span></h2>
      </div>
      <div className="guarantees-grid">
        {cards.map((card, i) => (
          <div className={`reveal reveal-delay-${i + 1}`} key={i}>
            <div className={`t-card${card.featured ? " featured-green" : ""}`} style={{ textAlign: "center", padding: "36px 24px" }}>
              <div className="t-icon-wrap">{Icon(card.icon)}</div>
              <h3>{card.title}</h3>
              <p className="t-text">{card.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQSection() {
  const faqs = [
    { q: "Est-ce que Plaidezy remplace un avocat ?", a: "Non. Plaidezy est un outil d'assistance rédactionnelle pour des cas courants et encadrés. Il ne constitue pas un conseil juridique personnalisé et ne remplace pas un avocat, notamment pour les litiges complexes." },
    { q: "Est-ce que je paie si je ne suis pas éligible ?", a: "Non. La vérification est gratuite. Vous ne payez les 9€ que si votre situation semble compatible avec une réclamation et que vous souhaitez générer la lettre." },
    { q: "Qu’est-ce que je reçois exactement ?", a: "Vous recevez une lettre personnalisée avec vos informations, le résumé des faits, les références utiles, une demande claire et un PDF prêt à envoyer. Vous pouvez aussi copier le texte pour le modifier." },
    { q: "Y a-t-il un abonnement ou une commission ?", a: "Non. Le paiement est unique : 9€ pour générer votre lettre. Plaidezy ne prend aucune commission sur les sommes que vous pourriez récupérer." },
    { q: "Que se passe-t-il si l'entreprise ne répond pas ?", a: "La lettre formalise votre démarche et fixe un délai de réponse. En cas de silence, vous pouvez ensuite contacter un médiateur, une association de consommateurs ou la juridiction compétente selon votre situation." },
    { q: "Mes données sont-elles confidentielles ?", a: "Oui. Vos informations servent à vérifier votre situation et rédiger votre lettre. Elles ne sont pas vendues. Évitez tout de même de saisir des informations inutiles ou trop sensibles." },
    { q: "Puis-je modifier la lettre ?", a: "Oui. Une fois générée, vous pouvez copier la lettre, l’ajuster si nécessaire, puis télécharger le PDF." },
    { q: "Et si je ne suis pas satisfait ?", a: "Vous pouvez nous contacter. L’objectif est simple : si la lettre générée ne répond pas correctement à votre situation, on trouve une solution ou on vous rembourse selon la garantie affichée." },
  ];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="faq-section reveal" id="faq">
      <div className="faq-inner">
        <div className="faq-header">
          <div className="section-label" style={{ justifyContent: "center" }}>FAQ</div>
          <h2 className="section-h2">Questions<br /><span className="green">fréquentes.</span></h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div className={`faq-item${open === i ? " open" : ""}`} key={i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-answer-${i}`}>
                {faq.q}
                <span className="faq-chevron"><IconChevron /></span>
              </button>
              <div className="faq-a" id={`faq-answer-${i}`} role="region">{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


type GuideArticle = {
  slug: string;
  claimId: string;
  category: string;
  icon: string;
  title: string;
  excerpt: string;
  readTime: string;
  intro: string;
  sections: { title: string; body: string[] }[];
  checklist: string[];
};

const guideArticles: GuideArticle[] = [
  {
    slug: "caution-non-rendue",
    claimId: "caution",
    category: "Logement",
    icon: "🏠",
    title: "Caution non rendue : délais, recours et lettre à envoyer",
    excerpt: "Comprendre les délais de restitution, les retenues possibles et les étapes pour réclamer votre dépôt de garantie.",
    readTime: "5 min",
    intro: "Votre propriétaire ne vous a pas rendu votre dépôt de garantie ? Voici les règles essentielles à connaître avant d’envoyer une mise en demeure.",
    sections: [
      { title: "Quel est le délai de restitution ?", body: ["En pratique, le bailleur doit restituer le dépôt de garantie dans un délai qui dépend de l’état des lieux de sortie. Si aucune dégradation n’est constatée, le délai est généralement d’un mois. Si des retenues sont justifiées, le délai peut aller jusqu’à deux mois.", "Au-delà du délai applicable, une lettre de mise en demeure permet de formaliser votre demande et de fixer une date limite de réponse."] },
      { title: "Quelles retenues sont possibles ?", body: ["Le propriétaire peut retenir des sommes uniquement si elles sont justifiées : réparations locatives, loyers impayés, charges régularisées ou dégradations constatées. Une retenue vague ou non documentée peut être contestée.", "Demandez toujours les justificatifs : devis, factures, état des lieux comparé, décompte des charges."] },
      { title: "Quelle démarche effectuer ?", body: ["Commencez par une demande écrite claire. Si elle reste sans réponse, envoyez une mise en demeure par courrier recommandé avec accusé de réception. Cette étape prouve votre démarche amiable." ] },
    ],
    checklist: ["Bail", "État des lieux d’entrée et de sortie", "Preuve de remise des clés", "RIB", "Échanges avec le bailleur"],
  },
  {
    slug: "vol-retarde-indemnisation",
    claimId: "vol",
    category: "Avion",
    icon: "✈️",
    title: "Vol retardé ou annulé : indemnisation, conditions et démarche",
    excerpt: "Retard de plus de 3h, annulation ou surbooking : voyez quand demander jusqu’à 600€.",
    readTime: "6 min",
    intro: "Les passagers aériens disposent de droits encadrés, notamment pour les vols retardés, annulés ou en cas de refus d’embarquement.",
    sections: [
      { title: "Quand peut-on réclamer ?", body: ["Une indemnisation peut être envisageable si le vol arrive avec plus de 3 heures de retard, si l’annulation intervient tardivement ou si l’embarquement est refusé pour cause de surbooking.", "L’éligibilité dépend aussi du trajet, de la compagnie, de la distance et de l’existence éventuelle de circonstances extraordinaires." ] },
      { title: "Quel montant demander ?", body: ["Le montant dépend en général de la distance du vol : 250€, 400€ ou 600€ par passager. Ce montant peut être réduit dans certains cas spécifiques.", "Il faut distinguer l’indemnisation forfaitaire du remboursement de frais ou du billet." ] },
      { title: "Comment envoyer sa demande ?", body: ["Préparez les informations du vol, la date, les aéroports, la durée du retard et vos justificatifs. Une lettre structurée permet de citer les bons éléments et de demander une réponse dans un délai clair." ] },
    ],
    checklist: ["Confirmation de réservation", "Carte d’embarquement", "Preuve du retard / annulation", "Échanges avec la compagnie", "Justificatifs de frais si nécessaires"],
  },
  {
    slug: "colis-perdu-remboursement",
    claimId: "colis",
    category: "Livraison",
    icon: "📦",
    title: "Colis perdu ou endommagé : qui doit rembourser et comment réclamer ?",
    excerpt: "Transporteur, vendeur, preuve d’achat, photos : les bons réflexes pour réclamer efficacement.",
    readTime: "5 min",
    intro: "Un colis perdu, bloqué ou arrivé abîmé peut vite devenir frustrant. La clé est de documenter rapidement la situation.",
    sections: [
      { title: "Qui contacter ?", body: ["Selon votre situation, vous pouvez contacter le transporteur, le vendeur, ou les deux. Si vous avez acheté auprès d’un professionnel, le vendeur reste souvent votre interlocuteur principal pour la bonne livraison du produit." ] },
      { title: "Quels délais respecter ?", body: ["Pour un colis endommagé, il faut agir vite : prenez des photos dès réception et signalez le problème immédiatement. Pour un colis perdu, surveillez le suivi et demandez une enquête au transporteur." ] },
      { title: "Que demander ?", body: ["Selon le cas : remboursement, nouvelle expédition, indemnisation ou prise en charge. La demande doit rappeler le numéro de suivi, la date d’envoi et la valeur du colis." ] },
    ],
    checklist: ["Numéro de suivi", "Preuve d’achat", "Photos du colis", "Capture du suivi", "Échanges avec vendeur / transporteur"],
  },
  {
    slug: "retard-sncf-g30",
    claimId: "train",
    category: "Train",
    icon: "🚆",
    title: "Retard SNCF / Eurostar : remboursement, Garantie G30 et réclamation",
    excerpt: "Comprendre les seuils de retard, les justificatifs et la demande à envoyer.",
    readTime: "4 min",
    intro: "En cas de retard important, une compensation peut être possible selon le transporteur, le billet et la durée du retard.",
    sections: [
      { title: "À partir de quel retard demander ?", body: ["La Garantie G30 prévoit généralement une compensation à partir de 30 minutes de retard pour certains trains. Le montant dépend ensuite de la durée du retard et du prix du billet." ] },
      { title: "Quelles informations réunir ?", body: ["Préparez le numéro du train, la date, les gares de départ et d’arrivée, la durée du retard et le prix du billet. Ces éléments permettent de formuler une demande précise." ] },
      { title: "Comment formuler la réclamation ?", body: ["La lettre doit rappeler le trajet, le retard constaté, le montant demandé et les justificatifs joints. Conservez une copie de votre envoi." ] },
    ],
    checklist: ["Billet ou e-billet", "Numéro de train", "Justificatif de retard", "Reçu de paiement", "Échanges avec le transporteur"],
  },
  {
    slug: "contester-amende-stationnement",
    claimId: "parking",
    category: "Stationnement",
    icon: "🅿️",
    title: "Amende de stationnement : comment contester efficacement ?",
    excerpt: "Délais, motifs possibles et preuves à fournir pour contester un forfait ou une amende.",
    readTime: "5 min",
    intro: "Une amende ou un forfait post-stationnement peut être contesté si vous avez un motif sérieux et des preuves suffisantes.",
    sections: [
      { title: "Quels motifs peuvent être utiles ?", body: ["Signalisation absente ou ambiguë, horodateur en panne, paiement déjà effectué, erreur sur le véhicule ou situation particulière documentée : le motif doit être clair et prouvé." ] },
      { title: "Quels délais respecter ?", body: ["Les délais de contestation sont stricts. Vérifiez l’avis reçu et agissez rapidement. Une contestation tardive peut être rejetée sans examen du fond." ] },
      { title: "Comment augmenter ses chances ?", body: ["Joignez des preuves : photos, ticket, capture d’application, justificatif d’abonnement ou tout document montrant l’erreur. Restez factuel et concis." ] },
    ],
    checklist: ["Avis de contravention", "Ticket ou preuve de paiement", "Photos de la signalisation", "Capture de l’application", "Tout justificatif utile"],
  },
];

function GuidesTeaserSection() {
  return (
    <section className="guides-section reveal" id="guides-preview">
      <div className="guides-inner">
        <div className="guides-header">
          <div>
            <div className="section-label">Guides pratiques</div>
            <h2 className="section-h2">Comprendre vos droits<br /><span className="green">avant d’agir.</span></h2>
          </div>
          <p>Des conseils simples pour préparer vos justificatifs, éviter les erreurs et envoyer la bonne lettre.</p>
        </div>
        <div className="guides-grid">
          {guideArticles.slice(0, 3).map((guide) => (
            <a className="guide-card" href={`#guide-${guide.slug}`} key={guide.slug}>
              <span className="guide-icon">{guide.icon}</span>
              <span className="guide-category">{guide.category} · {guide.readTime}</span>
              <h3>{guide.title}</h3>
              <p>{guide.excerpt}</p>
              <span className="guide-link">Lire le guide <IconArrowRight /></span>
            </a>
          ))}
        </div>
        <div className="guides-more-row">
          <a className="btn-outline guides-more" href="#guides">Voir tous les guides</a>
        </div>
      </div>
    </section>
  );
}

function GuidesPage({ onStartClaim }: { onStartClaim: (claimId: string) => void }) {
  return (
    <main className="guides-page" id="main-content">
      <section className="guides-hero">
        <div className="section-label" style={{ justifyContent: "center" }}>Guides & conseils</div>
        <h1>Les bons réflexes pour<br /><span className="green">faire une réclamation.</span></h1>
        <p>Délais, justificatifs, montants, erreurs à éviter : choisissez votre guide et générez ensuite une lettre adaptée à votre situation.</p>
      </section>
      <section className="guides-page-grid">
        {guideArticles.map((guide) => (
          <article className="guide-card guide-card-large" key={guide.slug}>
            <div className="guide-card-top">
              <span className="guide-icon">{guide.icon}</span>
              <span className="guide-category">{guide.category} · {guide.readTime}</span>
            </div>
            <h2>{guide.title}</h2>
            <p>{guide.excerpt}</p>
            <div className="guide-actions">
              <a className="guide-link" href={`#guide-${guide.slug}`}>Lire le guide <IconArrowRight /></a>
              <button className="guide-mini-cta" onClick={() => onStartClaim(guide.claimId)}>Créer ma lettre</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function GuideArticlePage({ guide, onStart }: { guide: GuideArticle; onStart: () => void }) {
  return (
    <main className="guide-article-page" id="main-content">
      <a className="guide-back" href="#guides">← Tous les guides</a>
      <article className="guide-article">
        <header className="guide-article-header">
          <span className="guide-icon big">{guide.icon}</span>
          <span className="guide-category">{guide.category} · {guide.readTime}</span>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
          <button className="btn-primary" onClick={onStart}>Générer ma lettre adaptée</button>
        </header>

        <div className="guide-article-content">
          {guide.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}

          <aside className="guide-checklist">
            <h2>Justificatifs à préparer</h2>
            <div>
              {guide.checklist.map((item) => (
                <span key={item}><IconCheck /> {item}</span>
              ))}
            </div>
          </aside>

          <section className="guide-final-cta">
            <h2>Votre situation correspond ?</h2>
            <p>Plaidezy génère une lettre personnalisée prête à envoyer, avec vos informations et les éléments utiles à votre cas.</p>
            <button className="btn-primary" onClick={onStart}>Créer ma lettre — 9€</button>
          </section>
        </div>
      </article>
    </main>
  );
}

/* ─── EMAIL SECTION ─── */
function EmailSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSubmitting(true); setError(false);
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error("fail");
      setSubmitted(true);
    } catch { setError(true); } finally { setSubmitting(false); }
  };
  return (
    <section className="email-section reveal">
      <div className="email-inner">
        <div className="section-label" style={{ justifyContent: "center" }}>Restez informé</div>
        <h2 className="section-h2" style={{ marginBottom: "8px" }}>Nouveaux cas<br /><span className="green">bientôt.</span></h2>
        <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: "1.65" }}>
          Abonnement piège, frais bancaires abusifs… Soyez notifié dès qu'un nouveau cas est disponible.
        </p>
        {!submitted ? (
          <form className="email-form" onSubmit={handleSubmit}>
            <input className="email-input" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} autoComplete="email" />
            <button className="email-btn" type="submit" disabled={submitting}>{submitting ? "…" : "S'inscrire"}</button>
          </form>
        ) : (
          <div className="email-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Vous serez notifié des nouveaux cas !
          </div>
        )}
        {error && <p style={{ color: "var(--accent)", fontSize: "13px", marginTop: "8px" }}>Erreur — réessayez dans un instant.</p>}
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection({ onStart }: { onStart: () => void }) {
  return (
    <section className="cta-wrap reveal">
      <div className="cta-block">
        <div className="cta-left">
          <h2>Une entreprise vous<br />doit de l'argent ?</h2>
          <p>Vérification gratuite. 9€ uniquement si vous êtes éligible.</p>
        </div>
        <div className="cta-right">
          <button className="btn-cta" onClick={onStart}>Vérifier mon droit — gratuit</button>
          <span className="cta-micro">9€ fixe · Zéro commission · Remboursé 7j</span>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ─── */
function FooterSection() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-logo">Plaid<em>ezy</em></div>
        <div className="footer-divider" />
        <ul className="footer-links">
          <li><a href="#guides">Guides</a></li>
          <li><a href="#a-propos">À propos</a></li>
          <li><a href="#mentions-legales">Mentions légales</a></li>
          <li><a href="#cgv">CGV</a></li>
          <li><a href="#confidentialite">Confidentialité</a></li>
          <li><a href="mailto:contact@plaidezy.com">Contact</a></li>
        </ul>
        <div className="footer-badges">
          <span className="footer-badge">
            <IconShieldCheck /> Données chiffrées
          </span>
          <span className="footer-badge">
            <IconScales /> Conforme RGPD
          </span>
        </div>
        <p className="footer-legal">
          Plaidezy est un outil d'assistance rédactionnelle. Il ne constitue pas un service juridique et ne remplace pas un avocat.
          © {new Date().getFullYear()} Plaidezy. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

/* ─── MOBILE STICKY ─── */
function MobileSticky({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 260);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <div className={`mobile-sticky${visible ? " visible" : ""}`} aria-hidden={!visible}>
      <button onClick={onStart}>Vérifier mon droit gratuitement</button>
    </div>
  );
}

/* ─── MAIN APP ─── */
function AppInner() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfig | null>(null);
  const [claimAnswers, setClaimAnswers] = useState<Record<string, string>>({});
  const [claimAmount, setClaimAmount] = useState("");
  const [preselectedClaimId, setPreselectedClaimId] = useState<string | null>(null);

  const openWizard = useCallback(() => { trackEvent("wizard_open"); setPreselectedClaimId(null); setWizardOpen(true); }, []);
  const openWizardWithClaim = useCallback((claimId: string) => { trackEvent("wizard_open", { claimId }); setPreselectedClaimId(claimId); setWizardOpen(true); }, []);
  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const handleEligible = useCallback((claim: ClaimConfig, answers: Record<string, string>) => {
    trackEvent("eligibility_success", { claimId: claim.id });
    setSelectedClaim(claim);
    const amount = claim.calculateAmount(answers);
    setClaimAmount(amount);
    const answersWithAmount = { ...answers, _calculatedAmount: amount };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ claimId: claim.id, answers: answersWithAmount, amount, step: "payment" })); } catch { /* noop */ }
    setClaimAnswers(answersWithAmount);
    setPaymentOpen(true);
  }, []);

  const handlePaid = useCallback(() => {
    trackEvent("payment_or_promo_validated", { claimId: selectedClaim?.id });
    setPaymentOpen(false);
    setBuilderOpen(true);
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, claimId: selectedClaim?.id, answers: claimAnswers, amount: claimAmount, step: "builder" }));
    } catch { /* noop */ }
  }, [selectedClaim, claimAnswers, claimAmount]);

  const closePayment = useCallback(() => { setPaymentOpen(false); try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ } }, []);
  const closeBuilder = useCallback(() => { setBuilderOpen(false); try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ } }, []);

  const editAnswers = useCallback(() => {
    if (!selectedClaim) return;
    trackEvent("edit_answers", { claimId: selectedClaim.id });
    setPaymentOpen(false);
    setBuilderOpen(false);
    setSuccessOpen(false);
    setPreselectedClaimId(selectedClaim.id);
    setWizardOpen(true);
  }, [selectedClaim]);

  const paymentReturn = usePaymentReturn();

  useEffect(() => {
    if (paymentReturn.verified && paymentReturn.claim) {
      setSelectedClaim(paymentReturn.claim);
      setClaimAnswers(paymentReturn.answers);
      setClaimAmount(paymentReturn.amount);
      setSuccessOpen(true);
    }
  }, [paymentReturn.verified, paymentReturn.claim, paymentReturn.answers, paymentReturn.amount]);

  useEffect(() => {
    document.body.style.overflow = wizardOpen || paymentOpen || builderOpen || successOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [wizardOpen, paymentOpen, builderOpen, successOpen]);

  useEffect(() => {
    const revealAll = () => {
      document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add("visible");
      });
    };
    const observer = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }); }, { threshold: 0.05 });
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    revealAll();
    window.addEventListener("scroll", revealAll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", revealAll); };
  }, []);

  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (hash === "#a-propos") return <APropos />;
  if (hash === "#mentions-legales") return <MentionsLegales />;
  if (hash === "#cgv") return <CGV />;
  if (hash === "#confidentialite") return <Confidentialite />;

  const activeGuide = guideArticles.find((guide) => hash === `#guide-${guide.slug}`) || null;
  const isGuidesRoute = hash === "#guides";

  return (
    <>
      <Navigation onOpenWizard={openWizard} />

      {activeGuide ? (
        <GuideArticlePage guide={activeGuide} onStart={() => openWizardWithClaim(activeGuide.claimId)} />
      ) : isGuidesRoute ? (
        <GuidesPage onStartClaim={openWizardWithClaim} />
      ) : (
        <>
          <HeroSection onOpenWizard={openWizard} />
          <div className="section-divider" />
          <ServicesSection onSelectService={openWizardWithClaim} />
          <VersusSection />
          <HowItWorksSection />
          <LetterPreviewSection onOpenWizard={openWizard} />
          <GuaranteesSection />
          <GuidesTeaserSection />
          <FAQSection />
          <EmailSection />
          <CTASection onStart={openWizard} />
        </>
      )}

      <FooterSection />
      <MobileSticky onStart={openWizard} />

      {paymentReturn.verifying && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: "center", padding: "48px 32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Vérification du paiement…</h2>
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>Merci de patienter.</p>
          </div>
        </div>
      )}

      {successOpen && !builderOpen && (
        <PaymentSuccess onContinue={() => { setSuccessOpen(false); setBuilderOpen(true); }} />
      )}

      {paymentReturn.error && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: "center", padding: "48px 32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>Paiement non vérifié</h2>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>{paymentReturn.error}</p>
            <button className="btn-primary" style={{ margin: "0 auto" }} onClick={() => window.location.replace("/")}>Fermer</button>
          </div>
        </div>
      )}

      {wizardOpen && <WizardModal onClose={closeWizard} onEligible={handleEligible} preselectedClaimId={preselectedClaimId} initialAnswers={claimAnswers} />}
      {paymentOpen && selectedClaim && <PaymentGate claim={selectedClaim} answers={claimAnswers} amount={claimAmount} onPaid={handlePaid} onClose={closePayment} onEdit={editAnswers} />}
      {builderOpen && selectedClaim && <LetterBuilder claim={selectedClaim} answers={claimAnswers} amount={claimAmount} onClose={closeBuilder} onEdit={editAnswers} />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

import { useState, useEffect, useCallback } from "react";
import WizardModal from "./components/WizardModal";
import PaymentGate from "./components/PaymentGate";
import LetterBuilder from "./components/LetterBuilder";
import ErrorBoundary from "./components/ErrorBoundary";
import { MentionsLegales, CGV, Confidentialite } from "./components/LegalPages";
import { claimTypes, type ClaimConfig } from "./lib/claims";

const STORAGE_KEY = "plaidezy_session";

/* ───────── helpers ───────── */

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

function GlassShine() { return <div className="glass-shine" />; }

function Orb({ color, size, top, left, right, bottom, opacity }: {
  color: string; size: number; top?: string; left?: string; right?: string; bottom?: string; opacity?: number;
}) {
  return <div className="ambient-orb" style={{ background: color, width: size, height: size, top, left, right, bottom, opacity: opacity ?? 0.35 }} />;
}

function SvgDefs() {
  return (
    <svg style={{ display: "none" }} xmlns="http://www.w3.org/2000/svg">
      <symbol id="icon-plane" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></symbol>
      <symbol id="icon-parking" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></symbol>
      <symbol id="icon-package" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-9 4.5v9L12 21l9-4.5v-9L12 3z" /><path d="M12 12 3 7.5" /><path d="m12 12 9-4.5" /><path d="M12 12v9" /><path d="m7.5 9.75 9-4.5" /></symbol>
      <symbol id="icon-train" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="14" rx="4" /><path d="M4 11h16" /><path d="M12 3v8" /><circle cx="8.5" cy="17.5" r="1.5" /><circle cx="15.5" cy="17.5" r="1.5" /><path d="m6 21 2-3.5" /><path d="m18 21-2-3.5" /></symbol>
      <symbol id="icon-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></symbol>
      <symbol id="icon-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></symbol>
      <symbol id="icon-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></symbol>
      <symbol id="icon-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></symbol>
      <symbol id="icon-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></symbol>
      <symbol id="icon-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></symbol>
      <symbol id="icon-refund" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></symbol>
      <symbol id="icon-scales" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M16 6l4 8H12l4-8z" /><path d="M8 6L4 14h8L8 6z" /><circle cx="12" cy="3" r="1.5" fill="currentColor" /><path d="M5 21h14" /></symbol>
      <symbol id="icon-shield-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></symbol>
      <symbol id="icon-chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></symbol>
    </svg>
  );
}

/* ───────── Navigation ───────── */

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
      <nav className={`nav-bar liquid-glass-nav${scrolled ? " scrolled" : ""}`}>
        <GlassShine />
        <div className="logo" style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Plaide<em>zy</em></div>
        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#comment">Comment ça marche</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="nav-right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="nav-btn" onClick={onOpenWizard}>Démarrer — 9€</button>
          <button type="button" className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}><span /><span /><span /></button>
        </div>
      </nav>
      {menuOpen && (
        <div className="mobile-nav liquid-glass-card">
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#comment" onClick={() => setMenuOpen(false)}>Comment ça marche</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <button type="button" className="nav-btn" style={{ width: "100%", marginTop: 8 }} onClick={() => { setMenuOpen(false); onOpenWizard(); }}>Démarrer — 9€</button>
        </div>
      )}
    </>
  );
}

/* ───────── Hero ───────── */

function HeroSection({ onOpenWizard }: { onOpenWizard: () => void }) {
  const items = [
    { icon: "plane", name: "Vol retardé / annulé", desc: "Règlement EU261/2004", badge: "Disponible", live: true },
    { icon: "parking", name: "Amende de stationnement", desc: "Recours administratif", badge: "Disponible", live: true },
    { icon: "package", name: "Colis perdu ou endommagé", desc: "Colissimo, Mondial Relay…", badge: "Disponible", live: true },
    { icon: "home", name: "Caution non rendue", desc: "Mise en demeure propriétaire", badge: "Disponible", live: true },
    { icon: "card", name: "Abonnement piège", desc: "Résiliation forcée", badge: "Bientôt", live: false },
  ];
  return (
    <section className="hero" id="main-content" style={{ position: "relative" }}>
      <div className="hero-left">
        <div className="hero-eyebrow liquid-glass-green price-pill">
          <GlassShine />
          <div className="eyebrow-dot" style={{ position: "relative", zIndex: 2 }} />
          <span style={{ position: "relative", zIndex: 2, fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.3 }}>Votre avocat IA</span>
          <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)", display: "inline-block" }} />
          <span className="price-old">25–35%</span>
          <span className="price-arrow">→</span>
          <span className="price-new">9€ fixe</span>
        </div>
        <h1>Réclamez ce qui<br />vous <span className="serif">appartient.</span></h1>
        <p className="hero-desc">Vol annulé, amende injuste, caution bloquée — Plaidezy génère votre lettre juridique en 2 minutes. 9€ fixe. Zéro commission.</p>
        <div className="hero-actions">
          <button type="button" className="btn-primary" onClick={onOpenWizard}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            Vérifier mon droit gratuitement
          </button>
          <button type="button" className="btn-outline" onClick={() => scrollTo("services")}>Voir les cas</button>
        </div>
        <div className="hero-trust">
          {["Vérification gratuite", "9€ fixe · zéro commission", "Satisfait ou remboursé"].map((t, i) => (
            <div className="trust-item" key={i}>
              <div className="trust-check"><svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <span>{t}</span>
              {i < 2 && <div className="trust-sep" />}
            </div>
          ))}
        </div>
      </div>
      <div className="hero-card-wrap">
        <div className="hero-card liquid-glass-card">
          <div className="hero-card-header">
            <div className="hch-label">Plaidezy · Mes réclamations</div>
            <div className="hch-title">Tableau de bord</div>
            <div className="hch-sub">Vos droits, en un coup d'œil</div>
          </div>
          <div className="hero-card-body">
            {items.map((item, i) => (
              <div className="hcb-item" key={i}>
                <div className={`hcb-icon ${item.live ? "green" : "gray"}`}>
                  <svg width="18" height="18" stroke={item.live ? "var(--green)" : "var(--muted)"} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><use href={`#icon-${item.icon}`} /></svg>
                </div>
                <div className="hcb-info"><div className="hcb-name">{item.name}</div><div className="hcb-desc">{item.desc}</div></div>
                <div className={`hcb-badge ${item.live ? "badge-live" : "badge-soon"}`}>{item.badge}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="scroll-indicator" onClick={() => scrollTo("services")} role="button" aria-label="Défiler vers les services"><span>Découvrir</span><div className="scroll-dot" /></div>
    </section>
  );
}

/* ───────── Services ───────── */

const serviceToClaim: Record<string, string> = {
  plane: "vol",
  parking: "parking",
  package: "colis",
  train: "train",
  home: "caution",
};

function ServicesSection({ onSelectService }: { onSelectService: (claimId: string) => void }) {
  const services = [
    { icon: "plane", color: "green", status: "live", locked: false, statusLabel: "Disponible", title: "Vol retardé ou annulé", desc: "Plus de 3h de retard ou annulation moins de 14 jours avant le départ ? Le règlement EU261/2004 vous garantit une indemnisation. Les compagnies comptent sur votre ignorance.", gain: "Jusqu'à 600€ par passager" },
    { icon: "parking", color: "green", status: "live", locked: false, statusLabel: "Disponible", title: "Amende de stationnement", desc: "PV injuste, zone mal signalisée, horodateur en panne ? De nombreuses amendes sont contestables. Plaidezy génère votre lettre de recours avec les arguments qui fonctionnent.", gain: "Annulation de l'amende" },
    { icon: "package", color: "green", status: "live", locked: false, statusLabel: "Disponible", title: "Colis perdu ou endommagé", desc: "Colissimo, Mondial Relay, DPD… Si votre colis est perdu ou abîmé, vous avez des droits stricts. Attention : le délai légal peut être aussi court que 3 jours.", gain: "Remboursement intégral" },
    { icon: "train", color: "green", status: "live", locked: false, statusLabel: "Disponible", title: "Retard SNCF / Eurostar", desc: "Un retard de plus de 30 minutes vous donne droit à une indemnisation G30. La SNCF ne vous le dira pas spontanément. Plaidezy rédige la demande avec les bons articles.", gain: "25% à 75% du billet remboursé" },
    { icon: "home", color: "green", status: "live", locked: false, statusLabel: "Disponible", title: "Dépôt de garantie non rendu", desc: "Votre propriétaire garde votre caution sans justification ? Il encourt des majorations financières. Plaidezy rédige la mise en demeure avec les articles exacts.", gain: "Caution + majorations légales" },
    { icon: "card", color: "orange", status: "bientot", locked: true, statusLabel: "Bientôt", title: "Abonnement piège", desc: "Salle de sport, streaming, appli… Un abonnement impossible à résilier ou des prélèvements après résiliation ? Plaidezy génère la mise en demeure qui bloque tout.", gain: "Remboursement des prélèvements" },
  ];
  return (
    <section className="services-section" id="services">
      <Orb color="#52B788" size={400} top="0" right="-100px" opacity={0.06} />
      <div className="services-header reveal">
        <div><div className="section-label">Ce qu'on gère</div><div className="section-h2">Vos droits,<br /><em>tous les cas.</em></div></div>
        <p>Des situations concrètes, des lois qui s'appliquent à vous. Plaidezy connaît les textes et génère la bonne lettre pour chaque cas.</p>
      </div>
      <div className="services-grid">
        {services.map((s, i) => (
          <div
            key={i}
            className={`service-card ${s.locked ? "locked" : "liquid-glass-card"} reveal reveal-delay-${(i % 3) + 1}`}
            onClick={() => { if (!s.locked && serviceToClaim[s.icon]) onSelectService(serviceToClaim[s.icon]); }}
            style={!s.locked ? { cursor: "pointer" } : {}}
          >
            {!s.locked && <GlassShine />}
            <div className="sc-top">
              <div className={`sc-icon ${s.color}`}><svg stroke={s.color === "green" ? "var(--green)" : "var(--accent)"} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><use href={`#icon-${s.icon}`} /></svg></div>
              <div className={`sc-status ${s.status}`}>{s.statusLabel}</div>
            </div>
            <div className="sc-title">{s.title}</div>
            <div className="sc-desc">{s.desc}</div>
            {!s.locked && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="sc-gain"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="var(--green)"><polyline points="20 6 9 17 4 12" /></svg>{s.gain}</div>
                <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
                  Vérifier <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Versus ───────── */

function VersusSection() {
  const rows: { label: string; plaidezy: boolean | string; avocat: boolean | string; legaltech: boolean | string | null }[] = [
    { label: "Prix", plaidezy: "9€ fixe", avocat: "25–35% du gain", legaltech: "15–25% du gain" },
    { label: "Délai de génération", plaidezy: "2 minutes", avocat: "3–10 jours", legaltech: "24–72h" },
    { label: "Connaissance juridique", plaidezy: true, avocat: true, legaltech: null },
    { label: "Adapté à chaque cas", plaidezy: true, avocat: true, legaltech: null },
    { label: "Sans commission", plaidezy: true, avocat: false, legaltech: false },
    { label: "Satisfait ou remboursé", plaidezy: true, avocat: false, legaltech: false },
  ];
  const renderCell = (val: boolean | string | null) => {
    if (val === true) return <svg className="check" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="var(--green)"><polyline points="20 6 9 17 4 12" /></svg>;
    if (val === false) return <svg className="cross" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="var(--light)"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    if (val === null) return <span style={{ color: "var(--light)", fontSize: 13 }}>Partiel</span>;
    return <span className="val">{val}</span>;
  };
  return (
    <section className="versus-section" id="versus">
      <div className="versus-inner">
        <div className="versus-header reveal">
          <div><div className="section-label">Comparaison</div><div className="section-h2">Pourquoi<br /><em>Plaidezy ?</em></div></div>
          <p>Les alternatives coûtent cher ou prennent du temps. Plaidezy fait les deux mieux.</p>
        </div>
        <div className="versus-table liquid-glass-card reveal">
          <GlassShine />
          <div className="vt-header">
            <div className="vth" />
            <div className="vth us">✦ Plaidezy<span className="versus-badge">Meilleur choix</span></div>
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

/* ───────── How It Works ───────── */

function HowItWorksSection() {
  const steps = [
    { num: "01", icon: "search", title: "Décrivez votre situation", desc: "Dites-nous ce qui s'est passé en quelques mots. Aucun jargon requis.", badge: "Gratuit" },
    { num: "02", icon: "zap", title: "On analyse vos droits", desc: "Notre IA identifie les lois applicables à votre cas spécifique.", badge: "< 30 secondes" },
    { num: "03", icon: "lock", title: "Payez si vous êtes éligible", desc: "9€ fixe uniquement si vous avez un droit à faire valoir. Sinon, c'est gratuit.", badge: "9€ si éligible" },
    { num: "04", icon: "send", title: "Envoyez la lettre", desc: "PDF prêt à envoyer, avec les articles de loi exacts et le bon ton juridique.", badge: "PDF en 2 min" },
  ];
  return (
    <section className="how-section" id="comment">
      <Orb color="#52B788" size={350} top="-50px" left="50%" opacity={0.05} />
      <div className="how-header reveal">
        <div className="section-label" style={{ justifyContent: "center" }}>Le processus</div>
        <div className="section-h2">Simple comme<br /><em>bonjour.</em></div>
      </div>
      <div className="how-grid">
        {steps.map((step, i) => (
          <div key={i} className={`how-card liquid-glass-card reveal reveal-delay-${i + 1}`}>
            <GlassShine />
            <div className="hc-num">ÉTAPE {step.num}</div>
            <div className="hc-icon-wrap"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href={`#icon-${step.icon}`} /></svg></div>
            <div className="hc-title">{step.title}</div>
            <div className="hc-desc">{step.desc}</div>
            <div className="hc-badge">{step.badge}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Letter Preview ───────── */

function LetterPreviewSection({ onOpenWizard }: { onOpenWizard: () => void }) {
  const checkItems = ["Articles de loi exacts (numéro, alinéa)", "Délai de réponse imposé à l'entreprise", "Montant précis réclamé selon votre cas", "Ton juridique qui force la prise au sérieux", "PDF professionnel prêt à envoyer"];
  return (
    <section className="letter-section" id="lettre">
      <Orb color="#52B788" size={400} top="50%" left="-100px" opacity={0.06} />
      <div className="letter-inner">
        <div className="letter-left reveal">
          <div className="section-label">La lettre</div>
          <div className="section-h2" style={{ marginBottom: 28 }}>Pas un modèle.<br /><em>Votre lettre.</em></div>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--muted)", marginBottom: 32 }}>Chaque lettre est générée selon votre situation précise : la bonne loi, le bon montant, le bon délai. Pas un copier-coller générique.</p>
          <ul>
            {checkItems.map((text, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green-light)", border: "1px solid rgba(82,183,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" stroke="var(--green)" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink2)" }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal" style={{ position: "relative" }}>
          <div className="liquid-glass-card" style={{ borderRadius: 18, padding: 36, position: "relative", overflow: "hidden" }}>
            <GlassShine />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28, alignItems: "flex-start", position: "relative", zIndex: 2 }}>
              <div><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>Expéditeur</div><div style={{ width: 120, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 90, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 110, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} /></div>
              <div style={{ textAlign: "right" as const }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>Destinataire</div><div style={{ width: 130, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 6, marginLeft: "auto" }} /><div style={{ width: 100, height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginLeft: "auto" }} /></div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20, position: "relative", zIndex: 2 }}>Pau, le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 16, letterSpacing: -0.2, position: "relative", zIndex: 2 }}>LETTRE DE RÉCLAMATION — MISE EN DEMEURE</div>
            <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--ink2)", marginBottom: 16, position: "relative", zIndex: 2 }}>
              Madame, Monsieur,<br /><br />Je me permets de vous contacter suite à <span style={{ background: "rgba(82,183,136,0.15)", padding: "0 3px", borderRadius: 3, fontWeight: 600 }}>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</span>. Conformément au <span style={{ color: "var(--green)", fontWeight: 700 }}>règlement (CE) n°261/2004</span>, article <span style={{ color: "var(--green)", fontWeight: 700 }}>7§1</span>, je suis en droit de prétendre à une indemnisation de <span style={{ color: "var(--accent)", fontWeight: 800 }}>400,00 €</span>.
            </div>
            <div style={{ position: "relative", marginTop: 8, zIndex: 2 }}>
              <div style={{ fontSize: 12, lineHeight: 1.8, color: "var(--ink2)", filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}>En l'absence de réponse satisfaisante de votre part dans un délai de 30 jours…</div>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 0%, var(--bg2) 60%)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 16 }}>
                <button type="button" onClick={onOpenWizard} className="liquid-glass-pill" style={{ border: "none", padding: "10px 22px", borderRadius: 99, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Générer ma lettre — 9€
                </button>
              </div>
            </div>
          </div>
          <div className="liquid-glass-green" style={{ position: "absolute", top: -12, right: 20, padding: "6px 14px", borderRadius: 99, fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: "var(--green)", overflow: "hidden" }}><GlassShine /><span style={{ position: "relative", zIndex: 2 }}>PDF prêt en 2 min</span></div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Guarantees ───────── */

function GuaranteesSection() {
  const cards = [
    { icon: "refund", title: "Satisfait ou remboursé", text: "Si vous n'êtes pas satisfait de votre lettre, on vous rembourse les 9€ — sans question, dans les 7 jours.", featured: true },
    { icon: "scales", title: "Juridiquement solide", text: "Chaque lettre cite les articles de loi exacts applicables à votre cas. Pas un modèle générique — une lettre sur-mesure.", featured: false },
    { icon: "shield-check", title: "Zéro commission", text: "9€ fixe, quel que soit le montant récupéré. Vos 400€ restent à 100% les vôtres. Pas de mauvaise surprise.", featured: false },
  ];
  return (
    <section className="testi-section" id="garanties">
      <Orb color="#52B788" size={400} top="-80px" right="5%" opacity={0.06} />
      <div style={{ textAlign: "center", marginBottom: 48 }} className="reveal"><div className="section-label" style={{ justifyContent: "center" }}>Nos engagements</div><div className="section-h2">Ce qu'on vous<br /><em>garantit vraiment.</em></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
        {cards.map((card, i) => (
          <div className={`t-card ${card.featured ? "featured-green" : "liquid-glass-card"} reveal${i > 0 ? ` reveal-delay-${i}` : ""}`} key={i} style={{ textAlign: "center", padding: "40px 28px" }}>
            <GlassShine />
            <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", position: "relative", zIndex: 2, background: card.featured ? "rgba(82,183,136,0.15)" : "var(--green-light)", border: `1px solid ${card.featured ? "rgba(82,183,136,0.2)" : "rgba(82,183,136,0.12)"}` }}>
              <svg width="26" height="26" stroke={card.featured ? "var(--green-mid)" : "var(--green)"} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><use href={`#icon-${card.icon}`} /></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: -0.3, position: "relative", zIndex: 2 }}>{card.title}</div>
            <div className="t-text" style={{ fontSize: 14, position: "relative", zIndex: 2 }}>{card.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── FAQ ───────── */

function FAQSection() {
  const faqs = [
    { q: "Est-ce que Plaidezy remplace un avocat ?", a: "Non. Plaidezy est un outil d'assistance rédactionnelle qui génère des lettres juridiques pour des cas clairs et bien encadrés par la loi. Pour des litiges complexes ou judiciaires, consultez un avocat. Mais pour 80% des réclamations courantes, une lettre bien rédigée suffit." },
    { q: "Que se passe-t-il si l'entreprise ne répond pas ?", a: "Votre lettre est une mise en demeure avec délai de réponse imposé (généralement 30 jours). En cas de silence, vous pouvez saisir le médiateur sectoriel ou la juridiction compétente — votre lettre Plaidezy constitue une preuve de démarche amiable, obligatoire avant toute action." },
    { q: "Pourquoi 9€ et pas gratuit ?", a: "La vérification est gratuite. Les 9€ couvrent la génération de votre lettre personnalisée avec les articles de loi exacts. C'est le prix d'un café, contre 25–35% du gain chez un concurrent ou plusieurs centaines d'euros chez un avocat." },
    { q: "Mes données sont-elles confidentielles ?", a: "Oui. Vos informations sont utilisées uniquement pour générer votre lettre. Elles ne sont jamais vendues, partagées avec des tiers ou utilisées à des fins publicitaires." },
    { q: "Ça marche vraiment ?", a: "Les droits que Plaidezy couvre sont encadrés par des textes de loi européens ou français contraignants (EU261/2004, Code civil, Code des transports…). Une lettre bien rédigée qui cite les bons articles oblige légalement l'entreprise à répondre — ce que la plupart des gens ne font pas." },
  ];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="faq-section" id="faq">
      <Orb color="#52B788" size={300} top="50%" right="-50px" opacity={0.05} />
      <div className="faq-inner">
        <div className="faq-header reveal"><div className="section-label" style={{ justifyContent: "center" }}>Questions fréquentes</div><div className="section-h2">Vous avez<br /><em>des questions ?</em></div></div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${open === i ? "open" : ""}`}>
              <button type="button" className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-answer-${i}`}><span>{faq.q}</span><div className="faq-chevron"><svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><use href="#icon-chevron-down" /></svg></div></button>
              <div className="faq-a" id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Email ───────── */

function EmailSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("fail");
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="email-section" id="newsletter">
      <div className="email-inner reveal">
        <div className="section-label" style={{ justifyContent: "center" }}>Restez informé</div>
        <div className="section-h2" style={{ textAlign: "center", marginBottom: 8 }}>De nouveaux cas<br /><em>arrivent bientôt.</em></div>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>Abonnement piège, frais bancaires abusifs, assurance refuse de payer… Inscrivez-vous pour être notifié dès qu'un nouveau cas de réclamation est disponible.</p>
        {!submitted ? (
          <form className="email-form" onSubmit={handleSubmit}><input id="newsletter-email" name="email" type="email" className="email-input" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} autoComplete="email" inputMode="email" /><button type="submit" className="email-btn" disabled={submitting}>{submitting ? "…" : "M'inscrire"}</button></form>
        ) : (
          <div className="email-success"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Vous serez notifié des nouveaux cas !</div>
        )}
        {error && <p style={{ color: "var(--accent)", fontSize: 13, marginTop: 10 }}>Erreur — réessayez dans un instant.</p>}
      </div>
    </section>
  );
}

/* ───────── CTA ───────── */

function CTASection({ onStart }: { onStart: () => void }) {
  return (
    <div className="cta-wrap" id="cta">
      <div className="cta-block liquid-glass-cta reveal">
        <Orb color="#52B788" size={350} top="-100px" right="-80px" opacity={0.12} /><Orb color="#E76F51" size={250} bottom="-80px" left="-60px" opacity={0.08} /><GlassShine />
        <div className="cta-left">
          <h2>Une entreprise vous<br />doit de l'argent ?<br /><em>Réclamez maintenant.</em></h2>
          <p>Vérification gratuite. Payez 9€ uniquement si vous êtes éligible et que vous lancez votre réclamation.</p>
        </div>
        <div className="cta-right">
          <button type="button" className="btn-cta" onClick={onStart}>Vérifier mon droit gratuitement</button>
          <div className="cta-micro">9€ fixe · Zéro commission · Satisfait ou remboursé 7j</div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Footer ───────── */

function FooterSection() {
  return (
    <footer>
      <Orb color="#52B788" size={300} top="-100px" left="30%" opacity={0.04} />
      <div className="footer-inner">
        <div className="footer-logo" style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Plaide<em>zy</em></div>
        <div className="footer-badges">
          <span className="footer-badge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>Données hébergées en France</span>
          <span className="footer-badge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>RGPD conforme</span>
          <span className="footer-badge"><svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Paiement sécurisé</span>
        </div>
        <div className="footer-socials">
          <a href="#" className="footer-social-link" aria-label="Twitter / X"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
          <a href="#" className="footer-social-link" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
          <a href="#" className="footer-social-link" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>
        </div>
        <div className="footer-divider" />
        <ul className="footer-links">
          <li><a href="#mentions-legales">Mentions légales</a></li><li><a href="#cgv">CGV</a></li><li><a href="#confidentialite">Confidentialité</a></li><li><a href="mailto:contact@plaidezy.com">Contact</a></li>
        </ul>
        <div className="footer-divider" />
        <p className="footer-legal">© {new Date().getFullYear()} Plaidezy · Plaidezy est un outil d'assistance rédactionnelle et ne constitue pas un conseil juridique au sens de la loi du 31 décembre 1971. En cas de litige complexe, consultez un professionnel du droit.</p>
      </div>
    </footer>
  );
}

/* ───────── Mobile Sticky ───────── */

function MobileSticky({ onStart }: { onStart: () => void }) {
  return (
    <div className="mobile-sticky liquid-glass-nav">
      <GlassShine />
      <button type="button" onClick={onStart}>Vérifier mon droit gratuitement</button>
    </div>
  );
}

/* ───────── App ───────── */

function AppInner() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfig | null>(null);
  const [claimAnswers, setClaimAnswers] = useState<Record<string, string>>({});
  const [claimAmount, setClaimAmount] = useState("");

  const [preselectedClaimId, setPreselectedClaimId] = useState<string | null>(null);
  const openWizard = useCallback(() => { setPreselectedClaimId(null); setWizardOpen(true); }, []);

  const openWizardWithClaim = useCallback((claimId: string) => {
    setPreselectedClaimId(claimId);
    setWizardOpen(true);
  }, []);
  const closeWizard = useCallback(() => setWizardOpen(false), []);

  const handleEligible = useCallback((claim: ClaimConfig, answers: Record<string, string>) => {
    setSelectedClaim(claim);
    setClaimAnswers(answers);
    const amount = claim.calculateAmount(answers);
    setClaimAmount(amount);

    // Injecte le montant calculé dans les answers pour que generateLetter puisse l'utiliser
    const answersWithAmount = { ...answers, _calculatedAmount: amount };

    // Sauvegarde la session avant d'ouvrir le paiement
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        claimId: claim.id,
        answers: answersWithAmount,
        amount,
        step: "payment",
      }));
    } catch { /* noop */ }

    setClaimAnswers(answersWithAmount);
    setPaymentOpen(true);
  }, []);

  const handlePaid = useCallback(() => {
    setPaymentOpen(false);
    setBuilderOpen(true);
    // Marque la session comme payée
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        claimId: selectedClaim?.id,
        answers: claimAnswers,
        amount: claimAmount,
        step: "builder",
      }));
    } catch { /* noop */ }
  }, [selectedClaim, claimAnswers, claimAmount]);

  const closePayment = useCallback(() => {
    setPaymentOpen(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);
  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Détecte le retour après paiement SumUp
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentSuccessParam = params.get("payment_success");

    if (paymentSuccessParam) {
      window.history.replaceState({}, "/", "/");

      // Restaure la session
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const session = JSON.parse(saved);
          const claim = claimTypes.find((c: ClaimConfig) => c.id === session.claimId);
          if (claim && session.answers) {
            setSelectedClaim(claim);
            setClaimAnswers(session.answers);
            setClaimAmount(session.amount || claim.calculateAmount(session.answers));

            // Vérifie le paiement côté serveur
            setPaymentSuccess(true);
            const verifyTimeout = setTimeout(() => {
              setPaymentSuccess(false);
              setPaymentError("La vérification a expiré. Contactez support@plaidezy.com.");
            }, 15000);
            fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: paymentSuccessParam }),
            })
              .then((r) => r.json())
              .then((data) => {
                clearTimeout(verifyTimeout);
                if (data.verified) {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    ...session,
                    step: "builder-unlocked",
                  }));
                  setPaymentSuccess(false);
                  setBuilderOpen(true);
                } else {
                  setPaymentSuccess(false);
                  setPaymentError(data.error || "Paiement non vérifié.");
                }
              })
              .catch(() => {
                clearTimeout(verifyTimeout);
                setPaymentSuccess(false);
                setPaymentError("Impossible de vérifier le paiement.");
              });
            return;
          }
        }
      } catch { /* noop */ }
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = wizardOpen || paymentOpen || builderOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [wizardOpen, paymentOpen, builderOpen]);

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

  // Routeur basé sur le hash (#mentions-legales, #cgv, #confidentialite)
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (hash === "#mentions-legales") return <MentionsLegales />;
  if (hash === "#cgv") return <CGV />;
  if (hash === "#confidentialite") return <Confidentialite />;

  return (
    <>
      <SvgDefs />
      <Navigation onOpenWizard={openWizard} />
      <main>
      <HeroSection onOpenWizard={openWizard} />
      <div className="section-divider" />
      <ServicesSection onSelectService={openWizardWithClaim} />
      <div className="section-divider" />
      <VersusSection />
      <div className="section-divider" />
      <HowItWorksSection />
      <div className="section-divider" />
      <LetterPreviewSection onOpenWizard={openWizard} />
      <div className="section-divider" />
      <GuaranteesSection />
      <div className="section-divider" />
      <FAQSection />
      <div className="section-divider" />
      <EmailSection />
      <CTASection onStart={openWizard} />
      <FooterSection />
      </main>
      <MobileSticky onStart={openWizard} />
      {/* Écran de confirmation après paiement SumUp */}
      {paymentSuccess && (
        <div className="modal-backdrop" style={{ background: "rgba(6,6,10,0.97)" }} role="status" aria-live="polite" aria-label="Vérification du paiement en cours">
          <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
            <div className="analysis-spinner" style={{ margin: "0 auto 24px", width: 28, height: 28 }} aria-hidden="true" />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginBottom: 8, letterSpacing: -1 }}>Vérification du paiement…</h2>
            <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.7 }}>On confirme votre paiement auprès de SumUp.</p>
          </div>
        </div>
      )}

      {/* Erreur de vérification paiement */}
      {paymentError && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="pay-err-title" aria-live="assertive">
          <div className="modal-content liquid-glass-card" style={{ maxWidth: 480 }}>
            <div className="modal-body" style={{ textAlign: "center", padding: 48 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface2)", border: "2px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </div>
              <h2 id="pay-err-title" style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", marginBottom: 8, letterSpacing: -0.5 }}>Paiement non vérifié</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>{paymentError}</p>
              <button type="button" className="wizard-btn-next" style={{ padding: "14px 28px" }} onClick={() => setPaymentError("")}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {wizardOpen && <WizardModal key={preselectedClaimId ?? "open"} onClose={closeWizard} onEligible={handleEligible} initialClaimId={preselectedClaimId} />}
      {paymentOpen && selectedClaim && <PaymentGate claim={selectedClaim} amount={claimAmount} onPaid={handlePaid} onClose={closePayment} />}
      {builderOpen && selectedClaim && <LetterBuilder claim={selectedClaim} answers={claimAnswers} onClose={closeBuilder} />}
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
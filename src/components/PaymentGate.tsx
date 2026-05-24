import { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { ClaimConfig } from "../lib/claims";

interface PaymentGateProps {
  claim: ClaimConfig;
  answers: Record<string, string>;
  amount: string;
  onPaid: () => void;
  onClose: () => void;
  onEdit?: () => void;
}


const evidenceByClaim: Record<string, string[]> = {
  vol: ["Billet ou confirmation de réservation", "Carte d’embarquement si disponible", "Preuve du retard / annulation", "Échanges avec la compagnie"],
  train: ["Billet ou e-billet", "Justificatif ou capture du retard", "Reçu de paiement", "Échanges avec SNCF / Eurostar"],
  colis: ["Numéro de suivi", "Preuve d’achat ou facture", "Photos du colis si endommagé", "Échanges avec le transporteur"],
  parking: ["Avis de contravention", "Justificatif de paiement si disponible", "Photos de la signalisation / horodateur", "Tout document utile au recours"],
  caution: ["Bail", "État des lieux d’entrée et de sortie", "Preuve de remise des clés", "RIB et échanges avec le bailleur"],
};

function formatAnswerValue(value: string) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

function buildPreview(claim: ClaimConfig, answers: Record<string, string>, amount: string) {
  const firstUseful = claim.questions
    .map((q) => answers[q.id])
    .filter(Boolean)
    .slice(0, 2)
    .join(" — ");

  return `Objet : Réclamation — ${claim.name}\n\nMadame, Monsieur,\n\nJe vous contacte concernant ${firstUseful || "la situation décrite"}. Au regard des informations fournies, je sollicite ${amount || "l’indemnisation ou le remboursement applicable"}.\n\nLa suite de la lettre détaille les faits, les références utiles et la demande précise…`;
}


export default function PaymentGate({ claim, answers, amount, onPaid, onClose, onEdit }: PaymentGateProps) {
  const trapRef = useFocusTrap(true);
  const [hasSumUp, setHasSumUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const summaryItems = claim.questions
    .filter((q) => answers[q.id])
    .map((q) => ({ label: q.label, value: formatAnswerValue(answers[q.id]) }));
  const evidenceItems = evidenceByClaim[claim.id] || ["Justificatifs liés à votre situation", "Preuve de paiement si applicable", "Échanges avec l’entreprise"];
  const previewText = buildPreview(claim, answers, amount);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => { setHasSumUp(data.hasSumUp); setLoading(false); })
      .catch(() => { setHasSumUp(false); setLoading(false); });
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoApplying(true);
    setPromoError("");
    try {
      const res = await fetch("/api/verify-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) { setPromoError(data.error || "Code promo invalide."); return; }
      try {
        const existing = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({ ...existing, promoCode: promoCode.trim(), step: "promo-validated" }));
      } catch { /* noop */ }
      onPaid();
    } catch (e: unknown) {
      setPromoError(e instanceof Error ? e.message : "Erreur lors de la vérification");
    } finally { setPromoApplying(false); }
  };

  const handlePay = async () => {
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.id, amount: 9.0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");
      try {
        const existing = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({ ...existing, checkoutRef: data.checkoutReference, step: "payment" }));
      } catch { /* noop */ }
      window.location.href = data.hostedCheckoutUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création du paiement");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" ref={trapRef as any} style={{ textAlign: "center", padding: "48px 28px" }}>
          <div className="analysis-spinner" style={{ margin: "0 auto 16px", width: 24, height: 24, borderWidth: 3 }} />
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Chargement…</p>
        </div>
      </div>
    );
  }

  // Mode sans SumUp
  if (!hasSumUp) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" ref={trapRef as any}>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="modal-body" style={{ textAlign: "center" }}>
            <h2 className="wizard-title">Service temporairement indisponible</h2>
            <p className="wizard-subtitle">Le paiement en ligne est momentanément indisponible. Contactez-nous pour finaliser votre demande.</p>

            <div style={{ background: "var(--bg2)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>9€</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>{claim.law.split("·")[0].trim()}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginTop: 8 }}>{amount}</p>
            </div>

            <a
              href={`mailto:contact@plaidezy.com?subject=Réclamation%20-%20Paiement`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--green)", color: "#fff", padding: "12px 24px",
                borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              Nous contacter par email →
            </a>
            <p style={{ fontSize: 12, color: "var(--light)", marginTop: 12 }}>contact@plaidezy.com · Réponse sous 24h</p>
          </div>
        </div>
      </div>
    );
  }

  // Mode production avec SumUp
  return (
    <div className="modal-backdrop">
      <div className="modal-content" ref={trapRef as any}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="modal-body">
          <h2 className="wizard-title">Générer ma lettre prête à envoyer</h2>
          <p className="wizard-subtitle">Paiement unique de 9€ · Aucun abonnement · Zéro commission</p>

          {/* Résumé */}
          <div style={{ background: "var(--bg2)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>9,00 €</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{claim.law.split("·")[0].trim()}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{amount}</p>
            {onEdit && (
              <button type="button" className="wizard-btn-back" onClick={onEdit} style={{ marginTop: 12, width: "100%", padding: "10px 12px", fontSize: 13 }}>
                Modifier mes réponses
              </button>
            )}
          </div>

          {summaryItems.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", marginBottom: 10 }}>Résumé avant paiement</h3>
              {summaryItems.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: i < Math.min(summaryItems.length, 6) - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "var(--ink)", fontWeight: 700, textAlign: "right" }}>{item.value}</span>
                </div>
              ))}
              {onEdit && (
                <button type="button" className="wizard-btn-back" onClick={onEdit} style={{ marginTop: 12, width: "100%", padding: "10px 12px", fontSize: 13 }}>
                  Modifier mes réponses
                </button>
              )}
            </div>
          )}

          <div style={{ background: "linear-gradient(180deg, #fff 0%, var(--bg2) 100%)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Aperçu de votre lettre</h3>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--green)", background: "var(--green-light)", padding: "4px 8px", borderRadius: 999 }}>extrait</span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.65, color: "var(--ink2)", whiteSpace: "pre-wrap", maxHeight: 126, overflow: "hidden" }}>
              {previewText}
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, background: "linear-gradient(transparent, #fff)" }} />
          </div>

          <div style={{ background: "var(--primary-light)", border: "1px solid rgba(13,148,136,0.18)", borderRadius: 10, padding: 14, marginBottom: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--primary-dark)", marginBottom: 8 }}>Justificatifs conseillés</h3>
            {evidenceItems.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Inclus */}
          <div style={{ marginBottom: 20 }}>
            {[
              "Lettre personnalisée selon vos réponses",
              "Résumé clair des faits et demande chiffrée",
              "PDF professionnel prêt à envoyer",
              "Copie du texte pour modification",
              "Paiement sécurisé · aucun frais caché",
              "Satisfait ou remboursé 7 jours",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ fontSize: 13, color: "var(--ink2)" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Code promo */}
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <input
              className="wizard-input"
              placeholder="CODE PROMO"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
              style={{ flex: 1, fontSize: 13, letterSpacing: 1 }}
            />
            <button className="wizard-btn-back" onClick={handleApplyPromo} disabled={promoApplying} style={{ whiteSpace: "nowrap" }}>
              {promoApplying ? "…" : "Appliquer"}
            </button>
          </div>
          {promoError && <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 12 }}>{promoError}</p>}

          {/* Séparateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--light)", fontWeight: 500 }}>ou payer par carte</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Erreur */}
          {error && (
            <div style={{ background: "var(--accent-light)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          {/* Bouton payer */}
          <button
            className="wizard-btn-next"
            style={{ width: "100%", padding: "14px 24px" }}
            onClick={handlePay}
            disabled={creating}
          >
            {creating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div className="analysis-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Redirection vers le paiement…
              </span>
            ) : (
              "Payer 9€ — CB · Apple Pay · Google Pay"
            )}
          </button>

          <p style={{ fontSize: 11, color: "var(--light)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
            Paiement sécurisé via SumUp · Accès immédiat après paiement · Plaidezy est un outil d’assistance rédactionnelle, pas un cabinet d’avocat.
          </p>
        </div>
      </div>
    </div>
  );
}

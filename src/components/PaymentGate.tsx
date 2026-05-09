import { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { ClaimConfig } from "../lib/claims";

function GlassShine() {
  return <div className="glass-shine" />;
}

interface PaymentGateProps {
  claim: ClaimConfig;
  amount: string;
  onPaid: () => void;
  onClose: () => void;
}

export default function PaymentGate({ claim, amount, onPaid, onClose }: PaymentGateProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [hasSumUp, setHasSumUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setHasSumUp(data.hasSumUp);
        setLoading(false);
      })
      .catch(() => {
        setHasSumUp(false);
        setLoading(false);
      });
  }, []);

  // Sauvegarde les données du dossier dans localStorage avant de quitter la page
  const saveClaimData = () => {
    try {
      const claimData = {
        claimId: claim.id,
        amount: amount,
        timestamp: Date.now(),
      };
      localStorage.setItem("plaidezy_pending_claim", JSON.stringify(claimData));
      // Sauvegarde aussi les answers et personal dans des clés séparées
      // (on les mettra depuis App.tsx avant d'ouvrir PaymentGate)
    } catch { /* noop */ }
  };

  const handlePay = async () => {
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          amount: 9.0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création du paiement");
      }

      // Sauvegarde checkoutRef dans la session principale (lue par LetterBuilder après retour SumUp)
      try {
        const existing = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({
          ...existing,
          checkoutRef: data.checkoutReference,
          step: "payment",
        }));
      } catch { /* noop */ }

      // Redirige vers la page de paiement SumUp
      window.location.href = data.hostedCheckoutUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création du paiement");
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div className="modal-content liquid-glass-card" ref={trapRef} style={{ maxWidth: 480 }}>
          <div className="modal-body" style={{ textAlign: "center", padding: 48 }}>
            <div className="analysis-spinner" style={{ margin: "0 auto", width: 24, height: 24 }} />
          </div>
        </div>
      </div>
    );
  }

  // Mode dev sans SumUp → bypass
  if (!hasSumUp) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Paiement">
        <div className="modal-content liquid-glass-card" ref={trapRef} style={{ maxWidth: 520 }}>
          <GlassShine />
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="modal-body">
            <div className="wizard-title">Accès au générateur</div>
            <div className="wizard-subtitle">Mode développement — SumUp n'est pas configuré.</div>
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.15)", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>9€</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{claim.law.split("·")[0].trim()}</div>
              <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginTop: 6 }}>{amount}</div>
            </div>
            <button type="button" className="wizard-btn-next" style={{ width: "100%", fontSize: 15, padding: "16px 28px" }} onClick={onPaid}>
              Continuer (mode dev) →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode production avec SumUp
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Paiement">
      <div className="modal-content liquid-glass-card" ref={trapRef} style={{ maxWidth: 520 }}>
        <GlassShine />
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="modal-body">
          <div className="wizard-title">Débloquez votre lettre</div>
          <div className="wizard-subtitle">
            La vérification est gratuite. La génération de la lettre personnalisée coûte 9€ fixe.
          </div>

          {/* Résumé */}
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.15)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>9,00 €</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{claim.law.split("·")[0].trim()}</div>
            <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginTop: 6 }}>{amount}</div>
          </div>

          {/* Inclus */}
          <div style={{ marginBottom: 24 }}>
            {[
              "Lettre personnalisée générée par IA",
              "Articles de loi exacts cités",
              "PDF professionnel prêt à envoyer",
              "Satisfait ou remboursé 7 jours",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: "var(--green-light)", border: "1px solid rgba(82,183,136,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <span style={{ fontSize: 13, color: "var(--ink2)" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.2)", fontSize: 13, color: "var(--accent)", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Bouton payer → redirige vers SumUp */}
          <button type="button"
            className="wizard-btn-next"
            style={{ width: "100%", fontSize: 15, padding: "16px 28px" }}
            disabled={creating}
            onClick={handlePay}
          >
            {creating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div className="analysis-spinner" /> Création du paiement…
              </span>
            ) : (
              "Payer 9€ — Carte bancaire"
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "var(--light)" }}>
            Paiement sécurisé via SumUp · CB, Apple Pay, Google Pay
          </div>
        </div>
      </div>
    </div>
  );
}

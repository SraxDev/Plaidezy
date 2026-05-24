import { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { ClaimConfig } from "../lib/claims";

interface PaymentGateProps {
  claim: ClaimConfig;
  answers: Record<string, string>;
  amount: string;
  onPaid: () => void;
  onClose: () => void;
}

export default function PaymentGate({ claim, amount, onPaid, onClose }: PaymentGateProps) {
  const trapRef = useFocusTrap(true);
  const [hasSumUp, setHasSumUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState("");

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
          <h2 className="wizard-title">Générer ma lettre juridique</h2>
          <p className="wizard-subtitle">9€ fixe · Aucune commission sur votre indemnisation</p>

          {/* Résumé */}
          <div style={{ background: "var(--bg2)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>9,00 €</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{claim.law.split("·")[0].trim()}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{amount}</p>
          </div>

          {/* Inclus */}
          <div style={{ marginBottom: 20 }}>
            {[
              "Lettre personnalisée générée par IA",
              "Articles de loi exacts cités",
              "PDF professionnel prêt à envoyer",
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

          <p style={{ fontSize: 11, color: "var(--light)", textAlign: "center", marginTop: 12 }}>
            Paiement sécurisé via SumUp · Satisfait ou remboursé 7 jours
          </p>
        </div>
      </div>
    </div>
  );
}

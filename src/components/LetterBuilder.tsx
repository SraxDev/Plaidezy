import { useState, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import jsPDF from "jspdf";
import type { ClaimConfig, PersonalInfo } from "../lib/claims";

interface LetterBuilderProps {
  claim: ClaimConfig;
  answers: Record<string, string>;
  onClose: () => void;
}

export default function LetterBuilder({ claim, answers, onClose }: LetterBuilderProps) {
  const [personal, setPersonal] = useState<PersonalInfo>(() => {
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) {
        const session = JSON.parse(saved);
        if (session.personal) return session.personal;
      }
    } catch { /* noop */ }
    return { fullName: "", address: "", city: "", email: "" };
  });

  const [letterText, setLetterText] = useState(() => {
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) {
        const session = JSON.parse(saved);
        if (session.letterText) return session.letterText;
      }
    } catch { /* noop */ }
    return "";
  });

  const [locked, setLocked] = useState(() => {
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) {
        const session = JSON.parse(saved);
        if (session.step === "builder-unlocked" && session.letterText) return false;
      }
    } catch { /* noop */ }
    return true;
  });

  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const isFormValid = personal.fullName.trim() && personal.address.trim() && personal.city.trim() && personal.email.trim();

  const generateWithAI = async (promoCodeOverride?: string) => {
    setGenerating(true);
    setError("");
    setLetterText("");

let paymentReference = "";
let savedPromoCode = "";
try {
  const saved = localStorage.getItem("plaidezy_session");
  if (saved) {
    const session = JSON.parse(saved);
    paymentReference = session.checkoutRef || "";
    savedPromoCode = session.promoCode || "";
  }
} catch { /* noop */ }

const body: Record<string, unknown> = {
  claimId: claim.id,
  answers,
  personal,
  paymentReference,
};

const activePromo = promoCodeOverride || savedPromoCode;
if (activePromo) body.promoCode = activePromo;

      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      if (!data.letter) throw new Error("Réponse vide du serveur");

      setLetterText(data.letter);
      setLocked(false);

      try {
        const saved = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({
          ...saved,
          letterText: data.letter,
          step: "builder-unlocked",
        }));
      } catch { /* noop */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoApplying(true);
    setPromoError("");
    setPromoSuccess(false);

    try {
      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          answers,
          personal,
          promoCode: promoCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromoError(data.error || "Code promo invalide.");
        return;
      }

      if (!data.letter) throw new Error("Réponse vide du serveur");

      setPromoSuccess(true);
      setLetterText(data.letter);
      setLocked(false);

      try {
        const saved = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({
          ...saved,
          letterText: data.letter,
          step: "builder-unlocked",
        }));
      } catch { /* noop */ }
    } catch (e: unknown) {
      setPromoError(e instanceof Error ? e.message : "Erreur lors de la vérification");
    } finally {
      setPromoApplying(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    setPayError("");

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.id, amount: 9.0 }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");

      try {
        localStorage.setItem("plaidezy_session", JSON.stringify({
          claimId: claim.id,
          answers,
          amount: claim.calculateAmount(answers),
          step: "builder",
          letterText,
          personal,
          checkoutRef: data.checkoutReference,
        }));
      } catch { /* noop */ }

      window.location.href = data.hostedCheckoutUrl;
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "Erreur lors du paiement");
      setPaying(false);
    }
  };

  const handleDevUnlock = () => {
    setLocked(false);
  };

  const handleDownload = () => {
    if (!letterText) return;
    setDownloading(true);
    setTimeout(() => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const leftMargin = 25;
      const pageWidth = 210;
      const pageHeight = 297;
      const maxWidth = pageWidth - 50;
      let y = 30;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - 25) { doc.addPage(); y = 25; }
      };

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);

      for (const para of letterText.split("\n")) {
        const trimmed = para.trim();
        if (!trimmed) { y += 4; continue; }
        const isHeader = (trimmed === trimmed.toUpperCase() && trimmed.length > 5) || trimmed === "Mise en demeure";
        const isSubject = trimmed.startsWith("Objet :") || trimmed.startsWith("Réf.");
        doc.setFont("helvetica", isHeader || isSubject ? "bold" : "normal");
        doc.setFontSize(isSubject ? 10.5 : 11);
        const lines = doc.splitTextToSize(trimmed, maxWidth);
        const lh = 5.5;
        checkPageBreak(lines.length * lh);
        for (const line of lines) { doc.text(line, leftMargin, y); y += lh; }
        y += 1;
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text("Généré par Plaidezy — Lettre juridique personnalisée", pageWidth / 2, pageHeight - 10, { align: "center" });
      }

      doc.save(`lettre_${claim.id}_${Date.now()}.pdf`);
      setDownloading(false);
    }, 400);
  };

  const personalFields: { id: keyof PersonalInfo; label: string; placeholder: string; fullWidth?: boolean }[] = [
    { id: "fullName", label: "Nom complet", placeholder: "Ex: Jean Dupont", fullWidth: true },
    { id: "address", label: "Adresse", placeholder: "Ex: 12 rue de la Paix" },
    { id: "city", label: "Code postal et ville", placeholder: "Ex: 75002 Paris" },
    { id: "email", label: "Email", placeholder: "Ex: jean@email.com", fullWidth: true },
  ];

  const summaryItems = claim.questions.map((q) => ({
    label: q.label,
    value: answers[q.id] || "—",
  }));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Génération de lettre">
      <div className="modal-content" ref={trapRef} style={{ maxWidth: 720, maxHeight: "90vh" }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-body" style={{ overflowY: "auto", maxHeight: "90vh" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", borderRadius: 12, background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.15)" }}>
            <svg width="20" height="20" stroke="var(--green)" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><use href={`#icon-${claim.icon}`} /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{claim.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginLeft: "auto" }}>{claim.law.split("·")[0].trim()}</span>
          </div>

          {/* Résumé du dossier */}
          <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Résumé de votre dossier</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {summaryItems.map((item, i) => (
                <div key={i}>
                  <span style={{ fontSize: 11, color: "var(--light)" }}>{item.label} : </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coordonnées */}
          <div className="wizard-title">Vos coordonnées</div>
          <div className="wizard-subtitle">Ces informations apparaîtront dans votre lettre.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {personalFields.map((field) => (
              <div key={field.id} style={field.fullWidth ? { gridColumn: "1 / -1" } : {}}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 5 }}>{field.label}</label>
                <input
                  className="wizard-input"
                  type={field.id === "email" ? "email" : "text"}
                  autoComplete={field.id === "email" ? "email" : field.id === "fullName" ? "name" : "off"}
                  placeholder={field.placeholder}
                  value={personal[field.id]}
                  onChange={(e) => setPersonal((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  style={{ padding: "11px 14px", borderRadius: 10 }}
                />
              </div>
            ))}
          </div>

          {/* Bouton générer */}
          {!letterText && (
            <button type="button"
              className="wizard-btn-next"
              style={{ width: "100%", fontSize: 15, padding: "16px 28px", marginBottom: 20 }}
              disabled={!isFormValid || generating}
              onClick={() => generateWithAI()}
            >
              {generating ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div className="analysis-spinner" /> L'IA rédige votre lettre…
                </span>
              ) : (
                <>Générer ma lettre avec l'IA ⚡</>
              )}
            </button>
          )}

          {/* Erreur génération */}
          {error && (
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.2)", fontSize: 13, color: "var(--accent)", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Aperçu de la lettre */}
          {letterText && (
            <div style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                {locked ? "Aperçu verrouillé" : "Votre lettre"}
              </div>
              <div
                ref={previewRef}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: 24,
                  maxHeight: 280,
                  overflowY: "auto",
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: "var(--ink2)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  transition: "filter 0.5s ease",
                  filter: locked ? "blur(5px)" : "none",
                  userSelect: locked ? "none" : "auto",
                }}
              >
                {letterText}
              </div>

              {/* Overlay verrouillé */}
              {locked && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to bottom, transparent 0%, rgba(14,14,22,0.4) 30%, rgba(14,14,22,0.85) 60%, rgba(14,14,22,0.97) 100%)",
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: 28,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--green-light)", border: "1px solid rgba(82,183,136,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 6, textAlign: "center", letterSpacing: -0.5 }}>
                    Votre lettre est prête
                  </div>
                  <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, textAlign: "center", lineHeight: 1.6 }}>
                    Débloquez-la pour la lire en entier et télécharger le PDF.
                  </div>

                  {/* Champ code promo */}
                  <div style={{ width: "100%", maxWidth: 320, marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="wizard-input"
                        type="text"
                        placeholder="Code promo"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); setPromoSuccess(false); }}
                        style={{ padding: "11px 14px", borderRadius: 10, flex: 1, fontSize: 13, letterSpacing: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoApplying || !isFormValid}
                        style={{
                          padding: "11px 16px",
                          borderRadius: 10,
                          background: "rgba(82,183,136,0.15)",
                          border: "1px solid rgba(82,183,136,0.3)",
                          color: "var(--green)",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                        }}
                      >
                        {promoApplying ? "…" : "Appliquer"}
                      </button>
                    </div>
                    {promoError && (
                      <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 6 }}>{promoError}</div>
                    )}
                    {promoSuccess && (
                      <div style={{ fontSize: 12, color: "var(--green)", marginTop: 6 }}>✓ Code appliqué — lettre débloquée !</div>
                    )}
                  </div>

                  {/* Séparateur */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 320, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ fontSize: 11, color: "var(--light)" }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                  </div>

                  {/* Erreur paiement */}
                  {payError && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(231,111,81,0.1)", border: "1px solid rgba(231,111,81,0.15)", fontSize: 12, color: "var(--accent)", marginBottom: 12, maxWidth: 320, textAlign: "center" }}>
                      {payError}
                    </div>
                  )}

                  {/* Bouton paiement */}
                  <button type="button"
                    className="wizard-btn-next"
                    style={{ width: "100%", maxWidth: 320, fontSize: 15, padding: "16px 28px" }}
                    disabled={paying}
                    onClick={handlePay}
                  >
                    {paying ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <div className="analysis-spinner" /> Redirection vers le paiement…
                      </span>
                    ) : (
                      "Débloquer ma lettre — 9€"
                    )}
                  </button>

                  {/* Mode dev bypass */}
                  {!import.meta.env.PROD && (
                    <button
                      onClick={handleDevUnlock}
                      style={{
                        marginTop: 10,
                        background: "none",
                        border: "none",
                        color: "var(--light)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        textDecoration: "underline",
                      }}
                    >
                      Mode dev : débloquer sans payer
                    </button>
                  )}

                  <div style={{ fontSize: 11, color: "var(--light)", marginTop: 8, textAlign: "center" }}>
                    Paiement sécurisé · CB, Apple Pay, Google Pay
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Télécharger (uniquement si déverrouillé) */}
          {letterText && !locked && (
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="wizard-btn-back" onClick={onClose}>Fermer</button>
              <button type="button"
                className="wizard-btn-next"
                style={{ flex: 1 }}
                disabled={downloading}
                onClick={handleDownload}
              >
                {downloading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div className="analysis-spinner" /> PDF…
                  </span>
                ) : (
                  <>Télécharger le PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
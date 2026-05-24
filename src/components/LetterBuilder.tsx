import { useState, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import jsPDF from "jspdf";
import type { ClaimConfig, PersonalInfo } from "../lib/claims";

interface LetterBuilderProps {
  claim: ClaimConfig;
  answers: Record<string, string>;
  amount: string;
  onClose: () => void;
}

export default function LetterBuilder({ claim, answers, onClose }: LetterBuilderProps) {
  const [personal, setPersonal] = useState<PersonalInfo>(() => {
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) { const session = JSON.parse(saved); if (session.personal) return session.personal; }
    } catch { /* noop */ }
    return { fullName: "", address: "", city: "", email: "" };
  });

  const [letterText, setLetterText] = useState(() => {
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) { const session = JSON.parse(saved); if (session.letterText) return session.letterText; }
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
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(true);

  const isFormValid = personal.fullName.trim() && personal.address.trim() && personal.city.trim() && personal.email.trim();

  const generateWithAI = async (promoCodeOverride?: string) => {
    setGenerating(true); setError(""); setLetterText("");
    let paymentReference = "";
    let savedPromoCode = "";
    try {
      const saved = localStorage.getItem("plaidezy_session");
      if (saved) { const session = JSON.parse(saved); paymentReference = session.checkoutRef || ""; savedPromoCode = session.promoCode || ""; }
    } catch { /* noop */ }

    const body: Record<string, unknown> = { claimId: claim.id, answers, personal, paymentReference, checkoutReference: paymentReference };
    const activePromo = promoCodeOverride || savedPromoCode;
    if (activePromo) body.promoCode = activePromo;

    try {
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
        localStorage.setItem("plaidezy_session", JSON.stringify({ ...saved, letterText: data.letter, ...(activePromo ? { promoCode: activePromo } : {}), step: "builder-unlocked" }));
      } catch { /* noop */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    } finally { setGenerating(false); }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoApplying(true); setPromoError(""); setPromoSuccess(false);
    try {
      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim.id, answers, personal, promoCode: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || "Code promo invalide."); return; }
      if (!data.letter) throw new Error("Réponse vide du serveur");
      setPromoSuccess(true);
      setLetterText(data.letter);
      setLocked(false);
      try {
        const saved = JSON.parse(localStorage.getItem("plaidezy_session") || "{}");
        localStorage.setItem("plaidezy_session", JSON.stringify({ ...saved, letterText: data.letter, promoCode: promoCode.trim(), step: "builder-unlocked" }));
      } catch { /* noop */ }
    } catch (e: unknown) {
      setPromoError(e instanceof Error ? e.message : "Erreur lors de la vérification");
    } finally { setPromoApplying(false); }
  };

  const handlePay = async () => {
    setPaying(true); setPayError("");
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
          claimId: claim.id, answers, amount: claim.calculateAmount(answers),
          step: "builder", letterText, personal, checkoutRef: data.checkoutReference,
        }));
      } catch { /* noop */ }
      window.location.href = data.hostedCheckoutUrl;
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "Erreur lors du paiement");
      setPaying(false);
    }
  };

  const handleDevUnlock = () => setLocked(false);

  const handleCopy = async () => {
    if (!letterText) return;
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Impossible de copier automatiquement. Sélectionnez le texte puis copiez-le manuellement.");
    }
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
    <div className="modal-backdrop">
      <div className="modal-content" ref={trapRef as any} style={{ maxWidth: 580 }}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="modal-body">
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h2 className="wizard-title">{claim.name}</h2>
            <span style={{
              display: "inline-block", fontSize: 12, fontWeight: 700,
              color: "var(--green)", background: "var(--green-light)",
              padding: "3px 10px", borderRadius: 6,
            }}>{claim.law.split("·")[0].trim()}</span>
          </div>

          {/* Résumé du dossier */}
          <div style={{ background: "var(--bg2)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>Résumé de votre dossier</h3>
            {summaryItems.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", padding: "5px 0",
                borderBottom: i < summaryItems.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Coordonnées */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Vos coordonnées</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Ces informations apparaîtront dans votre lettre.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {personalFields.map((field) => (
                <div key={field.id} style={{ gridColumn: field.fullWidth ? "1 / -1" : undefined }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink2)", marginBottom: 4 }}>{field.label}</label>
                  <input
                    className="wizard-input"
                    placeholder={field.placeholder}
                    value={personal[field.id]}
                    onChange={(e) => setPersonal((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bouton générer */}
          {!letterText && (
            <button
              className="wizard-btn-next"
              style={{ width: "100%", padding: "14px 24px" }}
              disabled={!isFormValid || generating}
              onClick={() => generateWithAI()}
            >
              {generating ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div className="analysis-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  L'IA rédige votre lettre…
                </span>
              ) : (
                <>Générer ma lettre avec l'IA ⚡</>
              )}
            </button>
          )}

          {!letterText && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
              marginTop: 12, marginBottom: 4,
            }}>
              {["Aucun abonnement", "PDF prêt à envoyer", "Modifiable après génération", "Données confidentielles"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{ background: "var(--accent-light)", borderRadius: 8, padding: "10px 14px", marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          {/* Aperçu de la lettre */}
          {letterText && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
                {locked ? "Aperçu verrouillé" : "Votre lettre"}
              </h3>
              <div
                ref={previewRef}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: 20,
                  maxHeight: 260, overflow: "hidden",
                  position: "relative",
                  fontSize: 13, lineHeight: 1.75, color: "var(--ink2)",
                  whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif",
                  ...(locked ? { filter: "blur(3px)", userSelect: "none" as const } : {}),
                }}
              >
                {letterText}
              </div>

              {locked && (
                <div style={{
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: 20, marginTop: 12, textAlign: "center",
                }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Votre lettre est prête</h4>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                    Débloquez-la pour la lire en entier et télécharger le PDF.
                  </p>

                  {/* Code promo */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      className="wizard-input"
                      placeholder="CODE PROMO"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); setPromoSuccess(false); }}
                      style={{ flex: 1, fontSize: 13, letterSpacing: 1 }}
                    />
                    <button className="wizard-btn-back" onClick={handleApplyPromo} disabled={promoApplying} style={{ whiteSpace: "nowrap" }}>
                      {promoApplying ? "…" : "Appliquer"}
                    </button>
                  </div>
                  {promoError && <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>{promoError}</p>}
                  {promoSuccess && <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>✓ Code appliqué — lettre débloquée !</p>}

                  {/* Séparateur */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <span style={{ fontSize: 12, color: "var(--light)" }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  </div>

                  {payError && (
                    <div style={{ background: "var(--accent-light)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                      <p style={{ fontSize: 12, color: "var(--accent)" }}>{payError}</p>
                    </div>
                  )}

                  <button
                    className="wizard-btn-next"
                    style={{ width: "100%", padding: "12px 20px" }}
                    onClick={handlePay}
                    disabled={paying}
                  >
                    {paying ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <div className="analysis-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        Redirection vers le paiement…
                      </span>
                    ) : "Débloquer ma lettre — 9€"}
                  </button>

                  {!import.meta.env.PROD && (
                    <button
                      className="wizard-btn-back"
                      style={{ width: "100%", marginTop: 8, fontSize: 12 }}
                      onClick={handleDevUnlock}
                    >
                      Mode dev : débloquer sans payer
                    </button>
                  )}

                  <p style={{ fontSize: 11, color: "var(--light)", marginTop: 10 }}>Paiement sécurisé · CB, Apple Pay, Google Pay</p>
                </div>
              )}
            </div>
          )}

          {/* Actions quand débloqué */}
          {letterText && !locked && (
            <>
              <div style={{
                background: "var(--primary-light)", border: "1px solid rgba(13,148,136,0.18)",
                borderRadius: 10, padding: 14, marginTop: 16,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--primary-dark)", marginBottom: 6 }}>Conseils d'envoi</h4>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Relisez la lettre, ajoutez vos justificatifs utiles puis envoyez-la par email ou courrier recommandé selon votre situation. Conservez toujours une preuve d'envoi.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button className="wizard-btn-back" onClick={onClose} style={{ flex: 0 }}>Fermer</button>
                <button className="wizard-btn-back" onClick={handleCopy} style={{ flex: 1 }}>
                  {copied ? "✓ Copiée" : "Copier la lettre"}
                </button>
                <button
                  className="wizard-btn-next"
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{ flex: 1 }}
                >
                  {downloading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div className="analysis-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      PDF…
                    </span>
                  ) : <>Télécharger le PDF</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

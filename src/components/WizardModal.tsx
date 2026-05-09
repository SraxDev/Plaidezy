import { useState, useEffect, useRef, useCallback } from "react";
import { claimTypes, getAnalysisSteps, type ClaimConfig, type Question } from "../lib/claims";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface WizardModalProps {
  onClose: () => void;
  onEligible: (claim: ClaimConfig, answers: Record<string, string>) => void;
  initialClaimId?: string | null;
}

function GlassShine() { return <div className="glass-shine" />; }

export default function WizardModal({ onClose, onEligible, initialClaimId }: WizardModalProps) {
  const initialClaim = initialClaimId ? claimTypes.find((c) => c.id === initialClaimId) || null : null;
  const [step, setStep] = useState(initialClaim ? 1 : 0);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfig | null>(initialClaim);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(!confirmClose);
  const confirmRef = useFocusTrap<HTMLDivElement>(confirmClose);

  const isDirty = step > 0 && step < 3 && Object.keys(answers).length > 0;

  const tryClose = useCallback(() => {
    if (isDirty) { setConfirmClose(true); } else { onClose(); }
  }, [isDirty, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (confirmClose) setConfirmClose(false); else tryClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tryClose, confirmClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) tryClose();
  };

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // FIX: les timeouts sont maintenant nettoyés si le modal ferme pendant l'analyse
  useEffect(() => {
    if (step !== 2) return;
    setAnalysisProgress(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    [400, 1100, 1800, 2600].forEach((delay, i) => {
      timeouts.push(setTimeout(() => setAnalysisProgress(i + 1), delay));
    });
    timeouts.push(setTimeout(() => setStep(3), 3200));
    return () => timeouts.forEach(clearTimeout);
  }, [step]);

  const runAnalysis = () => setStep(2);

  const selectedQuestions: Question[] = selectedClaim?.questions || [];
  const isFormValid = selectedQuestions.filter((q) => q.required).every((q) => answers[q.id]?.trim());
  const eligibility = selectedClaim ? selectedClaim.checkEligibility(answers) : { eligible: false };

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Vérification de droit">

      {confirmClose && (
        <div ref={confirmRef} style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,6,10,0.7)" }} role="alertdialog" aria-modal="true" aria-label="Confirmer la fermeture">
          <div className="liquid-glass-card" style={{ borderRadius: 20, padding: "36px 32px", maxWidth: 380, textAlign: "center", position: "relative" }}>
            <GlassShine />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 10, letterSpacing: -0.5, position: "relative", zIndex: 2 }}>Abandonner votre réclamation ?</div>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28, position: "relative", zIndex: 2 }}>Vos réponses ne seront pas sauvegardées.</p>
            <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 2 }}>
              <button type="button" className="wizard-btn-back" style={{ flex: 1 }} onClick={() => setConfirmClose(false)} autoFocus>Continuer</button>
              <button type="button" className="wizard-btn-next" style={{ flex: 1, background: "rgba(231,111,81,0.15)", boxShadow: "none", color: "var(--accent)" }} onClick={onClose}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-content liquid-glass-card" ref={trapRef}>
        <GlassShine />
        <button type="button" className="modal-close" onClick={tryClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="modal-body">
          <div className="wizard-progress" role="progressbar" aria-valuenow={step} aria-valuemin={0} aria-valuemax={3} aria-label={`Étape ${step + 1} sur 4`}>
            {[0, 1, 2, 3].map((i) => (<div key={i} className={`wizard-step-dot ${step === i ? "active" : step > i ? "done" : ""}`} />))}
          </div>

          {/* Step 0 */}
          {step === 0 && (
            <div>
              <div className="wizard-title">Quel est votre cas ?</div>
              <div className="wizard-subtitle">Sélectionnez le type de réclamation pour vérifier vos droits.</div>
              {claimTypes.map((claim) => (
                <button type="button" key={claim.id} className={`wizard-option ${selectedClaim?.id === claim.id ? "selected" : ""}`} onClick={() => { setSelectedClaim(claim); setAnswers({}); }} aria-pressed={selectedClaim?.id === claim.id}>
                  <div className="wizard-option-icon">
                    <svg width="20" height="20" stroke="var(--green)" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><use href={`#icon-${claim.icon}`} /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{claim.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{claim.desc}</div>
                  </div>
                </button>
              ))}
              <div className="wizard-btn-row">
                <button type="button" className="wizard-btn-next" disabled={!selectedClaim} onClick={() => setStep(1)}>Continuer →</button>
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && selectedClaim && (
            <div>
              <div className="wizard-title">{selectedClaim.name}</div>
              <div className="wizard-subtitle">Répondez à ces questions pour évaluer vos droits.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 8 }}>
                {selectedQuestions.map((q) => (
                  <div key={q.id}>
                    <label htmlFor={`wf-${q.id}`} style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink2)", marginBottom: 6 }}>
                      {q.label} {q.required && <span style={{ color: "var(--accent)" }} aria-label="obligatoire">*</span>}
                    </label>
                    {q.type === "select" ? (
                      <select id={`wf-${q.id}`} className="wizard-select" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-required={q.required}>
                        <option value="" disabled>Sélectionner…</option>
                        {q.options?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                    ) : q.type === "textarea" ? (
                      <textarea id={`wf-${q.id}`} className="wizard-textarea" placeholder={q.placeholder} value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-required={q.required} />
                    ) : (
                      <input id={`wf-${q.id}`} className="wizard-input" type={q.type} placeholder={q.placeholder} value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-required={q.required} />
                    )}
                  </div>
                ))}
              </div>
              <div className="wizard-btn-row">
                <button type="button" className="wizard-btn-back" onClick={() => setStep(0)}>← Retour</button>
                <button type="button" className="wizard-btn-next" disabled={!isFormValid} onClick={runAnalysis}>Analyser mes droits ⚡</button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && selectedClaim && (
            <div>
              <div className="wizard-title" style={{ marginBottom: 4 }}>Analyse en cours…</div>
              <div className="wizard-subtitle" style={{ marginBottom: 20 }}>Notre IA examine votre situation.</div>
              <div aria-live="polite" aria-atomic="false">
                {getAnalysisSteps(selectedClaim.id).map((s, i) => (
                  <div key={i} className="analysis-step" style={{ opacity: analysisProgress > i ? 1 : 0.3, transform: analysisProgress > i ? "translateX(0)" : "translateX(-8px)", transition: "all 0.4s ease" }}>
                    <div className={`analysis-step-dot ${analysisProgress > i + 1 ? "done" : analysisProgress === i + 1 ? "active" : "pending"}`}>
                      {analysisProgress > i + 1 ? (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>) : analysisProgress === i + 1 ? (<div className="analysis-spinner" />) : (<div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--light)" }} />)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: analysisProgress > i ? "var(--ink)" : "var(--light)" }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && selectedClaim && (
            <div className="result-eligible">
              <div className="result-check" role="img" aria-label={eligibility.eligible ? "Éligible" : "Non éligible"}
                style={!eligibility.eligible ? { background: "rgba(231,111,81,0.12)", border: "1px solid rgba(231,111,81,0.2)" } : {}}>
                {eligibility.eligible
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                }
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: eligibility.eligible ? "var(--green)" : "var(--accent)", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" as const }}>
                {eligibility.eligible ? "Vous êtes éligible !" : "Non éligible"}
              </div>
              <div className="result-amount">{selectedClaim.calculateAmount({ ...answers, _calculatedAmount: selectedClaim.calculateAmount(answers) })}</div>
              <div style={{ marginBottom: 20 }}>
                <span className="result-law"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>{selectedClaim.law}</span>
              </div>
              <div className="result-desc">{selectedClaim.lawDesc}</div>
              {eligibility.eligible ? (
                <button type="button" className="wizard-btn-next" style={{ width: "100%", fontSize: 15, padding: "16px 28px" }} onClick={() => { onEligible(selectedClaim, answers); onClose(); }}>
                  Générer ma lettre — 9€
                </button>
              ) : (
                <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                  {eligibility.reason || "Les conditions ne sont pas remplies pour ce type de réclamation."}
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--light)" }}>{eligibility.eligible ? "Satisfait ou remboursé 7 jours" : ""}</div>
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button type="button" className="wizard-btn-back" onClick={onClose}>Fermer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
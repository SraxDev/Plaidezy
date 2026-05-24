import { useState, useEffect, useRef, useCallback } from "react";
import { claimTypes, getAnalysisSteps, type ClaimConfig, type Question } from "../lib/claims";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface WizardModalProps {
  onClose: () => void;
  onEligible: (claim: ClaimConfig, answers: Record<string, string>) => void;
  preselectedClaimId?: string | null;
  initialClaimId?: string | null;
}

export default function WizardModal({ onClose, onEligible, preselectedClaimId, initialClaimId }: WizardModalProps) {
  const preId = preselectedClaimId ?? initialClaimId ?? null;
  const initialClaim = preId ? claimTypes.find((c) => c.id === preId) || null : null;
  const [step, setStep] = useState(initialClaim ? 1 : 0);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfig | null>(initialClaim);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(!confirmClose);
  const confirmRef = useFocusTrap(confirmClose);

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

  // Icon helper
  const claimIcons: Record<string, JSX.Element> = {
    vol: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C20.9 6.1 22 4 22 4s-2.1 1.1-3.5 2.5L15 10l-8.2-1.8c-.4-.1-.8.1-1 .4L4 11l6 3 3 6 2.4-1.8c.3-.2.5-.6.4-1z"/></svg>,
    parking: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>,
    colis: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    train: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/></svg>,
    caution: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  };

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdrop}>
      {/* Confirm close dialog */}
      {confirmClose && (
        <div className="modal-backdrop" style={{ zIndex: 600 }}>
          <div className="modal-content" ref={confirmRef as any} style={{ maxWidth: 380, textAlign: "center", padding: "36px 28px" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Abandonner votre réclamation ?</h3>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>Vos réponses ne seront pas sauvegardées.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="wizard-btn-back" onClick={() => setConfirmClose(false)} autoFocus style={{ flex: 1 }}>Continuer</button>
              <button className="wizard-btn-next" onClick={onClose} style={{ flex: 1, background: "var(--accent)" }}>Quitter</button>
            </div>
          </div>
        </div>
      )}

      <div className="modal-content" ref={trapRef as any}>
        <button className="modal-close" onClick={tryClose} aria-label="Fermer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="modal-body">
          {/* Progress dots */}
          <div className="wizard-progress">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`wizard-step-dot${i === step ? " active" : i < step ? " done" : ""}`} />
            ))}
          </div>

          {/* Step 0: Claim selection */}
          {step === 0 && (
            <div>
              <h2 className="wizard-title">Quel est votre cas ?</h2>
              <p className="wizard-subtitle">Sélectionnez le type de réclamation pour vérifier vos droits.</p>
              {claimTypes.map((claim) => (
                <button
                  key={claim.id}
                  className={`wizard-option${selectedClaim?.id === claim.id ? " selected" : ""}`}
                  onClick={() => { setSelectedClaim(claim); setAnswers({}); }}
                  aria-pressed={selectedClaim?.id === claim.id}
                >
                  <div className="wizard-option-icon">
                    {claimIcons[claim.id] || null}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>{claim.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>{claim.desc}</div>
                  </div>
                </button>
              ))}
              <div className="wizard-btn-row">
                <button className="wizard-btn-next" disabled={!selectedClaim} onClick={() => setStep(1)}>Continuer →</button>
              </div>
            </div>
          )}

          {/* Step 1: Questions */}
          {step === 1 && selectedClaim && (
            <div>
              <h2 className="wizard-title">{selectedClaim.name}</h2>
              <p className="wizard-subtitle">Répondez à ces questions pour évaluer vos droits.</p>
              {selectedQuestions.map((q) => (
                <div key={q.id} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink2)", marginBottom: 6 }}>
                    {q.label} {q.required && <span style={{ color: "var(--accent)" }}>*</span>}
                  </label>
                  {q.type === "select" ? (
                    <select className="wizard-select" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} aria-required={q.required}>
                      <option value="">Sélectionner…</option>
                      {q.options?.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  ) : q.type === "textarea" ? (
                    <textarea
                      className="wizard-textarea"
                      placeholder={q.placeholder || ""}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      aria-required={q.required}
                    />
                  ) : (
                    <input
                      className="wizard-input"
                      type={q.type || "text"}
                      placeholder={q.placeholder || ""}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      aria-required={q.required}
                    />
                  )}
                </div>
              ))}
              <div className="wizard-btn-row">
                <button className="wizard-btn-back" onClick={() => setStep(0)}>← Retour</button>
                <button className="wizard-btn-next" disabled={!isFormValid} onClick={runAnalysis}>Analyser mes droits</button>
              </div>
            </div>
          )}

          {/* Step 2: Analysis */}
          {step === 2 && selectedClaim && (
            <div>
              <h2 className="wizard-title">Analyse en cours…</h2>
              <p className="wizard-subtitle">Vérification de vos droits selon les textes applicables.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 16 }}>
                {getAnalysisSteps(selectedClaim.id).map((step, i) => (
                  <div key={i} className={`analysis-step${i < analysisProgress ? " visible" : ""}`}>
                    <div className={`analysis-step-dot${i < analysisProgress ? " done" : i === analysisProgress - 1 ? " active" : " pending"}`}>
                      {i < analysisProgress ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : i === analysisProgress ? (
                        <div className="analysis-spinner" />
                      ) : null}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: i < analysisProgress ? "var(--ink)" : "var(--muted)" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && selectedClaim && (
            <div>
              {eligibility.eligible ? (
                <div className="result-eligible">
                  <div className="result-check">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div className="result-amount">{selectedClaim.calculateAmount(answers)}</div>
                  <div className="result-law">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    {selectedClaim.law}
                  </div>
                  <p className="result-desc">{eligibility.reason || "Vous êtes éligible à une réclamation. Générez votre lettre juridique personnalisée."}</p>
                  <button className="wizard-btn-next" style={{ width: "100%" }} onClick={() => onEligible(selectedClaim, answers)}>
                    Générer ma lettre — 9€
                  </button>
                </div>
              ) : (
                <div className="result-ineligible">
                  <div className="result-ineligible-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Réclamation non éligible</h3>
                  <p className="result-desc">{eligibility.reason || "D'après les informations fournies, votre situation ne semble pas éligible à une réclamation."}</p>
                  <button className="wizard-btn-back" style={{ width: "100%" }} onClick={onClose}>Fermer</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

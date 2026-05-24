import { useEffect, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface PaymentSuccessProps {
  onContinue: () => void;
}

const steps = [
  { icon: "1", label: "Paiement reçu" },
  { icon: "2", label: "Lettre en cours" },
  { icon: "3", label: "PDF prêt" },
];

export default function PaymentSuccess({ onContinue }: PaymentSuccessProps) {
  const trapRef = useFocusTrap(true);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timers = [
      setTimeout(() => setActiveStep(1), 600),
      setTimeout(() => setActiveStep(2), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        ref={trapRef as any}
        style={{
          maxWidth: 440,
          textAlign: "center",
          padding: "48px 32px 36px",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        {/* Success icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--green-light)", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--green-light)", padding: "5px 14px",
          borderRadius: 6, fontSize: 11, fontWeight: 700,
          color: "var(--green)", letterSpacing: 0.5,
          textTransform: "uppercase", marginBottom: 16,
        }}>
          PAIEMENT CONFIRMÉ
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24, fontWeight: 700, letterSpacing: -0.8,
          color: "var(--ink)", marginBottom: 10, lineHeight: 1.15,
        }}>
          Votre lettre est<br />prête à générer.
        </h2>

        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, marginBottom: 28 }}>
          Merci ! Votre paiement de{" "}
          <strong style={{ color: "var(--ink)" }}>9€</strong>{" "}
          a bien été reçu. Renseignez vos coordonnées pour générer votre lettre de réclamation personnalisée.
        </p>

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: i <= activeStep ? "var(--green-light)" : "var(--bg2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s ease",
                  border: i <= activeStep ? "1px solid rgba(45,106,79,0.15)" : "1px solid var(--border)",
                }}>
                  {i < activeStep ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <span style={{ fontSize: 14 }}>{step.icon}</span>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: i <= activeStep ? "var(--green)" : "var(--light)",
                  transition: "color 0.3s",
                }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  width: 32, height: 2, borderRadius: 2,
                  background: i < activeStep ? "var(--green-soft)" : "var(--border)",
                  margin: "0 6px", marginBottom: 20, transition: "background 0.3s",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          {["Articles de loi exacts", "PDF prêt en 2 min", "Satisfait ou remboursé"].map((text, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 6,
              background: "var(--bg2)", border: "1px solid var(--border)",
              fontSize: 11, fontWeight: 600, color: "var(--muted)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {text}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          className="wizard-btn-next"
          style={{ width: "100%", padding: "14px 24px" }}
          onClick={onContinue}
        >
          Générer ma lettre maintenant
        </button>

        <p style={{ fontSize: 12, color: "var(--light)", marginTop: 12 }}>
          Un reçu a été envoyé à votre adresse e-mail.
        </p>
      </div>
    </div>
  );
}

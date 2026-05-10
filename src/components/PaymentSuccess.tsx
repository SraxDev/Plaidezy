import { useEffect, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

function GlassShine() {
  return <div className="glass-shine" />;
}

interface PaymentSuccessProps {
  onContinue: () => void;
}

const steps = [
  { icon: "✦", label: "Paiement reçu" },
  { icon: "⚡", label: "Lettre en cours" },
  { icon: "📄", label: "PDF prêt" },
];

export default function PaymentSuccess({ onContinue }: PaymentSuccessProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);
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
    <div
      className="modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="success-title"
      style={{ zIndex: 9999 }}
    >
      <div
        ref={trapRef}
        className="modal-content liquid-glass-card"
        style={{
          maxWidth: 500,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          maxHeight: "none",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
          transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <GlassShine />

        {/* Halo vert de fond */}
        <div style={{
          position: "absolute",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,183,136,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="modal-body" style={{ padding: "52px 40px 44px", textAlign: "center", position: "relative", zIndex: 2, overflowY: "hidden", msOverflowStyle: "none" } as React.CSSProperties}>

          {/* Icône succès avec anneaux */}
          <div style={{ position: "relative", display: "inline-flex", marginBottom: 28 }}>
            <div style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              border: "1px solid rgba(82,183,136,0.15)",
              animation: "pulse 2.5s ease-in-out infinite",
            }} />
            <div style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "1px solid rgba(82,183,136,0.25)",
              animation: "pulse 2.5s ease-in-out infinite 0.4s",
            }} />
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--green-light)",
              border: "1.5px solid rgba(82,183,136,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Badge statut */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 99,
            background: "rgba(82,183,136,0.1)",
            border: "1px solid rgba(82,183,136,0.2)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--green)",
            letterSpacing: 0.5,
            marginBottom: 14,
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--green)",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            PAIEMENT CONFIRMÉ
          </div>

          <h2 id="success-title" style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--ink)",
            marginBottom: 12,
            letterSpacing: -0.8,
            lineHeight: 1.15,
          }}>
            Votre lettre est<br />
            <span style={{ color: "var(--green)" }}>prête à générer.</span>
          </h2>

          <p style={{
            fontSize: 14,
            color: "var(--muted)",
            lineHeight: 1.75,
            maxWidth: 360,
            margin: "0 auto 32px",
          }}>
            Merci ! Votre paiement de{" "}
            <strong style={{ color: "var(--ink2)", fontWeight: 700 }}>9€</strong>{" "}
            a bien été reçu. Renseignez vos coordonnées pour générer votre lettre juridique personnalisée.
          </p>

          {/* Stepper */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
            padding: "20px 24px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center", minWidth: 90 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    margin: "0 auto 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    transition: "all 0.4s ease",
                    background: i <= activeStep ? "var(--green-light)" : "rgba(255,255,255,0.04)",
                    border: i <= activeStep ? "1.5px solid rgba(82,183,136,0.35)" : "1.5px solid rgba(255,255,255,0.08)",
                    boxShadow: i <= activeStep ? "0 0 12px rgba(82,183,136,0.15)" : "none",
                  }}>
                    {i < activeStep ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span style={{ color: i <= activeStep ? "var(--green)" : "var(--light)" }}>{step.icon}</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: i <= activeStep ? "var(--ink2)" : "var(--light)",
                    transition: "color 0.4s ease",
                  }}>
                    {step.label}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 32,
                    height: 1,
                    marginBottom: 20,
                    transition: "background 0.4s ease",
                    background: i < activeStep ? "rgba(82,183,136,0.4)" : "rgba(255,255,255,0.08)",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Badges garanties */}
          <div style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 32,
          }}>
            {["Articles de loi exacts", "PDF prêt en 2 min", "Satisfait ou remboursé"].map((text, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 99,
                background: "var(--surface2)",
                border: "1px solid var(--border2)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink2)",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {text}
              </div>
            ))}
          </div>

          {/* Bouton CTA */}
          <button
            type="button"
            className="wizard-btn-next"
            onClick={onContinue}
            autoFocus
            style={{
              width: "100%",
              padding: "17px 28px",
              fontSize: 15,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Générer ma lettre maintenant
          </button>

          <p style={{ fontSize: 12, color: "var(--light)", marginTop: 16, lineHeight: 1.6 }}>
            Un reçu a été envoyé à votre adresse e-mail.
          </p>
        </div>
      </div>
    </div>
  );
}
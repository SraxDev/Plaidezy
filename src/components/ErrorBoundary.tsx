import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En production, envoyer à un service de monitoring
    console.error("Plaidezy ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
          padding: "24px",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(231,111,81,0.12)",
              border: "1px solid rgba(231,111,81,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#E76F51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f5", marginBottom: 10, letterSpacing: -0.5 }}>
              Une erreur est survenue
            </h1>
            <p style={{ fontSize: 14, color: "#9999ad", lineHeight: 1.7, marginBottom: 28 }}>
              Plaidezy a rencontré un problème inattendu. Rechargez la page pour continuer.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#f0f0f5", color: "#0a0a0f", border: "none",
                padding: "14px 28px", borderRadius: "99px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              Recharger la page
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: "#66667a" }}>
              Si le problème persiste :{" "}
              <a href="mailto:contact@plaidezy.com" style={{ color: "#52B788" }}>
                contact@plaidezy.com
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

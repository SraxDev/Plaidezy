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
    console.error("Plaidezy ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 40, background: "var(--bg, #FAFAF8)",
        }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--accent-light, #FFF3EE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #B44D2D)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 24, fontWeight: 700, color: "var(--ink, #1A1A1A)",
              marginBottom: 8, letterSpacing: -0.5,
            }}>
              Une erreur est survenue
            </h1>
            <p style={{
              fontSize: 14, color: "var(--muted, #6B6B6B)", lineHeight: 1.6,
              marginBottom: 24,
            }}>
              Plaidezy a rencontré un problème inattendu. Rechargez la page pour continuer.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "var(--green, #2D6A4F)", color: "#fff", border: "none",
                padding: "12px 24px", borderRadius: 8,
                fontFamily: "'Inter', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              Recharger la page
            </button>
            <p style={{ fontSize: 12, color: "var(--light, #999)", marginTop: 16 }}>
              Si le problème persiste :{" "}
              <a href="mailto:contact@plaidezy.com" style={{ color: "var(--green, #2D6A4F)", textDecoration: "underline" }}>
                contact@plaidezy.com
              </a>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

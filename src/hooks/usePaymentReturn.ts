/**
 * Hook qui détecte le retour depuis SumUp après paiement,
 * restaure la session depuis localStorage, et vérifie le paiement côté serveur.
 * Extrait de App.tsx pour alléger le composant et faciliter les tests.
 */
import { useEffect, useState } from "react";
import { claimTypes, type ClaimConfig } from "../lib/claims";

const STORAGE_KEY = "plaidezy_session";

interface PaymentReturnState {
  verifying: boolean;
  error: string;
  claim: ClaimConfig | null;
  answers: Record<string, string>;
  amount: string;
  verified: boolean;
}

export function usePaymentReturn() {
  const [state, setState] = useState<PaymentReturnState>({
    verifying: false,
    error: "",
    claim: null,
    answers: {},
    amount: "",
    verified: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("payment_success");
    if (!reference) return;

    // Nettoie l'URL immédiatement
    window.history.replaceState({}, "/", "/");

    // Restaure la session
    let session: Record<string, unknown> | null = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) session = JSON.parse(saved);
    } catch { /* noop */ }

    if (!session) {
      setState((s) => ({ ...s, error: "Session expirée. Contactez contact@plaidezy.com." }));
      return;
    }

    const claim = claimTypes.find((c) => c.id === session!.claimId) || null;
    if (!claim) {
      setState((s) => ({ ...s, error: "Session invalide. Contactez contact@plaidezy.com." }));
      return;
    }

    const answers = (session.answers as Record<string, string>) || {};
    const amount = (session.amount as string) || claim.calculateAmount(answers);

    setState((s) => ({ ...s, verifying: true, claim, answers, amount }));

    // Timeout de sécurité
    const timeout = setTimeout(() => {
      setState((s) => ({
        ...s,
        verifying: false,
        error: "La vérification a expiré. Contactez contact@plaidezy.com.",
      }));
    }, 15000);

    fetch("/api/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((data) => {
        clearTimeout(timeout);
        if (data.verified) {
          // Marque la session comme débloquée
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, step: "builder-unlocked" }));
          } catch { /* noop */ }
          setState((s) => ({ ...s, verifying: false, verified: true }));
        } else {
          setState((s) => ({
            ...s,
            verifying: false,
            error: data.error || "Paiement non vérifié. Réessayez ou contactez contact@plaidezy.com.",
          }));
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        setState((s) => ({
          ...s,
          verifying: false,
          error: "Impossible de vérifier le paiement. Contactez contact@plaidezy.com.",
        }));
      });
  }, []);

  const clearError = () => setState((s) => ({ ...s, error: "" }));

  return { ...state, clearError };
}
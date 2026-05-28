import { useState, useEffect } from "react";

/* ───────── Layout commun aux pages légales ───────── */

function LegalLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const goHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="legal-shell">
      <nav className={`legal-nav${scrolled ? " scrolled" : ""}`}>
        <a href="/" onClick={goHome} className="legal-logo">
          Plaid<em>ezy</em>
        </a>
        <div className="legal-nav-links">
          <a href="/guides">Guides</a>
          <a href="/aide">Aide</a>
          <a href="/" onClick={goHome} className="legal-back">← Retour au site</a>
        </div>
      </nav>

      <main className="legal-main">
        <div className="legal-hero-card">
          <div className="section-label legal-label">Plaidezy</div>
          <div className="legal-content">
            {children}
          </div>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>Plaid<em>ezy</em></span>
          <p>Outil d'assistance rédactionnelle · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

/* ───────── Contenu des pages ───────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      <div className="legal-section-body">
        {children}
      </div>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--green)", textDecoration: "underline", textUnderlineOffset: 2,
};
const strongStyle: React.CSSProperties = { fontWeight: 600, color: "var(--ink)" };


function AProposContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40, fontWeight: 800, color: "var(--ink)",
        marginBottom: 10, letterSpacing: -1.4, lineHeight: 1.08,
      }}>
        À propos de Plaidezy
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Un outil simple pour reprendre la main sur vos réclamations.</p>

      <Section title="Notre mission">
        <p>Plaidezy aide les particuliers à rédiger des lettres de réclamation claires, structurées et prêtes à envoyer pour des situations du quotidien : vol retardé, train, colis, amende ou caution non rendue.</p>
        <p style={{ marginTop: 8 }}>L'objectif est simple : rendre les démarches plus accessibles, plus rapides et moins intimidantes.</p>
      </Section>

      <Section title="Ce que Plaidezy fait">
        <ul style={{ paddingLeft: 20 }}>
          <li>Vous guide avec un questionnaire court</li>
          <li>Évalue automatiquement votre situation selon les critères du cas choisi</li>
          <li>Génère une lettre personnalisée prête à copier ou télécharger</li>
          <li>Vous rappelle les justificatifs utiles et les prochaines étapes</li>
        </ul>
      </Section>

      <Section title="Ce que Plaidezy ne fait pas">
        <p>Plaidezy n'est pas un cabinet d'avocat et ne fournit pas de conseil juridique personnalisé. Pour un litige complexe, urgent ou à fort enjeu, il est recommandé de consulter un professionnel du droit.</p>
      </Section>

      <Section title="Notre modèle">
        <p>La vérification est gratuite. La génération de la lettre coûte <span style={strongStyle}>9€ une seule fois</span>. Il n'y a aucun abonnement et aucune commission sur les sommes que vous pourriez récupérer.</p>
      </Section>

      <Section title="Confidentialité">
        <p>Vos informations servent uniquement à vérifier votre situation et à générer votre lettre. Elles ne sont pas revendues. Vous pouvez nous contacter à tout moment pour toute demande relative à vos données : <span style={strongStyle}>contactplaidezy@proton.me</span>.</p>
      </Section>

      <Section title="Contact">
        <p>Une question, un remboursement, une suggestion ? Utilisez notre <a href="/aide" style={linkStyle}>formulaire d’aide</a>.</p>
      </Section>
    </div>
  );
}

function MentionsContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40, fontWeight: 800, color: "var(--ink)",
        marginBottom: 10, letterSpacing: -1.4, lineHeight: 1.08,
      }}>
        Mentions légales
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Éditeur du site">
        <p>Plaidezy est un service d'assistance rédactionnelle proposé sous forme de site internet.</p>
        <p style={{ marginTop: 8 }}><span style={strongStyle}>Raison sociale :</span> Plaidezy</p>
        <p><span style={strongStyle}>Email :</span> contactplaidezy@proton.me</p>
        <p><span style={strongStyle}>Statut :</span> Service de rédaction assistée par intelligence artificielle</p>
      </Section>

      <Section title="Hébergement">
        <p>Ce site est hébergé par un prestataire d'hébergement professionnel assurant la disponibilité et la sécurité des données.</p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>L'ensemble du contenu de ce site (textes, images, logos, design) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
      </Section>

      <Section title="Responsabilité">
        <p>Plaidezy est un outil d'assistance rédactionnelle et ne constitue pas un conseil juridique au sens de la loi du 31 décembre 1971. Les lettres générées sont fournies à titre indicatif et n'engagent pas la responsabilité de Plaidezy quant à l'issue de la procédure engagée par l'utilisateur.</p>
        <p style={{ marginTop: 8 }}>En cas de litige complexe, Plaidezy recommande de consulter un professionnel du droit.</p>
      </Section>

      <Section title="Données personnelles">
        <p>Les données personnelles collectées lors de l'utilisation du service sont traitées conformément au RGPD. Pour plus d'informations, consultez notre <a href="/confidentialite" style={linkStyle}>Politique de confidentialité</a>.</p>
      </Section>

      <Section title="Médiation">
        <p>En cas de litige relatif à l'utilisation du service, l'utilisateur peut recourir à une procédure de médiation conventionnelle ou à tout mode alternatif de règlement des différends.</p>
      </Section>
    </div>
  );
}

function CGVContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40, fontWeight: 800, color: "var(--ink)",
        marginBottom: 10, letterSpacing: -1.4, lineHeight: 1.08,
      }}>
        Conditions Générales de Vente
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Objet">
        <p>Les présentes CGV régissent la vente des services proposés par Plaidezy. Toute commande implique l'acceptation sans réserve des présentes CGV.</p>
      </Section>

      <Section title="Services">
        <p>Plaidezy propose :</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Une vérification gratuite de l'éligibilité du dossier</li>
          <li>La génération d'une lettre de réclamation personnalisée au format PDF, au tarif de 9€ TTC</li>
        </ul>
      </Section>

      <Section title="Prix">
        <p>Le prix est fixé à <span style={strongStyle}>9,00€ TTC</span>. La vérification préalable est gratuite. Plaidezy se réserve le droit de modifier ses prix — les modifications ne s'appliquent pas aux commandes déjà réglées.</p>
      </Section>

      <Section title="Paiement">
        <p>Le paiement s'effectue en ligne via SumUp de manière sécurisée. Moyens acceptés : carte bancaire (Visa, Mastercard), Apple Pay et Google Pay. Le paiement est exigé avant la génération de la lettre.</p>
      </Section>

      <Section title="Livraison">
        <p>La lettre est mise à disposition sous forme de PDF téléchargeable immédiatement après génération. Délai : généralement inférieur à 30 secondes.</p>
      </Section>

      <Section title="Droit de rétractation">
        <p>Conformément aux articles L.221-18 et suivants du Code de la consommation, l'utilisateur dispose d'un délai de 14 jours pour exercer son droit de rétractation. Ce droit ne peut être exercé pour les services pleinement exécutés (article L.221-28).</p>
        <p style={{ marginTop: 8 }}>Plaidezy propose une <span style={strongStyle}>garantie satisfait ou remboursé de 7 jours</span> : demande à adresser à contactplaidezy@proton.me.</p>
      </Section>

      <Section title="Responsabilité">
        <p>Plaidezy fournit un outil d'aide à la rédaction. Les lettres ne remplacent pas un avis juridique. Plaidezy ne peut être tenu responsable de l'issue de la procédure ni des informations fournies par l'utilisateur.</p>
      </Section>

      <Section title="Droit applicable">
        <p>Les présentes CGV sont soumises au droit français. Consultez notre <a href="/confidentialite" style={linkStyle}>Politique de confidentialité</a>.</p>
      </Section>
    </div>
  );
}

function ConfidentialiteContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40, fontWeight: 800, color: "var(--ink)",
        marginBottom: 10, letterSpacing: -1.4, lineHeight: 1.08,
      }}>
        Politique de confidentialité
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Responsable du traitement">
        <p>Plaidezy, joignable à : contactplaidezy@proton.me.</p>
      </Section>

      <Section title="Données collectées">
        <ul style={{ paddingLeft: 20 }}>
          <li><span style={strongStyle}>Données de réclamation :</span> informations relatives au litige</li>
          <li><span style={strongStyle}>Coordonnées :</span> nom, adresse, email — nécessaires à la rédaction</li>
          <li><span style={strongStyle}>Données de paiement :</span> traitées exclusivement par SumUp (aucune donnée bancaire stockée)</li>
          <li><span style={strongStyle}>Données techniques :</span> adresse IP, navigateur</li>
        </ul>
      </Section>

      <Section title="Finalités du traitement">
        <ul style={{ paddingLeft: 20 }}>
          <li>Générer la lettre de réclamation</li>
          <li>Traiter le paiement</li>
          <li>Répondre aux demandes de remboursement</li>
          <li>Newsletter (si inscrit, sur consentement)</li>
        </ul>
      </Section>

      <Section title="Base légale">
        <p>Exécution du contrat (art. 6.1.b RGPD) pour le service, consentement (art. 6.1.a) pour la newsletter.</p>
      </Section>

      <Section title="Conservation">
        <p>Données de réclamation : supprimées dans les 30 jours. Données de facturation : 10 ans (obligations comptables).</p>
      </Section>

      <Section title="Hébergement et transferts">
        <p>Données hébergées en France/UE. Aucun transfert hors UE.</p>
      </Section>

      <Section title="Sous-traitants">
        <ul style={{ paddingLeft: 20 }}>
          <li><span style={strongStyle}>SumUp :</span> paiements</li>
          <li><span style={strongStyle}>Groq :</span> génération assistée par IA</li>
        </ul>
      </Section>

      <Section title="Vos droits">
        <p>Accès, rectification, effacement, limitation, portabilité, opposition. Contact : <span style={strongStyle}>contactplaidezy@proton.me</span></p>
      </Section>

      <Section title="Cookies">
        <p>Uniquement des cookies techniques essentiels. Aucun cookie publicitaire ou de tracking.</p>
      </Section>

      <Section title="Réclamation">
        <p>Vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr/" style={linkStyle} target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
      </Section>
    </div>
  );
}


function ContactAideContent() {
  const supportCards = [
    {
      id: "paiement",
      title: "Problème de paiement",
      text: "Paiement débité, retour bloqué, lien SumUp expiré ou confirmation manquante.",
    },
    {
      id: "lettre",
      title: "Problème avec ma lettre",
      text: "Lettre incomplète, information à corriger, téléchargement PDF/Word impossible.",
    },
    {
      id: "remboursement",
      title: "Demande de remboursement",
      text: "Vous souhaitez utiliser la garantie satisfait ou remboursé de 7 jours.",
    },
    {
      id: "autre",
      title: "Autre demande",
      text: "Une question, une suggestion ou un cas que vous aimeriez voir ajouté.",
    },
  ];

  const [type, setType] = useState("paiement");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const selectedCard = supportCards.find((card) => card.id === type) || supportCards[0];
  const messageMinLength = 10;
  const messageMaxLength = 1200;
  const messageLength = message.trim().length;
  const canSubmit = email.trim().includes("@") && messageLength >= messageMinLength && !submitting;
  const placeholders: Record<string, string> = {
    paiement: "Ex: J’ai payé mais je suis resté bloqué sur la page de retour. Mon paiement date d’environ 14h30...",
    lettre: "Ex: La lettre générée ne mentionne pas mon justificatif / je n’arrive pas à télécharger le PDF...",
    remboursement: "Ex: Je souhaite demander un remboursement car la lettre ne correspond pas à ma situation...",
    autre: "Décrivez votre demande ou le nouveau cas que vous aimeriez voir ajouté...",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setSent(false);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email, message, page: window.location.href }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Impossible d’envoyer votre message.");
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’envoyer votre message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: 40, fontWeight: 800, color: "var(--ink)",
        marginBottom: 10, letterSpacing: -1.4, lineHeight: 1.08,
      }}>
        Aide & contact
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Une question avant ou après la génération de votre lettre ? Écrivez-nous directement depuis ce formulaire.</p>

      <Section title="Envoyer un message au support">
        <div className="support-intro-card">
          <div>
            <strong>Réponse sous 24h ouvrées</strong>
            <span>Plus votre message est précis, plus on pourra vous aider vite.</span>
          </div>
          <span>Support Plaidezy</span>
        </div>

        <form onSubmit={handleSubmit} className="support-form">
          <div className="support-step">
            <span>1</span>
            <div>
              <strong>Choisissez le sujet</strong>
              <p>Sélectionnez le type de demande le plus proche de votre situation.</p>
            </div>
          </div>

          <div className="support-card-grid" role="radiogroup" aria-label="Sujet de la demande">
            {supportCards.map((card) => (
              <button
                key={card.id}
                type="button"
                role="radio"
                aria-checked={type === card.id}
                onClick={() => { setType(card.id); setError(""); }}
                className={`support-choice${type === card.id ? " selected" : ""}`}
              >
                <span className="support-choice-dot" />
                <strong>{card.title}</strong>
                <small>{card.text}</small>
              </button>
            ))}
          </div>

          <div className="support-selected-help">
            <strong>{selectedCard.title}</strong>
            <span>{selectedCard.text}</span>
          </div>

          <div className="support-step">
            <span>2</span>
            <div>
              <strong>Vos coordonnées</strong>
              <p>On utilisera cet email uniquement pour vous répondre.</p>
            </div>
          </div>

          <div className="support-field">
            <label>Votre email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
              autoComplete="email"
            />
          </div>

          <div className="support-step">
            <span>3</span>
            <div>
              <strong>Votre message</strong>
              <p>Ajoutez les détails utiles : cas concerné, paiement, référence, problème rencontré.</p>
            </div>
          </div>

          <div className="support-field">
            <label>Message</label>
            <textarea
              required
              minLength={messageMinLength}
              maxLength={messageMaxLength}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholders[type] || placeholders.autre}
              rows={7}
            />
            <div className="support-field-meta">
              <span>{messageLength < messageMinLength ? `${messageMinLength - messageLength} caractères minimum restants` : "Message suffisamment détaillé"}</span>
              <span>{message.length}/{messageMaxLength}</span>
            </div>
          </div>

          {error && <div className="support-alert error">{error}</div>}
          {sent && <div className="support-alert success">✓ Message envoyé. Nous vous répondrons dès que possible.</div>}

          <button type="submit" className="support-submit" disabled={!canSubmit}>
            {submitting ? (
              <span><span className="support-mini-spinner" /> Envoi en cours…</span>
            ) : (
              "Envoyer mon message"
            )}
          </button>
        </form>
      </Section>

      <Section title="Questions fréquentes du support">
        <ul style={{ paddingLeft: 20 }}>
          <li><span style={strongStyle}>Je n’ai pas reçu ma lettre :</span> vérifiez que la génération est allée au bout et que votre paiement/code promo a bien été validé.</li>
          <li><span style={strongStyle}>Le paiement a été débité mais je suis bloqué :</span> envoyez-nous l’email utilisé et l’heure approximative du paiement.</li>
          <li><span style={strongStyle}>Puis-je modifier la lettre ?</span> Oui, la lettre est modifiable avant téléchargement PDF ou Word.</li>
          <li><span style={strongStyle}>Puis-je demander un remboursement ?</span> Oui, vous pouvez nous écrire sous 7 jours si la lettre ne correspond pas à votre situation.</li>
        </ul>
      </Section>

      <Section title="Avant de nous écrire">
        <ul style={{ paddingLeft: 20 }}>
          <li>Vérifiez que vos réponses dans le wizard sont exactes.</li>
          <li>Conservez votre référence de paiement si vous avez réglé votre lettre.</li>
          <li>Expliquez brièvement le cas concerné : vol, train, colis, caution ou amende.</li>
        </ul>
      </Section>

      <Section title="Rappel important">
        <p>Plaidezy est un outil d'assistance rédactionnelle. Il ne remplace pas un avocat et ne constitue pas un conseil personnalisé. Pour une situation complexe ou urgente, consultez un professionnel du droit.</p>
      </Section>
    </div>
  );
}

/* ───────── Exports avec Layout ───────── */

export function ContactAide() {
  return <LegalLayout><ContactAideContent /></LegalLayout>;
}
export function APropos() {
  return <LegalLayout><AProposContent /></LegalLayout>;
}
export function MentionsLegales() {
  return <LegalLayout><MentionsContent /></LegalLayout>;
}
export function CGV() {
  return <LegalLayout><CGVContent /></LegalLayout>;
}
export function Confidentialite() {
  return <LegalLayout><ConfidentialiteContent /></LegalLayout>;
}

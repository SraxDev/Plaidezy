import { useState, useEffect } from "react";

/* ───────── Layout commun aux pages légales ───────── */

function LegalLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Mini nav fixe */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: "12px 24px",
        background: scrolled ? "rgba(10,10,15,0.95)" : "rgba(10,10,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background 0.3s",
      }}>
        <a href="#" style={{
          fontSize: 17,
          fontWeight: 800,
          color: "var(--ink)",
          textDecoration: "none",
          letterSpacing: -0.5,
        }}>
          Plaide<em style={{ fontStyle: "normal", color: "var(--green-mid)" }}>zy</em>
        </a>
        <a href="#" style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--muted)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 99,
          border: "1px solid rgba(255,255,255,0.08)",
          transition: "all 0.2s",
        }}>
          ← Retour
        </a>
      </div>

      {/* Contenu */}
      <div style={{ paddingTop: 80 }}>
        {children}
      </div>

      {/* Footer simplifié */}
      <div style={{
        padding: "32px 24px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: "var(--light)", lineHeight: 1.7 }}>
          © 2025 Plaidezy · Outil d'assistance rédactionnelle
        </div>
      </div>
    </div>
  );
}

/* ───────── Contenu des pages ───────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", marginBottom: 14, letterSpacing: -0.3 }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--muted)" }}>
        {children}
      </div>
    </div>
  );
}

function MentionsContent() {
  return (
    <div style={{ padding: "40px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: "var(--ink)", marginBottom: 8 }}>Mentions légales</h1>
      <p style={{ fontSize: 13, color: "var(--light)", marginBottom: 40 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Éditeur du site">
        <p>Plaidezy est un service d'assistance rédactionnelle proposé sous forme de site internet.</p>
        <p><strong>Raison sociale :</strong> Plaidezy</p>
        <p><strong>Email :</strong> contact@plaidezy.com</p>
        <p><strong>Statut :</strong> Service de rédaction assistée par intelligence artificielle</p>
      </Section>

      <Section title="Hébergement">
        <p>Ce site est hébergé par un prestataire d'hébergement professionnel assurant la disponibilité et la sécurité des données.</p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>L'ensemble du contenu de ce site (textes, images, logos, design) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable.</p>
      </Section>

      <Section title="Responsabilité">
        <p>Plaidezy est un outil d'assistance rédactionnelle et ne constitue pas un conseil juridique au sens de la loi du 31 décembre 1971. Les lettres générées sont fournies à titre indicatif et n'engagent pas la responsabilité de Plaidezy quant à l'issue de la procédure engagée par l'utilisateur.</p>
        <p>En cas de litige complexe, Plaidezy recommande de consulter un professionnel du droit.</p>
      </Section>

      <Section title="Données personnelles">
        <p>Les données personnelles collectées lors de l'utilisation du service sont traitées conformément au Règlement Général sur la Protection des Données (RGPD). Pour plus d'informations, consultez notre <a href="#confidentialite" style={{ color: "var(--green)" }}>Politique de confidentialité</a>.</p>
      </Section>

      <Section title="Médiation">
        <p>En cas de litige relatif à l'utilisation du service, l'utilisateur peut recourir à une procédure de médiation conventionnelle ou à tout mode alternatif de règlement des différends.</p>
      </Section>
    </div>
  );
}

function CGVContent() {
  return (
    <div style={{ padding: "40px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: "var(--ink)", marginBottom: 8 }}>Conditions Générales de Vente</h1>
      <p style={{ fontSize: 13, color: "var(--light)", marginBottom: 40 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Article 1 — Objet">
        <p>Les présentes Conditions Générales de Vente (CGV) régissent la vente des services proposés par Plaidezy via son site internet. Toute commande implique l'acceptation sans réserve des présentes CGV.</p>
      </Section>

      <Section title="Article 2 — Service proposé">
        <p>Plaidezy propose un service de génération de lettres de réclamation juridiques personnalisées par intelligence artificielle. Le service comprend :</p>
        <ul>
          <li>Une vérification gratuite de l'éligibilité du dossier de l'utilisateur</li>
          <li>La génération d'une lettre juridique personnalisée au format PDF, au tarif de 9€ TTC</li>
        </ul>
      </Section>

      <Section title="Article 3 — Prix">
        <p>Le prix du service de génération de lettre est fixé à 9,00€ TTC. La vérification préalable de l'éligibilité est gratuite et ne donne lieu à aucun engagement de paiement.</p>
        <p>Plaidezy se réserve le droit de modifier ses prix à tout moment. Les modifications ne s'appliquent pas aux commandes déjà réglées.</p>
      </Section>

      <Section title="Article 4 — Paiement">
        <p>Le paiement s'effectue en ligne via le prestataire de paiement SumUp, de manière sécurisée. Les moyens de paiement acceptés sont : carte bancaire (Visa, Mastercard), Apple Pay et Google Pay.</p>
        <p>Le paiement est exigé intégralement avant la génération de la lettre.</p>
      </Section>

      <Section title="Article 5 — Livraison">
        <p>La lettre générée est mise à disposition de l'utilisateur sous forme de fichier PDF téléchargeable immédiatement après génération par l'intelligence artificielle. Le délai de génération est généralement inférieur à 30 secondes.</p>
      </Section>

      <Section title="Article 6 — Droit de rétractation et remboursement">
        <p>Conformément aux articles L.221-18 et suivants du Code de la consommation, l'utilisateur dispose d'un délai de 14 jours pour exercer son droit de rétractation. Toutefois, conformément à l'article L.221-28 du Code de la consommation, ce droit ne peut être exercé pour les contrats de fourniture de services pleinement exécutés avant la fin du délai de rétractation et dont l'exécution a commencé après accord préalable exprès du consommateur.</p>
        <p>Nonobstant ce qui précède, Plaidezy propose une garantie satisfait ou remboursé de 7 jours : si l'utilisateur n'est pas satisfait de la lettre générée, il peut demander le remboursement intégral dans les 7 jours suivant l'achat, en adressant sa demande à contact@plaidezy.com.</p>
      </Section>

      <Section title="Article 7 — Responsabilité">
        <p>Plaidezy fournit un outil d'assistance rédactionnelle. Les lettres générées constituent une aide à la rédaction et ne sauraient se substituer à un avis juridique professionnel.</p>
        <p>Plaidezy ne saurait être tenu responsable de l'issue de la procédure engagée par l'utilisateur à l'aide de la lettre générée, ni des conséquences résultant d'informations inexactes fournies par l'utilisateur.</p>
      </Section>

      <Section title="Article 8 — Données personnelles">
        <p>Les données collectées font l'objet d'un traitement conforme au RGPD. Consultez notre <a href="#confidentialite" style={{ color: "var(--green)" }}>Politique de confidentialité</a>.</p>
      </Section>

      <Section title="Article 9 — Droit applicable et juridiction">
        <p>Les présentes CGV sont soumises au droit français. Tout litige sera soumis à la compétence exclusive des tribunaux français.</p>
      </Section>
    </div>
  );
}

function ConfidentialiteContent() {
  return (
    <div style={{ padding: "40px 24px 80px", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: "var(--ink)", marginBottom: 8 }}>Politique de confidentialité</h1>
      <p style={{ fontSize: 13, color: "var(--light)", marginBottom: 40 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Responsable du traitement">
        <p>Le responsable du traitement des données personnelles est Plaidezy, joignable à l'adresse : contact@plaidezy.com.</p>
      </Section>

      <Section title="Données collectées">
        <p>Plaidezy collecte les données suivantes dans le cadre de son service :</p>
        <ul>
          <li><strong>Données de réclamation :</strong> informations relatives au litige (type, compagnie, dates, montants)</li>
          <li><strong>Coordonnées :</strong> nom, adresse, email — nécessaires à la rédaction de la lettre</li>
          <li><strong>Données de paiement :</strong> traitées exclusivement par SumUp (Plaidezy ne stocke aucune donnée bancaire)</li>
          <li><strong>Données techniques :</strong> adresse IP, type de navigateur</li>
        </ul>
      </Section>

      <Section title="Finalité du traitement">
        <p>Les données sont traitées pour :</p>
        <ul>
          <li>Générer la lettre de réclamation personnalisée</li>
          <li>Traiter le paiement</li>
          <li>Répondre aux demandes de remboursement</li>
          <li>Envoyer des informations sur les nouveaux services (si inscrit à la newsletter)</li>
        </ul>
      </Section>

      <Section title="Base légale">
        <p>Le traitement repose sur l'exécution du contrat (article 6.1.b du RGPD) pour les données nécessaires au service, et sur le consentement (article 6.1.a) pour la newsletter.</p>
      </Section>

      <Section title="Durée de conservation">
        <p>Les données de réclamation sont conservées pendant la durée nécessaire à la génération de la lettre et supprimées dans les 30 jours suivant la dernière utilisation. Les données de facturation sont conservées pendant 10 ans conformément aux obligations comptables.</p>
      </Section>

      <Section title="Hébergement des données">
        <p>Les données sont hébergées en France au sein de l'Union européenne. Aucun transfert hors UE n'est effectué.</p>
      </Section>

      <Section title="Sous-traitants">
        <p>Plaidezy fait appel aux sous-traitants suivants :</p>
        <ul>
          <li><strong>SumUp :</strong> traitement des paiements</li>
          <li><strong>Google Gemini :</strong> génération des lettres par IA — les données envoyées ne sont pas utilisées pour l'entraînement des modèles</li>
        </ul>
      </Section>

      <Section title="Droits des utilisateurs">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li>Droit d'accès à vos données personnelles</li>
          <li>Droit de rectification des données inexactes</li>
          <li>Droit à l'effacement de vos données</li>
          <li>Droit à la limitation du traitement</li>
          <li>Droit à la portabilité de vos données</li>
          <li>Droit d'opposition au traitement</li>
        </ul>
        <p>Pour exercer ces droits : <strong>contact@plaidezy.com</strong></p>
      </Section>

      <Section title="Cookies">
        <p>Plaidezy utilise uniquement des cookies techniques essentiels au fonctionnement du service. Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
      </Section>

      <Section title="Réclamation">
        <p>Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" style={{ color: "var(--green)" }}>www.cnil.fr</a></p>
      </Section>
    </div>
  );
}

/* ───────── Exports avec Layout ───────── */

export function MentionsLegales() {
  return <LegalLayout><MentionsContent /></LegalLayout>;
}
export function CGV() {
  return <LegalLayout><CGVContent /></LegalLayout>;
}
export function Confidentialite() {
  return <LegalLayout><ConfidentialiteContent /></LegalLayout>;
}

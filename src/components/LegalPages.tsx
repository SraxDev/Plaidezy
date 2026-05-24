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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Mini nav fixe */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(250,250,248,0.9)" : "var(--bg)",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(8px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s",
      }}>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.location.reload(); }} style={{
          fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800,
          color: "var(--ink)", textDecoration: "none", letterSpacing: -0.5,
        }}>
          Plaid<em style={{ fontStyle: "normal", color: "var(--green)" }}>ezy</em>
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; window.location.reload(); }} style={{
          fontSize: 13, fontWeight: 600, color: "var(--muted)",
          textDecoration: "none", padding: "6px 14px", borderRadius: 6,
          transition: "all 0.2s",
        }}>
          ← Retour
        </a>
      </nav>

      {/* Contenu */}
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "100px 40px 80px" }}>
        {children}
      </main>

      {/* Footer simplifié */}
      <footer style={{ padding: "24px 40px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--light)" }}>
          © {new Date().getFullYear()} Plaidezy · Outil d'assistance rédactionnelle
        </p>
      </footer>
    </div>
  );
}

/* ───────── Contenu des pages ───────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 20, fontWeight: 700, color: "var(--ink)",
        marginBottom: 12, letterSpacing: -0.5,
        paddingBottom: 8, borderBottom: "1px solid var(--border)",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--ink2)" }}>
        {children}
      </div>
    </section>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--green)", textDecoration: "underline", textUnderlineOffset: 2,
};
const strongStyle: React.CSSProperties = { fontWeight: 600, color: "var(--ink)" };

function MentionsContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32, fontWeight: 700, color: "var(--ink)",
        marginBottom: 6, letterSpacing: -1,
      }}>
        Mentions légales
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Éditeur du site">
        <p>Plaidezy est un service d'assistance rédactionnelle proposé sous forme de site internet.</p>
        <p style={{ marginTop: 8 }}><span style={strongStyle}>Raison sociale :</span> Plaidezy</p>
        <p><span style={strongStyle}>Email :</span> contact@plaidezy.com</p>
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
        <p>Les données personnelles collectées lors de l'utilisation du service sont traitées conformément au RGPD. Pour plus d'informations, consultez notre <a href="#confidentialite" style={linkStyle}>Politique de confidentialité</a>.</p>
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
        fontFamily: "'Playfair Display', serif",
        fontSize: 32, fontWeight: 700, color: "var(--ink)",
        marginBottom: 6, letterSpacing: -1,
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
          <li>La génération d'une lettre juridique personnalisée au format PDF, au tarif de 9€ TTC</li>
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
        <p style={{ marginTop: 8 }}>Plaidezy propose une <span style={strongStyle}>garantie satisfait ou remboursé de 7 jours</span> : demande à adresser à contact@plaidezy.com.</p>
      </Section>

      <Section title="Responsabilité">
        <p>Plaidezy fournit un outil d'aide à la rédaction. Les lettres ne remplacent pas un avis juridique. Plaidezy ne peut être tenu responsable de l'issue de la procédure ni des informations fournies par l'utilisateur.</p>
      </Section>

      <Section title="Droit applicable">
        <p>Les présentes CGV sont soumises au droit français. Consultez notre <a href="#confidentialite" style={linkStyle}>Politique de confidentialité</a>.</p>
      </Section>
    </div>
  );
}

function ConfidentialiteContent() {
  return (
    <div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32, fontWeight: 700, color: "var(--ink)",
        marginBottom: 6, letterSpacing: -1,
      }}>
        Politique de confidentialité
      </h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 32 }}>Dernière mise à jour : juin 2025</p>

      <Section title="Responsable du traitement">
        <p>Plaidezy, joignable à : contact@plaidezy.com.</p>
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
          <li><span style={strongStyle}>Google Gemini :</span> génération IA — données non utilisées pour l'entraînement</li>
        </ul>
      </Section>

      <Section title="Vos droits">
        <p>Accès, rectification, effacement, limitation, portabilité, opposition. Contact : <span style={strongStyle}>contact@plaidezy.com</span></p>
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

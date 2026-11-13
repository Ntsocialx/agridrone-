import { LegalDocument, type LegalContent } from "../components/LegalDocument";
import terms from "../content/terms.json";

/** The Terms of Service (same text as the public /terms page). */
export default function TermsScreen() {
  return <LegalDocument doc={terms as LegalContent} />;
}

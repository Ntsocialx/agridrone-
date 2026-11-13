import { LegalDocument, type LegalContent } from "../components/LegalDocument";
import privacy from "../content/privacy.json";

/** The privacy policy (same text as the public /privacy page). */
export default function PrivacyScreen() {
  return <LegalDocument doc={privacy as LegalContent} />;
}

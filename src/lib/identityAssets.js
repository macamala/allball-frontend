import { countryLabel } from "../labels.js";
import { participantLogo } from "./sportsData.js";

const SLUG_TO_ISO = {
  england: "GB", scotland: "GB", wales: "GB", "northern-ireland": "GB",
  britain: "GB", uk: "GB", gb: "GB", "united-kingdom": "GB",
  usa: "US", us: "US", unitedstates: "US", "united-states": "US",
  spain: "ES", italy: "IT", germany: "DE", france: "FR", netherlands: "NL",
  portugal: "PT", belgium: "BE", turkey: "TR", greece: "GR", switzerland: "CH",
  croatia: "HR", serbia: "RS", poland: "PL", brazil: "BR", argentina: "AR",
  australia: "AU", au: "AU", mexico: "MX", japan: "JP", china: "CN", india: "IN",
  canada: "CA", ireland: "IE", austria: "AT", denmark: "DK", sweden: "SE",
  norway: "NO", finland: "FI", "czech-republic": "CZ", czechia: "CZ",
  albania: "AL", "bosnia-and-herzegovina": "BA", bosnia: "BA", bulgaria: "BG",
  romania: "RO", slovakia: "SK", slovenia: "SI", "north-macedonia": "MK",
  macedonia: "MK", montenegro: "ME", kosovo: "XK", hungary: "HU",
  ukraine: "UA", russia: "RU", belarus: "BY", lithuania: "LT", latvia: "LV",
  estonia: "EE", iceland: "IS", luxembourg: "LU", malta: "MT", cyprus: "CY",
  georgia: "GE", armenia: "AM", azerbaijan: "AZ", israel: "IL",
  "saudi-arabia": "SA", uae: "AE", "united-arab-emirates": "AE", qatar: "QA",
  egypt: "EG", morocco: "MA", tunisia: "TN", algeria: "DZ", "south-africa": "ZA",
  nigeria: "NG", ghana: "GH", senegal: "SN", cameroon: "CM", "ivory-coast": "CI",
  "cote-divoire": "CI", kenya: "KE", uganda: "UG", tanzania: "TZ", angola: "AO",
  mozambique: "MZ", zimbabwe: "ZW", "new-zealand": "NZ", "south-korea": "KR",
  korea: "KR", taiwan: "TW", "hong-kong": "HK", thailand: "TH", indonesia: "ID",
  malaysia: "MY", singapore: "SG", philippines: "PH", vietnam: "VN",
  uruguay: "UY", paraguay: "PY", colombia: "CO", chile: "CL", peru: "PE",
  ecuador: "EC", venezuela: "VE", bolivia: "BO", "costa-rica": "CR", panama: "PA",
};

function isoFromCountry(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();
  const slug = raw.toLowerCase().replace(/[\s_]+/g, "-");
  return SLUG_TO_ISO[slug] || SLUG_TO_ISO[slug.replace(/-/g, "")] || "";
}

export function flagEmoji(countryId) {
  const iso = isoFromCountry(countryId);
  if (!iso || iso.length !== 2) return "";
  const points = [...iso.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0));
  if (points.some((code) => code < 127462 || code > 127487)) return "";
  return String.fromCodePoint(...points);
}

export function countryDisplay(countryId) {
  const iso = isoFromCountry(countryId);
  const flag = flagEmoji(countryId);
  const label = countryLabel(countryId);
  return { iso, flag, label };
}

export function crestInitial(name) {
  const text = String(name || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function sideLogo(side) {
  return participantLogo(side);
}

export function sideCountry(side, fallback) {
  if (side && typeof side === "object") {
    return side.country_id || side.country || side.nationality || fallback || "";
  }
  return fallback || "";
}

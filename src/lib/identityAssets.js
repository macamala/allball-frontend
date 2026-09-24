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
  andorra: "AD", liechtenstein: "LI", "san-marino": "SM", monaco: "MC",
  moldova: "MD", moldavia: "MD", gibraltar: "GI", "faroe-islands": "FO",
  kosovo: "XK", palestine: "PS", jordan: "JO", lebanon: "LB", iraq: "IQ",
  syria: "SY", yemen: "YE", bahrain: "BH", oman: "OM", kuwait: "KW",
  nepal: "NP", pakistan: "PK", bangladesh: "BD", "sri-lanka": "LK",
  maldives: "MV", afghanistan: "AF", uzbekistan: "UZ", tajikistan: "TJ",
  kyrgyzstan: "KG", turkmenistan: "TM", mongolia: "MN",
  "dr-congo": "CD", "democratic-republic-of-the-congo": "CD", congo: "CG",
  "equatorial-guinea": "GQ", libya: "LY", botswana: "BW", "sierra-leone": "SL",
  comoros: "KM", "guinea-bissau": "GW", guinea: "GN", mauritania: "MR",
  mali: "ML", benin: "BJ", togo: "TG", gabon: "GA", gambia: "GM",
  liberia: "LR", rwanda: "RW", burundi: "BI", zambia: "ZM", malawi: "MW",
  namibia: "NA", lesotho: "LS", eswatini: "SZ", swaziland: "SZ",
  "burkina-faso": "BF", "cape-verde": "CV", "cabo-verde": "CV",
  ethiopia: "ET", sudan: "SD", "south-sudan": "SS",
  haiti: "HT", guyana: "GY", suriname: "SR", nicaragua: "NI",
  honduras: "HN", guatemala: "GT", "el-salvador": "SV", belize: "BZ",
  curacao: "CW", curaçao: "CW", jamaica: "JM", cuba: "CU",
  "dominican-republic": "DO", "trinidad-and-tobago": "TT",
  "cayman-islands": "KY", bermuda: "BM", bahamas: "BS", barbados: "BB",
  dominica: "DM", grenada: "GD", "saint-lucia": "LC",
  "saint-kitts-and-nevis": "KN", "antigua-and-barbuda": "AG",
  "saint-vincent-and-the-grenadines": "VC", "puerto-rico": "PR",
  "papua-new-guinea": "PG", fiji: "FJ", samoa: "WS", tonga: "TO",
  vanuatu: "VU", "solomon-islands": "SB", tahiti: "PF",
};

const ALPHA3_TO_ISO = {
  ALB: "AL", ALG: "DZ", ANG: "AO", ARG: "AR", ARM: "AM", AUS: "AU", AUT: "AT",
  AZE: "AZ", BEL: "BE", BIH: "BA", BOL: "BO", BRA: "BR", BUL: "BG", CAN: "CA",
  CHI: "CL", CHL: "CL", CHN: "CN", COL: "CO", CRC: "CR", CRO: "HR", CZE: "CZ",
  DEN: "DK", ECU: "EC", EGY: "EG", ENG: "GB", ESP: "ES", EST: "EE", FIN: "FI",
  FRA: "FR", GEO: "GE", GER: "DE", GHA: "GH", GRE: "GR", HUN: "HU", IDN: "ID",
  IND: "IN", IRL: "IE", IRN: "IR", ISL: "IS", ISR: "IL", ITA: "IT", JPN: "JP",
  KAZ: "KZ", KOR: "KR", KSA: "SA", MAR: "MA", MEX: "MX", MKD: "MK", NED: "NL",
  NGA: "NG", NIR: "GB", NOR: "NO", NZL: "NZ", PAR: "PY", PER: "PE", POL: "PL",
  POR: "PT", ROU: "RO", RSA: "ZA", RUS: "RU", SCO: "GB", SRB: "RS", SUI: "CH",
  SVK: "SK", SVN: "SI", SWE: "SE", THA: "TH", TUN: "TN", TUR: "TR", UAE: "AE",
  UKR: "UA", URU: "UY", USA: "US", UZB: "UZ", VEN: "VE", VIE: "VN", WAL: "GB",
  CMR: "CM", SEN: "SN", CIV: "CI", QAT: "QA", PAN: "PA", PRY: "PY", KEN: "KE",
  UGA: "UG", TAN: "TZ", ZIM: "ZW", MOZ: "MZ", MNE: "ME", KOS: "XK", BLR: "BY",
  LTU: "LT", LVA: "LV", LUX: "LU", MLT: "MT", CYP: "CY", SGP: "SG", MAS: "MY",
  PHI: "PH", HKG: "HK", TPE: "TW",
  AFG: "AF", AHO: "CW", AND: "AD", ANT: "AG", ARU: "AW", BAH: "BS", BHR: "BH",
  BAN: "BD", BGD: "BD", BAR: "BB", BDI: "BI", BEN: "BJ", BER: "BM", BHU: "BT",
  BOT: "BW", BRB: "BB", BRU: "BN", BUR: "BF", BFA: "BF", CAM: "KH", CPV: "CV",
  CAY: "KY", CAF: "CF", CHA: "TD", COM: "KM", CGO: "CG", COD: "CD", CUB: "CU",
  DJI: "DJ", DMA: "DM", DOM: "DO", ESA: "SV", SLV: "SV", EQG: "GQ", ERI: "ER",
  SWZ: "SZ", ETH: "ET", FIJ: "FJ", GAB: "GA", GAM: "GM", GMB: "GM", GRN: "GD",
  GUA: "GT", GTM: "GT", GUI: "GN", GNB: "GW", GUY: "GY", HAI: "HT", HON: "HN",
  HND: "HN", IRQ: "IQ", JAM: "JM", JOR: "JO", KUW: "KW", KGZ: "KG", LAO: "LA",
  LBN: "LB", LES: "LS", LBR: "LR", LBY: "LY", LIE: "LI", MAD: "MG", MWI: "MW",
  MDV: "MV", MLI: "ML", MDA: "MD", MON: "MC", MNG: "MN", MTN: "MR", MRI: "MU",
  MYA: "MM", NAM: "NA", NEP: "NP", NCA: "NI", NIG: "NE", OMA: "OM", PAK: "PK",
  PLE: "PS", PNG: "PG", PUR: "PR", RWA: "RW", SKN: "KN", LCA: "LC", VIN: "VC",
  SAM: "WS", SMR: "SM", STP: "ST", SEY: "SC", SLE: "SL", SOL: "SB", SOM: "SO",
  SSD: "SS", SUD: "SD", SUR: "SR", SYR: "SY", TJK: "TJ", TLS: "TL", TOG: "TG",
  TGA: "TO", TRI: "TT", TKM: "TM", VAN: "VU", YEM: "YE", ZAM: "ZM", ZMB: "ZM",
};

function isoFromCountry(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();
  if (/^[a-z]{3}$/i.test(raw)) return ALPHA3_TO_ISO[raw.toUpperCase()] || "";
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

export function sideCountries(side, fallback) {
  if (side && typeof side === "object") {
    const values = Array.isArray(side.country_ids) ? side.country_ids.filter(Boolean) : [];
    const single = side.country_id || side.country || side.nationality || "";
    const combined = single ? [single, ...values] : values;
    const unique = [...new Set(combined.map((value) => String(value).trim()).filter(Boolean))];
    if (unique.length) return unique;
  }
  return fallback ? [fallback] : [];
}

export function sideCountry(side, fallback) {
  return sideCountries(side, fallback)[0] || "";
}

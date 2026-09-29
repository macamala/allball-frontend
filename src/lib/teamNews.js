import { getRegistrySport } from "../config/sportsRegistry.js";
import { publishedNewsArchiveRows } from "./newsFreshness.js";

// This resolver is driven by a resolved profile, not a shortlist of teams.
// Never use a URL-supplied name as identity evidence or infer a club from a player.
export function foldNewsName(value) {
  return latinNewsName(value).normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Script equivalents are spelling variants, never inferred club nicknames.
const SERBIAN_LETTERS = Object.fromEntries([..."абвгдђежзијклљмнњопрстћуфхцчџш"].map((letter, i) =>
  [letter, ["a", "b", "v", "g", "d", "dj", "e", "z", "z", "i", "j", "k", "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "t", "c", "u", "f", "h", "c", "c", "dz", "s"][i]]));
function latinNewsName(value) {
  return String(value || "").replace(/[А-Яа-яЂђЈјЉљЊњЋћЏџ]/g, (letter) => SERBIAN_LETTERS[letter.toLowerCase()] || letter)
    .replace(/[Đđ]/g, "dj")
    .replace(/\b(F|B|H)\.\s*C\./gi, "$1C");
}

function hasPhrase(text, phrase) {
  return Boolean(phrase && (` ${text} `).includes(` ${phrase} `));
}

function category(text) {
  const value = foldNewsName(text);
  const women = /\b(women|womens|female|ladies|girls|wnba|nwsl|wsl|feminine|femenino|femminile)\b/.test(value);
  const men = /\b(men|mens|male|boys)\b/.test(value);
  const ages = [...new Set([...value.matchAll(/\b(?:u|under)\s*(1[0-9]|2[0-3])\b/g)].map((m) => `u${m[1]}`))];
  if (/\b(youth|junior|juniors|academy|reserves|reserve)\b/.test(value) && !ages.length) ages.push("youth");
  return { gender: women && men ? "conflict" : women ? "women" : men ? "men" : "", ages };
}

const AMBIGUOUS_NAMES = new Set(["united", "city", "inter", "milan", "sporting", "racing", "national", "nacional", "athletic", "real", "heat", "storm", "giants", "warriors"]);
const CLUB_DECORATION = /^(?:(?:fc|fk|kk|bc|ssc|acf|hc|hk|rfc) )| (?:fc|fk|kk|bc|hc|hk|rfc)$/g;
let countryAliases;
function countrySpellings(name) {
  if (!countryAliases) {
    countryAliases = new Map();
    const displays = ["en", "sr-Latn", "sr", "es", "fr", "de", "it", "pt"].map((locale) =>
      new Intl.DisplayNames([locale], { type: "region", fallback: "none" }));
    for (let a = 65; a <= 90; a += 1) for (let b = 65; b <= 90; b += 1) {
      const code = String.fromCharCode(a, b);
      const canonicalCode = new Intl.Locale(`und-${code}`).region;
      const labels = displays.map((display) => display.of(code)).filter(Boolean);
      for (const label of labels) {
        const folded = foldNewsName(label);
        const existing = countryAliases.get(folded);
        // An ambiguous translated region name must not merge two countries.
        countryAliases.set(folded, existing && existing.code !== canonicalCode ? { code: "ambiguous", labels: [] } : { code: canonicalCode, labels });
      }
    }
    for (const label of ["England", "Scotland", "Wales", "Northern Ireland", "Kosovo"]) {
      if (!countryAliases.has(foldNewsName(label))) countryAliases.set(foldNewsName(label), { code: label, labels: [label] });
    }
    countryAliases.set("usa", countryAliases.get("united states"));
  }
  return countryAliases.get(name)?.labels || [];
}

function withoutCategory(name) {
  return name.replace(/\b(?:women|womens|men|mens|ladies|female|male|girls|boys|youth|juniors?|academy|reserves?|(?:under|u)\s*(?:1[0-9]|2[0-3]))\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function teamNewsIdentity(profile) {
  if (!profile?.available || !profile.team || !getRegistrySport(profile.sport)) return null;
  const team = profile.team;
  const names = [team.name, team.display_name, profile.name].filter((x) => typeof x === "string" && x.trim());
  if (!names.length) return null;
  const scopes = category(names.map((name) => name.replace(/\(W\)$/i, "Women")).join(" "));
  const explicitGender = profile.football_gender || team.gender;
  if (explicitGender === "conflict" || scopes.gender === "conflict" || scopes.ages.length > 1) return null;
  if (["men", "women"].includes(explicitGender) && scopes.gender && scopes.gender !== explicitGender) return null;
  const baseAliases = [...new Set(names.flatMap((name) => {
    const folded = withoutCategory(foldNewsName(name.replace(/\(W\)$/i, "Women")));
    return [folded, folded.replace(CLUB_DECORATION, "").trim()];
  }))].filter((name) => name.length >= 3 && !AMBIGUOUS_NAMES.has(name) && !/^\d+$/.test(name));
  if (!baseAliases.length) return null;
  const nationalNames = baseAliases.flatMap(countrySpellings);
  const aliases = [...new Set([...baseAliases, ...nationalNames.map(foldNewsName)])];
  // Keep accented spellings for the API's literal title search. Normalization
  // belongs to matching, not to the historical database query.
  const searchTerms = [...new Set([...names.map((name) => name.replace(/\(W\)$/i, "Women")),
    ...names.map(latinNewsName), ...baseAliases, ...nationalNames])];
  const gender = scopes.gender || (["men", "women"].includes(explicitGender) ? explicitGender : "");
  return {
    key: `${profile.sport}:${profile.entity_key || team.id}:${gender}:${scopes.ages[0] || "senior"}`,
    name: team.display_name || team.name || profile.name,
    sport: profile.sport,
    aliases,
    searchTerms,
    gender,
    age: scopes.ages[0] || "",
    national: nationalNames.length > 0,
  };
}

export function matchesTeamNews(article, identity) {
  if (!identity || article?.sport !== identity.sport) return false;
  const text = foldNewsName(`${article.title || ""} ${article.summary || ""}`);
  if (!identity.aliases.some((alias) => hasPhrase(text, alias))) return false;
  const scope = category(`${article.title || ""} ${article.summary || ""} ${article.league || ""}`);
  if (scope.gender === "conflict" || scope.ages.length > 1) return false;
  if (identity.gender === "women" && scope.gender !== "women") return false;
  if (identity.gender === "men" && scope.gender === "women") return false;
  if (!identity.gender && scope.gender) return false;
  if ((scope.ages[0] || "") !== identity.age) return false;
  if (!identity.age && identity.aliases.some((alias) => hasPhrase(text, `${alias} b`) || hasPhrase(text, `${alias} ii`))) return false;
  if (identity.national) {
    // A country is also a location, league and player nationality. Those are
    // insufficient: require an explicit team/squad phrase for that country.
    return identity.aliases.some((alias) => [
      `${alias} national team`, `${alias}s national team`, `national team of ${alias}`,
      `${alias} squad`, `${alias}s squad`, `team ${alias}`, `${alias} team`, `${alias}s team`,
      `${alias} mens team`, `${alias} womens team`, `${alias} women`, `${alias} men`,
      `${alias} ${identity.age}`, `${alias}s ${identity.age}`,
    ].filter((phrase) => phrase.trim() !== alias && phrase.trim() !== `${alias}s`)
      .some((phrase) => hasPhrase(text, phrase.trim())));
  }
  return true;
}

export function selectTeamNews(rows, identity, now = new Date()) {
  const seen = new Set();
  return publishedNewsArchiveRows(rows, now).filter((row) => {
    const key = row.id || row.slug;
    if (!key || seen.has(key) || !matchesTeamNews(row, identity)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadTeamNews(identity, { getArticles, searchArticles }, active = () => true) {
  if (!identity) return { rows: [], partial: false };
  // Search includes the historical archive. The sport feed additionally finds
  // mentions in decks which the legacy title-only search cannot retrieve.
  const searches = await Promise.allSettled((identity.searchTerms || identity.aliases).slice(0, 4).map((alias) =>
    searchArticles(alias, { sport: identity.sport, limit: 50 })));
  let partial = searches.some((result) => result.status === "rejected");
  const rows = searches.flatMap((result) => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : []);
  for (let offset = 0; active() && offset < 2000; offset += 100) {
    try {
      const page = await getArticles({ sport: identity.sport, sort: "newest", limit: 100, offset });
      if (!Array.isArray(page)) throw new Error("Invalid News list");
      rows.push(...page);
      if (page.length < 100) break;
      if (offset === 1900) partial = true;
    } catch { partial = true; break; }
  }
  return { rows: selectTeamNews(rows, identity), partial };
}

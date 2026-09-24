/** Public competition presentation. Never fall back geography to the sport name. */

const SPORT_GEO = new Set([
  "football",
  "soccer",
  "basketball",
  "tennis",
  "rugby",
  "rugby league",
  "rugby-league",
  "baseball",
  "ice hockey",
  "ice-hockey",
  "hockey",
  "cricket",
  "volleyball",
  "handball",
  "futsal",
  "motorsport",
  "golf",
  "esports",
]);

export function isSportGeography(value) {
  const folded = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ");
  return Boolean(folded) && SPORT_GEO.has(folded);
}

export function competitionPresentation(eventOrGroup = {}) {
  const sample = eventOrGroup.events?.[0] || eventOrGroup;
  const displayName =
    sample.competition_name ||
    sample.competition ||
    eventOrGroup.competition ||
    eventOrGroup.key ||
    "";
  const geography = String(
    sample.geography_label || eventOrGroup.geography_label || ""
  ).trim();
  const countryId = sample.country_id || eventOrGroup.country_id || null;
  const scopeType = sample.scope_type || eventOrGroup.scope_type || "";
  const kicker = geography && !isSportGeography(geography) ? geography : "";
  const showFlag = Boolean(countryId && scopeType === "DOMESTIC");
  return {
    displayName,
    geography: kicker,
    kicker,
    countryId: countryId || null,
    scopeType,
    showFlag,
  };
}

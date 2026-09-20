const LEGAL = new Set([
  "fc",
  "cf",
  "sc",
  "afc",
  "cfc",
  "fk",
  "nk",
  "bk",
  "if",
  "il",
  "sk",
  "ac",
  "as",
  "us",
  "ssc",
  "ud",
  "cd",
  "rcd",
  "sv",
  "rc",
  "vfl",
  "calcio",
  "club",
  "clube",
  "football",
  "soccer",
  "de",
  "da",
  "do",
  "del",
  "della",
  "di",
  "of",
  "the",
  "and",
  "la",
  "le",
  "el",
  "los",
  "las",
]);

const CLUB_STYLE = new Set(["racing", "olympique", "olympic", "deportivo"]);
const GENERIC = new Set(["real", "sporting", "athletic", "united", "city", "inter", "racing"]);
const LEADING = new Set(["fc", "cf", "sc", "afc", "vfl", "sv", "as", "ac", "us", "rc", "rcd", "the", "1"]);

function foldName(name) {
  let raw = String(name || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  raw = raw.replace(/\([a-z]{2,3}\)/g, " ");
  raw = raw.replace(/^[a-z]{2}\s+/, "");
  raw = raw.replace(
    /\b(fc|cf|sc|afc|cfc|fk|nk|bk|if|il|sk|ac|as|us|ssc|ud|cd|rcd|sv|rc|vfl|calcio|club|clube|football|soccer)\b/g,
    " "
  );
  raw = raw.replace(/\b(de|da|do|del|della|di|of|the|and|la|le|el|los|las)\b/g, " ");
  raw = raw.replace(/[^a-z0-9]+/g, " ");
  return raw.replace(/\s+/g, " ").trim();
}

function identityCore(name) {
  return foldName(name)
    .split(" ")
    .filter((tok) => tok && !LEGAL.has(tok))
    .join(" ")
    .trim();
}

function expand(folded) {
  let text = String(folded || "")
    .replace(/\butd\b/g, "united")
    .replace(/\bath\b/g, "athletic");
  let tokens = text.split(" ").filter(Boolean);
  while (tokens.length > 1 && LEADING.has(tokens[0]) && tokens.slice(1).join(" ").length >= 4) {
    tokens = tokens.slice(1);
  }
  return tokens.join(" ").trim();
}

export function namesEquivalent(left, right) {
  const a = foldName(left);
  const b = foldName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (expand(a) === expand(b)) return true;
  return coresCompatible(left, right);
}

function coresCompatible(left, right) {
  const ca = identityCore(left);
  const cb = identityCore(right);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const ta = ca.split(" ");
  const tb = cb.split(" ");
  const [shorter, longer] = ca.length <= cb.length ? [ta, tb] : [tb, ta];
  const shortS = shorter.join(" ");
  const longS = longer.join(" ");
  if (!shortS || !longS.startsWith(`${shortS} `)) {
    if (shorter.length === 1 && longer[longer.length - 1] === shorter[0] && shorter[0].length >= 4) {
      const extra = new Set(longer.slice(0, -1));
      return extra.size > 0 && [...extra].every((tok) => CLUB_STYLE.has(tok));
    }
    return false;
  }
  const extra = longer.slice(shorter.length);
  if (!extra.length) return false;
  if (extra.some((tok) => GENERIC.has(tok))) return false;
  if (GENERIC.has(shortS) || shortS.length < 6) return false;
  if (extra.length <= 3 && extra.every((tok) => CLUB_STYLE.has(tok) || tok.length >= 6)) return true;
  return shortS.length >= 8 && extra.every((tok) => tok.length > 1 && tok.length <= 3);
}

function sideName(side) {
  if (!side) return "";
  if (typeof side === "string") return side;
  return side.display_name || side.name || "";
}

function participantsMatch(left, right) {
  const lh = sideName(left.home);
  const la = sideName(left.away);
  const rh = sideName(right.home);
  const ra = sideName(right.away);
  return (
    (namesEquivalent(lh, rh) && namesEquivalent(la, ra)) ||
    (namesEquivalent(lh, ra) && namesEquivalent(la, rh))
  );
}

function scoreFilled(event) {
  const score = event?.score || {};
  return score.home != null && score.home !== "" && score.away != null && score.away !== "";
}

function statusRank(status) {
  const value = String(status || "").toLowerCase();
  if (["live", "inplay", "halftime", "ht", "break"].includes(value)) return 3;
  if (["finished", "ft", "final", "ended", "complete", "postponed", "cancelled", "canceled"].includes(value)) return 2;
  return 1;
}

function sameDay(left, right) {
  return String(left.start_time || "").slice(0, 10) === String(right.start_time || "").slice(0, 10);
}

function sameCompetition(left, right) {
  const a = left.competition_key || left.competition || "";
  const b = right.competition_key || right.competition || "";
  return Boolean(a) && a === b;
}

function preferEvent(left, right) {
  const leftScore = scoreFilled(left) ? 1 : 0;
  const rightScore = scoreFilled(right) ? 1 : 0;
  if (leftScore !== rightScore) return leftScore > rightScore ? left : right;
  const leftStatus = statusRank(left.status);
  const rightStatus = statusRank(right.status);
  if (leftStatus !== rightStatus) return leftStatus > rightStatus ? left : right;
  return left;
}

export function collapseDisplayEvents(events) {
  const list = Array.isArray(events) ? events.filter(Boolean) : [];
  const hidden = new Set();
  for (let i = 0; i < list.length; i += 1) {
    if (hidden.has(list[i].id)) continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const other = list[j];
      if (hidden.has(other.id)) continue;
      if ((list[i].sport || "") !== (other.sport || "")) continue;
      if (!sameCompetition(list[i], other) || !sameDay(list[i], other)) continue;
      if (!participantsMatch(list[i], other)) continue;
      const keeper = preferEvent(list[i], other);
      const loser = keeper === list[i] ? other : list[i];
      hidden.add(loser.id);
      if (keeper !== list[i]) {
        list[i] = keeper;
      }
    }
  }
  return list.filter((event) => event?.id && !hidden.has(event.id));
}

/** Display-only participant sanitizer. Never invents the actual competitor. */

const TBD = "TBD";

const ROUND_LABEL = {
  sf: "SF",
  qf: "QF",
  r16: "R16",
  r32: "R32",
  r64: "R64",
  of: "F",
  f: "F",
  final: "F",
};

function compact(value) {
  return String(value || "").replace(/[\s._-]+/g, "");
}

function roundLabel(token, index) {
  const key = String(token || "").toLowerCase();
  const base = ROUND_LABEL[key] || String(token || "").toUpperCase();
  return index ? `${base}${index}` : base;
}

function winnerLoserLabel(kind, round, index) {
  const role = String(kind || "w").toLowerCase().startsWith("l") ? "Loser" : "Winner";
  const slot = roundLabel(round, index);
  return slot ? `${role} of ${slot}` : TBD;
}

export function sanitizeParticipantName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const folded = compact(raw);
  const lower = raw.toLowerCase();

  if (/^(tbd|tba|tbc|n\/a|na|unk|unknown|tbc)$/i.test(folded)) return TBD;
  if (/^(team|player|fighter|horse|runner|club)?(tbd|tba|tbc)$/i.test(folded)) return TBD;
  if (/\b(to be (decided|announced|confirmed)|team tbd|player tbd)\b/i.test(lower)) return TBD;

  const coded = folded.match(/^(w|l)(sf|qf|r16|r32|r64|of|f)(\d{1,2})$/i);
  if (coded) return winnerLoserLabel(coded[1], coded[2], coded[3]);

  const shortCode = folded.match(/^(w|l)(sf|qf)(\d{1,2})$/i);
  if (shortCode) return winnerLoserLabel(shortCode[1], shortCode[2], shortCode[3]);

  const words = raw.match(
    /^(winner|loser)\s+(?:of\s+)?(?:semi(?:final)?s?|quarter(?:final)?s?|sf|qf|r16|r32|r64|match|m)?\s*#?\s*(\d{1,2})?$/i
  );
  if (words) {
    const kind = words[1].toLowerCase().startsWith("l") ? "l" : "w";
    const roundMatch = raw.match(/\b(sf|qf|r16|r32|r64|semi(?:final)?s?|quarter(?:final)?s?|match)\b/i);
    let round = "match";
    if (roundMatch) {
      const token = roundMatch[1].toLowerCase();
      if (token.startsWith("semi")) round = "sf";
      else if (token.startsWith("quarter")) round = "qf";
      else if (token === "match") round = "match";
      else round = token;
    }
    const index = words[2] || "";
    if (round === "match") return `${kind === "l" ? "Loser" : "Winner"} of Match ${index || ""}`.trim();
    return winnerLoserLabel(kind, round, index);
  }

  if (/^qualifier(\s+\d+)?$/i.test(raw)) {
    return raw.replace(/^qualifier/i, "Qualifier");
  }
  if (/^seed\s*(placeholder|#)?\s*\d*$/i.test(raw) && /placeholder/i.test(raw)) return TBD;

  if (/^m[efs]-\d+$/i.test(folded)) return TBD;

  if (/^[wl][a-z]{1,3}\d{1,2}$/i.test(folded) && /^(w|l)/i.test(folded)) {
    return TBD;
  }
  if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(raw) || /^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) return "";
  if (/^\d{1,3}\s*[-–:/]\s*\d{1,3}$/.test(raw)) return "";
  if (/<[^>]+>/.test(raw)) return "";

  return raw;
}

export function displayParticipantName(sideOrName) {
  if (!sideOrName) return "";
  if (typeof sideOrName === "string") return sanitizeParticipantName(sideOrName);
  return sanitizeParticipantName(sideOrName.display_name || sideOrName.name || "");
}

export function isPlaceholderName(name) {
  const shown = sanitizeParticipantName(name);
  return shown === TBD || /^Winner of |^Loser of /.test(shown);
}

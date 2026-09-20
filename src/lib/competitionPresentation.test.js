import { describe, expect, it } from "vitest";
import { competitionPresentation, isSportGeography } from "./competitionPresentation.js";
import { sanitizeParticipantName } from "./participantDisplay.js";
import { namesEquivalent } from "./scoreIdentity.js";

describe("competition presentation", () => {
  it("uses canonical geography and never the sport name", () => {
    const serie = competitionPresentation({
      competition: "Serie A",
      competition_name: "Serie A",
      geography_label: "Italy",
      country_id: "it",
      scope_type: "DOMESTIC",
      sport: "football",
    });
    expect(serie.kicker).toBe("Italy");
    expect(serie.displayName).toBe("Serie A");
    const ucl = competitionPresentation({
      competition: "UEFA Champions League",
      geography_label: "Europe",
      scope_type: "CONTINENTAL",
      sport: "football",
    });
    expect(ucl.kicker).toBe("Europe");
    const missing = competitionPresentation({
      competition: "Serie A",
      sport: "football",
    });
    expect(missing.kicker).toBe("");
    expect(isSportGeography("FOOTBALL")).toBe(true);
    expect(competitionPresentation({ geography_label: "Football" }).kicker).toBe("");
    expect(competitionPresentation({ geography_label: "Basketball" }).kicker).toBe("");
    expect(competitionPresentation({ geography_label: "Tennis" }).kicker).toBe("");
  });

  it("matches list and match centre from the same helper", () => {
    const event = {
      competition_key: "spain-la-liga",
      competition: "La Liga",
      geography_label: "Spain",
      country_id: "es",
      scope_type: "DOMESTIC",
    };
    expect(competitionPresentation(event)).toEqual(competitionPresentation({ events: [event] }));
  });
});

describe("participant display prefixes", () => {
  it("keeps club particles and does not invent names", () => {
    expect(sanitizeParticipantName("AS Monaco")).toBe("AS Monaco");
    expect(sanitizeParticipantName("AC Milan")).toBe("AC Milan");
    expect(sanitizeParticipantName("US Sassuolo")).toBe("US Sassuolo");
    expect(sanitizeParticipantName("US Chicago White Sox")).toBe("Chicago White Sox");
    expect(sanitizeParticipantName("IT Roma")).toBe("Roma");
    expect(sanitizeParticipantName("US Colorado Springs", { competitionCountry: "US" })).toBe("Colorado Springs");
    expect(sanitizeParticipantName("AC Milan")).toBe("AC Milan");
    expect(sanitizeParticipantName("AS Roma")).toBe("AS Roma");
    expect(sanitizeParticipantName("FC Barcelona")).toBe("FC Barcelona");
  });
});

describe("identity false-positive protection", () => {
  it("does not equate different clubs that share a token", () => {
    expect(namesEquivalent("Inter", "Inter Miami")).toBe(false);
    expect(namesEquivalent("Manchester United", "Newcastle United")).toBe(false);
    expect(namesEquivalent("Manchester City", "Melbourne City")).toBe(false);
    expect(namesEquivalent("Arsenal Women", "Arsenal")).toBe(false);
  });
});

import React, { useMemo, useState } from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { competitionLabel, countryLabel } from "../../labels.js";
import { sportI18nKey } from "../../i18n/index.js";
import { groupEventsByCompetition } from "../../lib/sportsData.js";
import { scopedCompetitionId } from "../../config/sports.js";
import EventRow from "./EventRow.jsx";

const PAGE = 12;

export default function EventList({ events, compact = false }) {
  const { t } = useI18n();
  const { favorites } = useAuth();
  const [visible, setVisible] = useState(PAGE);
  const followedLeagues = favorites?.leagues || [];
  const followedSports = favorites?.sports || [];

  const groups = useMemo(() => {
    const list = groupEventsByCompetition(events);
    const rank = (group) => {
      const scoped = scopedCompetitionId(group.sport, group.key);
      if (followedLeagues.includes(scoped) || followedLeagues.includes(group.key)) return 0;
      if (followedSports.includes(group.sport)) return 1;
      return 2;
    };
    return [...list].sort((left, right) => {
      const diff = rank(left) - rank(right);
      if (diff) return diff;
      return String(left.competition).localeCompare(String(right.competition));
    });
  }, [events, followedLeagues, followedSports]);

  const shown = groups.slice(0, visible);

  return (
    <div className="score-groups">
      {shown.map((group) => {
        const sportLabelText = t(sportI18nKey(group.sport) || "sport.label");
        const title = competitionLabel(group.competition);
        const country = group.country_id ? countryLabel(group.country_id) : "";
        const followed =
          followedLeagues.includes(scopedCompetitionId(group.sport, group.key)) ||
          followedLeagues.includes(group.key);
        return (
          <section
            key={group.key}
            className={followed ? "score-comp is-followed" : "score-comp"}
            aria-label={title}
          >
            <header className="score-comp-head">
              <h2 className="score-comp-title">{title}</h2>
              <p className="score-comp-meta">
                {sportLabelText}
                {country ? ` · ${country}` : ""}
              </p>
            </header>
            <ul className="score-comp-list">
              {group.events.map((event) => (
                <EventRow key={event.id} event={event} compact={compact} />
              ))}
            </ul>
          </section>
        );
      })}
      {groups.length > visible ? (
        <button type="button" className="btn-ghost" onClick={() => setVisible((n) => n + PAGE)}>
          {t("live.showMore")}
        </button>
      ) : null}
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { competitionPresentation } from "../../lib/competitionPresentation.js";
import { competitionLabel } from "../../labels.js";
import { groupEventsByCompetition } from "../../lib/sportsData.js";
import { scopedCompetitionId } from "../../config/sports.js";
import { flagEmoji } from "../../lib/identityAssets.js";
import EventRow from "./EventRow.jsx";
import FavoriteButton from "./FavoriteButton.jsx";

function headerMeta(group) {
  const sample = group.events[0] || {};
  const presented = competitionPresentation({ ...group, ...sample, events: group.events });
  return {
    kicker: presented.kicker,
    showFlag: presented.showFlag,
    countryId: presented.countryId,
    title: presented.displayName || competitionLabel(group.competition),
  };
}

export default function EventList({ events, compact = false }) {
  const { favorites, syncFavorites } = useAuth();
  const followedLeagues = favorites?.leagues || [];
  const followedSports = favorites?.sports || [];
  const [collapsed, setCollapsed] = useState(() => new Set());

  const groups = useMemo(() => {
    const list = groupEventsByCompetition(events);
    const rank = (group) => {
      const scoped = scopedCompetitionId(group.sport, group.key);
      if (followedLeagues.includes(scoped) || followedLeagues.includes(group.key)) return 0;
      if (group.hasLive) return 1;
      if (followedSports.includes(group.sport)) return 2;
      return 3;
    };
    return [...list].sort((left, right) => {
      const diff = rank(left) - rank(right);
      if (diff) return diff;
      if (left.earliest !== right.earliest) return String(left.earliest).localeCompare(String(right.earliest));
      return String(left.competition).localeCompare(String(right.competition));
    });
  }, [events, followedLeagues, followedSports]);

  function toggleFollow(group, event) {
    event.preventDefault();
    event.stopPropagation();
    const scoped = scopedCompetitionId(group.sport, group.key);
    const exists = followedLeagues.includes(scoped) || followedLeagues.includes(group.key);
    const leagues = exists
      ? followedLeagues.filter((item) => item !== scoped && item !== group.key)
      : [...followedLeagues, scoped];
    syncFavorites({ ...favorites, leagues });
  }

  function toggleCollapse(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="score-groups">
      {groups.map((group) => {
        const meta = headerMeta(group);
        const title = meta.title;
        const followed =
          followedLeagues.includes(scopedCompetitionId(group.sport, group.key)) ||
          followedLeagues.includes(group.key);
        const logo = group.events.find((item) => item.competition_logo)?.competition_logo;
        const flag = meta.showFlag ? flagEmoji(meta.countryId) : "";
        const isCollapsed = collapsed.has(group.key);
        return (
          <section
            key={group.key}
            className={followed ? "score-comp is-followed" : "score-comp"}
            aria-label={title}
          >
            <header className="score-comp-head">
              <span className="score-comp-mark" aria-hidden="true">
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.replaceWith(document.createElement("span"));
                    }}
                  />
                ) : (
                  flag || ""
                )}
              </span>
              <button
                type="button"
                className="score-comp-toggle"
                aria-expanded={!isCollapsed}
                onClick={() => toggleCollapse(group.key)}
              >
                <div className="score-comp-copy">
                  {meta.kicker ? <p className="score-comp-kicker">{meta.kicker}</p> : null}
                  <h2 className="score-comp-title">{title}</h2>
                </div>
                <span className="score-comp-caret" aria-hidden="true">
                  {isCollapsed ? "›" : "▾"}
                </span>
              </button>
              <FavoriteButton
                pressed={followed}
                label={title}
                onClick={(ev) => toggleFollow(group, ev)}
              />
            </header>
            {isCollapsed ? null : (
              <ul className="score-comp-list">
                {group.events.map((item) => (
                  <EventRow key={item.id} event={item} compact={compact} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

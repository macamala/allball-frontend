import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { competitionPresentation } from "../../lib/competitionPresentation.js";
import { competitionLabel } from "../../labels.js";
import { competitionStandingsPath, groupEventsByCompetition } from "../../lib/sportsData.js";
import { scopedCompetitionId } from "../../config/sports.js";
import { getRegistrySport } from "../../config/sportsRegistry.js";
import { flagImageUrl } from "../../lib/identityAssets.js";
import CountryFlag from "./CountryFlag.jsx";
import { normalizeAssetUrl } from "../../lib/assetUrls.js";
import EventRow from "./EventRow.jsx";
import { orderCompetitionGroups } from "../../lib/competitionOrder.js";
import FavoriteButton from "./FavoriteButton.jsx";

function CompetitionIdentity({ logo, flag }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  const missingLogo = !logo || failed;
  return (
    <span className={`score-comp-identity ${flag ? "has-flag" : ""} ${missingLogo ? "is-logo-missing" : "has-logo"}`} aria-hidden="true">
      {flag ? <CountryFlag countryId={flag} className="score-comp-flag" /> : null}
      {missingLogo ? (
        <span className="score-comp-logo-missing" data-asset-missing="competition-logo">◆</span>
      ) : (
        <img
          className="score-comp-logo"
          src={logo}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function headerMeta(group) {
  const sample = group.events[0] || {};
  const presented = competitionPresentation({ ...group, ...sample, events: group.events });
  return {
    kicker: presented.kicker,
    showFlag: presented.showFlag,
    countryId: presented.countryId,
    title: group.group || presented.displayName || competitionLabel(group.competition),
  };
}

export default function EventList({ events, compact = false }) {
  const { favorites, syncFavorites } = useAuth();
  const followedLeagues = favorites?.leagues || [];
  const followedSports = favorites?.sports || [];
  const [collapsed, setCollapsed] = useState(() => new Set());

  const groups = useMemo(() => {
    return orderCompetitionGroups(groupEventsByCompetition(events), { leagues: followedLeagues, sports: followedSports });
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
        const logo = normalizeAssetUrl(group.events.find((item) => item.competition_logo)?.competition_logo);
        const flag = meta.showFlag && flagImageUrl(meta.countryId) ? meta.countryId : "";
        const identityKey = group.identity_key || `${group.sport || "unknown"}::${group.key}`;
        const isCollapsed = collapsed.has(identityKey);
        return (
          <section
            key={identityKey}
            className={followed ? "score-comp is-followed" : "score-comp"}
            aria-label={title}
          >
            <header className="score-comp-head">
              <CompetitionIdentity logo={logo} flag={flag} />
              <button
                type="button"
                className="score-comp-toggle"
                aria-expanded={!isCollapsed}
                onClick={() => toggleCollapse(identityKey)}
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
              <div className="score-comp-actions">
                {group.events.some((item) => item.standings_available) ? (
                  <Link className="score-comp-standings" to={competitionStandingsPath(group.key, { sport: group.sport, group: group.group || "" })}>
                    Table
                  </Link>
                ) : null}
                <span className="score-comp-count">{group.events.length}</span>
              </div>
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

import React from "react";
import { useI18n } from "../../context/I18nContext.jsx";
import { visibleEvidence } from "../../lib/sportsData.js";

export default function EvidenceList({ prediction }) {
  const { t } = useI18n();
  const evidence = visibleEvidence(prediction);
  if (!evidence.length) return null;
  return (
    <section className="prediction-why">
      <h2>{t("predictions.why")}</h2>
      <ul className="prediction-evidence">
        {evidence.map((item) => (
          <li key={`${item.type}-${item.team || item.label || ""}`}>
            <strong>{item.label || item.type}</strong>
            {item.facts?.wins != null && item.facts?.matches != null ? (
              <span>
                {item.facts.wins}/{item.facts.matches}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

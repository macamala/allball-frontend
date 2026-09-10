import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LANGUAGES } from "../i18n/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import ArticleCard from "../components/ArticleCard.jsx";

export default function ProfilePage() {
  const { user, loading, logout, updateProfile, favorites, saved } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState(lang);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPageSeo({
      title: "Profile | NinkoSports",
      description: "Manage your NinkoSports account.",
      path: "/profile",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, navigate, user]);

  useEffect(() => {
    if (user) {
      setName(user.display_name || "");
      setLanguage(user.preferred_language || lang);
    }
  }, [lang, user]);

  if (!user) return <p className="info-text">Loading profile...</p>;

  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await updateProfile({ display_name: name, preferred_language: language });
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err.detail || "Could not save profile.");
    }
  };

  return (
    <div className="profile-page">
      <h1>{t("profile.title")}</h1>
      <div className="profile-card">
        <div className="avatar-placeholder" aria-hidden="true">
          {(user.display_name || "N").slice(0, 1).toUpperCase()}
        </div>
        <form className="auth-form" onSubmit={save}>
          <label htmlFor="profile-name">{t("auth.displayName")}</label>
          <input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            required
          />
          <p>
            {t("auth.email")}: {user.email}
          </p>
          <p>
            {t("profile.created")}: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          </p>
          <label htmlFor="profile-language">{t("profile.language")}</label>
          <select
            id="profile-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
          {message ? <p className="info-text">{message}</p> : null}
          <button type="submit" className="btn">
            {t("profile.save")}
          </button>
        </form>
      </div>

      <section className="section">
        <h2>{t("followedSports")}</h2>
        <p>
          {(favorites.sports || []).join(", ") || "None yet."}{" "}
          <Link to="/my-sports">{t("nav.mySports")}</Link>
        </p>
      </section>

      <section className="section">
        <h2>{t("nav.saved")}</h2>
        {saved.length === 0 ? (
          <p>{t("saved.empty")}</p>
        ) : (
          <div className="sport-story-list">
            {saved.slice(0, 6).map((article) => (
              <ArticleCard key={article.id || article.slug} article={article} variant="row" />
            ))}
          </div>
        )}
        <p>
          <Link to="/saved">{t("nav.saved")}</Link>
        </p>
      </section>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
      >
        {t("nav.logout")}
      </button>
    </div>
  );
}

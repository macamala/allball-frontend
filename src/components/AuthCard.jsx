import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthProviders, startSocialLogin } from "../api.js";
import { useI18n } from "../context/I18nContext.jsx";

export function PasswordField({ id, label, value, onChange, autoComplete, required = true }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange}
          required={required}
          minLength={8}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
        >
          {visible ? t("auth.hidePassword") : t("auth.showPassword")}
        </button>
      </div>
    </div>
  );
}

export function SocialButtons() {
  const { t } = useI18n();
  const [providers, setProviders] = useState({ google: false, facebook: false });

  useEffect(() => {
    getAuthProviders()
      .then(setProviders)
      .catch(() => setProviders({ google: false, facebook: false }));
  }, []);

  const start = async (provider) => {
    const data = await startSocialLogin(provider);
    if (data?.authorize_url) {
      window.location.assign(data.authorize_url);
    }
  };

  if (!providers.google && !providers.facebook) return null;

  return (
    <div className="social-auth">
      {providers.google ? (
        <button type="button" className="btn btn-ghost" onClick={() => start("google")}>
          {t("auth.google")}
        </button>
      ) : null}
      {providers.facebook ? (
        <button type="button" className="btn btn-ghost" onClick={() => start("facebook")}>
          {t("auth.facebook")}
        </button>
      ) : null}
    </div>
  );
}

export default function AuthCard({ title, children }) {
  const { t } = useI18n();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">NinkoSports</p>
        <h1>{title}</h1>
        <p className="auth-tagline">{t("auth.tagline")}</p>
        {children}
      </div>
    </div>
  );
}

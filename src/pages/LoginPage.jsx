import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import AuthCard, { PasswordField, SocialButtons } from "../components/AuthCard.jsx";

export default function LoginPage() {
  const { login, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPageSeo({
      title: `${t("nav.login")} | NinkoSports`,
      description: t("auth.tagline"),
      path: "/login",
      noindex: true,
    });
  }, [t]);

  useEffect(() => {
    if (user) navigate("/profile", { replace: true });
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/profile");
    } catch (err) {
      setError(err.detail || t("auth.failedLogin"));
    }
  };

  return (
    <AuthCard title={t("nav.login")}>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="login-email">{t("auth.email")}</label>
        <input
          id="login-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          id="login-password"
          label={t("auth.password")}
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="btn">
          {t("auth.ctaLogin")}
        </button>
      </form>
      <SocialButtons />
      <p className="auth-switch">
        {t("auth.needAccount")} <Link to="/register">{t("nav.register")}</Link>
      </p>
    </AuthCard>
  );
}

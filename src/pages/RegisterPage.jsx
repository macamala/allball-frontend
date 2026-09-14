import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";
import AuthCard, { PasswordField, SocialButtons } from "../components/AuthCard.jsx";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPageSeo({
      title: `${t("nav.register")} | NinkoSports`,
      description: t("auth.tagline"),
      path: "/register",
      noindex: true,
    });
  }, [t]);

  useEffect(() => {
    if (user) navigate("/profile", { replace: true });
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("auth.mismatch"));
      return;
    }
    try {
      await register({ email, password, display_name: displayName });
      navigate("/profile");
    } catch (err) {
      setError(err.detail || t("auth.failedRegister"));
    }
  };

  return (
    <AuthCard title={t("nav.register")}>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="register-name">{t("auth.displayName")}</label>
        <input
          id="register-name"
          value={displayName}
          autoComplete="nickname"
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          required
        />
        <label htmlFor="register-email">{t("auth.email")}</label>
        <input
          id="register-email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordField
          id="register-password"
          label={t("auth.password")}
          value={password}
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          id="register-confirm"
          label={t("auth.passwordConfirm")}
          value={confirm}
          autoComplete="new-password"
          onChange={(event) => setConfirm(event.target.value)}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="btn">
          {t("auth.ctaRegister")}
        </button>
      </form>
      <SocialButtons />
      <p className="auth-switch">
        {t("auth.haveAccount")} <Link to="/login">{t("nav.login")}</Link>
      </p>
    </AuthCard>
  );
}

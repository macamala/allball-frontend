import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPageSeo({
      title: "Register | NinkoSports",
      description: "Create a NinkoSports account to comment, save stories and follow sports.",
      path: "/register",
      noindex: true,
    });
  }, []);

  useEffect(() => {
    if (user) navigate("/profile", { replace: true });
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register({ email, password, display_name: displayName });
      navigate("/profile");
    } catch (err) {
      setError(err.detail || "Could not create the account.");
    }
  };

  return (
    <div className="auth-page">
      <h1>{t("nav.register")}</h1>
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
        <label htmlFor="register-password">{t("auth.password")}</label>
        <input
          id="register-password"
          type="password"
          value={password}
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="btn">
          {t("auth.create")}
        </button>
      </form>
      <p className="auth-switch">
        {t("auth.haveAccount")} <Link to="/login">{t("nav.login")}</Link>
      </p>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { setPageSeo } from "../lib/seo.js";

export default function LoginPage() {
  const { login, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPageSeo({
      title: "Log in | NinkoSports",
      description: "Sign in to NinkoSports to comment, save stories and follow sports.",
      path: "/login",
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
      await login({ email, password });
      navigate("/profile");
    } catch (err) {
      setError(err.detail || "Could not sign in.");
    }
  };

  return (
    <div className="auth-page">
      <h1>{t("nav.login")}</h1>
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
        <label htmlFor="login-password">{t("auth.password")}</label>
        <input
          id="login-password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="btn">
          {t("nav.login")}
        </button>
      </form>
      <p className="auth-switch">
        {t("auth.needAccount")} <Link to="/register">{t("nav.register")}</Link>
      </p>
    </div>
  );
}

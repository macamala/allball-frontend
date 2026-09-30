import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LanguageSelect from "./LanguageSelect.jsx";
import { I18nProvider, useI18n } from "../context/I18nContext.jsx";

vi.mock("../config/siteLanguages.js", () => ({ SITE_LANGUAGES_ENABLED: false }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: () => ({ user: null }) }));
afterEach(() => { cleanup(); localStorage.clear(); });

function Reader() {
  const { lang, t, setLang } = useI18n();
  return <><p>{lang}: {t("nav.home")}</p>
    <button onClick={() => setLang("sr")}>Restore profile preference</button>
    <LanguageSelect id="header-language" /><LanguageSelect id="mobile-language" /></>;
}

it("keeps English and removes both selectors even for a previously Serbian reader", () => {
  localStorage.setItem("ninkosports.lang", "sr");
  render(<I18nProvider><Reader /></I18nProvider>);
  expect(screen.getByText("en: Home")).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("en: Home")).toBeTruthy();
  expect(localStorage.getItem("ninkosports.lang")).toBe("sr");
});

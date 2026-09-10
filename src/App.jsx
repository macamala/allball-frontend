import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ArticlePage from "./pages/ArticlePage.jsx";
import SportPage from "./pages/SportPage.jsx";
import LeaguePage from "./pages/LeaguePage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import LiveScoresPage from "./pages/LiveScoresPage.jsx";
import MySportsPage from "./pages/MySportsPage.jsx";
import MatchPage from "./pages/MatchPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SavedPage from "./pages/SavedPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:slug" element={<ArticlePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/live-scores" element={<LiveScoresPage />} />
        <Route path="/scores" element={<Navigate to="/live-scores" replace />} />
        <Route path="/my-sports" element={<MySportsPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
        <Route path="/:sportSlug" element={<SportPage />} />
        <Route path="/:sportSlug/:leagueSlug" element={<LeaguePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getJSON, sendJSON, setCsrfToken } from "../api.js";
import { emptyFavorites, readFavorites, writeFavorites } from "../lib/favorites.js";
import { readSaved, writeSaved } from "../lib/saved.js";
import { writeLanguage } from "../i18n/index.js";
import { useI18n } from "./I18nContext.jsx";

const AuthContext = createContext({
  user: null,
  loading: true,
  favorites: emptyFavorites(),
  saved: [],
});

export function AuthProvider({ children }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => readFavorites());
  const [saved, setSaved] = useState(() => readSaved());

  const refresh = useCallback(async () => {
    try {
      const session = await getJSON("/auth/session");
      if (session?.csrf) setCsrfToken(session.csrf);
      setUser(session?.user || null);
      if (session?.user) {
        if (session.user.preferred_language) {
          setLang(session.user.preferred_language);
        }
        const [remoteFavs, remoteSaved] = await Promise.all([
          getJSON("/auth/favorites"),
          getJSON("/auth/saved"),
        ]);
        const mergedFavs = writeFavorites({
          sports: [...(readFavorites().sports || []), ...(remoteFavs.sports || [])],
          leagues: [...(readFavorites().leagues || []), ...(remoteFavs.leagues || [])],
          teams: [...(readFavorites().teams || []), ...(remoteFavs.teams || [])],
        });
        await sendJSON("/auth/favorites", "PUT", mergedFavs);
        setFavorites(mergedFavs);
        const localSaved = readSaved();
        await Promise.all(
          localSaved
            .filter((item) => item?.id)
            .map((item) => sendJSON(`/auth/saved/${item.id}`, "PUT").catch(() => null))
        );
        const latestSaved = await getJSON("/auth/saved");
        setSaved(writeSaved(Array.isArray(latestSaved) ? latestSaved : []));
      } else {
        setFavorites(readFavorites());
        setSaved(readSaved());
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setLang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = async (payload) => {
    const data = await sendJSON("/auth/register", "POST", payload);
    if (data.csrf) setCsrfToken(data.csrf);
    setUser(data.user);
    await refresh();
    return data.user;
  };

  const login = async (payload) => {
    const data = await sendJSON("/auth/login", "POST", payload);
    if (data.csrf) setCsrfToken(data.csrf);
    setUser(data.user);
    await refresh();
    return data.user;
  };

  const logout = async () => {
    await sendJSON("/auth/logout", "POST");
    setUser(null);
    setFavorites(readFavorites());
    setSaved(readSaved());
  };

  const updateProfile = async (payload) => {
    const data = await sendJSON("/auth/profile", "PATCH", payload);
    setUser(data.user);
    if (payload.preferred_language) {
      writeLanguage(payload.preferred_language);
      setLang(payload.preferred_language);
    }
    return data.user;
  };

  const syncFavorites = async (next) => {
    const local = writeFavorites(next);
    setFavorites(local);
    if (user) {
      const remote = await sendJSON("/auth/favorites", "PUT", local);
      const savedFavs = writeFavorites(remote);
      setFavorites(savedFavs);
      return savedFavs;
    }
    return local;
  };

  const toggleSave = async (article) => {
    if (!article) return saved;
    if (user && article.id) {
      const exists = saved.some((item) => item.id === article.id);
      if (exists) {
        await sendJSON(`/auth/saved/${article.id}`, "DELETE");
      } else {
        await sendJSON(`/auth/saved/${article.id}`, "PUT");
      }
      const remote = await getJSON("/auth/saved");
      const next = writeSaved(Array.isArray(remote) ? remote : []);
      setSaved(next);
      return next;
    }
    const next = writeSaved(
      saved.some((item) => item.id === article.id || item.slug === article.slug)
        ? saved.filter((item) => item.id !== article.id && item.slug !== article.slug)
        : [article, ...saved]
    );
    setSaved(next);
    return next;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      favorites,
      saved,
      register,
      login,
      logout,
      updateProfile,
      syncFavorites,
      toggleSave,
      refresh,
    }),
    [favorites, loading, saved, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Paused at the owner's request. Keep existing dictionaries/cached articles so
// localization can be enabled again later without rebuilding the News system.
export const SITE_LANGUAGES_ENABLED = import.meta.env.VITE_SITE_LANGUAGES_ENABLED === "true";

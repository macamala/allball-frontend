const STORAGE_KEY = "ninkosports.lang";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sr", label: "Srpski" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
];

const en = {
  "nav.home": "Home",
  "nav.mySports": "My Sports",
  "nav.search": "Search",
  "nav.login": "Log in",
  "nav.register": "Register",
  "nav.profile": "Profile",
  "nav.logout": "Log out",
  "nav.saved": "Saved articles",
  "nav.menu": "Menu",
  "nav.close": "Close",
  "nav.language": "Language",
  "search.placeholder": "Search stories",
  "search.submit": "Search",
  "latest": "Latest news",
  "mostRead": "Most read",
  "trending": "Trending",
  "followedSports": "My Sports",
  "liveScores": "Live scores",
  "todaysMatches": "Today's matches",
  "related": "Related stories",
  "comments": "Comments",
  "comments.count": "{n} comments",
  "comments.signIn": "Sign in to comment",
  "comments.placeholder": "Share your view of this match or story",
  "comments.post": "Post comment",
  "comments.reply": "Reply",
  "comments.like": "Like",
  "comments.edit": "Edit",
  "comments.delete": "Delete",
  "comments.report": "Report",
  "comments.newest": "Newest",
  "comments.oldest": "Oldest",
  "save": "Save article",
  "saved": "Saved",
  "follow": "Follow",
  "following": "Following",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.displayName": "Display name",
  "auth.create": "Create account",
  "auth.haveAccount": "Already have an account?",
  "auth.needAccount": "Need an account?",
  "profile.title": "Your profile",
  "profile.created": "Member since",
  "profile.language": "Preferred language",
  "profile.save": "Save profile",
  "saved.empty": "No saved articles yet.",
  "favorites.hint": "Follow sports and leagues to personalize NinkoSports.",
  "skip": "Skip to content",
  "footer.copy": "Original English sports coverage. Football, basketball, tennis and motorsport.",
};

const sr = {
  ...en,
  "nav.home": "Početna",
  "nav.mySports": "Moji sportovi",
  "nav.search": "Pretraga",
  "nav.login": "Prijava",
  "nav.register": "Registracija",
  "nav.profile": "Profil",
  "nav.logout": "Odjava",
  "nav.saved": "Sačuvani članci",
  "nav.menu": "Meni",
  "nav.close": "Zatvori",
  "nav.language": "Jezik",
  "search.placeholder": "Pretraži vesti",
  "search.submit": "Traži",
  "latest": "Najnovije",
  "mostRead": "Najčitanije",
  "followedSports": "Moji sportovi",
  "comments": "Komentari",
  "comments.signIn": "Prijavite se da komentarišete",
  "comments.post": "Pošalji komentar",
  "comments.reply": "Odgovori",
  "save": "Sačuvaj",
  "saved": "Sačuvano",
  "follow": "Prati",
  "following": "Pratite",
  "auth.email": "Email",
  "auth.password": "Lozinka",
  "auth.displayName": "Ime",
  "auth.create": "Napravi nalog",
  "profile.title": "Vaš profil",
  "footer.copy": "Originalne sportske vesti na engleskom. Fudbal, košarka, tenis i motorsport.",
};

const es = {
  ...en,
  "nav.home": "Inicio",
  "nav.mySports": "Mis deportes",
  "nav.search": "Buscar",
  "nav.login": "Entrar",
  "nav.register": "Registro",
  "nav.profile": "Perfil",
  "nav.logout": "Salir",
  "nav.saved": "Artículos guardados",
  "nav.menu": "Menú",
  "nav.close": "Cerrar",
  "nav.language": "Idioma",
  "latest": "Últimas noticias",
  "mostRead": "Más leídas",
  "comments": "Comentarios",
  "comments.signIn": "Inicia sesión para comentar",
  "save": "Guardar",
  "saved": "Guardado",
  "follow": "Seguir",
  "following": "Siguiendo",
};

const de = {
  ...en,
  "nav.home": "Start",
  "nav.mySports": "Meine Sportarten",
  "nav.search": "Suche",
  "nav.login": "Anmelden",
  "nav.register": "Registrieren",
  "nav.profile": "Profil",
  "nav.logout": "Abmelden",
  "nav.saved": "Gespeicherte Artikel",
  "nav.menu": "Menü",
  "nav.close": "Schließen",
  "nav.language": "Sprache",
  "latest": "Neueste Nachrichten",
  "mostRead": "Meistgelesen",
  "comments": "Kommentare",
  "comments.signIn": "Zum Kommentieren anmelden",
  "save": "Speichern",
  "saved": "Gespeichert",
  "follow": "Folgen",
  "following": "Gefolgt",
};

const fr = {
  ...en,
  "nav.home": "Accueil",
  "nav.mySports": "Mes sports",
  "nav.search": "Recherche",
  "nav.login": "Connexion",
  "nav.register": "Inscription",
  "nav.profile": "Profil",
  "nav.logout": "Déconnexion",
  "nav.saved": "Articles enregistrés",
  "nav.menu": "Menu",
  "nav.close": "Fermer",
  "nav.language": "Langue",
  "latest": "Dernières actus",
  "mostRead": "Les plus lus",
  "comments": "Commentaires",
  "comments.signIn": "Connectez-vous pour commenter",
  "save": "Enregistrer",
  "saved": "Enregistré",
  "follow": "Suivre",
  "following": "Suivi",
};

const it = {
  ...en,
  "nav.home": "Home",
  "nav.mySports": "I miei sport",
  "nav.search": "Cerca",
  "nav.login": "Accedi",
  "nav.register": "Registrati",
  "nav.profile": "Profilo",
  "nav.logout": "Esci",
  "nav.saved": "Articoli salvati",
  "nav.menu": "Menu",
  "nav.close": "Chiudi",
  "nav.language": "Lingua",
  "latest": "Ultime notizie",
  "mostRead": "Più letti",
  "comments": "Commenti",
  "comments.signIn": "Accedi per commentare",
  "save": "Salva",
  "saved": "Salvato",
  "follow": "Segui",
  "following": "Seguito",
};

const pt = {
  ...en,
  "nav.home": "Início",
  "nav.mySports": "Meus esportes",
  "nav.search": "Buscar",
  "nav.login": "Entrar",
  "nav.register": "Registrar",
  "nav.profile": "Perfil",
  "nav.logout": "Sair",
  "nav.saved": "Artigos salvos",
  "nav.menu": "Menu",
  "nav.close": "Fechar",
  "nav.language": "Idioma",
  "latest": "Últimas notícias",
  "mostRead": "Mais lidas",
  "comments": "Comentários",
  "comments.signIn": "Entre para comentar",
  "save": "Salvar",
  "saved": "Salvo",
  "follow": "Seguir",
  "following": "Seguindo",
};

export const DICTS = { en, sr, es, de, fr, it, pt };

export function readLanguage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (DICTS[value]) return value;
  } catch (err) {
    // Ignore unavailable storage.
  }
  return "en";
}

export function writeLanguage(code) {
  const next = DICTS[code] ? code : "en";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (err) {
    // Ignore unavailable storage.
  }
  return next;
}

export function translate(lang, key, vars = {}) {
  const table = DICTS[lang] || en;
  let value = table[key] || en[key] || key;
  Object.entries(vars).forEach(([name, item]) => {
    value = value.replaceAll(`{${name}}`, String(item));
  });
  return value;
}

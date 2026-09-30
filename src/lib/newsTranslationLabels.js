const labels = {
  en: ["Loading translation…", "This translation is not ready yet. The English original is shown.", "Check translation"],
  sr: ["Učitavam prevod…", "Prevod još nije spreman. Prikazan je original na engleskom.", "Proveri prevod"],
  es: ["Cargando traducción…", "La traducción aún no está disponible. Se muestra el original en inglés.", "Comprobar traducción"],
  de: ["Übersetzung wird geladen…", "Die Übersetzung ist noch nicht verfügbar. Das englische Original wird angezeigt.", "Übersetzung prüfen"],
  fr: ["Chargement de la traduction…", "La traduction n’est pas encore disponible. L’original anglais est affiché.", "Vérifier la traduction"],
  it: ["Caricamento della traduzione…", "La traduzione non è ancora disponibile. Viene mostrato l’originale inglese.", "Controlla la traduzione"],
  pt: ["A carregar tradução…", "A tradução ainda não está disponível. É apresentado o original em inglês.", "Verificar tradução"],
};
export const newsTranslationLabels = (language) => labels[language] || labels.en;

export const MEDIA_KINDS = {
  EDITORIAL_PHOTO: "EDITORIAL_PHOTO",
  CREST_OR_LOGO: "CREST_OR_LOGO",
  GRAPHIC: "GRAPHIC",
  UNKNOWN: "UNKNOWN",
  MISSING: "MISSING",
};

export function publicMediaKind(article, item) {
  return (
    item?.presentation ||
    item?.media_kind ||
    article?.hero_media_kind ||
    MEDIA_KINDS.UNKNOWN
  );
}

export function isCrestMedia(kind) {
  return kind === MEDIA_KINDS.CREST_OR_LOGO || kind === MEDIA_KINDS.GRAPHIC;
}

export function isLeadHeroMedia(kind) {
  return kind === MEDIA_KINDS.EDITORIAL_PHOTO;
}

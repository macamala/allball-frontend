"""Apply the reviewed asset-only changes on the isolated checkpoint11 branch."""
from pathlib import Path
import subprocess
subprocess.run(['git','merge-base','--is-ancestor','99653b3e9af022cfedc430b43e94466720783d57','HEAD'],check=True)

def change(path, old, new):
    p=Path(path); s=p.read_text()
    assert old in s, (path,old)
    p.write_text(s.replace(old,new,1))

insert=r'''// ISO spellings complement the existing sports-provider codes (GER, CRO, etc.).
const ISO3_FALLBACK = {"ABW":"AW","AGO":"AO","AIA":"AI","ALA":"AX","ARE":"AE","ASM":"AS","ATA":"AQ","ATF":"TF","ATG":"AG","BES":"BQ","BGR":"BG","BHS":"BS","BLM":"BL","BLZ":"BZ","BMU":"BM","BRN":"BN","BTN":"BT","BVT":"BV","BWA":"BW","CCK":"CC","CHE":"CH","COG":"CG","COK":"CK","CRI":"CR","CUW":"CW","CXR":"CX","CYM":"KY","DEU":"DE","DNK":"DK","DZA":"DZ","ESH":"EH","FJI":"FJ","FLK":"FK","FRO":"FO","FSM":"FM","GBR":"GB","GGY":"GG","GIB":"GI","GIN":"GN","GLP":"GP","GNQ":"GQ","GRC":"GR","GRD":"GD","GRL":"GL","GUF":"GF","GUM":"GU","HMD":"HM","HRV":"HR","HTI":"HT","IMN":"IM","IOT":"IO","JEY":"JE","KHM":"KH","KIR":"KI","KNA":"KN","KWT":"KW","LKA":"LK","LSO":"LS","MAC":"MO","MAF":"MF","MCO":"MC","MDG":"MG","MHL":"MH","MMR":"MM","MNP":"MP","MRT":"MR","MSR":"MS","MTQ":"MQ","MUS":"MU","MYS":"MY","MYT":"YT","NCL":"NC","NER":"NE","NFK":"NF","NIC":"NI","NIU":"NU","NLD":"NL","NPL":"NP","NRU":"NR","OMN":"OM","PCN":"PN","PHL":"PH","PLW":"PW","PRI":"PR","PRK":"KP","PRT":"PT","PSE":"PS","PYF":"PF","REU":"RE","SAU":"SA","SDN":"SD","SGS":"GS","SHN":"SH","SJM":"SJ","SLB":"SB","SPM":"PM","SXM":"SX","SYC":"SC","TCA":"TC","TCD":"TD","TGO":"TG","TKL":"TK","TON":"TO","TTO":"TT","TUV":"TV","TWN":"TW","TZA":"TZ","UMI":"UM","URY":"UY","VAT":"VA","VCT":"VC","VGB":"VG","VIR":"VI","VNM":"VN","VUT":"VU","WLF":"WF","WSM":"WS","ZAF":"ZA","ZWE":"ZW"};
const FLAG_CODES = new Set("ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws xk ye yt za zm zw".split(" "));
const HOME_NATION_FLAGS = {
  england: "gb-eng", eng: "gb-eng", "gb-eng": "gb-eng",
  scotland: "gb-sct", sco: "gb-sct", "gb-sct": "gb-sct",
  wales: "gb-wls", wal: "gb-wls", "gb-wls": "gb-wls",
  "northern-ireland": "gb-nir", nir: "gb-nir", "gb-nir": "gb-nir",
};

// Real PNG flags do not depend on the operating system's flag-emoji font.
// Public-domain images: https://flagpedia.net/download/api
export function flagImageUrl(countryId) {
  const key = String(countryId || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  const homeNation = HOME_NATION_FLAGS[key];
  const code = homeNation || isoFromCountry(countryId).toLowerCase();
  return code && (homeNation || FLAG_CODES.has(code)) ? `https://flagcdn.com/w40/${code}.png` : "";
}

'''
change('src/lib/identityAssets.js','function isoFromCountry(value) {',insert+'function isoFromCountry(value) {')
change('src/lib/identityAssets.js','ALPHA3_TO_ISO[raw.toUpperCase()] || ""','ALPHA3_TO_ISO[raw.toUpperCase()] || ISO3_FALLBACK[raw.toUpperCase()] || ""')
Path('src/components/scores/CountryFlag.jsx').write_text('''import React, { useState } from "react";
import { flagImageUrl } from "../../lib/identityAssets.js";

export default function CountryFlag({ countryId, label = "", size = 20, className = "" }) {
  const src = flagImageUrl(countryId);
  const [failedSrc, setFailedSrc] = useState("");
  if (!src) return null;
  if (failedSrc === src) {
    return <span className={className} data-asset-missing="country-flag" aria-label={`${label || countryId} flag unavailable`}>◻</span>;
  }
  return (
    <img className={className} data-country-flag={countryId} src={src}
      alt={label || String(countryId)} width={size} height={size}
      style={{ display: "inline-block", objectFit: "contain", flexShrink: 0, verticalAlign: "middle" }}
      loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
  );
}
''')
imports='import { flagImageUrl } from "../../lib/identityAssets.js";\nimport CountryFlag from "./CountryFlag.jsx";\nimport { normalizeAssetUrl } from "../../lib/assetUrls.js";'
for path in ('src/components/scores/EventList.jsx','src/components/scores/MatchCentre.jsx'):
    change(path,'import { flagEmoji } from "../../lib/identityAssets.js";',imports)
change('src/components/scores/EventList.jsx','<span className="score-comp-flag">{flag}</span>','<CountryFlag countryId={flag} className="score-comp-flag" />')
change('src/components/scores/EventList.jsx','const logo = group.events.find((item) => item.competition_logo)?.competition_logo;','const logo = normalizeAssetUrl(group.events.find((item) => item.competition_logo)?.competition_logo);')
change('src/components/scores/EventList.jsx','meta.showFlag ? flagEmoji(meta.countryId) : ""','meta.showFlag && flagImageUrl(meta.countryId) ? meta.countryId : ""')
change('src/components/scores/MatchCentre.jsx','logo: event.competition_logo || "",','logo: normalizeAssetUrl(event.competition_logo),')
change('src/components/scores/MatchCentre.jsx','presented.showFlag ? flagEmoji(presented.countryId) : ""','presented.showFlag && flagImageUrl(presented.countryId) ? presented.countryId : ""')
change('src/components/scores/MatchCentre.jsx','<span className="mc-comp-flag">{flag}</span>','<CountryFlag countryId={flag} className="mc-comp-flag" size={24} />')
change('src/components/scores/Crest.jsx','crestInitial, flagEmoji, sideCountries, sideLogo','crestInitial, flagImageUrl, sideCountries, sideLogo')
change('src/components/scores/Crest.jsx','export default function Crest','import CountryFlag from "./CountryFlag.jsx";\n\nexport default function Crest')
change('src/components/scores/Crest.jsx','sideCountries(side, fallbackCountry).map(flagEmoji).filter(Boolean)','sideCountries(side, fallbackCountry).filter((value) => flagImageUrl(value))')
change('src/components/scores/Crest.jsx','<span key={`${item}-${index}`}>{item}</span>','<CountryFlag key={`${item}-${index}`} countryId={item} size={Math.max(12, size / 2)} />')
change('src/components/scores/Crest.jsx','flag || initials','flag ? <CountryFlag countryId={flag} size={size} /> : initials')
Path('src/lib/assetUrls.js').write_text(r'''// Only expand known FIFA image routes, preserving the exact source entity ID.
export function normalizeAssetUrl(value) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.host !== "api.fifa.com" || url.username || url.password) return value;
    const match = decodeURIComponent(url.pathname).match(/^\/api\/v3\/picture\/(flags|teams)-\{format\}-\{size\}\/([A-Za-z0-9_-]{1,128})$/);
    if (!match) return value;
    url.pathname = `/api/v3/picture/${match[1]}-sq-2/${match[2]}`;
    return url.toString();
  } catch {
    return value;
  }
}
''')
p=Path('src/lib/sportsData.js');s=p.read_text();s='import { normalizeAssetUrl } from "./assetUrls.js";\n'+s
start=s.index('export function participantLogo(');end=s.index('\n}',start);part=s[start:end];assert 'return (' in part
s=s[:start]+part.replace('return (','return normalizeAssetUrl(',1)+s[end:];p.write_text(s)

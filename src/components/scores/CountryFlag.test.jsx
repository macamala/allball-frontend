import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CountryFlag from "./CountryFlag.jsx";
import Crest from "./Crest.jsx";
import { flagImageUrl } from "../../lib/identityAssets.js";
import { participantLogo } from "../../lib/sportsData.js";
import { normalizeAssetUrl } from "../../lib/assetUrls.js";
afterEach(cleanup);

describe("real flags on all operating systems", () => {
  it.each([["RS","rs"],["SRB","rs"],["Serbia","rs"],["DEU","de"],["GER","de"],["CRO","hr"],["HRV","hr"],
    ["ENG","gb-eng"],["Scotland","gb-sct"],["WAL","gb-wls"],["Northern Ireland","gb-nir"],["GB-SCT","gb-sct"],
    ["KOS","xk"],["MYA","mm"],["TLS","tl"],["FRO","fo"]])("%s maps to the correct flag", (country, code) => {
    expect(flagImageUrl(country)).toBe(`https://flagcdn.com/w40/${code}.png`);
    render(<CountryFlag countryId={country} />);
    expect(screen.getByRole("img")).toHaveAttribute("src",`https://flagcdn.com/w40/${code}.png`);
  });
  it.each(["",null,"INT","world","europe","ZZ","<script>"])("does not invent a national flag for %s", (value) => {
    expect(flagImageUrl(value)).toBe("");
  });
  it("reports a broken image honestly and recovers when the country changes", () => {
    const {rerender,container}=render(<CountryFlag countryId="RS" />);
    fireEvent.error(screen.getByRole("img"));
    expect(container.querySelector('[data-asset-missing="country-flag"]')).not.toBeNull();
    rerender(<CountryFlag countryId="AU" />);
    expect(screen.getByRole("img")).toHaveAttribute("src","https://flagcdn.com/w40/au.png");
  });
  it("keeps real club crests ahead of country flags", () => {
    render(<Crest side={{name:"Club",logo:"https://official.example/club.png",country_id:"RS"}} />);
    expect(document.querySelector("img")).toHaveAttribute("src","https://official.example/club.png");
  });
  it("uses actual flag images for a two-country doubles participant", () => {
    const {container}=render(<Crest side={{name:"Pair",country_ids:["RS","AU"]}} />);
    expect([...container.querySelectorAll("img")].map(x=>x.getAttribute('src'))).toEqual(["https://flagcdn.com/w40/rs.png","https://flagcdn.com/w40/au.png"]);
  });
});

describe("source-provided FIFA artwork templates",()=>{
  it.each([["flags","MYA"],["flags","TLS"],["teams","1894031"],["teams","1885981"]])("expands %s %s without changing identity",(kind,id)=>{
    const value=`https://api.fifa.com/api/v3/picture/${kind}-{format}-{size}/${id}`;
    const expected=`https://api.fifa.com/api/v3/picture/${kind}-sq-2/${id}`;
    expect(normalizeAssetUrl(value)).toBe(expected);expect(participantLogo({logo:value})).toBe(expected);
    expect(normalizeAssetUrl(value.replaceAll('{','%7B').replaceAll('}','%7D'))).toBe(expected);
  });
  it.each(['https://official.example/image.png','https://api.fifa.com.evil.invalid/api/v3/picture/flags-{format}-{size}/MYA',
    'https://user@api.fifa.com/api/v3/picture/flags-{format}-{size}/MYA','https://api.fifa.com/api/v3/picture/flags-sq-2/MYA',
    'http://api.fifa.com/api/v3/picture/flags-{format}-{size}/MYA'])('leaves %s unchanged',value=>expect(normalizeAssetUrl(value)).toBe(value));
});

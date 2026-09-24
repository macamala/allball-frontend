import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../context/I18nContext.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import MatchCentre from "./MatchCentre.jsx";
import StandingsTable from "../StandingsTable.jsx";

const event = { id:"serbia-greece", sport:"football", competition_key:"uefa-nations-league",
  group:"UEFA Nations League A Grp. 2", stage:"UEFA Nations League A", status:"finished",
  score:{home:1,away:2},home:{name:"Serbia",id:"1"},away:{name:"Greece",id:"2"} };
const rows = [
  {team:"Serbia",team_id:"1",stage:event.stage,group:event.group,played:0,points:0},
  {team:"Greece",team_id:"2",stage:event.stage,group:event.group,played:0,points:0},
  {team:"Austria",team_id:"3",stage:"UEFA Nations League B",group:"UEFA Nations League B Grp. 3",played:0,points:0},
  {team:"Israel",team_id:"4",stage:"UEFA Nations League B",group:"UEFA Nations League B Grp. 3",played:0,points:0},
];
beforeEach(() => {
  global.fetch=vi.fn(()=>Promise.resolve({ok:true,status:200,text:async()=>JSON.stringify({user:null,csrf:"t"})}));
});
it("shows only the match group and lets the user select a different group",()=>{
  render(<MemoryRouter><StandingsTable rows={rows} sport="football" event={event}/></MemoryRouter>);
  expect(within(screen.getByRole("table")).getByText("Serbia")).toBeTruthy();
  expect(within(screen.getByRole("table")).queryByText("Austria")).toBeNull();
  expect(screen.getAllByText("0")).toHaveLength(4);
  const select=screen.getByRole("combobox",{name:"Standings group"});
  fireEvent.change(select,{target:{value:select.options[1].value}});
  expect(within(screen.getByRole("table")).getByText("Austria")).toBeTruthy();
  expect(within(screen.getByRole("table")).queryByText("Serbia")).toBeNull();
});
it("retains the Table deep link while its data is still loading",()=>{
  const view=(tableRows)=><I18nProvider><MemoryRouter initialEntries={["/scores/event/serbia-greece#mc-standings"]}><AuthProvider><MatchCentre event={event} data={{}} standings={tableRows}/></AuthProvider></MemoryRouter></I18nProvider>;
  const {rerender}=render(view([]));
  expect(screen.queryByRole("table")).toBeNull();
  rerender(view(rows));
  expect(document.getElementById("mc-panel-standings").hidden).toBe(false);
  expect(document.getElementById("mc-tab-standings").getAttribute("aria-selected")).toBe("true");
  expect(within(screen.getByRole("table")).getByText("Serbia")).toBeTruthy();
  expect(within(screen.getByRole("table")).queryByText("Austria")).toBeNull();
});

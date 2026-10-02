import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const css=readFileSync(resolve(process.cwd(),'src/styles/newsFootballData.css'),'utf8');
it('uses paired NinkoSports theme tokens for readable News data',()=>{
  expect(css).not.toContain('var(--surface,');
  expect(css).toContain('background:var(--ns-surface,#102844)');
  expect(css).toContain('color:var(--ns-text,#f5f8fd)');
  expect(css).toContain('color:var(--ns-text-secondary,#c5d4ea)');
  expect(css).toContain('.news-football-data .standings-view-toggle');
});

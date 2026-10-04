import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {it,expect,afterEach,vi} from 'vitest';
import ArticleImage from './ArticleImage.jsx';
import NewsAutoRefresh from './NewsAutoRefresh.jsx';
import {isPublisherBranding} from '../lib/newsMedia.js';
import {publishedNewsRows} from '../lib/newsFreshness.js';
const bad='https://www.soccernews.com/og/og-image.png';
afterEach(()=>{cleanup();vi.useRealTimers();});
it.each([bad,bad+'?v=3',bad.replace('www.','')])('never renders the known publisher logo even from a cached article: %s',src=>{
 render(<ArticleImage src={src} mediaKind="EDITORIAL_PHOTO" alt="News"/>);expect(screen.queryByRole('img')).toBeNull();
 expect(isPublisherBranding(src)).toBe(true);
});
it('keeps the real source photograph available instead of replacing it with another placeholder',()=>{
 const src='https://images.performgroup.com/real.jpg';render(<ArticleImage src={src} mediaKind="EDITORIAL_PHOTO"/>);expect(document.querySelector('img').getAttribute('src')).toBe(src);
});
it('no publisher-card article can become a promoted front-page hero',()=>{
 const rows=[{id:1,published_at:'2026-10-03T20:00:00Z',image_url:bad},{id:2,published_at:'2026-10-03T20:00:00Z',image_url:'https://photos.test/photo.jpg'}];
 expect(publishedNewsRows(rows,new Date('2026-10-04T00:00Z')).map(r=>r.id)).toEqual([2]);
});
it('automatic News updates add no visible banner or Refresh news button',()=>{
 vi.useFakeTimers();const refresh=vi.fn();const {container}=render(<NewsAutoRefresh onRefresh={refresh}/>);
 expect(container.innerHTML).toBe('');vi.advanceTimersByTime(60000);expect(refresh).toHaveBeenCalledTimes(1);
});

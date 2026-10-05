import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metaFor } from '../utils/pageMeta.js';
import { trackPageView } from '../utils/analytics.js';

function setMeta(selector, attr, value, create) {
  let el = document.head.querySelector(selector);
  if (!el && create) {
    el = document.createElement(create.tag);
    Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

// Keeps <title>, description, canonical, Open Graph and robots in sync with
// the current route, and reports the page view to analytics (if accepted).
export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const m = metaFor(pathname);
    document.title = m.title;
    setMeta('meta[name="description"]', 'content', m.description);
    setMeta('meta[property="og:title"]', 'content', m.title);
    setMeta('meta[property="og:description"]', 'content', m.description);
    setMeta('meta[name="robots"]', 'content', m.noindex ? 'noindex, nofollow' : 'index, follow', {
      tag: 'meta',
      attrs: { name: 'robots' },
    });
    if (m.canonical) {
      setMeta('link[rel="canonical"]', 'href', m.canonical, { tag: 'link', attrs: { rel: 'canonical' } });
      setMeta('meta[property="og:url"]', 'content', m.canonical);
    } else {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    }
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

import { useEffect } from 'react';

// /guia and /etiqueta are plain static pages, not part of the app. Someone who opened the app before it existed
// still has the old offline copy, which answers every address with the app itself. If the app
// ends up here, drop that old copy (the app registers a fresh one on the next visit) and go to the page.
export default function GuiaRedirect() {
  useEffect(() => {
    let tried = false;
    try {
      tried = sessionStorage.getItem('tipit_guia_try') === '1';
      sessionStorage.setItem('tipit_guia_try', '1');
    } catch {
      // storage blocked: still try once
    }
    (async () => {
      try {
        const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // nothing to clean
      }
      if (!tried) window.location.replace(window.location.pathname.replace(/\/+$/, '') + '/');
    })();
  }, []);

  return (
    <div className="page-shell flex min-h-[60svh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-2xl font-extrabold">Abriendo…</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">Si no abre sola, toca el botón.</p>
      <a href={`${window.location.pathname.replace(/\/+$/, '')}/`} className="btn-primary mt-6">
        Abrir
      </a>
    </div>
  );
}

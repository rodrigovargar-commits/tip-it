import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, ZoomIn } from 'lucide-react';

// Pick a picture, then move and zoom it inside a round frame until it looks right. What you see in
// the frame is what gets saved (a 512 px square, small enough to send and to show on every profile).
const FRAME = 240; // size of the frame on screen
const OUT = 512; // size of the saved picture
const MAX_CHARS = 420000; // the server accepts up to ~450 000 characters

const baseScale = (img) => Math.max(FRAME / img.width, FRAME / img.height);

function clampOffset(img, zoom, off) {
  const s = baseScale(img) * zoom;
  const mx = Math.max(0, (img.width * s - FRAME) / 2);
  const my = Math.max(0, (img.height * s - FRAME) / 2);
  return { x: Math.min(mx, Math.max(-mx, off.x)), y: Math.min(my, Math.max(-my, off.y)) };
}

function paint(ctx, img, zoom, off, size) {
  const k = size / FRAME;
  const s = baseScale(img) * zoom * k;
  const w = img.width * s;
  const h = img.height * s;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, size / 2 + off.x * k - w / 2, size / 2 + off.y * k - h / 2, w, h);
}

function exportImage(img, zoom, off) {
  const c = document.createElement('canvas');
  c.width = OUT;
  c.height = OUT;
  paint(c.getContext('2d'), img, zoom, off, OUT);
  for (const q of [0.86, 0.74, 0.6, 0.48]) {
    const d = c.toDataURL('image/jpeg', q);
    if (d.length <= MAX_CHARS) return d;
  }
  return c.toDataURL('image/jpeg', 0.4);
}

export default function ImageAdjuster({ onChange, onError, currentUrl = null, label = 'Imagen' }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const inputRef = useRef(null);

  // Draw what the frame shows.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    paint(c.getContext('2d'), img, zoom, off, FRAME);
  }, [img, zoom, off]);

  // Tell the form what was saved, a moment after the person stops moving it.
  useEffect(() => {
    if (!img) return undefined;
    const t = setTimeout(() => onChange(exportImage(img, zoom, off)), 220);
    return () => clearTimeout(t);
  }, [img, zoom, off]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = useCallback(
    (file) => {
      if (!file) return;
      if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(file.type) && file.type) {
        onError?.('Elige una imagen PNG, JPG o WebP.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        onError?.('Esa imagen es demasiado grande. Elige una de menos de 15 MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      const el = new Image();
      el.onload = () => {
        URL.revokeObjectURL(url);
        setZoom(1);
        setOff({ x: 0, y: 0 });
        setImg(el);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        onError?.('No pudimos abrir esa imagen. Prueba con otra en PNG o JPG.');
      };
      el.src = url;
    },
    [onError]
  );

  const remove = () => {
    setImg(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const down = (e) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, off };
  };
  const move = (e) => {
    if (!drag.current || !img) return;
    const k = FRAME / e.currentTarget.getBoundingClientRect().width;
    const dx = (e.clientX - drag.current.x) * k;
    const dy = (e.clientY - drag.current.y) * k;
    setOff(clampOffset(img, zoom, { x: drag.current.off.x + dx, y: drag.current.off.y + dy }));
  };
  const up = () => {
    drag.current = null;
  };
  const changeZoom = (z) => {
    setZoom(z);
    if (img) setOff((o) => clampOffset(img, z, o));
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        id="image-adjuster-input"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {!img ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-punch-ink bg-white p-5 text-center">
          {currentUrl ? (
            <img src={currentUrl} alt="Imagen actual" className="h-24 w-24 rounded-full border-2 border-punch-ink object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow">
              <ImagePlus size={32} />
            </span>
          )}
          <label htmlFor="image-adjuster-input" className="btn-primary cursor-pointer !px-5 !py-2.5 text-sm">
            {currentUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </label>
          <p className="text-xs text-slate-500">Logo o foto del lugar. PNG, JPG o WebP.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-punch-ink bg-white p-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={FRAME}
              height={FRAME}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              aria-label="Arrastra para mover la imagen"
              className="h-60 w-60 max-w-full cursor-grab touch-none rounded-full border-4 border-punch-ink bg-white active:cursor-grabbing"
            />
          </div>
          <label className="flex w-full max-w-xs items-center gap-3 text-sm font-bold">
            <ZoomIn size={18} aria-hidden="true" />
            <span className="sr-only">Acercar</span>
            <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="w-full accent-[#FF8243]" />
          </label>
          <p className="text-center text-xs text-slate-500">Arrastra la imagen para moverla y usa la barra para acercarla. Así se guardará.</p>
          <div className="flex gap-2">
            <label htmlFor="image-adjuster-input" className="btn-secondary cursor-pointer !px-4 !py-2 text-sm">Cambiar imagen</label>
            <button type="button" onClick={remove} className="btn-secondary !px-4 !py-2 text-sm">
              <Trash2 size={14} className="mr-1 inline" /> Quitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

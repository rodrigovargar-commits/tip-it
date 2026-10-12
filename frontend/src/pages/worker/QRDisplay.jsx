import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Tropical punch brand tokens (same values as tailwind.config.js `punch`).
const BRAND = {
  bg: '#FF8243', // orange
  ink: '#0A2F2F',
  muted: 'rgba(10,47,47,0.75)',
  yellow: '#FCE883',
  pink: '#FFC0CB',
  teal: '#069494',
};

const FONT = '"DM Sans", Inter, system-ui, sans-serif';
const DISPLAY = '"Bricolage Grotesque", "DM Sans", system-ui, sans-serif';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Draws the TIP-IT mark (see Logo.jsx): a big yellow circle with a smaller
// orange one over its lower-right edge, both outlined in dark green.
// `size` is the width of the whole mark.
function drawMark(ctx, x, y, size) {
  const k = size / 85; // the mark is 85 units wide in its 96-unit box
  const ox = x - 3.5 * k;
  const oy = y - 3.5 * k;
  ctx.lineWidth = 7 * k;
  ctx.strokeStyle = BRAND.ink;
  ctx.fillStyle = BRAND.yellow;
  ctx.beginPath();
  ctx.arc(ox + 38 * k, oy + 38 * k, 31 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = BRAND.bg;
  ctx.beginPath();
  ctx.arc(ox + 62 * k, oy + 62 * k, 23 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// "TIP-IT" with the hyphen as a rounded orange bar, centred on cx.
function drawWordmark(ctx, cx, baseline, fontPx) {
  ctx.font = `800 ${fontPx}px ${DISPLAY}`;
  ctx.textAlign = 'left';
  const tip = ctx.measureText('TIP').width;
  const it = ctx.measureText('IT').width;
  const gap = fontPx * 0.05;
  const barW = fontPx * 0.31;
  const barH = fontPx * 0.16;
  const total = tip + gap + barW + gap + it;
  let x = cx - total / 2;
  ctx.fillStyle = BRAND.ink;
  ctx.fillText('TIP', x, baseline);
  x += tip + gap;
  ctx.fillStyle = '#FF8243';
  roundRectPath(ctx, x, baseline - fontPx * 0.36 - barH / 2, barW, barH, barH / 2);
  ctx.fill();
  x += barW + gap;
  ctx.fillStyle = BRAND.ink;
  ctx.fillText('IT', x, baseline);
  ctx.textAlign = 'center';
}

// Builds a printable card (logo, "¡Escanéame!", QR, name) instead of just the
// bare QR — meant to be downloaded, printed, and displayed as-is, so it
// needs to look finished and trustworthy on its own with no extra context.
async function buildPrintableQR(worker) {
  // Make sure the brand fonts are really loaded before drawing text, or the
  // canvas silently falls back to a system font on first load.
  if (document.fonts?.ready) {
    await document.fonts.load(`800 64px ${DISPLAY}`);
    await document.fonts.load(`500 32px ${FONT}`);
    await document.fonts.ready;
  }

  const W = 1000;
  const H = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BRAND.yellow;
  ctx.fillRect(0, 0, W, H);

  // a little colour: pink and orange discs in the corners
  ctx.fillStyle = BRAND.pink;
  ctx.beginPath();
  ctx.arc(920, 90, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND.bg;
  ctx.beginPath();
  ctx.arc(70, H - 90, 90, 0, Math.PI * 2);
  ctx.fill();

  // logo: mark + wordmark, side by side and centred
  const markSize = 120;
  ctx.font = `800 96px ${DISPLAY}`;
  const wordW = ctx.measureText('TIP').width + ctx.measureText('IT').width + 96 * 0.41;
  const rowW = markSize + 28 + wordW;
  const rowX = W / 2 - rowW / 2;
  drawMark(ctx, rowX, 95, markSize);
  drawWordmark(ctx, rowX + markSize + 28 + wordW / 2, 95 + markSize * 0.82, 96);

  ctx.textAlign = 'center';
  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 92px ${DISPLAY}`;
  ctx.fillText('¡Escanéame!', W / 2, 345);
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText('Deja tu propina de forma rápida y segura.', W / 2, 408);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText('Scan me! Leave your tip quickly and securely.', W / 2, 455);

  const qrBox = 540;
  const qrX = W / 2 - qrBox / 2;
  const qrY = 500;
  roundRectPath(ctx, qrX + 12, qrY + 12, qrBox, qrBox, 40);
  ctx.fillStyle = BRAND.ink;
  ctx.fill();
  roundRectPath(ctx, qrX, qrY, qrBox, qrBox, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = BRAND.ink;
  ctx.stroke();

  const qrImg = await loadImage(worker.qrCode);
  const pad = 40;
  ctx.drawImage(qrImg, qrX + pad, qrY + pad, qrBox - pad * 2, qrBox - pad * 2);

  // the mark in the middle of the QR: small (about 2% of the code's area) so
  // phone cameras still read it, on a white disc so it stands out
  const cx = qrX + qrBox / 2;
  const cy = qrY + qrBox / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  drawMark(ctx, cx - 30, cy - 30, 60);

  ctx.textAlign = 'center';
  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(worker.name || `@${worker.username}`, W / 2, qrY + qrBox + 80);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(`@${worker.username}`, W / 2, qrY + qrBox + 125);

  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText('Paga con tarjeta, Apple Pay o Google Pay · Pagos seguros', W / 2, H - 70);

  return canvas.toDataURL('image/png');
}

export default function QRDisplay() {
  const { worker } = useAuth();
  // The QR and the link open the profile first; from there people choose to tip or comment.
  const tipUrl = `${window.location.origin}/p/${worker.username}`;
  // Only while developing: lets the card be previewed without downloading it.
  if (import.meta.env.DEV) window.__buildQR = () => buildPrintableQR(worker);

  const handleDownload = async () => {
    try {
      const dataUrl = await buildPrintableQR(worker);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `tipit-qr-${worker.username}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // Fall back to the plain QR if anything about building the card fails
      // (e.g. the QR image itself doesn't load), so downloading never breaks.
      const link = document.createElement('a');
      link.href = worker.qrCode;
      link.download = `tipit-qr-${worker.username}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.error('No se pudo generar el diseño, se descargó el QR simple');
    }
  };

  const profileUrl = `${window.location.origin}/p/${worker.username}`;

  const handleShareProfile = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Mi perfil en TIP-IT', url: profileUrl });
      else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Enlace de tu perfil copiado');
      }
    } catch {
      // share sheet closed
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mi perfil en TIP-IT', url: tipUrl });
      } catch {
        // user canceled share
      }
    } else {
      await navigator.clipboard.writeText(tipUrl);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    <div className="page-shell items-center text-center">
      <div className="self-start text-left">
        <PageHeader back={{ to: '/worker/dashboard', label: 'Mi panel' }} title="Tu código QR" subtitle={`@${worker.username}`} />
      </div>

      <div className="relative mt-8 -rotate-1 rounded-[2rem] border-2 border-punch-ink bg-punch-yellow p-5 shadow-[8px_8px_0_0_#0A2F2F]">
        <div className="rounded-3xl border-2 border-punch-ink bg-white p-4">
          <img src={worker.qrCode} alt="Código QR" className="h-64 w-64 md:h-72 md:w-72" />
        </div>
        <span className="absolute -right-4 -top-4 rotate-6 rounded-2xl border-2 border-punch-ink bg-punch-pink px-3 py-1.5 font-display text-sm font-extrabold shadow-[3px_3px_0_0_#0A2F2F]">
          ¡Escanéame!
        </span>
      </div>

      <p className="mt-6 break-all text-sm text-slate-500">{tipUrl}</p>
      <a
        href={tipUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 text-sm font-extrabold underline underline-offset-2"
      >
        Probar cómo lo ve tu cliente
      </a>

      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <button onClick={handleDownload} className="btn-secondary">
          Descargar
        </button>
        <button onClick={handleShare} className="btn-primary">
          Compartir
        </button>
      </div>

      <div className="mt-6 w-full rounded-2xl border-2 border-punch-ink/25 bg-white p-4 text-left">
        <p className="font-display font-extrabold">Tu perfil público</p>
        <p className="mt-0.5 text-sm text-slate-400">Con tus reseñas y dos botones: dejar propina o dejar un comentario.</p>
        <p className="mt-2 break-all text-xs text-slate-500">{profileUrl}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={profileUrl} target="_blank" rel="noreferrer" className="btn-secondary !py-2 text-sm">
            Verlo
          </a>
          <button onClick={handleShareProfile} className="btn-secondary !py-2 text-sm">
            Compartir perfil
          </button>
        </div>
      </div>
    </div>
  );
}

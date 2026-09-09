import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

// Real TIP-IT brand tokens, pulled straight from tailwind.config.js and
// index.css — not a made-up palette. brand-500/700 are the exact two
// gradient stops the logo mark itself uses.
const BRAND = {
  bg: '#020617', // slate-950
  ink: '#f1f5f9', // slate-100
  muted: '#94a3b8', // slate-400
  brand400: '#2dd4bf',
  brand500: '#14b8a6',
  brand700: '#0f766e',
};

const FONT = 'Inter, system-ui, sans-serif';

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

// Draws the actual app logo (see Logo.jsx): a rounded square with a
// brand-500 → brand-700 diagonal gradient, holding two overlapping circles
// — one white outline, one solid white — same proportions as the SVG.
function drawLogo(ctx, x, y, size) {
  roundRectPath(ctx, x, y, size, size, size * 0.22);
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, BRAND.brand500);
  gradient.addColorStop(1, BRAND.brand700);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Icon is a 24x24 viewBox rendered at size*0.58, centered in the square.
  const iconSize = size * 0.58;
  const iconOffset = (size - iconSize) / 2;
  const scale = iconSize / 24;
  const ix = x + iconOffset;
  const iy = y + iconOffset;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  ctx.arc(ix + 9 * scale, iy + 9 * scale, 6.5 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(ix + 15 * scale, iy + 15 * scale, 6.5 * scale, 0, Math.PI * 2);
  ctx.fill();
}

// Builds a printable card (logo, tagline, QR, name) instead of just the
// bare QR — meant to be downloaded, printed, and displayed as-is, so it
// needs to look finished and trustworthy on its own with no extra context.
async function buildPrintableQR(worker) {
  // Inter is loaded via Google Fonts in index.html — make sure it's actually
  // ready before drawing text, or canvas silently falls back to a system
  // font on first load.
  if (document.fonts?.ready) {
    await document.fonts.load(`700 64px ${FONT}`);
    await document.fonts.ready;
  }

  const W = 1000;
  const H = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = BRAND.brand400;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(890, 90, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(90, H - 90, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const logoSize = 130;
  drawLogo(ctx, W / 2 - logoSize / 2, 80, logoSize);

  ctx.textAlign = 'center';
  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText('TIP-IT', W / 2, 290);

  ctx.fillStyle = BRAND.brand400;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText('¿Te gustó el servicio?', W / 2, 355);
  ctx.fillText('¡Déjame una propina!', W / 2, 401);

  const qrBox = 560;
  const qrX = W / 2 - qrBox / 2;
  const qrY = 460;
  roundRectPath(ctx, qrX, qrY, qrBox, qrBox, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  const qrImg = await loadImage(worker.qrCode);
  const pad = 40;
  ctx.drawImage(qrImg, qrX + pad, qrY + pad, qrBox - pad * 2, qrBox - pad * 2);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(worker.name || `@${worker.username}`, W / 2, qrY + qrBox + 75);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `400 30px ${FONT}`;
  ctx.fillText(`@${worker.username}`, W / 2, qrY + qrBox + 120);

  ctx.fillStyle = BRAND.muted;
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText('Escanea y paga con tarjeta, Apple Pay o Google Pay', W / 2, H - 95);
  ctx.fillText('Pagos seguros procesados por Stripe', W / 2, H - 58);

  return canvas.toDataURL('image/png');
}

export default function QRDisplay() {
  const { worker } = useAuth();
  const tipUrl = `${window.location.origin}/tip/${worker.username}`;

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Envíame un pago en TIP-IT', url: tipUrl });
      } catch {
        // user canceled share
      }
    } else {
      await navigator.clipboard.writeText(tipUrl);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    <div className="page-shell items-center pb-10 text-center">
      <Link to="/worker/dashboard" className="flex items-center gap-1 self-start text-sm text-slate-400">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Tu código QR</h1>
      <p className="mt-1 text-sm text-slate-400">@{worker.username}</p>

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-xl">
        <img src={worker.qrCode} alt="Código QR" className="h-64 w-64" />
      </div>

      <p className="mt-6 break-all text-sm text-slate-500">{tipUrl}</p>

      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <button onClick={handleDownload} className="btn-secondary">
          Descargar
        </button>
        <button onClick={handleShare} className="btn-primary">
          Compartir
        </button>
      </div>
    </div>
  );
}

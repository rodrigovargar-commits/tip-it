import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
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

// Draws the app logo (see Logo.jsx): a yellow disc with an ink outline
// holding two overlapping coins — one outline, one solid orange.
function drawLogo(ctx, x, y, size) {
  const c = size / 2;
  ctx.lineWidth = size * 0.04;
  ctx.strokeStyle = BRAND.ink;
  ctx.fillStyle = BRAND.yellow;
  ctx.beginPath();
  ctx.arc(x + c, y + c, c - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 24x24 viewBox rendered at size*0.62, centered.
  const iconSize = size * 0.62;
  const ix = x + (size - iconSize) / 2;
  const iy = y + (size - iconSize) / 2;
  const scale = iconSize / 24;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(ix + 9 * scale, iy + 9 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = BRAND.bg;
  ctx.beginPath();
  ctx.arc(ix + 15 * scale, iy + 15 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Builds a printable card (logo, tagline, QR, name) instead of just the
// bare QR — meant to be downloaded, printed, and displayed as-is, so it
// needs to look finished and trustworthy on its own with no extra context.
async function buildPrintableQR(worker) {
  // The brand fonts are loaded via Google Fonts in index.html — make sure it's actually
  // ready before drawing text, or canvas silently falls back to a system
  // font on first load.
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

  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = BRAND.yellow;
  ctx.beginPath();
  ctx.arc(900, 110, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BRAND.pink;
  ctx.beginPath();
  ctx.arc(80, H - 120, 90, 0, Math.PI * 2);
  ctx.fill();

  const logoSize = 130;
  drawLogo(ctx, W / 2 - logoSize / 2, 80, logoSize);

  ctx.textAlign = 'center';
  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 72px ${DISPLAY}`;
  ctx.fillText('TIP-IT', W / 2, 295);

  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText('¿Te gustó el servicio?', W / 2, 350);
  ctx.fillText('¡Déjame una propina!', W / 2, 387);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText('Enjoyed the service? Leave a tip!', W / 2, 437);

  const qrBox = 540;
  const qrX = W / 2 - qrBox / 2;
  const qrY = 475;
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

  ctx.fillStyle = BRAND.ink;
  ctx.font = `800 52px ${DISPLAY}`;
  ctx.fillText(worker.name || `@${worker.username}`, W / 2, qrY + qrBox + 75);
  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(`@${worker.username}`, W / 2, qrY + qrBox + 120);

  ctx.fillStyle = BRAND.muted;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText('Escanea y paga con tarjeta, Apple Pay o Google Pay', W / 2, H - 170);
  ctx.fillText('Scan and pay with card, Apple Pay or Google Pay', W / 2, H - 132);
  ctx.fillText('Pagos seguros / Secure payments', W / 2, H - 80);

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

      <div className="mt-8 rounded-3xl bg-white p-6 shadow-none border-2 border-punch-ink">
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

import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';

export default function QRDisplay() {
  const { worker } = useAuth();
  const tipUrl = `${window.location.origin}/tip/${worker.username}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = worker.qrCode;
    link.download = `tipit-qr-${worker.username}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Envíame una propina en TIP-IT', url: tipUrl });
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
      <Link to="/worker/dashboard" className="self-start text-sm text-slate-400">
        ← Volver
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

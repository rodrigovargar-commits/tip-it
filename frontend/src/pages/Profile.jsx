import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, LogOut } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fileToResizedDataUrl } from '../utils/image.js';
import Avatar from '../components/Avatar.jsx';

export default function Profile() {
  const { user, worker, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    document: user?.document || '',
  });
  const [bio, setBio] = useState(worker?.bio || '');
  const [experience, setExperience] = useState(worker?.experience || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkerProfile, setSavingWorkerProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/users/profile', form);
      await refreshMe();
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Elige un archivo de imagen');
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      await api.put('/users/profile', { avatarUrl: dataUrl });
      await refreshMe();
      toast.success('Foto actualizada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveWorkerProfile = async () => {
    setSavingWorkerProfile(true);
    try {
      await api.put('/workers/profile', { bio, experience });
      await refreshMe();
      toast.success('Perfil público actualizado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingWorkerProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          <Avatar src={user?.avatarUrl} name={user?.name} size={72} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-slate-950"
            aria-label="Cambiar foto"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <div>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-slate-500">{uploadingPhoto ? 'Subiendo foto...' : 'Toca el ícono para cambiar tu foto'}</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500">Nombre</label>
          <input name="name" value={form.name} onChange={handleChange} className="input-field mt-1" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Teléfono</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="input-field mt-1" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Documento de identidad (KYC)</label>
          <input
            name="document"
            value={form.document}
            onChange={handleChange}
            placeholder="INE / Pasaporte"
            className="input-field mt-1"
          />
        </div>
        {user?.isGuest ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-sm text-slate-300">Estás usando una cuenta rápida, sin contraseña.</p>
            <Link to="/worker/setup" className="mt-1 inline-block text-sm font-semibold text-brand-400">
              Protégela con contraseña →
            </Link>
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input value={user?.email || ''} disabled className="input-field mt-1 opacity-60" />
          </div>
        )}
        <button type="submit" disabled={savingProfile} className="btn-primary w-full">
          {savingProfile ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {worker ? (
        <div className="mt-8 card space-y-4">
          <div>
            <p className="font-semibold">Perfil público</p>
            <p className="text-sm text-slate-500">@{worker.username}</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">Bio corta</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              className="input-field mt-1 h-20 resize-none"
              placeholder="¿A qué te dedicas?"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Experiencia (opcional)</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              maxLength={600}
              className="input-field mt-1 h-24 resize-none"
              placeholder="Dónde has trabajado, cuánto tiempo llevas, certificaciones... esto se muestra en tu perfil como tu trayectoria."
            />
          </div>
          <button
            onClick={handleSaveWorkerProfile}
            disabled={savingWorkerProfile}
            className="btn-secondary w-full"
          >
            {savingWorkerProfile ? 'Guardando...' : 'Guardar perfil público'}
          </button>
        </div>
      ) : (
        <div className="mt-8 card">
          <p className="font-semibold">¿Quieres empezar a recibir pagos?</p>
          <p className="mt-1 text-sm text-slate-400">
            Crea tu perfil público y obtén tu código QR único.
          </p>
          <Link to="/worker/setup" className="btn-primary mt-3 w-full">
            Activar mi perfil
          </Link>
        </div>
      )}

      <Link
        to="/como-funciona"
        className="mt-8 block text-center text-sm font-semibold text-brand-400 hover:text-brand-300"
      >
        ¿Cómo funciona TIP-IT?
      </Link>

      <button
        onClick={handleLogout}
        className="btn-secondary mt-4 flex w-full items-center justify-center gap-2 !border-rose-800 !text-rose-400"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, worker, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    document: user?.document || '',
  });
  const [bio, setBio] = useState(worker?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBio, setSavingBio] = useState(false);

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

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await api.put('/workers/profile', { bio });
      await refreshMe();
      toast.success('Bio actualizada');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingBio(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-bold">Perfil</h1>

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
        <div>
          <label className="text-xs text-slate-500">Email</label>
          <input value={user?.email || ''} disabled className="input-field mt-1 opacity-60" />
        </div>
        <button type="submit" disabled={savingProfile} className="btn-primary w-full">
          {savingProfile ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      {worker ? (
        <div className="mt-8 card">
          <p className="font-semibold">Perfil público de trabajador</p>
          <p className="text-sm text-slate-500">@{worker.username}</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            className="input-field mt-3 h-24 resize-none"
            placeholder="Bio / descripción de tu trabajo"
          />
          <button onClick={handleSaveBio} disabled={savingBio} className="btn-secondary mt-3 w-full">
            {savingBio ? 'Guardando...' : 'Guardar bio'}
          </button>
        </div>
      ) : (
        <div className="mt-8 card">
          <p className="font-semibold">¿Recibes propinas?</p>
          <p className="mt-1 text-sm text-slate-400">
            Crea tu perfil de trabajador y obtén tu QR único.
          </p>
          <Link to="/worker/setup" className="btn-primary mt-3 w-full">
            Convertirme en trabajador
          </Link>
        </div>
      )}

      <button onClick={handleLogout} className="btn-secondary mt-8 w-full !border-rose-800 !text-rose-400">
        Cerrar sesión
      </button>
    </div>
  );
}

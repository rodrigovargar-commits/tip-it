import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, LogOut, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fileToResizedDataUrl } from '../utils/image.js';
import Avatar from '../components/Avatar.jsx';
import PageHeader from '../components/PageHeader.jsx';
import FormField from '../components/FormField.jsx';
import { ACTIVITIES } from '../utils/activities.js';

export default function Profile() {
  const { user, worker, logout, refreshMe } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    document: '',
  });
  const [bio, setBio] = useState(worker?.bio || '');
  const [experience, setExperience] = useState(worker?.experience || '');
  const [publicName, setPublicName] = useState(worker?.publicName || '');
  const [activity, setActivity] = useState(worker?.activity || '');
  const [occupation, setOccupation] = useState(worker?.occupation || '');
  const [establishment, setEstablishment] = useState(worker?.establishment || '');
  const [years, setYears] = useState(worker?.yearsExperience ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkerProfile, setSavingWorkerProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Se borrarán tus datos personales y tu cuenta quedará desactivada. Esto no se puede deshacer. ¿Continuar?')) return;
    try {
      await api.delete('/users/me');
      toast.success('Tu cuenta fue eliminada');
      logout();
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/users/profile', form.document ? form : { name: form.name, phone: form.phone });
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
      await api.put('/workers/profile', { bio, experience, publicName, activity, occupation, establishment, yearsExperience: years === '' ? null : Number(years) });
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
      <PageHeader eyebrow="Tu cuenta" title="Perfil" subtitle="Tus datos y cómo te ve la gente." />

      <div className="mt-6 card flex items-center gap-4 !bg-punch-pink">
        <div className="relative">
          <Avatar src={user?.avatarUrl} name={user?.name} size={72} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-punch-ink bg-punch-yellow text-punch-ink"
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
          <p className="font-display text-xl font-extrabold">{user?.name}</p>
          <p className="text-sm font-medium text-slate-400">{uploadingPhoto ? 'Subiendo foto...' : 'Toca el ícono para cambiar tu foto'}</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
        <FormField label="Nombre">
          {(p) => <input {...p} name="name" value={form.name} onChange={handleChange} className="input-field" />}
        </FormField>
        <FormField label="Teléfono">
          {(p) => <input {...p} name="phone" type="tel" inputMode="tel" value={form.phone} onChange={handleChange} className="input-field" />}
        </FormField>
        <FormField label="Documento de identidad (KYC)" optional>
          {(p) => (
            <input
              {...p}
              name="document"
              value={form.document}
              onChange={handleChange}
              placeholder={user?.hasDocument ? 'Registrado (escribe para reemplazar)' : 'INE / Pasaporte'}
              className="input-field"
            />
          )}
        </FormField>
        {user?.isGuest ? (
          <div className="rounded-2xl border-2 border-punch-ink/30 bg-white/60 p-3">
            <p className="text-sm text-slate-300">Estás usando una cuenta rápida, sin contraseña.</p>
            <Link to="/worker/setup" className="mt-1 inline-block text-sm font-semibold text-brand-400">
              Protégela con contraseña →
            </Link>
          </div>
        ) : (
          <FormField label="Correo">
            {(p) => <input {...p} value={user?.email || ''} disabled className="input-field opacity-60" />}
          </FormField>
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
          <FormField label="Nombre público" hint="Es el que ven tus clientes; puede ser distinto a tu nombre legal.">
            {(p) => <input {...p} value={publicName} onChange={(e) => setPublicName(e.target.value)} maxLength={60} className="input-field" />}
          </FormField>
          <FormField label="Actividad">
            {(p) => (
              <select {...p} value={activity} onChange={(e) => setActivity(e.target.value)} className="input-field">
                <option value="">Elige una</option>
                {ACTIVITIES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="Ocupación" optional>
            {(p) => <input {...p} value={occupation} onChange={(e) => setOccupation(e.target.value)} maxLength={60} className="input-field" />}
          </FormField>
          <FormField label="Años de experiencia" optional hint="Se muestra en tu perfil público.">
            {(p) => <input {...p} type="number" inputMode="numeric" min="0" max="60" value={years} onChange={(e) => setYears(e.target.value)} className="input-field" />}
          </FormField>
          <FormField label="Lugar de trabajo" optional>
            {(p) => <input {...p} value={establishment} onChange={(e) => setEstablishment(e.target.value)} maxLength={60} className="input-field" />}
          </FormField>
          <FormField label="Sobre ti" optional hint={`${bio.length}/280`}>
            {(p) => (
              <textarea
                {...p}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                className="input-field h-20 resize-none"
                placeholder="¿A qué te dedicas?"
              />
            )}
          </FormField>
          <FormField label="Experiencia" optional hint="Se muestra en tu perfil como tu trayectoria.">
            {(p) => (
              <textarea
                {...p}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                maxLength={600}
                className="input-field h-24 resize-none"
                placeholder="Dónde has trabajado, cuánto tiempo llevas, certificaciones…"
              />
            )}
          </FormField>
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

      <div className="mt-8 card !bg-punch-yellow">
        <p className="font-display text-lg font-extrabold">Ayuda y más</p>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          {[
            ['/history', 'Mi historial'],
            ['/contacts', 'Mis contactos'],
            ['/', 'Página principal'],
            ['/#preguntas', 'Preguntas frecuentes'],
            ['/#como-funciona', 'Cómo funciona'],
            ['/como-funciona', 'Guía de la app'],
            ['/terminos', 'Términos'],
            ['/privacidad', 'Aviso de privacidad'],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className="rounded-xl px-3 py-2 font-display text-sm font-extrabold hover:bg-white/70"
            >
              {label} →
            </Link>
          ))}
        </div>
        <a href="tel:+525580075613" className="mt-2 block px-3 text-sm font-semibold underline">
          ¿Dudas? Llámanos: 55 8007 5613
        </a>
      </div>

      <button
        onClick={handleDeleteAccount}
        className="mt-3 flex w-full items-center justify-center gap-2 text-sm text-slate-500 hover:text-rose-700"
      >
        <Trash2 size={14} />
        Eliminar mi cuenta y mis datos
      </button>

      <button
        onClick={handleLogout}
        className="btn-secondary mt-4 flex w-full items-center justify-center gap-2 !border-rose-300 !text-rose-700"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  );
}

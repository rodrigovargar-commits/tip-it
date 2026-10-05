import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner from '../components/Spinner.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/contacts')
      .then(({ data }) => setContacts(data.contacts))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRemove = async (id) => {
    try {
      await api.delete(`/contacts/${id}`);
      setContacts((c) => c.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="page-shell md:!max-w-4xl">
      <PageHeader
        eyebrow="Tu gente"
        title="Contactos"
        subtitle="Guarda a las personas a las que sueles darles propina para encontrarlas rápido."
      />

      <div className="mt-6 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            person="cook"
            title="Todavía no tienes contactos"
            body="Desde el perfil de alguien, toca “Guardar contacto” y aparecerá aquí."
            cta={{ to: '/scan', label: 'Buscar a alguien' }}
          />
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="card flex items-center gap-3">
              <Avatar src={c.worker.avatarUrl} name={c.worker.name || c.worker.username} size={48} />
              <Link to={`/tip/${c.worker.username}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-100">
                  {c.worker.name || `@${c.worker.username}`}
                </p>
                <p className="truncate text-sm text-slate-500">@{c.worker.username}</p>
              </Link>
              <button
                onClick={() => handleRemove(c.id)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-rose-700"
                aria-label="Quitar contacto"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

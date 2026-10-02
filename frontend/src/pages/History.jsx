import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner from '../components/Spinner.jsx';
import TransactionCard from '../components/TransactionCard.jsx';

export default function History() {
  const { worker } = useAuth();
  const [role, setRole] = useState(worker ? 'worker' : 'client');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/tips/history', { params: { role, limit: 50 } })
      .then(({ data }) => setTransactions(data.transactions))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <div className="page-shell md:!max-w-4xl">
      <PageHeader eyebrow="Tus movimientos" title="Historial" subtitle={worker ? 'Lo que has recibido y lo que has enviado.' : 'Las propinas que has enviado.'} />

      {worker && (
        <div className="mt-4 flex gap-2 rounded-2xl border-2 border-punch-ink/30 bg-white p-1">
          <button
            onClick={() => setRole('worker')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              role === 'worker' ? 'bg-brand-600 text-white' : 'text-slate-400'
            }`}
          >
            Recibidas
          </button>
          <button
            onClick={() => setRole('client')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              role === 'client' ? 'bg-brand-600 text-white' : 'text-slate-400'
            }`}
          >
            Enviadas
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          role === 'worker' ? (
            <EmptyState
              person="musician"
              title="Aún no te llegan propinas"
              body="Comparte tu QR donde chambeas y aquí verás cada una."
              cta={{ to: '/worker/qr', label: 'Ver mi QR' }}
            />
          ) : (
            <EmptyState
              person="waiter"
              title="Aún no has enviado propinas"
              body="Escanea el QR de quien te atendió bien y dale las gracias."
              cta={{ to: '/scan', label: 'Escanear un QR' }}
            />
          )
        ) : (
          transactions.map((tx) => (
            <TransactionCard key={tx._id} transaction={tx} perspective={role} />
          ))
        )}
      </div>
    </div>
  );
}

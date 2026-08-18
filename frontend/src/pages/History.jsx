import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
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
    <div className="page-shell">
      <h1 className="text-2xl font-bold">Historial</h1>

      {worker && (
        <div className="mt-4 flex gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
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

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">Aún no hay transacciones.</p>
        ) : (
          transactions.map((tx) => (
            <TransactionCard key={tx._id} transaction={tx} perspective={role} />
          ))
        )}
      </div>
    </div>
  );
}

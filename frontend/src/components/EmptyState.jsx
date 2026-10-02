import { Link } from 'react-router-dom';
import Person from './Person.jsx';

// Friendly empty screen with one of the little illustrated people.
export default function EmptyState({ person = 'stylist', title, body, cta }) {
  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col items-center text-center md:col-span-2">
      <span className="flex h-28 w-28 items-end justify-center overflow-hidden rounded-full border-2 border-punch-ink bg-punch-pink shadow-[4px_4px_0_0_#0A2F2F]">
        <Person kind={person} size={112} />
      </span>
      <p className="mt-5 font-display text-2xl font-extrabold">{title}</p>
      {body && <p className="mt-2 text-sm font-medium text-slate-400">{body}</p>}
      {cta && (
        <Link to={cta.to} className="btn-primary mt-5">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

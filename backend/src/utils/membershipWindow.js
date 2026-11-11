// When does a membership "see" a person's activity? Never before it began.
//   team  : from the day the person joined, with no end.
//   event : from the event's start (or the day they joined, if later) to its end.
function windowOf(membership, location) {
  const joined = new Date(membership.joinedAt);
  if (location && location.kind === 'event' && location.startsAt && location.endsAt) {
    const start = new Date(Math.max(joined.getTime(), new Date(location.startsAt).getTime()));
    return { start, end: new Date(location.endsAt) };
  }
  return { start: joined, end: null };
}

// Does one payment or comment belong to this membership?
function belongs(item, membership, win, qrCode) {
  const at = new Date(item.createdAt).getTime();
  if (at < win.start.getTime()) return false;
  if (win.end && at > win.end.getTime()) return false;
  if (membership.scope === 'qr') return Boolean(qrCode) && item.qr === qrCode;
  return true;
}

// The Mongo filter that finds every item that could belong to this membership.
function mongoFilterFor(membership, win, qrCode) {
  const createdAt = { $gte: win.start };
  if (win.end) createdAt.$lte = win.end;
  const filter = { worker: membership.worker, createdAt };
  if (membership.scope === 'qr') filter.qr = qrCode || '__none__';
  return filter;
}

module.exports = { windowOf, belongs, mongoFilterFor };

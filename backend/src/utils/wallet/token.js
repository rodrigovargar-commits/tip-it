const jwt = require('jsonwebtoken');

// Safari needs a plain link to open "Add to Wallet", and a plain link can't carry
// the login header. So the signed-in person asks for a link that works for a few
// minutes and only for their own pass.
function signWalletToken(workerId) {
  return jwt.sign({ sub: String(workerId), purpose: 'wallet' }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '10m',
  });
}

function readWalletToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return decoded.purpose === 'wallet' ? decoded.sub : null;
  } catch {
    return null;
  }
}

module.exports = { signWalletToken, readWalletToken };

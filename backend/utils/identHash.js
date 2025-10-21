const crypto = require('crypto');

const canon = (s = '') => {
  const [l = '', d = ''] = String(s).trim().toLowerCase().split('@');
  return `${l.split('+')[0]}@${d}`;
};

const identHash = (value, pepper = process.env.EMAIL_HASH_PEPPER) =>
  crypto.createHmac('sha256', pepper).update(canon(value)).digest('hex');

module.exports = { canon, identHash };
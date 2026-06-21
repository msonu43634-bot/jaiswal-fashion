function sanitize(str) {
  if (typeof str !== 'string') return str;
  let s = str.replace(/<[^>]*>/g, '');
  s = s.replace(/[&<>"']/g, function(m) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return map[m];
  });
  return s.substring(0, 5000);
}

function deepSanitize(val) {
  if (typeof val === 'string') return sanitize(val);
  if (typeof val === 'object' && val !== null) {
    if (Array.isArray(val)) return val.map(deepSanitize);
    const obj = {};
    for (const [k, v] of Object.entries(val)) obj[deepSanitize(k)] = deepSanitize(v);
    return obj;
  }
  return val;
}

module.exports = { sanitize, deepSanitize };

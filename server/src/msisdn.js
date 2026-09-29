function normalizeNigerianMsisdn(input) {
  if (typeof input !== 'string') {
    throw new Error('A valid Nigerian MTN number is required');
  }

  const compact = input.trim().replace(/\s+/g, '');
  let normalized;
  if (/^0\d{10}$/.test(compact)) {
    normalized = `+234${compact.slice(1)}`;
  } else if (/^234\d{10}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^\+234\d{10}$/.test(compact)) {
    normalized = compact;
  }

  if (!normalized) {
    throw new Error('A valid Nigerian MTN number is required');
  }
  return normalized;
}

function validateLabel(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Label is required');
  }
  const label = input.trim();
  if (label.length > 80) {
    throw new Error('Label must be 80 characters or fewer');
  }
  return label;
}

module.exports = { normalizeNigerianMsisdn, validateLabel };

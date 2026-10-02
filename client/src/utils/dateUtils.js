/**
 * Safely parses any date string (including MySQL UTC strings 'YYYY-MM-DD HH:MM:SS')
 * and returns a JavaScript Date object in the user's local timezone.
 */
export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  let str = String(dateInput).trim();
  if (!str) return null;

  // Format MySQL 'YYYY-MM-DD HH:MM:SS' to ISO 'YYYY-MM-DDTHH:MM:SS'
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  // Append 'Z' if timezone designator is absent
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(dateInput) : d;
};

export const formatTime = (dateInput) => {
  const d = parseLocalDate(dateInput);
  if (!d) return 'Just now';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatDateTime = (dateInput) => {
  const d = parseLocalDate(dateInput);
  if (!d) return '';
  return d.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const formatDate = (dateInput) => {
  const d = parseLocalDate(dateInput);
  if (!d) return '';
  return d.toLocaleDateString();
};

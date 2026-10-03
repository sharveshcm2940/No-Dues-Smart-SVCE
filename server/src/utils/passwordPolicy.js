/**
 * Password Policy Enforcement Service
 * - Minimum 10 characters
 * - Uppercase, lowercase, numeric, and special characters
 * - Block list of common / breached passwords
 */

const COMMON_PASSWORDS = new Set([
  'password123',
  'password1234',
  'password12345',
  'admin12345',
  'administrator',
  'svce123456',
  'svcecollege',
  '1234567890',
  '12345678901',
  'qwertyuiop',
  'welcome123',
  'welcome1234',
  'welcome@123',
  'iloveyou123',
  'passcode123'
]);

function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }

  if (password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters long.' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, error: 'This password is too common or known to be breached. Please choose a more complex passphrase.' };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const missing = [];
  if (!hasUpper) missing.push('an uppercase letter');
  if (!hasLower) missing.push('a lowercase letter');
  if (!hasDigit) missing.push('a number');
  if (!hasSpecial) missing.push('a special character (e.g. !@#$%^&*)');

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Password must contain at least ${missing.join(', ')}.`
    };
  }

  return { valid: true, error: null };
}

module.exports = {
  validatePasswordPolicy
};

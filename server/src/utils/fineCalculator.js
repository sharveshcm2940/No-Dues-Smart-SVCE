const { query } = require('../config/db');

/**
 * Fetches active fine rules from system_settings table with fallback defaults
 */
async function getFineSettings() {
  const defaults = {
    ratePerDay: 5.00,
    graceDays: 0,
    capAmount: 500.00
  };

  try {
    const rows = await query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('fine_rate_per_day', 'fine_grace_days', 'fine_cap_amount')"
    );

    rows.forEach(r => {
      const val = parseFloat(r.setting_value);
      if (!isNaN(val)) {
        if (r.setting_key === 'fine_rate_per_day') defaults.ratePerDay = val;
        if (r.setting_key === 'fine_grace_days') defaults.graceDays = parseInt(r.setting_value) || 0;
        if (r.setting_key === 'fine_cap_amount') defaults.capAmount = val;
      }
    });
  } catch (err) {
    // If settings table not available, fallback defaults apply
  }

  return defaults;
}

/**
 * Computes overdue fine dynamically based on fine policies
 */
async function calculateOverdueFine(dueDate, returnDate = null, customSettings = null) {
  const settings = customSettings || (await getFineSettings());
  const due = new Date(dueDate);
  const returned = returnDate ? new Date(returnDate) : new Date();

  // Reset time portions for pure day difference
  due.setHours(0, 0, 0, 0);
  returned.setHours(0, 0, 0, 0);

  const diffMs = returned.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysOverdue = Math.max(0, diffDays);

  const billableDays = Math.max(0, daysOverdue - settings.graceDays);
  const uncappedFine = billableDays * settings.ratePerDay;
  const calculatedFine = Number(Math.min(settings.capAmount, uncappedFine).toFixed(2));

  return {
    daysOverdue,
    graceDays: settings.graceDays,
    billableDays,
    ratePerDay: settings.ratePerDay,
    capAmount: settings.capAmount,
    calculatedFine
  };
}

module.exports = {
  getFineSettings,
  calculateOverdueFine
};

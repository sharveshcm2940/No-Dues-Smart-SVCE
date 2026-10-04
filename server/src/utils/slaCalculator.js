/**
 * SVCE Smart No-Dues ERP - Service Level Agreement (SLA) & Turnaround Time Engine
 * 
 * Provides SLA thresholds, turnaround calculations, breach detection,
 * and statistical aggregation (median, percentiles, bottleneck identification)
 * to support empirical pilot reporting.
 */

// Default SLA thresholds in hours per clearance stage
const DEFAULT_STAGE_SLA_HOURS = {
  'department library': 24,
  'dpc': 48,
  'central library': 24,
  'faculty advisor': 48,
  'finance': 48,
  'hod': 24
};

const DEFAULT_OVERALL_SLA_HOURS = 144; // 6 business days

/**
 * Calculates elapsed hours between two timestamps
 */
function calculateElapsedHours(startTime, endTime = new Date()) {
  if (!startTime) return 0;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
}

/**
 * Evaluates whether a given stage transition has breached its SLA threshold
 */
function evaluateStageSla(departmentName, startTime, endTime = new Date(), customThresholdHours = null) {
  const normDept = String(departmentName || '').toLowerCase().trim();
  const thresholdHours = typeof customThresholdHours === 'number' && customThresholdHours > 0
    ? customThresholdHours
    : (DEFAULT_STAGE_SLA_HOURS[normDept] || 48);

  const elapsedHours = calculateElapsedHours(startTime, endTime);
  const breached = elapsedHours > thresholdHours;
  const excessHours = breached ? Number((elapsedHours - thresholdHours).toFixed(2)) : 0;

  return {
    department: departmentName,
    elapsedHours,
    thresholdHours,
    breached,
    excessHours
  };
}

/**
 * Computes exact median of an array of numbers
 */
function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sorted = [...numbers].filter(n => typeof n === 'number' && !isNaN(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;

  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Number(sorted[mid].toFixed(2));
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

/**
 * Identifies the bottleneck stage given an array of stage metric objects
 * [{ stageName, medianHours, rejectionCount, holdCount }]
 */
function identifyBottleneckStage(stageStats) {
  if (!Array.isArray(stageStats) || stageStats.length === 0) return null;

  // Score stages based on combined latency and friction: medianHours + (holdCount * 4) + (rejectionCount * 8)
  const ranked = [...stageStats].sort((a, b) => {
    const scoreA = (a.medianHours || 0) + ((a.holdCount || 0) * 4) + ((a.rejectionCount || 0) * 8);
    const scoreB = (b.medianHours || 0) + ((b.holdCount || 0) * 4) + ((b.rejectionCount || 0) * 8);
    return scoreB - scoreA;
  });

  return ranked[0];
}

module.exports = {
  DEFAULT_STAGE_SLA_HOURS,
  DEFAULT_OVERALL_SLA_HOURS,
  calculateElapsedHours,
  evaluateStageSla,
  calculateMedian,
  identifyBottleneckStage
};

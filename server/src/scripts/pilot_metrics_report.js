/**
 * SVCE Smart No-Dues ERP - Pilot Evaluation & Bottleneck Analysis Engine
 * 
 * Computes:
 * 1. Median turnaround time per stage (in hours)
 * 2. Stage bottleneck identification (latency + hold/rejection friction ranking)
 * 3. Hold and Rejection rates per department
 * 4. SLA breaches based on institutional thresholds
 * 5. Resubmission counts and retry distribution
 * 6. Automated CSV export for accreditation & administrative reporting
 * 
 * Usage:
 *   node server/src/scripts/pilot_metrics_report.js [--csv] [--out=filename.csv]
 */

const fs = require('fs');
const path = require('path');
const { query, ensureReady } = require('../config/db');
const { 
  DEFAULT_STAGE_SLA_HOURS, 
  calculateElapsedHours, 
  calculateMedian, 
  identifyBottleneckStage 
} = require('../utils/slaCalculator');

async function generatePilotReport(options = {}) {
  await ensureReady();

  // 1. Fetch all requests
  const requests = await query(`
    SELECT id, request_number, register_number, department, year, overall_status, 
           request_date, completion_date, resubmission_count
    FROM nodues_requests
  `);

  // 2. Fetch all stages with timestamps
  const stages = await query(`
    SELECT s.id, s.request_id, s.department_name, s.stage_order, s.status, 
           s.updated_at, r.request_date, r.completion_date, r.department as student_dept
    FROM nodues_stages s
    JOIN nodues_requests r ON s.request_id = r.id
    ORDER BY s.request_id ASC, s.stage_order ASC
  `);

  // 3. Fetch audit logs for exact stage transition durations
  const auditLogs = await query(`
    SELECT request_id, department_name, action_type, status_after, timestamp
    FROM nodues_audit_logs
    ORDER BY request_id ASC, id ASC
  `);

  const DEPARTMENTS = [
    'Department Library',
    'DPC',
    'Central Library',
    'Faculty Advisor',
    'Finance',
    'HOD'
  ];

  const stageMetrics = [];

  for (const dept of DEPARTMENTS) {
    const deptStages = stages.filter(s => s.department_name.toLowerCase() === dept.toLowerCase());
    const processedStages = deptStages.filter(s => s.status !== 'Locked');

    const totalCount = deptStages.length;
    const approvedCount = deptStages.filter(s => s.status === 'Approved').length;
    const holdCount = deptStages.filter(s => s.status === 'Hold').length;
    const rejectedCount = deptStages.filter(s => s.status === 'Rejected').length;
    const pendingCount = deptStages.filter(s => s.status === 'Pending').length;

    // Calculate elapsed hours for processed stages
    const durations = [];
    let slaBreachCount = 0;
    const slaThreshold = DEFAULT_STAGE_SLA_HOURS[dept.toLowerCase()] || 48;

    for (const st of processedStages) {
      // Find audit logs corresponding to this request and department
      const deptLogs = auditLogs.filter(
        l => l.request_id === st.request_id && l.department_name && l.department_name.toLowerCase() === dept.toLowerCase()
      );

      let duration = 0;
      if (deptLogs.length >= 2) {
        duration = calculateElapsedHours(deptLogs[0].timestamp, deptLogs[deptLogs.length - 1].timestamp);
      } else if (st.updated_at && st.request_date) {
        duration = calculateElapsedHours(st.request_date, st.updated_at);
      }

      if (duration > 0) {
        durations.push(duration);
        if (duration > slaThreshold) {
          slaBreachCount++;
        }
      }
    }

    const medianHours = calculateMedian(durations);
    const holdRate = totalCount > 0 ? Number(((holdCount / totalCount) * 100).toFixed(1)) : 0;
    const rejectionRate = totalCount > 0 ? Number(((rejectedCount / totalCount) * 100).toFixed(1)) : 0;

    stageMetrics.push({
      stageName: dept,
      totalCount,
      approvedCount,
      holdCount,
      rejectedCount,
      pendingCount,
      medianHours,
      slaThresholdHours: slaThreshold,
      slaBreaches: slaBreachCount,
      holdRatePercent: holdRate,
      rejectionRatePercent: rejectionRate
    });
  }

  // Identify Bottleneck Stage
  const bottleneck = identifyBottleneckStage(stageMetrics);

  // Overall Turnaround Time Metrics
  const overallDurations = [];
  let totalResubmissions = 0;
  let completedCount = 0;

  for (const r of requests) {
    totalResubmissions += (r.resubmission_count || 0);
    if (r.overall_status === 'Approved' && r.completion_date && r.request_date) {
      completedCount++;
      const dur = calculateElapsedHours(r.request_date, r.completion_date);
      if (dur > 0) overallDurations.push(dur);
    }
  }

  const overallMedianHours = calculateMedian(overallDurations);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalRequests: requests.length,
    completedRequests: completedCount,
    inProgressRequests: requests.filter(r => r.overall_status === 'In Progress').length,
    rejectedRequests: requests.filter(r => r.overall_status === 'Rejected').length,
    overallMedianTurnaroundHours: overallMedianHours,
    totalResubmissionEvents: totalResubmissions,
    bottleneckStage: bottleneck ? bottleneck.stageName : 'None',
    stages: stageMetrics
  };

  // CSV Output generation if requested
  let csvContent = null;
  if (options.csv || options.out) {
    const lines = [];
    lines.push('Stage Name,Total Applications,Approved,Hold,Rejected,Pending,Median Hours,SLA Threshold (h),SLA Breaches,Hold Rate (%),Rejection Rate (%)');
    for (const m of stageMetrics) {
      lines.push(`"${m.stageName}",${m.totalCount},${m.approvedCount},${m.holdCount},${m.rejectedCount},${m.pendingCount},${m.medianHours},${m.slaThresholdHours},${m.slaBreaches},${m.holdRatePercent}%,${m.rejectionRatePercent}%`);
    }
    lines.push('');
    lines.push('--- SUMMARY ---');
    lines.push(`Total Requests,${summary.totalRequests}`);
    lines.push(`Fully Cleared Requests,${summary.completedRequests}`);
    lines.push(`Overall Median Turnaround (h),${summary.overallMedianTurnaroundHours}`);
    lines.push(`Total Resubmission Events,${summary.totalResubmissionEvents}`);
    lines.push(`Bottleneck Stage,"${summary.bottleneckStage}"`);
    lines.push(`Report Generated At,"${summary.generatedAt}"`);

    csvContent = lines.join('\n');

    if (options.out) {
      const outPath = path.resolve(options.out);
      fs.writeFileSync(outPath, csvContent, 'utf8');
      summary.csvPath = outPath;
    }
  }

  return { summary, csvContent };
}

// CLI Execution Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  const wantsCsv = args.includes('--csv');
  const outArg = args.find(a => a.startsWith('--out='));
  const outPath = outArg ? outArg.split('=')[1] : (wantsCsv ? path.join(__dirname, '../../logs/pilot_metrics_report.csv') : null);

  generatePilotReport({ csv: wantsCsv || !!outPath, out: outPath })
    .then(({ summary, csvContent }) => {
      console.log('=================================================================');
      console.log('         SVCE SMART NO-DUES ERP - PILOT METRICS REPORT           ');
      console.log('=================================================================');
      console.log(`Generated At:                ${summary.generatedAt}`);
      console.log(`Total Clearance Requests:    ${summary.totalRequests}`);
      console.log(`Fully Approved Requests:     ${summary.completedRequests}`);
      console.log(`Overall Median Latency:      ${summary.overallMedianTurnaroundHours} hours`);
      console.log(`Total Resubmissions:         ${summary.totalResubmissionEvents}`);
      console.log(`Identified Bottleneck Stage: ${summary.bottleneckStage}`);
      console.log('-----------------------------------------------------------------');
      console.log('STAGE-WISE METRICS BREAKDOWN:');
      console.table(summary.stages);
      if (outPath) {
        console.log(`✅ CSV Report written to: ${outPath}`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Pilot metrics generation failed:', err);
      process.exit(1);
    });
}

module.exports = { generatePilotReport };

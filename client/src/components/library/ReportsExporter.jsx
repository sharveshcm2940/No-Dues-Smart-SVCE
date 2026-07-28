import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Download, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';

export const ReportsExporter = () => {
  const [reportType, setReportType] = useState('nodues');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportOptions = [
    { value: 'nodues', label: 'No-Dues Applications Clearance Report' },
    { value: 'books', label: 'IT Department Book Inventory Catalog Report' },
    { value: 'issued', label: 'Currently Issued Books & Circulation Report' },
    { value: 'fines', label: 'Fine Collections & Unpaid Dues Report' },
    { value: 'master', label: 'Student Clearance Master Audit Summary' },
  ];

  const fetchReport = async (type) => {
    setLoading(true);
    try {
      const res = await api.get(`/library/reports?type=${type}`);
      if (res.data.success) {
        setReportData(res.data.report);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const csvRows = [];
    csvRows.push([reportData.title]);
    csvRows.push([`Department: ${reportData.department}`]);
    csvRows.push([`Generated At: ${reportData.generatedAt}`]);
    csvRows.push([]); // empty line
    csvRows.push(reportData.columns);

    reportData.rows.forEach(row => {
      csvRows.push(row.map(v => `"${String(v || '').replace(/"/g, '""')}"`));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Report Selection Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 rounded-lg text-brand-600 border border-brand-200">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Enterprise Reports & Analytics Generator</h3>
            <p className="text-xs text-slate-500">Generate formatted institutional audit reports for IT Department</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500"
          >
            {reportOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Document Preview */}
      <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-xs" id="printable-report">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Generating report dataset...</p>
          </div>
        ) : reportData ? (
          <div>
            
            {/* Official Institutional Report Header */}
            <div className="text-center pb-6 mb-6 border-b border-slate-200">
              <h2 className="text-lg font-extrabold uppercase text-slate-900 tracking-tight">
                UNIVERSITY COLLEGE OF ENGINEERING
              </h2>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {reportData.department}
              </p>
              <h3 className="text-sm font-bold text-brand-600 uppercase mt-2">
                {reportData.title}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Generated Date: {reportData.generatedAt} | Authorized System Report
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-bold uppercase text-[11px]">
                    {reportData.columns.map((col, idx) => (
                      <th key={idx} className="px-3.5 py-2.5 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.columns.length} className="py-8 text-center text-slate-400">
                        No report records matching criteria.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap text-slate-800">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Report Security Stamp: IT-ERP-SEC-{Date.now()}</span>
              <span>Page 1 of 1</span>
            </div>

          </div>
        ) : null}
      </div>

    </div>
  );
};

export default ReportsExporter;

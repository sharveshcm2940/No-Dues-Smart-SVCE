import React, { useState, useEffect, useCallback } from 'react';
import api, { getClientDeviceMetadata } from '../../services/api';
import { 
  ShieldCheck, 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Search, 
  RefreshCw, 
  Download, 
  Filter, 
  Calendar, 
  User, 
  Laptop, 
  Globe, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Wifi,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import Badge from './Badge';

export const AuditLogsViewer = ({ role, title = 'System Audit & Activity Logs' }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState(role || 'ALL');
  const [stats, setStats] = useState({
    totalLogs: 0,
    desktopCount: 0,
    mobileCount: 0,
    tabletCount: 0,
    locationCount: 0,
    deviceCount: 0
  });

  const [clientMeta, setClientMeta] = useState(() => getClientDeviceMetadata());

  useEffect(() => {
    const updateMeta = () => setClientMeta(getClientDeviceMetadata());
    window.addEventListener('nodues:location_updated', updateMeta);
    return () => window.removeEventListener('nodues:location_updated', updateMeta);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search.trim()) params.append('search', search.trim());
      if (deviceFilter !== 'ALL') params.append('device_type', deviceFilter);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data && res.data.success) {
        setLogs(res.data.logs || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setError('Failed to load audit logs.');
      }
    } catch (err) {
      console.error('Audit logs fetch error:', err);
      setError('Error communicating with audit log server.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, deviceFilter, roleFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Timestamp', 'Operator', 'Role', 'Action', 'Module', 'Device Name', 'Device Type', 'Location', 'IP Address', 'Details'];
    const rows = logs.map(l => [
      l.id,
      `"${l.created_at || ''}"`,
      `"${l.full_name || l.username || ''}"`,
      `"${l.role || ''}"`,
      `"${l.action || ''}"`,
      `"${l.module || ''}"`,
      `"${l.device_name || ''}"`,
      `"${l.device_type || ''}"`,
      `"${l.location || ''}"`,
      `"${l.ip_address || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `svce_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (!logs.length) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `svce_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainStatus, setChainStatus] = useState(null);

  const handleVerifyTamperCheck = async () => {
    setVerifyingChain(true);
    try {
      const res = await api.get('/audit-logs/verify');
      if (res.data && res.data.success) {
        setChainStatus(res.data);
      } else {
        setChainStatus({ valid: false, message: 'Verification failed.' });
      }
    } catch (err) {
      setChainStatus({ valid: false, message: 'Error running cryptographic verification.' });
    } finally {
      setVerifyingChain(false);
    }
  };

  const getDeviceIcon = (deviceType) => {
    const dt = (deviceType || '').toLowerCase();
    if (dt.includes('mobile') || dt.includes('phone')) {
      return <Smartphone className="w-4 h-4 text-emerald-600 inline-block mr-1 shrink-0" />;
    }
    if (dt.includes('tablet') || dt.includes('pad')) {
      return <Tablet className="w-4 h-4 text-amber-600 inline-block mr-1 shrink-0" />;
    }
    return <Monitor className="w-4 h-4 text-blue-600 inline-block mr-1 shrink-0" />;
  };

  const getDeviceBadgeColor = (deviceType) => {
    const dt = (deviceType || '').toLowerCase();
    if (dt.includes('mobile') || dt.includes('phone')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (dt.includes('tablet') || dt.includes('pad')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Current Device Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-400/30 text-indigo-300">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Authentic login activity audit trail capturing verified operator logins, device fingerprint, and precise geographic coordinates
                </p>
              </div>
            </div>
          </div>

          {/* Current Connected Device Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-xs space-y-1 max-w-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Your Active Session Device</span>
            </div>
            <div className="font-semibold text-white flex items-center gap-1.5 truncate">
              {getDeviceIcon(clientMeta.deviceType)}
              <span className="truncate">{clientMeta.deviceName}</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/20 uppercase font-mono font-bold">
                {clientMeta.deviceType}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span className="truncate">{clientMeta.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Events</p>
            <p className="text-xl font-bold text-slate-900">{stats.totalLogs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Desktop Access</p>
            <p className="text-xl font-bold text-blue-700">{stats.desktopCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Mobile Access</p>
            <p className="text-xl font-bold text-emerald-700">{stats.mobileCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Tablet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tablet Access</p>
            <p className="text-xl font-bold text-amber-700">{stats.tabletCount}</p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Locations</p>
            <p className="text-xl font-bold text-purple-700">{stats.locationCount || 1}</p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Filters, and Export Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by operator, username, device name, precise location, or IP address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Action Buttons: Refresh, CSV, JSON */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              title="Refresh Logs"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              onClick={handleVerifyTamperCheck}
              disabled={verifyingChain}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
              title="Cryptographically verify SHA-256 hash chains across system and clearance audit logs"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
              <span>{verifyingChain ? 'Verifying Chain...' : 'Tamper Check'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Cryptographic Tamper Check Status Banner */}
        {chainStatus && (
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-all ${
            chainStatus.valid 
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <span className={`p-1.5 rounded-lg shrink-0 ${
              chainStatus.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold flex items-center justify-between">
                <span>{chainStatus.valid ? '✅ Cryptographic Integrity Verified' : '⚠️ Audit Chain Tampering Detected!'}</span>
                <button 
                  onClick={() => setChainStatus(null)} 
                  className="text-slate-400 hover:text-slate-600 font-normal underline"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-[11px] leading-relaxed">
                {chainStatus.message}
              </p>
              <div className="flex flex-wrap gap-4 text-[10px] font-mono mt-1 pt-1 border-t border-emerald-200/60">
                <span>System Logs Checked: <strong>{chainStatus.systemLogsVerified || 0}</strong></span>
                <span>Clearance Logs Checked: <strong>{chainStatus.noduesLogsVerified || 0}</strong></span>
                <span>SHA-256 Hash Chaining: <strong>{chainStatus.valid ? 'UNTAMPERED' : 'INVALID'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Filter Chips: Device Type */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Device Type:</span>
          </span>

          {['ALL', 'Desktop', 'Mobile', 'Tablet'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setDeviceFilter(type);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                deviceFilter === type
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'ALL' ? 'All Devices' : type}
            </button>
          ))}

          {/* Role Filter (Available for HOD to inspect department roles) */}
          {role === 'hod' && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Department Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Department Roles</option>
                <option value="hod">HOD Executive</option>
                <option value="faculty_advisor">Faculty Advisors</option>
                <option value="library_staff">Department Library</option>
                <option value="main_library_staff">Central Library</option>
                <option value="finance">Finance Office</option>
                <option value="dpc">Placement (DPC)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. Audit Log Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-medium">Loading system audit records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500 text-xs font-medium">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No Login Audit Records Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Authentic login records will appear here as respective users sign in with their active credentials.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Login Event</th>
                    <th className="py-3 px-4">Device Name</th>
                    <th className="py-3 px-4">Device Type</th>
                    <th className="py-3 px-4">Precise Location</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-900 text-[11px]">
                          {log.created_at ? log.created_at.slice(0, 16).replace('T', ' ') : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>ID #{log.id}</span>
                        </div>
                      </td>

                      {/* Operator & Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{log.full_name || log.username}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500">{log.username}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            {log.role}
                          </span>
                        </div>
                      </td>

                      {/* Action & Module */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px] block w-fit">
                          {log.action}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">{log.module}</div>
                      </td>

                      {/* Device Name */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center font-medium text-slate-800">
                          {getDeviceIcon(log.device_type)}
                          <span className="font-mono text-[11px]">{log.device_name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          IP: {log.ip_address || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Device Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getDeviceBadgeColor(log.device_type)}`}>
                          {log.device_type}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-start gap-1 text-[11px] text-slate-700 leading-snug">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="truncate" title={log.location}>{log.location}</span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-600 text-xs truncate" title={log.details}>
                          {log.details || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stream */}
            <div className="md:hidden divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm block">
                        {log.full_name || log.username}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {log.username} • {log.role}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getDeviceBadgeColor(log.device_type)}`}>
                      {getDeviceIcon(log.device_type)}
                      {log.device_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {log.module}
                    </span>
                  </div>

                  {log.details && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {log.details}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700 truncate">{log.device_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-slate-700 truncate">{log.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>IP: {log.ip_address || '127.0.0.1'}</span>
                      <span>{log.created_at ? log.created_at.slice(0, 16).replace('T', ' ') : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 5. Pagination */}
        <div className="py-3 px-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="font-medium">
            Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsViewer;

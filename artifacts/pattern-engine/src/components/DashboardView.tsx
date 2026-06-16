import { FileText, ShieldAlert, Fingerprint, Activity, ArrowRight, TrendingUp, AlertCircle, CheckCircle, History } from 'lucide-react';
import { Pattern, SecurityAlert, ActivityLog, Severity, ViewType } from '../types';

interface DashboardViewProps {
  filesScannedCount: number;
  alerts: SecurityAlert[];
  patterns: Pattern[];
  logs: ActivityLog[];
  onViewChange: (view: ViewType) => void;
}

export default function DashboardView({ filesScannedCount, alerts, patterns, logs, onViewChange }: DashboardViewProps) {
  const activePatternsCount = patterns.filter(p => p.enabled).length;
  const unresolvedAlerts = alerts.filter(a => a.status === 'Unresolved');
  const totalDetections = alerts.reduce((acc, a) => acc + (a.status === 'Unresolved' ? a.hits : 0), 0);

  const riskCounts = {
    Low: unresolvedAlerts.filter(a => a.severity === 'Low').length,
    Medium: unresolvedAlerts.filter(a => a.severity === 'Medium').length,
    High: unresolvedAlerts.filter(a => a.severity === 'High').length,
    Critical: unresolvedAlerts.filter(a => a.severity === 'Critical').length,
  };

  const getRiskLevel = () => {
    if (riskCounts.Critical > 0) return { label: 'CRITICAL', colorClass: 'bg-red-600 text-white', textClass: 'text-red-600' };
    if (riskCounts.High > 0) return { label: 'HIGH', colorClass: 'bg-orange-500 text-white', textClass: 'text-orange-600' };
    if (riskCounts.Medium > 0) return { label: 'MEDIUM', colorClass: 'bg-yellow-500 text-slate-900', textClass: 'text-yellow-600' };
    return { label: 'STABLE', colorClass: 'bg-green-500 text-white', textClass: 'text-green-600' };
  };

  const currentRisk = getRiskLevel();
  const maxRiskCount = Math.max(riskCounts.Low, riskCounts.Medium, riskCounts.High, riskCounts.Critical, 1);
  const getBarHeight = (count: number) => count === 0 ? '10%' : `${(count / maxRiskCount) * 80 + 10}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Real-time leak detection overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-32 hover:border-primary/50 transition-all shadow-sm">
          <div className="flex justify-between items-start text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Files Scanned</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary">{filesScannedCount.toLocaleString()}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-32 hover:border-destructive/50 transition-all shadow-sm">
          <div className="flex justify-between items-start text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Detections</span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <span className="text-2xl font-bold text-destructive">{totalDetections.toLocaleString()}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-32 hover:border-blue-400/50 transition-all shadow-sm">
          <div className="flex justify-between items-start text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Patterns</span>
            <Fingerprint className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-blue-600">{activePatternsCount} / {patterns.length}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-32 hover:border-yellow-400/50 transition-all shadow-sm">
          <div className="flex justify-between items-start text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Risk Level</span>
            <Activity className="h-4 w-4 text-yellow-500" />
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold text-center w-fit uppercase ${currentRisk.colorClass}`}>
            {currentRisk.label}
          </span>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <section className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-foreground">Risk Level Distribution</h3>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            LIVE EVALUATION
          </div>
        </div>

        <div className="flex items-end justify-around h-40 gap-4 mb-4 border-b border-border pb-2">
          {[
            { key: 'Low' as Severity, color: 'bg-primary/20 hover:bg-primary/40', bar: 'bg-primary', label: 'Low' },
            { key: 'Medium' as Severity, color: 'bg-yellow-500/20 hover:bg-yellow-500/40', bar: 'bg-yellow-500', label: 'Med' },
            { key: 'High' as Severity, color: 'bg-orange-500/20 hover:bg-orange-500/40', bar: 'bg-orange-500', label: 'High' },
            { key: 'Critical' as Severity, color: 'bg-red-600/20 hover:bg-red-600/40', bar: 'bg-red-600', label: 'Crit' },
          ].map(({ key, color, bar, label }) => (
            <div key={key} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
              <span className="text-xs font-mono text-muted-foreground font-bold">{riskCounts[key]}</span>
              <div className={`${color} w-full rounded-t-md transition-all duration-500 flex items-end justify-center py-1`} style={{ height: getBarHeight(riskCounts[key]) }}>
                <div className={`h-full w-2 ${bar} rounded-t ${key === 'Critical' && riskCounts.Critical > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-muted p-3.5 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Total Threat System Risk Status</span>
          <span className={`text-xs font-bold font-mono tracking-widest ${currentRisk.textClass}`}>
            {currentRisk.label === 'STABLE' ? 'STABLE (SECURE)' : `${currentRisk.label} THREATS DETECTED`}
          </span>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
          <button onClick={() => onViewChange('Alerts')} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer">
            View Alerts <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} onClick={() => onViewChange('Alerts')}
              className="flex items-center gap-3 p-3.5 bg-card border border-border hover:border-primary/40 transition-all rounded-xl cursor-pointer shadow-sm">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                alert.status === 'Acknowledged' ? 'bg-green-100 text-green-700'
                  : alert.severity === 'Critical' ? 'bg-red-100 text-red-600'
                  : 'bg-orange-100 text-orange-600'
              }`}>
                {alert.status === 'Acknowledged' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{alert.fileName}</p>
                <p className={`text-[11px] font-medium font-mono ${
                  alert.status === 'Acknowledged' ? 'text-green-700'
                    : alert.severity === 'Critical' ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {alert.status === 'Acknowledged' ? 'Mitigated / Acknowledged' : `${alert.hits} matches (${alert.patternName})`}
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0 uppercase">{alert.timestamp}</span>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="flex items-center justify-center py-8 bg-card border border-border rounded-xl">
              <p className="text-xs text-muted-foreground font-mono">No alerts yet. Run a scan to get started.</p>
            </div>
          )}

          {logs.length > 0 && (
            <div onClick={() => onViewChange('Logs')}
              className="flex items-center justify-between p-3 bg-muted border border-dashed border-border hover:border-primary/40 rounded-xl cursor-pointer text-xs">
              <div className="flex items-center gap-2 text-muted-foreground truncate">
                <History className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-mono truncate">Latest: {logs[0].message}</span>
              </div>
              <span className="text-[10px] font-mono text-primary hover:underline shrink-0 ml-1">View Logs</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

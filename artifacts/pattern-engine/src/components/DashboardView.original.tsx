import { 
  FileText, 
  ShieldAlert, 
  Fingerprint, 
  Activity, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react';
import { Pattern, SecurityAlert, ActivityLog, Severity, ViewType } from '../types';

interface DashboardViewProps {
  filesScannedCount: number;
  alerts: SecurityAlert[];
  patterns: Pattern[];
  logs: ActivityLog[];
  onViewChange: (view: ViewType) => void;
}

export default function DashboardView({
  filesScannedCount,
  alerts,
  patterns,
  logs,
  onViewChange
}: DashboardViewProps) {
  
  // Dynamic metrics calculation
  const activePatternsCount = patterns.filter(p => p.enabled).length;
  
  const unresolvedAlerts = alerts.filter(a => a.status === 'Unresolved');
  const totalDetections = alerts.reduce((acc, alert) => acc + (alert.status === 'Unresolved' ? alert.hits : 0), 0);

  // Risk Counts based on active unresolved threats
  const riskCounts = {
    Low: unresolvedAlerts.filter(a => a.severity === 'Low').length,
    Medium: unresolvedAlerts.filter(a => a.severity === 'Medium').length,
    High: unresolvedAlerts.filter(a => a.severity === 'High').length,
    Critical: unresolvedAlerts.filter(a => a.severity === 'Critical').length,
  };

  // Compute highest risk level
  const getRiskLevel = () => {
    if (riskCounts.Critical > 0) return { label: 'CRITICAL', colorClass: 'bg-red-600 text-white', textClass: 'text-error' };
    if (riskCounts.High > 0) return { label: 'HIGH', colorClass: 'bg-orange-500 text-white', textClass: 'text-orange-600' };
    if (riskCounts.Medium > 0) return { label: 'MEDIUM', colorClass: 'bg-yellow-500 text-on-surface', textClass: 'text-tertiary' };
    return { label: 'STABLE', colorClass: 'bg-green-500 text-white', textClass: 'text-green-600' };
  };

  const currentRisk = getRiskLevel();

  // Max count of threats in a category to scale bar chart correctly
  const maxRiskCount = Math.max(riskCounts.Low, riskCounts.Medium, riskCounts.High, riskCounts.Critical, 1);
  const getBarHeight = (count: number) => {
    if (count === 0) return '10%';
    const pct = (count / maxRiskCount) * 80 + 10; // min 15% for visibility, max 90%
    return `${pct}%`;
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-on-surface tracking-tight font-sans">Dashboard</h2>
        <p className="text-sm text-on-surface-variant font-sans">Real-time leak detection overview</p>
      </div>

      {/* Stats Grid (Bento Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Files Scanned Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-4 flex flex-col justify-between h-32 transition-all hover:border-primary shadow-xs">
          <div className="flex justify-between items-start text-on-surface-variant">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Files Scanned</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-primary font-sans">
            {filesScannedCount.toLocaleString()}
          </span>
        </div>

        {/* Detections Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-4 flex flex-col justify-between h-32 transition-all hover:border-error shadow-xs">
          <div className="flex justify-between items-start text-on-surface-variant">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Detections</span>
            <ShieldAlert className="h-4 w-4 text-error" />
          </div>
          <span className="text-2xl font-bold text-error font-sans">
            {totalDetections.toLocaleString()}
          </span>
        </div>

        {/* Active Patterns Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-4 flex flex-col justify-between h-32 transition-all hover:border-secondary shadow-xs">
          <div className="flex justify-between items-start text-on-surface-variant">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Active Patterns</span>
            <Fingerprint className="h-4 w-4 text-secondary" />
          </div>
          <span className="text-2xl font-bold text-secondary font-sans">
            {activePatternsCount} / {patterns.length}
          </span>
        </div>

        {/* Risk Level Card */}
        <div className="bg-white border border-outline-variant rounded-xl p-4 flex flex-col justify-between h-32 transition-all hover:border-tertiary-container shadow-xs">
          <div className="flex justify-between items-start text-on-surface-variant">
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Risk Level</span>
            <Activity className="h-4 w-4 text-tertiary-container" />
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold text-center w-fit uppercase ${currentRisk.colorClass}`}>
            {currentRisk.label}
          </span>
        </div>
      </div>

      {/* Analytics Chart Section */}
      <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-on-surface font-sans">Risk Level Distribution</h3>
          <div className="flex items-center gap-1 text-[11px] font-mono text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">
            <TrendingUp className="h-3 w-3 text-secondary" />
            LIVE EVALUATION
          </div>
        </div>

        {/* Dynamic Interactive Bar Chart */}
        <div className="flex items-end justify-around h-40 gap-4 mb-4 border-b border-surface-container pb-2">
          {/* Low */}
          <div className="flex flex-col items-center gap-2 w-full group cursor-pointer">
            <span className="text-xs font-mono text-on-surface-variant scale-90 group-hover:scale-100 transition-all font-bold">
              {riskCounts.Low}
            </span>
            <div 
              className="bg-primary/20 hover:bg-primary/40 w-full rounded-t-md transition-all duration-500 ease-out flex items-end justify-center py-1" 
              style={{ height: getBarHeight(riskCounts.Low) }}
            >
              <div className="h-full w-2 bg-primary rounded-t" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">Low</span>
          </div>

          {/* Medium */}
          <div className="flex flex-col items-center gap-2 w-full group cursor-pointer">
            <span className="text-xs font-mono text-on-surface-variant scale-90 group-hover:scale-100 transition-all font-bold">
              {riskCounts.Medium}
            </span>
            <div 
              className="bg-yellow-500/20 hover:bg-yellow-500/40 w-full rounded-t-md transition-all duration-500 ease-out flex items-end justify-center py-1" 
              style={{ height: getBarHeight(riskCounts.Medium) }}
            >
              <div className="h-full w-2 bg-yellow-500 rounded-t" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">Med</span>
          </div>

          {/* High */}
          <div className="flex flex-col items-center gap-2 w-full group cursor-pointer">
            <span className="text-xs font-mono text-on-surface-variant scale-90 group-hover:scale-100 transition-all font-bold">
              {riskCounts.High}
            </span>
            <div 
              className="bg-orange-500/20 hover:bg-orange-500/40 w-full rounded-t-md transition-all duration-500 ease-out flex items-end justify-center py-1" 
              style={{ height: getBarHeight(riskCounts.High) }}
            >
              <div className="h-full w-2 bg-orange-500 rounded-t" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">High</span>
          </div>

          {/* Critical */}
          <div className="flex flex-col items-center gap-2 w-full group cursor-pointer">
            <span className="text-xs font-mono text-on-surface-variant scale-90 group-hover:scale-100 transition-all font-bold">
              {riskCounts.Critical}
            </span>
            <div 
              className="bg-red-600/20 hover:bg-red-600/45 w-full rounded-t-md transition-all duration-500 ease-out flex items-end justify-center py-1" 
              style={{ height: getBarHeight(riskCounts.Critical) }}
            >
              <div className="h-full w-2 bg-red-600 rounded-t animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">Crit</span>
          </div>
        </div>

        <div className="bg-surface-container-low p-3.5 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-on-surface font-sans">
            Total Threat System Risk Status
          </span>
          <span className={`text-xs font-bold font-mono tracking-widest ${currentRisk.textClass}`}>
            {currentRisk.label === 'STABLE' ? 'STABLE (SECURE)' : `${currentRisk.label} THREATS DETECTED`}
          </span>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-on-surface font-sans">Recent Activity</h3>
          <button 
            onClick={() => onViewChange('Alerts')}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
          >
            View Alerts <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2">
          {/* List of top 3 recent alerts */}
          {alerts.slice(0, 3).map((alert) => (
            <div 
              key={alert.id}
              className="flex items-center gap-3 p-3.5 bg-white border border-outline-variant hover:border-primary transition-all rounded-xl cursor-pointer shadow-xs"
              onClick={() => onViewChange('Alerts')}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                alert.status === 'Acknowledged'
                  ? 'bg-green-100 text-green-700'
                  : alert.severity === 'Critical'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-orange-100 text-orange-600'
              }`}>
                {alert.status === 'Acknowledged' ? (
                  <CheckCircle className="h-4.5 w-4.5" />
                ) : (
                  <AlertCircle className="h-4.5 w-4.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-on-surface truncate font-sans">{alert.fileName}</p>
                <p className={`text-[11px] font-medium font-mono ${
                  alert.status === 'Acknowledged' 
                    ? 'text-green-700' 
                    : alert.severity === 'Critical'
                      ? 'text-red-600'
                      : 'text-orange-600'
                }`}>
                  {alert.status === 'Acknowledged' 
                    ? 'Mitigated / Acknowledged' 
                    : `${alert.hits} leak matches detected (${alert.patternName})`}
                </p>
              </div>

              <span className="text-[10px] font-mono text-on-surface-variant shrink-0 uppercase tracking-tight">
                {alert.timestamp}
              </span>
            </div>
          ))}

          {/* Quick Info Log */}
          {logs.length > 0 && (
            <div 
              onClick={() => onViewChange('Logs')}
              className="flex items-center justify-between p-3 bg-surface-container-low border border-dashed border-outline-variant hover:border-primary rounded-xl cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2 text-on-surface-variant truncate">
                <History className="h-3.5 w-3.5 text-secondary" />
                <span className="font-mono truncate">
                  Latest rule trace: {logs[0].message}
                </span>
              </div>
              <span className="text-[10px] font-mono text-secondary hover:underline shrink-0 ml-1">
                View Logs
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


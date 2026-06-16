import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  MoreVertical, 
  ShieldAlert, 
  Trash2, 
  Maximize2, 
  ListFilter,
  Check,
  TrendingDown,
  Lock,
  Compass
} from 'lucide-react';
import { SecurityAlert, Severity } from '../types';

interface AlertsViewProps {
  alerts: SecurityAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

export default function AlertsView({
  alerts,
  onAcknowledgeAlert,
  onDeleteAlert
}: AlertsViewProps) {
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Unresolved'>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter alerts dynamically according to choices
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'Critical') return alert.severity === 'Critical';
    if (filter === 'Unresolved') return alert.status === 'Unresolved';
    return true;
  });

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Icon level helper
  const getSeverityIcon = (severity: Severity, status: SecurityAlert['status']) => {
    if (status === 'Acknowledged') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    switch (severity) {
      case 'Critical':
        return <ShieldAlert className="h-5 w-5 text-white" />;
      case 'High':
      case 'Medium':
        return <AlertTriangle className="h-5 w-5 text-white" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-white" />;
    }
  };

  const getCardBorderClass = (alert: SecurityAlert) => {
    if (alert.status === 'Acknowledged') return 'border-green-200 bg-green-50/10 grayscale-[30%] opacity-85';
    switch (alert.severity) {
      case 'Critical':
        return 'border-red-300 hover:border-red-500 bg-red-50/5';
      case 'High':
        return 'border-orange-300 hover:border-orange-500 bg-orange-50/5';
      case 'Medium':
        return 'border-blue-200 hover:border-blue-400';
      default:
        return 'border-outline-variant';
    }
  };

  const getIconBackground = (alert: SecurityAlert) => {
    if (alert.status === 'Acknowledged') return 'bg-green-100 text-green-700';
    switch (alert.severity) {
      case 'Critical':
        return 'bg-red-600 shadow-lg shadow-red-500/10';
      case 'High':
        return 'bg-orange-500 shadow-lg shadow-orange-500/10';
      case 'Medium':
        return 'bg-blue-600';
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  };

  // Stats calculation
  const unresolvedCriticalCount = alerts.filter(a => a.severity === 'Critical' && a.status === 'Unresolved').length;
  const healthClass = unresolvedCriticalCount > 0 ? 'bg-red-600 text-white' : 'bg-primary text-white';

  return (
    <div className="space-y-6 pb-24" onClick={() => setActiveMenuId(null)}>
      {/* Filters Bar Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-outline-variant rounded-xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 ${
              filter === 'All' 
                ? 'bg-primary text-white shadow-xs' 
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          
          <button 
            onClick={() => setFilter('Critical')}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 ${
              filter === 'Critical' 
                ? 'bg-red-600 text-white shadow-xs' 
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            Critical Only ({alerts.filter(a => a.severity === 'Critical').length})
          </button>

          <button 
            onClick={() => setFilter('Unresolved')}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 ${
              filter === 'Unresolved' 
                ? 'bg-orange-600 text-white shadow-xs' 
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            Unresolved ({alerts.filter(a => a.status === 'Unresolved').length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-mono shrink-0 select-none">
          <ListFilter className="h-3.5 w-3.5 text-outline" />
          <span className="uppercase tracking-widest font-bold">Sort by Recency</span>
        </div>
      </div>

      {/* Alerts feed list */}
      <section className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 p-8 bg-white border border-outline-variant rounded-xl shadow-xs">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-on-surface mb-1 font-sans">Clear Audit Workspace</h4>
            <p className="text-xs text-on-surface-variant font-sans">All issues matching filters have been completed &amp; acknowledged.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <article 
              key={alert.id}
              className={`glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 transition-all ${getCardBorderClass(alert)}`}
            >
              {/* Severity emblem */}
              <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${getIconBackground(alert)}`}>
                {getSeverityIcon(alert.severity, alert.status)}
              </div>

              {/* Alert Content description */}
              <div className="flex-grow space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold tracking-widest uppercase font-mono ${
                    alert.status === 'Acknowledged' 
                      ? 'text-green-700' 
                      : alert.severity === 'Critical' 
                        ? 'text-red-600' 
                        : alert.severity === 'High'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                  }`}>
                    {alert.status === 'Acknowledged' ? 'MITIGATED ACKNOWLEDGED' : `${alert.severity} RISK ALERT`}
                  </span>
                  <time className="text-[10px] font-mono text-outline shrink-0">{alert.timestamp}</time>
                </div>

                <h3 className="text-sm font-bold text-on-surface font-sans leading-none truncate">
                  {alert.fileName}
                </h3>

                <div className="flex flex-wrap gap-2 items-center">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                    alert.status === 'Acknowledged'
                      ? 'bg-green-100 text-green-800'
                      : alert.severity === 'Critical'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                  }`}>
                    <Check className="h-3 w-3" />
                    {alert.patternName} ({alert.hits} hits)
                  </div>
                  
                  <div className="text-on-surface-variant font-mono text-[10px] flex items-center gap-1 truncate shrink">
                    <span className="w-1 h-1 bg-outline-variant rounded-full" />
                    {alert.channel}
                  </div>
                </div>

                {/* Leak code sample text preview */}
                {alert.snippet && (
                  <div className="bg-surface p-2 rounded border border-outline-variant mt-2 max-h-16 overflow-y-auto font-mono text-[11px] text-on-surface-variant leading-relaxed select-text">
                    Context: <span className="text-outline">{alert.snippet}</span>
                  </div>
                )}
              </div>

              {/* Action columns */}
              <div className="flex md:flex-col gap-2 shrink-0 md:justify-center relative">
                {alert.status === 'Unresolved' ? (
                  <button 
                    onClick={() => onAcknowledgeAlert(alert.id)}
                    className="flex-grow md:flex-none px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg font-sans font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <button 
                    disabled
                    className="flex-grow md:flex-none px-4 py-2 bg-surface-container-high text-on-surface-variant/75 border border-outline-variant rounded-lg font-sans font-bold text-xs select-none"
                  >
                    Acknowledged
                  </button>
                )}

                <div className="relative shrink-0">
                  <button 
                    onClick={(e) => handleToggleMenu(alert.id, e)}
                    className="px-2.5 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  
                  {activeMenuId === alert.id && (
                    <div className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-1 mb-1 bg-white border border-outline-variant rounded-xl shadow-lg z-30 py-1 min-w-[120px]">
                      <button 
                        type="button"
                        onClick={() => onDeleteAlert(alert.id)}
                        className="w-full text-left px-4 py-2 text-xs text-error font-sans font-bold hover:bg-red-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Alert
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-on-surface-variant font-sans hover:bg-surface-container-low flex items-center gap-1.5 cursor-pointer"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        Detail Inspect
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Bento Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Weekly matrix illustration display */}
        <div className="md:col-span-8 bg-surface-container-low rounded-xl p-6 border border-outline-variant overflow-hidden relative min-h-[180px] flex items-end shadow-xs group">
          <div className="absolute top-6 right-6 text-primary opacity-10 group-hover:scale-110 transition-transform duration-500 select-none pointer-events-none">
            <Compass className="h-28 w-28" />
          </div>
          <div className="relative z-10 w-full max-w-md">
            <h4 className="text-base font-bold text-on-surface font-sans">Weekly Threat Matrix</h4>
            <p className="text-xs text-on-surface-variant font-sans mt-1.5 leading-relaxed">
              Analyzes multi-stream incoming telemetry packets across distributed S3 Storage nodes. Fully audited compliance standards.
            </p>
          </div>
        </div>

        {/* Global Node status indicator */}
        <div className="md:col-span-4 bg-primary-fixed text-on-primary-fixed bg-blue-100 rounded-xl p-5 border border-primary-fixed-dim flex flex-col justify-between shadow-xs">
          <div>
            <TrendingDown className="h-8 w-8 text-primary mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-on-surface-variant">System Status</p>
            <h4 className="text-base font-bold text-primary font-sans mt-1">
              {unresolvedCriticalCount > 0 ? 'Threat Mitigation Active' : 'All Nodes Secure'}
            </h4>
          </div>
          <div className="mt-4 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${unresolvedCriticalCount > 0 ? 'bg-orange-500 w-[60%]' : 'bg-primary w-[100%]'}`}
            />
          </div>
        </div>
      </section>
    </div>
  );
}


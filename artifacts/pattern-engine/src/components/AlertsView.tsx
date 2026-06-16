import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, MoreVertical, ShieldAlert, Trash2, Maximize2, ListFilter, Check, TrendingDown, Compass } from 'lucide-react';
import { SecurityAlert, Severity } from '../types';

interface AlertsViewProps {
  alerts: SecurityAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

export default function AlertsView({ alerts, onAcknowledgeAlert, onDeleteAlert }: AlertsViewProps) {
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Unresolved'>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'Critical') return alert.severity === 'Critical';
    if (filter === 'Unresolved') return alert.status === 'Unresolved';
    return true;
  });

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const getSeverityIcon = (severity: Severity, status: SecurityAlert['status']) => {
    if (status === 'Acknowledged') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (severity === 'Critical') return <ShieldAlert className="h-5 w-5 text-white" />;
    return <AlertTriangle className="h-5 w-5 text-white" />;
  };

  const getCardBorderClass = (alert: SecurityAlert) => {
    if (alert.status === 'Acknowledged') return 'border-green-200 bg-green-50/10 opacity-80';
    if (alert.severity === 'Critical') return 'border-red-300 hover:border-red-500 bg-red-50/5';
    if (alert.severity === 'High') return 'border-orange-300 hover:border-orange-500 bg-orange-50/5';
    if (alert.severity === 'Medium') return 'border-blue-200 hover:border-blue-400';
    return 'border-border';
  };

  const getIconBg = (alert: SecurityAlert) => {
    if (alert.status === 'Acknowledged') return 'bg-green-100 text-green-700';
    if (alert.severity === 'Critical') return 'bg-red-600';
    if (alert.severity === 'High') return 'bg-orange-500';
    if (alert.severity === 'Medium') return 'bg-blue-600';
    return 'bg-muted text-muted-foreground';
  };

  const unresolvedCritical = alerts.filter(a => a.severity === 'Critical' && a.status === 'Unresolved').length;

  return (
    <div className="space-y-6 pb-24" onClick={() => setActiveMenuId(null)}>
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'All', label: `All Alerts (${alerts.length})`, active: 'bg-primary text-white', inactive: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
            { key: 'Critical', label: `Critical Only (${alerts.filter(a => a.severity === 'Critical').length})`, active: 'bg-red-600 text-white', inactive: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
            { key: 'Unresolved', label: `Unresolved (${alerts.filter(a => a.status === 'Unresolved').length})`, active: 'bg-orange-600 text-white', inactive: 'bg-muted hover:bg-muted/80 text-muted-foreground' },
          ].map(({ key, label, active, inactive }) => (
            <button key={key} onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0 ${filter === key ? active : inactive}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-mono shrink-0">
          <ListFilter className="h-3.5 w-3.5" />
          <span className="uppercase tracking-widest font-bold">Sort by Recency</span>
        </div>
      </div>

      {/* Alert List */}
      <section className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl shadow-sm">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Clear Workspace</h4>
            <p className="text-xs text-muted-foreground">All issues matching filters are resolved.</p>
          </div>
        ) : filteredAlerts.map(alert => (
          <article key={alert.id} className={`glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 transition-all ${getCardBorderClass(alert)}`}>
            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${getIconBg(alert)}`}>
              {getSeverityIcon(alert.severity, alert.status)}
            </div>

            <div className="flex-grow space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold tracking-widest uppercase font-mono ${
                  alert.status === 'Acknowledged' ? 'text-green-700'
                    : alert.severity === 'Critical' ? 'text-red-600'
                    : alert.severity === 'High' ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {alert.status === 'Acknowledged' ? 'MITIGATED' : `${alert.severity} RISK ALERT`}
                </span>
                <time className="text-[10px] font-mono text-muted-foreground shrink-0">{alert.timestamp}</time>
              </div>

              <h3 className="text-sm font-bold text-foreground leading-none truncate">{alert.fileName}</h3>

              <div className="flex flex-wrap gap-2 items-center">
                <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                  alert.status === 'Acknowledged' ? 'bg-green-100 text-green-800'
                    : alert.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  <Check className="h-3 w-3" />
                  {alert.patternName} ({alert.hits} hits)
                </div>
                <div className="text-muted-foreground font-mono text-[10px] flex items-center gap-1 truncate">
                  <span className="w-1 h-1 bg-border rounded-full" />
                  {alert.channel}
                </div>
              </div>

              {alert.snippet && (
                <div className="bg-muted p-2 rounded border border-border mt-2 max-h-16 overflow-y-auto font-mono text-[11px] text-muted-foreground leading-relaxed select-text">
                  Context: <span className="text-foreground/60">{alert.snippet}</span>
                </div>
              )}
            </div>

            <div className="flex md:flex-col gap-2 shrink-0 md:justify-center relative">
              {alert.status === 'Unresolved' ? (
                <button onClick={() => onAcknowledgeAlert(alert.id)}
                  className="flex-grow md:flex-none px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm">
                  Acknowledge
                </button>
              ) : (
                <button disabled className="flex-grow md:flex-none px-4 py-2 bg-muted text-muted-foreground border border-border rounded-lg font-bold text-xs">
                  Acknowledged
                </button>
              )}

              <div className="relative shrink-0">
                <button onClick={e => handleToggleMenu(alert.id, e)}
                  className="px-2.5 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <MoreVertical className="h-4 w-4" />
                </button>

                {activeMenuId === alert.id && (
                  <div className="absolute right-0 bottom-full md:top-full md:bottom-auto mt-1 mb-1 bg-card border border-border rounded-xl shadow-lg z-30 py-1 min-w-[130px]">
                    <button type="button" onClick={() => onDeleteAlert(alert.id)}
                      className="w-full text-left px-4 py-2 text-xs text-destructive font-bold hover:bg-red-50 flex items-center gap-1.5 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" /> Delete Alert
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); setActiveMenuId(null); }}
                      className="w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted flex items-center gap-1.5 cursor-pointer">
                      <Maximize2 className="h-3.5 w-3.5" /> Detail Inspect
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Bento Bottom Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 bg-muted rounded-xl p-6 border border-border overflow-hidden relative min-h-[160px] flex items-end shadow-sm group">
          <div className="absolute top-6 right-6 text-primary opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <Compass className="h-28 w-28" />
          </div>
          <div className="relative z-10 w-full max-w-md">
            <h4 className="text-base font-bold text-foreground">Weekly Threat Matrix</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Analyzes multi-stream incoming telemetry packets across distributed storage nodes. Fully audited compliance standards.
            </p>
          </div>
        </div>

        <div className="md:col-span-4 bg-blue-50 rounded-xl p-5 border border-blue-100 flex flex-col justify-between shadow-sm">
          <div>
            <TrendingDown className="h-8 w-8 text-primary mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-muted-foreground">System Status</p>
            <h4 className="text-base font-bold text-primary mt-1">
              {unresolvedCritical > 0 ? 'Threat Mitigation Active' : 'All Nodes Secure'}
            </h4>
          </div>
          <div className="mt-4 w-full bg-blue-200 h-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${unresolvedCritical > 0 ? 'bg-orange-500 w-[60%]' : 'bg-primary w-[100%]'}`} />
          </div>
        </div>
      </section>
    </div>
  );
}

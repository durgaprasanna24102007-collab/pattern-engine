import { useState } from 'react';
import { FileClock, Terminal, Search, Download, Trash2, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { ActivityLog } from '../types';

interface LogsViewProps {
  logs: ActivityLog[];
  onClearLogs: () => void;
  onAddLog: (level: ActivityLog['level'], message: string, details?: string) => void;
}

export default function LogsView({ logs, onClearLogs, onAddLog }: LogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ActivityLog['level'] | 'all'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelIcon = (level: ActivityLog['level']) => {
    if (level === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (level === 'error') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getLevelClass = (level: ActivityLog['level']) => {
    if (level === 'success') return 'text-green-700 bg-green-50/50 border-green-200';
    if (level === 'warning') return 'text-yellow-700 bg-yellow-50/50 border-yellow-200';
    if (level === 'error') return 'text-red-700 bg-red-50/50 border-red-200';
    return 'text-blue-700 bg-blue-50/50 border-blue-200';
  };

  const handleExportLogs = () => {
    const rawData = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(rawData);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `dlp_telemetry_logs_${Date.now()}.json`;
    link.click();
    onAddLog('success', 'Exported system logs workspace', `Generated JSON bundle: ${rawData.length} bytes.`);
  };

  const levels = [
    { key: 'all', label: 'ALL', active: 'bg-foreground text-background', inactive: 'bg-background hover:bg-muted border border-border' },
    { key: 'info', label: 'INFO', active: 'bg-blue-600 text-white', inactive: 'bg-background hover:bg-blue-50 border border-border text-blue-700' },
    { key: 'success', label: 'SUCCESS', active: 'bg-green-600 text-white', inactive: 'bg-background hover:bg-green-50 border border-border text-green-700' },
    { key: 'warning', label: 'WARN', active: 'bg-yellow-600 text-white', inactive: 'bg-background hover:bg-yellow-50 border border-border text-yellow-700' },
    { key: 'error', label: 'ERROR', active: 'bg-red-600 text-white', inactive: 'bg-background hover:bg-red-50 border border-border text-red-700' },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none text-xs"
            placeholder="Search telemetry traces, file names, or errors..." />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {levels.map(({ key, label, active, inactive }) => (
              <button key={key} onClick={() => setSelectedLevel(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${selectedLevel === key ? active : inactive}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={handleExportLogs}
              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={onClearLogs}
              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Console Feed */}
      <div className="bg-muted border border-border rounded-xl p-4 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary shrink-0" />
            <h4 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider">
              DLP Engine Console Logs ({filteredLogs.length} traces)
            </h4>
          </div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground">MODE: LOCAL_STATE_STREAM</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <FileClock className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-mono text-muted-foreground">Console memory empty or no matching filters.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 border-b border-border/50 pb-3 text-xs last:border-b-0">
                <span className="shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>
                <div className="flex-1 min-w-0 font-mono space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground text-xs font-semibold truncate leading-normal">{log.message}</p>
                    <time className="text-[10px] text-muted-foreground tracking-tight shrink-0">[{log.timestamp}]</time>
                  </div>
                  {log.details && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed select-text bg-background/75 p-2 rounded border border-border">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

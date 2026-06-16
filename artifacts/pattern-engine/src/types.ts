export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type ScanStatus = 'ongoing' | 'alert' | 'done' | 'canceled';
export type AlertStatus = 'Unresolved' | 'Acknowledged';
export interface Pattern { id: string; name: string; category: string; type: string; regexStr: string; severity: Severity; enabled: boolean; iconName: 'alternate_email' | 'credit_card' | 'badge' | 'vpn_key' | 'phone' | 'custom'; }
export interface SecurityAlert { id: string; fileName: string; patternName: string; severity: Severity; timestamp: string; hits: number; status: AlertStatus; channel: string; snippet: string; }
export interface ScanTask { id: string; fileName: string; progress: number; status: ScanStatus; threatsFound: number; size: string; timeRemaining: string; }
export interface ActivityLog { id: string; timestamp: string; level: 'info' | 'warning' | 'error' | 'success'; message: string; details?: string; }
export type ViewType = 'Dashboard' | 'Patterns' | 'Scanner' | 'Alerts' | 'Logs';

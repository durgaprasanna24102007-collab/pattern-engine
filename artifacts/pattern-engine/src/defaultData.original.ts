import { Pattern, SecurityAlert, ScanTask, ActivityLog } from './types';

export const INITIAL_PATTERNS: Pattern[] = [
  {
    id: 'pat-1',
    name: 'Email Address',
    category: 'PII',
    type: 'Standard',
    regexStr: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    severity: 'Medium',
    enabled: true,
    iconName: 'alternate_email'
  },
  {
    id: 'pat-2',
    name: 'Credit Card',
    category: 'Financial',
    type: 'PCI-DSS',
    regexStr: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})\\b',
    severity: 'High',
    enabled: true,
    iconName: 'credit_card'
  },
  {
    id: 'pat-3',
    name: 'Social Security Number',
    category: 'PII',
    type: 'Sensitive',
    regexStr: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    severity: 'Critical',
    enabled: true,
    iconName: 'badge'
  },
  {
    id: 'pat-4',
    name: 'API Keys',
    category: 'Creds',
    type: 'Developer',
    regexStr: '\\b(?:api[-_]?[key]?)?[:=]\\s*[\'"]?([A-Za-z0-9]{32,48})[\'"]?\\b',
    severity: 'High',
    enabled: false,
    iconName: 'vpn_key'
  },
  {
    id: 'pat-5',
    name: 'Phone Numbers',
    category: 'PII',
    type: 'Global',
    regexStr: '\\+?\\b[1-9]\\d{1,3}[- .]?\\d{3,4}[- .]?\\d{4,6}\\b',
    severity: 'Low',
    enabled: true,
    iconName: 'phone'
  }
];

export const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'alert-1',
    fileName: 'customer_export_june.csv',
    patternName: 'VISA Card Match',
    severity: 'Critical',
    timestamp: '2 mins ago',
    hits: 142,
    status: 'Unresolved',
    channel: 'Outbound Transfer',
    snippet: '4111-2222-3333-4444 (VISA), 4222-1234-3456-7890 (VISA)'
  },
  {
    id: 'alert-2',
    fileName: 'internal_payroll_draft.xlsx',
    patternName: 'SSN Pattern Match',
    severity: 'High',
    timestamp: '14 mins ago',
    hits: 5,
    status: 'Unresolved',
    channel: 'Storage Scanner',
    snippet: 'John Doe, 123-45-6789; Jane Smith, 987-65-4321'
  },
  {
    id: 'alert-3',
    fileName: 'system_logs_archive.zip',
    patternName: 'Internal IP Leak',
    severity: 'Medium',
    timestamp: '1 hr ago',
    hits: 18,
    status: 'Unresolved',
    channel: 'Network Bridge',
    snippet: 'Internal gateway leak: 192.168.1.104, admin: 10.0.8.22'
  },
  {
    id: 'alert-4',
    fileName: 'public_announcement.docx',
    patternName: 'Possible API Key',
    severity: 'Low',
    timestamp: '4 hrs ago',
    hits: 1,
    status: 'Acknowledged',
    channel: 'Public Relations Drive',
    snippet: 'SDK initialization with key_production=x98FAS87fhas8fh1f893'
  }
];

export const INITIAL_SCANS: ScanTask[] = [
  {
    id: 'scan-1',
    fileName: 'customer_db_dump.sql',
    progress: 65,
    status: 'ongoing',
    threatsFound: 24,
    size: '2.4GB',
    timeRemaining: '4m left'
  },
  {
    id: 'scan-2',
    fileName: 'prod_env_backup.tar.gz',
    progress: 88,
    status: 'alert',
    threatsFound: 12,
    size: '1.2GB',
    timeRemaining: 'high alert'
  },
  {
    id: 'scan-3',
    fileName: 'api_spec_v2.yaml',
    progress: 100,
    status: 'done',
    threatsFound: 0,
    size: '4.2MB',
    timeRemaining: 'Completed 2m ago'
  }
];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: '22:31:04',
    level: 'info',
    message: 'Pattern Engine v3.0 initializes',
    details: 'Loaded 5 active rules and compiled optimized regex tree.'
  },
  {
    id: 'log-2',
    timestamp: '22:31:12',
    level: 'success',
    message: 'Connected to Enterprise Vault',
    details: 'Verified TLS handshake with AWS S3 Nodes & Azure Blob storage endpoints.'
  },
  {
    id: 'log-3',
    timestamp: '22:31:45',
    level: 'warning',
    message: 'Detections identified in public_announcement.docx',
    details: 'Found pattern matches matching rule "API Keys".'
  },
  {
    id: 'log-4',
    timestamp: '22:32:01',
    level: 'error',
    message: 'Critical outbound transfer block on customer_export_june.csv',
    details: 'Blocked outbound API route packet matching 142 records of "Credit Card".'
  }
];


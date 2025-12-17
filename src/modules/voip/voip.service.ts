import axios from 'axios';
import { db } from '../../database/db';

// AGI Isabel Configuration Interface
export interface IsabelConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: 'http' | 'https';
  enabled: boolean;
}

// Helper function to promisify db.all
const dbAll = (query: string, params: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Get configuration from settings table or environment
export const getIsabelConfig = async (): Promise<IsabelConfig | null> => {
  try {
    // Try to load configuration from settings table
    const rows = await dbAll(
      'SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?)',
      [
        'isabel_host',
        'isabel_port',
        'isabel_username',
        'isabel_password',
        'isabel_protocol',
        'isabel_enabled',
      ]
    );

    const settings: Record<string, string> = {};
    rows.forEach((row: any) => {
      if (row && row.key) {
        settings[row.key] = row.value || '';
      }
    });

    const host = settings['isabel_host'] || process.env.ISABEL_HOST || '';
    const port = parseInt(settings['isabel_port'] || process.env.ISABEL_PORT || '8088');
    const username = settings['isabel_username'] || process.env.ISABEL_USERNAME || '';
    const password = settings['isabel_password'] || process.env.ISABEL_PASSWORD || '';
    const protocol = ((settings['isabel_protocol'] ||
      process.env.ISABEL_PROTOCOL ||
      'http') as 'http' | 'https');
    const enabled =
      (settings['isabel_enabled'] ?? process.env.ISABEL_ENABLED) === 'true';

    const config: IsabelConfig = {
      host,
      port,
      username,
      password,
      protocol,
      enabled,
    };

    if (!config.host || !config.username || !config.password || !config.enabled) {
      return null;
    }

    return config;
  } catch (error) {
    console.error('Error loading Isabel config:', error);

    // Fallback to environment variables only
    const config: IsabelConfig = {
      host: process.env.ISABEL_HOST || '',
      port: parseInt(process.env.ISABEL_PORT || '8088'),
      username: process.env.ISABEL_USERNAME || '',
      password: process.env.ISABEL_PASSWORD || '',
      protocol: (process.env.ISABEL_PROTOCOL as 'http' | 'https') || 'http',
      enabled: process.env.ISABEL_ENABLED === 'true',
    };

    if (!config.host || !config.username || !config.password || !config.enabled) {
      return null;
    }

    return config;
  }
};

// Test connection to AGI Isabel
export const testIsabelConnection = async (config: IsabelConfig): Promise<boolean> => {
  try {
    const baseURL = `${config.protocol}://${config.host}:${config.port}`;
    const response = await axios.get(`${baseURL}/api/status`, {
      auth: {
        username: config.username,
        password: config.password,
      },
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('Isabel connection test failed:', error);
    return false;
  }
};

// Get call logs from AGI Isabel
export const getIsabelCallLogs = async (
  config: IsabelConfig,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    user?: string;
    type?: 'incoming' | 'outgoing';
  }
): Promise<any[]> => {
  try {
    const baseURL = `${config.protocol}://${config.host}:${config.port}`;
    const params: any = {};
    
    if (filters?.dateFrom) params.start_date = filters.dateFrom;
    if (filters?.dateTo) params.end_date = filters.dateTo;
    if (filters?.user) params.user = filters.user;
    if (filters?.type) params.call_type = filters.type;

    const response = await axios.get(`${baseURL}/api/cdr`, {
      auth: {
        username: config.username,
        password: config.password,
      },
      params,
      timeout: 10000,
    });

    // Transform Isabel CDR format to our format
    let logs = (response.data?.data || []).map((cdr: any) => ({
      id: cdr.id || cdr.uniqueid,
      date: cdr.calldate || cdr.date,
      from: cdr.src || cdr.callerid,
      to: cdr.dst || cdr.destination,
      userName: cdr.userfield || cdr.accountcode,
      type: cdr.channel?.includes('Incoming') || cdr.dcontext === 'from-external' ? 'incoming' : 'outgoing',
      duration: parseInt(cdr.duration || 0),
      billsec: parseInt(cdr.billsec || 0),
      status: cdr.disposition || 'UNKNOWN',
      recording: cdr.recordingfile || null,
    }));

    // Filter by user (voip_extension) if provided
    if (filters?.user) {
      logs = logs.filter((log: any) => 
        log.from === filters.user || log.to === filters.user
      );
    }

    return logs;
  } catch (error: any) {
    console.error('Error fetching Isabel call logs:', error.message);
    throw new Error(`خطا در دریافت لاگ تماس‌ها: ${error.message}`);
  }
};

// Get call statistics from AGI Isabel
export const getIsabelStatistics = async (
  config: IsabelConfig,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<any> => {
  try {
    const baseURL = `${config.protocol}://${config.host}:${config.port}`;
    const params: any = {};
    
    if (filters?.dateFrom) params.start_date = filters.dateFrom;
    if (filters?.dateTo) params.end_date = filters.dateTo;

    const response = await axios.get(`${baseURL}/api/cdr/stats`, {
      auth: {
        username: config.username,
        password: config.password,
      },
      params,
      timeout: 10000,
    });

    const stats = response.data || {};
    
    return {
      totalCalls: stats.total_calls || 0,
      incomingCalls: stats.incoming_calls || 0,
      outgoingCalls: stats.outgoing_calls || 0,
      avgDuration: stats.avg_duration || 0,
      totalDuration: stats.total_duration || 0,
      userStats: stats.user_stats || [],
    };
  } catch (error: any) {
    console.error('Error fetching Isabel statistics:', error.message);
    throw new Error(`خطا در دریافت آمار تماس‌ها: ${error.message}`);
  }
};

// Get real-time monitoring data from AGI Isabel
export const getIsabelRealTime = async (config: IsabelConfig): Promise<any> => {
  try {
    const baseURL = `${config.protocol}://${config.host}:${config.port}`;
    
    const response = await axios.get(`${baseURL}/api/channels`, {
      auth: {
        username: config.username,
        password: config.password,
      },
      timeout: 5000,
    });

    const channels = response.data?.data || [];
    
    // Transform channels to active calls
    const activeCalls = channels
      .filter((channel: any) => channel.state === 'Up' && channel.connectedlinenum)
      .map((channel: any) => ({
        id: channel.uniqueid,
        from: channel.calleridnum || channel.callerid,
        to: channel.connectedlinenum || channel.exten,
        user: channel.accountcode || channel.userfield,
        type: channel.context?.includes('incoming') ? 'incoming' : 'outgoing',
        duration: parseInt(channel.duration || 0),
        startTime: channel.answeredtime || channel.starttime,
      }));

    return {
      activeCalls,
      channels: channels.length,
      totalChannels: response.data?.total || 0,
    };
  } catch (error: any) {
    console.error('Error fetching Isabel real-time data:', error.message);
    return { activeCalls: [], channels: [], totalChannels: 0 };
  }
};

// Placeholder functions for when Isabel is not configured
export const getMonitoringPlaceholder = () => {
  return {
    status: 'pending',
    integrations: [],
    message: 'Issabel VOIP integration is not configured yet. This is a placeholder endpoint.',
    connected: false,
  };
};

export const getVoipLogsPlaceholder = () => {
  return {
    status: 'pending',
    logs: [],
    message: 'VOIP logs will appear here after integrating with Issabel API.',
  };
};

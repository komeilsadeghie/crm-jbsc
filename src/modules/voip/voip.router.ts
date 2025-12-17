import { Router, Request, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { db } from '../../database/db';
import {
  getMonitoringPlaceholder,
  getVoipLogsPlaceholder,
  getIsabelConfig,
  testIsabelConnection,
  getIsabelCallLogs,
  getIsabelStatistics,
  getIsabelRealTime,
} from './voip.service';

const router = Router();

// Get VOIP configuration status
router.get(
  '/config',
  authenticate,
  authorize('admin', 'media', 'media_manager', 'sales', 'sales_manager'),
  async (_req: Request, res: Response) => {
    try {
      const config = await getIsabelConfig();

      if (!config) {
        return res.json({
          connected: false,
          message: 'تنظیمات AGI Isabel پیکربندی نشده است',
        });
      }

      const isConnected = await testIsabelConnection(config);

      return res.json({
        connected: isConnected,
        host: config.host,
        port: config.port,
        protocol: config.protocol,
        message: isConnected ? 'اتصال برقرار است' : 'خطا در اتصال به AGI Isabel',
      });
    } catch (error: any) {
      return res.status(500).json({
        connected: false,
        error: error.message || 'خطا در بررسی وضعیت اتصال',
      });
    }
  }
);

// Get call logs
router.get('/logs', authenticate, authorize('admin', 'media', 'sales'), async (req: AuthRequest, res: Response) => {
  try {
    const config = await getIsabelConfig();
    
    if (!config) {
      return res.json(getVoipLogsPlaceholder());
    }

    const filters = {
      dateFrom: req.query.date_from as string,
      dateTo: req.query.date_to as string,
      user: req.query.user as string,
      type: req.query.type as 'incoming' | 'outgoing' | undefined,
    };

    const logs = await getIsabelCallLogs(config, filters);
    
    // Get users with voip_extension to match with call logs
    db.all(
      'SELECT id, username, full_name, first_name, last_name, voip_extension FROM users WHERE voip_extension IS NOT NULL AND voip_extension != ""',
      [],
      (err, users) => {
        if (err) {
          console.error('Error fetching users for VOIP matching:', err);
          return res.json({
            status: 'success',
            logs,
            count: logs.length,
          });
        }

        // Create a map of voip_extension to user
        const userMap: Record<string, any> = {};
        (users || []).forEach((user: any) => {
          if (user.voip_extension) {
            userMap[user.voip_extension] = {
              id: user.id,
              username: user.username,
              full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            };
          }
        });

        // Match logs with users based on voip_extension
        const enrichedLogs = logs.map((log: any) => {
          // Try to find user by matching voip_extension with 'from' or 'to' fields
          let matchedUser = null;
          let matchedExtension = null;
          
          // Check if 'from' matches a user's voip_extension (for outgoing calls)
          if (log.from && userMap[log.from]) {
            matchedUser = userMap[log.from];
            matchedExtension = log.from;
          } 
          // Check if 'to' matches a user's voip_extension (for incoming calls)
          else if (log.to && userMap[log.to]) {
            matchedUser = userMap[log.to];
            matchedExtension = log.to;
          }

          return {
            ...log,
            userId: matchedUser?.id || null,
            userName: matchedUser?.full_name || log.userName || 'نامشخص',
            userExtension: matchedExtension || null,
          };
        });

        return res.json({
          status: 'success',
          logs: enrichedLogs,
          count: enrichedLogs.length,
        });
      }
    );
  } catch (error: any) {
    console.error('Error fetching VOIP logs:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'خطا در دریافت لاگ تماس‌ها',
      logs: [],
    });
  }
});

// Get call statistics
router.get('/statistics', authenticate, authorize('admin', 'media', 'sales'), async (req: AuthRequest, res: Response) => {
  try {
    const config = await getIsabelConfig();
    
    if (!config) {
      return res.json({
        totalCalls: 0,
        incomingCalls: 0,
        outgoingCalls: 0,
        avgDuration: 0,
        userStats: [],
      });
    }

    const filters = {
      dateFrom: req.query.date_from as string,
      dateTo: req.query.date_to as string,
    };

    const statistics = await getIsabelStatistics(config, filters);
    
    // Get users with voip_extension to calculate user statistics
    db.all(
      'SELECT id, username, full_name, first_name, last_name, voip_extension FROM users WHERE voip_extension IS NOT NULL AND voip_extension != ""',
      [],
      async (err, users) => {
        if (err) {
          console.error('Error fetching users for statistics:', err);
          return res.json(statistics);
        }

        // Get call logs to calculate per-user statistics
        try {
          const logs = await getIsabelCallLogs(config, filters);
          
          // Create user map
          const userMap: Record<string, any> = {};
          (users || []).forEach((user: any) => {
            if (user.voip_extension) {
              userMap[user.voip_extension] = {
                id: user.id,
                username: user.username,
                full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
              };
            }
          });

          // Calculate statistics per user
          const userStatsMap: Record<number, any> = {};
          
          logs.forEach((log: any) => {
            let userId = null;
            let userName = 'نامشخص';
            
            if (log.from && userMap[log.from]) {
              userId = userMap[log.from].id;
              userName = userMap[log.from].full_name;
            } else if (log.to && userMap[log.to]) {
              userId = userMap[log.to].id;
              userName = userMap[log.to].full_name;
            }

            if (userId) {
              if (!userStatsMap[userId]) {
                userStatsMap[userId] = {
                  userId,
                  userName,
                  totalCalls: 0,
                  incoming: 0,
                  outgoing: 0,
                  totalDuration: 0,
                };
              }

              userStatsMap[userId].totalCalls++;
              if (log.type === 'incoming') {
                userStatsMap[userId].incoming++;
              } else {
                userStatsMap[userId].outgoing++;
              }
              userStatsMap[userId].totalDuration += log.duration || 0;
            }
          });

          // Calculate average duration for each user
          const userStats = Object.values(userStatsMap).map((stat: any) => ({
            ...stat,
            avgDuration: stat.totalCalls > 0 ? Math.round(stat.totalDuration / stat.totalCalls) : 0,
          }));

          return res.json({
            ...statistics,
            userStats: userStats.sort((a: any, b: any) => b.totalCalls - a.totalCalls),
          });
        } catch (error: any) {
          console.error('Error calculating user statistics:', error);
          return res.json(statistics);
        }
      }
    );
  } catch (error: any) {
    console.error('Error fetching VOIP statistics:', error);
    return res.status(500).json({
      error: error.message || 'خطا در دریافت آمار تماس‌ها',
      totalCalls: 0,
      incomingCalls: 0,
      outgoingCalls: 0,
      avgDuration: 0,
      userStats: [],
    });
  }
});

// Get real-time monitoring data
router.get('/realtime', authenticate, authorize('admin', 'media', 'sales'), async (req: AuthRequest, res: Response) => {
  try {
    const config = await getIsabelConfig();
    
    if (!config) {
      return res.json({
        activeCalls: [],
        channels: [],
        totalChannels: 0,
      });
    }

    const realTimeData = await getIsabelRealTime(config);
    
    return res.json(realTimeData);
  } catch (error: any) {
    console.error('Error fetching real-time data:', error);
    return res.json({
      activeCalls: [],
      channels: [],
      totalChannels: 0,
    });
  }
});

// Legacy endpoints for backward compatibility
router.get('/monitoring', authenticate, authorize('admin', 'media', 'sales'), async (_req: Request, res: Response) => {
  try {
    const config = await getIsabelConfig();
    
    if (!config) {
      return res.json(getMonitoringPlaceholder());
    }

    const isConnected = await testIsabelConnection(config);
    
    return res.json({
      status: isConnected ? 'connected' : 'disconnected',
      integrations: ['AGI Isabel'],
      connected: isConnected,
      message: isConnected ? 'اتصال به AGI Isabel برقرار است' : 'خطا در اتصال به AGI Isabel',
    });
  } catch (error: any) {
    return res.json(getMonitoringPlaceholder());
  }
});

export default router;



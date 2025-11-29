import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { getMonitoringPlaceholder, getVoipLogsPlaceholder } from './voip.service';

const router = Router();

router.get('/monitoring', authenticate, authorize('admin', 'media', 'sales'), (_req, res) => {
  res.json(getMonitoringPlaceholder());
});

router.get('/logs', authenticate, authorize('admin', 'media', 'sales'), (_req, res) => {
  res.json(getVoipLogsPlaceholder());
});

export default router;



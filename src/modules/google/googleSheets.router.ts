import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { getModuleSnapshot, readSheetRange } from './googleSheets.service';
import { ImportModule } from '../import-export/importExport.service';

const router = Router();

const isSupportedModule = (module: string): module is ImportModule => {
  return ['customers', 'deals', 'coachingPrograms', 'contentItems'].includes(module);
};

router.post('/read', authenticate, authorize('admin', 'sales', 'coach', 'media', 'finance'), async (req, res) => {
  try {
    const { spreadsheetId, range } = req.body as { spreadsheetId: string; range: string };

    if (!spreadsheetId || !range) {
      return res.status(400).json({ error: 'شناسه شیت و محدوده الزامی است' });
    }

    const rows = await readSheetRange(spreadsheetId, range);
    res.json({ rows });
  } catch (error) {
    if (error instanceof Error && error.message === 'GOOGLE_SHEETS_CREDENTIALS_MISSING') {
      return res.status(500).json({ error: 'تنظیمات گوگل شیت انجام نشده است' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در خواندن اطلاعات از گوگل شیت' });
  }
});

router.get('/:module/snapshot', authenticate, authorize('admin', 'sales', 'coach', 'media', 'finance'), async (req, res) => {
  try {
    const { module } = req.params;

    if (!isSupportedModule(module)) {
      return res.status(400).json({ error: 'ماژول پشتیبانی نمی‌شود' });
    }

    const data = await getModuleSnapshot(module);
    res.json({ module, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت داده‌های ماژول' });
  }
});

export default router;



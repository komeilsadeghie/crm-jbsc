import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { exportModuleToExcel, importModuleFromExcel, ImportModule } from './importExport.service';

const router = Router();

const isSupportedModule = (module: string): module is ImportModule => {
  return ['customers', 'deals', 'coachingPrograms', 'contentItems'].includes(module);
};

router.get('/:module/export', authenticate, authorize('admin', 'sales', 'coach', 'media', 'finance'), async (req, res) => {
  try {
    const { module } = req.params;

    if (!isSupportedModule(module)) {
      return res.status(400).json({ error: 'ماژول پشتیبانی نمی‌شود' });
    }

    const buffer = await exportModuleToExcel(module);

    res.json({
      filename: `${module}-${new Date().toISOString().split('T')[0]}.xlsx`,
      content: buffer.toString('base64'),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در خروجی گرفتن از اکسل' });
  }
});

router.post('/:module/import', authenticate, authorize('admin', 'sales', 'coach', 'media', 'finance'), async (req: AuthRequest, res) => {
  try {
    const { module } = req.params;
    const { file, mapping } = req.body as { file: string; mapping: Record<string, string> };

    if (!isSupportedModule(module)) {
      return res.status(400).json({ error: 'ماژول پشتیبانی نمی‌شود' });
    }

    if (!file) {
      return res.status(400).json({ error: 'فایل اکسل ارسال نشده است' });
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      return res.status(400).json({ error: 'نگاشت ستون‌ها ارسال نشده است' });
    }

    const buffer = Buffer.from(file, 'base64');

    const result = await importModuleFromExcel({
      module,
      file: buffer,
      mapping,
      createdById: req.user?.id,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ورود اطلاعات از اکسل' });
  }
});

export default router;



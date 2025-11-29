import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateCustomerScore,
  getCustomerSegments,
  bulkDeleteCustomers,
} from './customer.service';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { CustomerStatus, CustomerType } from './customer.types';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const {
      type,
      status,
      category,
      search,
      tags,
      customerModels,
      createdById,
    } = req.query;

    const tagIds = typeof tags === 'string' ? tags.split(',') : undefined;
    const customerModelsArray =
      typeof customerModels === 'string'
        ? customerModels.split(',').map((model) => parseInt(model, 10)).filter((value) => !Number.isNaN(value))
        : undefined;

    const customers = await listCustomers({
      type: type as CustomerType | undefined,
      status: status as CustomerStatus | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      tagIds,
      customerModels: customerModelsArray,
      createdById: createdById as string | undefined,
    });

    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مشتریان' });
  }
});

router.get('/segments', authenticate, async (_req, res) => {
  try {
    const segments = await getCustomerSegments();
    res.json(segments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت سگمنت‌های مشتری' });
  }
});

// Bulk delete customers - MUST be before /:id route
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'لیست شناسه‌ها الزامی است' });
    }

    const deletedCount = await bulkDeleteCustomers(ids);
    res.json({ 
      message: `${deletedCount} مشتری و تمام موارد مرتبط با موفقیت حذف شد`,
      deletedCount 
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'خطا در حذف گروهی مشتریان: ' + (error instanceof Error ? error.message : 'خطای نامشخص') });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await getCustomerById(id);
    res.json(customer);
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مشتری' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const payload = req.body;
    const userId = req.user?.id;
    const customer = await createCustomer(payload, userId);
    res.status(201).json(customer);
  } catch (error) {
    if (error instanceof Error && error.message.includes('customerModel')) {
      return res.status(400).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در ثبت مشتری' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const customer = await updateCustomer(id, payload);
    res.json(customer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ error: 'مشتری یافت نشد' });
      }

      if (error.message.includes('customerModel')) {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی مشتری' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCustomer(id);
    res.json({ message: 'مشتری و تمام موارد مرتبط با موفقیت حذف شد' });
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'مشتری یافت نشد' });
    }
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف مشتری: ' + (error instanceof Error ? error.message : 'خطای نامشخص') });
  }
});

router.patch('/:id/score', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    if (typeof score !== 'number') {
      return res.status(400).json({ error: 'نمره باید عدد باشد' });
    }

    const customer = await updateCustomerScore(id, score);
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی نمره' });
  }
});

export default router;



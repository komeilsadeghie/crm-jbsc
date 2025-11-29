import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import {
  assignTagsToEntity,
  createTag,
  deleteTag,
  listTags,
  removeTagAssignment,
  updateTag,
} from './tag.service';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  try {
    const tags = await listTags();
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت برچسب‌ها' });
  }
});

router.post('/', authenticate, authorize('admin', 'sales', 'coach', 'media'), async (req, res) => {
  try {
    const tag = await createTag(req.body);
    res.status(201).json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ایجاد برچسب' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'sales', 'coach', 'media'), async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await updateTag(id, req.body);
    res.json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ویرایش برچسب' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTag(id);
    res.json({ message: 'برچسب حذف شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف برچسب' });
  }
});

router.post('/assign', authenticate, async (req, res) => {
  try {
    const assignments = await assignTagsToEntity(req.body);
    res.json(assignments);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ENTITY_NOT_FOUND') {
        return res.status(404).json({ error: 'موجودیت مورد نظر یافت نشد' });
      }
      if (error.message === 'UNSUPPORTED_ENTITY_TYPE') {
        return res.status(400).json({ error: 'نوع موجودیت پشتیبانی نمی‌شود' });
      }
    }

    console.error(error);
    res.status(500).json({ error: 'خطا در انتساب برچسب‌ها' });
  }
});

router.delete('/assign/:assignmentId', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    await removeTagAssignment(assignmentId);
    res.json({ message: 'برچسب از موجودیت جدا شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف انتساب برچسب' });
  }
});

export default router;



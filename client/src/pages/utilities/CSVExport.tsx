import { useState } from 'react';
import { Download } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const CSVExport = () => {
  const toast = useToast();
  const [exportType, setExportType] = useState('customers');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement CSV export API call
      toast.showSuccess('خروجی CSV با موفقیت ایجاد شد');
    } catch (error: any) {
      toast.showError('خطا در ایجاد خروجی CSV: ' + (error.message || 'خطای ناشناخته'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">خروجی CSV</h1>
        
        <div className="card">
          <div className="space-y-4">
            <div>
              <label className="label">نوع خروجی</label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
                className="input"
              >
                <option value="customers">مشتریان</option>
                <option value="leads">سرنخ‌ها</option>
                <option value="deals">معاملات</option>
                <option value="invoices">فاکتورها</option>
                <option value="estimates">پیش‌فاکتورها</option>
              </select>
            </div>
            
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn btn-primary flex items-center gap-2 w-full"
            >
              <Download size={20} />
              {isExporting ? 'در حال ایجاد...' : 'ایجاد خروجی CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVExport;


import { useState } from 'react';
import { useMutation } from 'react-query';
import api from '../services/api';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { formatDateForInput } from '../utils/dateHelper';
import { useToast } from '../contexts/ToastContext';

const ImportExport = () => {
  const toast = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'customers' | 'deals' | 'coachingPrograms' | 'contentItems'>('customers');
  const [exportType, setExportType] = useState<'customers' | 'deals' | 'coachingPrograms' | 'contentItems'>('customers');

  const importMutation = useMutation(
    async (formData: FormData) => {
      // Convert file to base64
      const file = formData.get('file') as File;
      const reader = new FileReader();
      const base64File = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // For now, use a simple mapping (can be enhanced later)
      const mapping: Record<string, string> = {};
      
      const response = await api.post(`/import-export/${importType}/import`, {
        file: base64File,
        mapping: mapping,
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.showSuccess(`واردات با موفقیت انجام شد. ${data.successCount || 0} رکورد وارد شد.`);
        setImportFile(null);
      },
      onError: (error: any) => {
        toast.showError(error.response?.data?.error || 'خطا در واردات فایل');
      },
    }
  );

  const exportMutation = useMutation(
    async () => {
      const response = await api.get(`/import-export/${exportType}/export`);
      // Backend returns base64, convert to blob
      const base64 = response.data.content;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return { blob, filename: response.data.filename };
    },
    {
      onSuccess: (data) => {
        const url = window.URL.createObjectURL(data.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${exportType}_${formatDateForInput(new Date())}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      onError: (error: any) => {
        toast.showError(error.response?.data?.error || 'خطا در خروجی فایل');
      },
    }
  );

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.showError('لطفاً یک فایل انتخاب کنید');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);
    importMutation.mutate(formData);
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">ورود و خروج داده‌ها</h1>
      </div>

      {/* Import Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-primary-600" size={24} />
          <h2 className="text-xl font-bold">واردات داده (Import)</h2>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">نکات مهم:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>فایل باید فرمت Excel (.xlsx) باشد</li>
                <li>ستون‌های فایل باید مطابق با ساختار داده باشد</li>
                <li>برای مشاهده قالب فایل، ابتدا یک خروجی بگیرید</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع داده</label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="input"
            >
              <option value="customers">مشتریان</option>
              <option value="deals">پروژه‌ها</option>
              <option value="coachingPrograms">برنامه‌های کوچینگ</option>
              <option value="contentItems">آیتم‌های محتوا</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">انتخاب فایل Excel</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="input"
                required
              />
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet size={20} />
                  <span>{importFile.name}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={importMutation.isLoading || !importFile}
          >
            <Upload size={20} />
            {importMutation.isLoading ? 'در حال واردات...' : 'واردات فایل'}
          </button>
        </form>
      </div>

      {/* Export Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Download className="text-primary-600" size={24} />
          <h2 className="text-xl font-bold">خروجی داده (Export)</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع داده</label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as any)}
              className="input"
            >
              <option value="customers">مشتریان</option>
              <option value="deals">پروژه‌ها</option>
              <option value="coachingPrograms">برنامه‌های کوچینگ</option>
              <option value="contentItems">آیتم‌های محتوا</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="btn btn-primary flex items-center gap-2"
            disabled={exportMutation.isLoading}
          >
            <Download size={20} />
            {exportMutation.isLoading ? 'در حال آماده‌سازی...' : 'دانلود فایل Excel'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-gray-50">
        <h3 className="font-bold mb-2">راهنمای استفاده:</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>واردات:</strong> فایل Excel را انتخاب کرده و نوع داده را مشخص کنید. پس از واردات، داده‌ها به سیستم اضافه می‌شوند.</p>
          <p><strong>خروجی:</strong> نوع داده مورد نظر را انتخاب کرده و فایل Excel را دانلود کنید. این فایل می‌تواند به عنوان قالب برای واردات استفاده شود.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;


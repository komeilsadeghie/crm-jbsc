import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Save, Globe, Lock, Shield } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import JalaliDatePicker from '../components/JalaliDatePicker';

const ProfileEdit = () => {
  const { user, refetchProfile } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);

  const { data: profile, isLoading } = useQuery(
    'profile',
    async () => {
      const response = await api.get('/profile/me');
      return response.data;
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching profile:', error);
      }
    }
  );

  if (isLoading) {
    return <div className="text-center py-12">در حال بارگذاری...</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">ویرایش پروفایل</h1>
        </div>

        {/* Profile Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">اطلاعات شخصی</h2>
          <ProfileForm profile={profile || user} onUpdate={refetchProfile} />
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Lock className="text-neutral-600 dark:text-neutral-400" size={24} />
              <h2 className="text-xl font-bold">تغییر رمز عبور</h2>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn btn-secondary"
            >
              تغییر رمز عبور
            </button>
          </div>
        </div>

        {/* Two Factor Authentication */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Shield className="text-neutral-600 dark:text-neutral-400" size={24} />
              <h2 className="text-xl font-bold">احراز هویت دو مرحله‌ای</h2>
            </div>
            <button
              onClick={() => setShowTwoFactorModal(true)}
              className="btn btn-secondary"
            >
              تنظیمات
            </button>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <PasswordModal onClose={() => setShowPasswordModal(false)} />
        )}

        {/* Two Factor Modal */}
        {showTwoFactorModal && (
          <TwoFactorModal onClose={() => setShowTwoFactorModal(false)} />
        )}
      </div>
    </div>
  );
};

const ProfileForm = ({ profile, onUpdate }: { profile: any; onUpdate: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    facebook: profile?.facebook || '',
    linkedin: profile?.linkedin || '',
    skype: profile?.skype || '',
    email_signature: profile?.email_signature || '',
    language: profile?.language || 'system',
    direction: profile?.direction || 'system',
  });

  const { data: departments } = useQuery('departments', async () => {
    try {
      const response = await api.get('/departments');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  });

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>(
    profile?.departments?.map((d: any) => d.id) || []
  );

  const mutation = useMutation(
    (data: any) => api.put('/profile/me', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('profile');
        onUpdate();
        toast.showSuccess('پروفایل با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        console.error('Error updating profile:', error);
        toast.showError(error.response?.data?.error || 'خطا در به‌روزرسانی پروفایل');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      departments: selectedDepartments,
    });
  };

  const toggleDepartment = (id: number) => {
    setSelectedDepartments(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label label-required">نام</label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
        <div>
          <label className="label label-required">ایمیل</label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
        <div>
          <label className="label">تلفن</label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
        <div>
          <label className="label">زبان پیش‌فرض</label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="input"
          >
            <option value="system">پیش‌فرض سیستم</option>
            <option value="fa">فارسی</option>
            <option value="en">انگلیسی</option>
          </select>
        </div>
        <div>
          <label className="label">جهت</label>
          <select
            value={formData.direction}
            onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
            className="input"
          >
            <option value="system">پیش‌فرض سیستم</option>
            <option value="rtl">راست به چپ</option>
            <option value="ltr">چپ به راست</option>
          </select>
        </div>
      </div>

      {/* Social Media */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">شبکه‌های اجتماعی</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Facebook</label>
            <input
              type="url"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              className="input"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="label">LinkedIn</label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              className="input"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="label">Skype</label>
            <input
              type="text"
              value={formData.skype}
              onChange={(e) => setFormData({ ...formData, skype: e.target.value })}
              className="input"
              placeholder="skype username"
            />
          </div>
        </div>
      </div>

      {/* Email Signature */}
      <div className="border-t pt-4">
        <label className="label">امضای ایمیل</label>
        <textarea
          value={formData.email_signature}
          onChange={(e) => setFormData({ ...formData, email_signature: e.target.value })}
          className="input"
          rows={5}
          placeholder="امضای ایمیل شما..."
        />
      </div>

      {/* Departments */}
      {departments && departments.length > 0 && (
        <div className="border-t pt-4">
          <label className="label">دپارتمان‌ها</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {departments.map((dept: any) => (
              <button
                key={dept.id}
                type="button"
                onClick={() => toggleDepartment(dept.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedDepartments.includes(dept.id)
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={mutation.isLoading}>
          <Save size={20} />
          {mutation.isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </div>
    </form>
  );
};

const PasswordModal = ({ onClose }: { onClose: () => void }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const mutation = useMutation(
    (data: any) => api.put('/profile/me/password', data),
    {
      onSuccess: () => {
        toast.showSuccess('رمز عبور با موفقیت تغییر یافت');
        onClose();
      },
      onError: (error: any) => {
        toast.showError(error.response?.data?.error || 'خطا در تغییر رمز عبور');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      toast.showError('رمز عبور جدید و تأیید آن مطابقت ندارند');
      return;
    }
    mutation.mutate({
      current_password: formData.current_password,
      new_password: formData.new_password,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">تغییر رمز عبور</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label label-required">رمز عبور فعلی</label>
            <input
              type="password"
              value={formData.current_password}
              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label label-required">رمز عبور جدید</label>
            <input
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              className="input"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label label-required">تأیید رمز عبور جدید</label>
            <input
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              className="input"
              required
              minLength={6}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TwoFactorModal = ({ onClose }: { onClose: () => void }) => {
  const toast = useToast();
  const [twoFactorType, setTwoFactorType] = useState('disabled');

  const mutation = useMutation(
    (data: any) => api.put('/profile/me/two-factor', data),
    {
      onSuccess: () => {
        toast.showSuccess('تنظیمات احراز هویت دو مرحله‌ای به‌روزرسانی شد');
        onClose();
      },
      onError: (error: any) => {
        toast.showError(error.response?.data?.error || 'خطا در به‌روزرسانی تنظیمات');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ type: twoFactorType });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">احراز هویت دو مرحله‌ای</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
              <input
                type="radio"
                name="twoFactor"
                value="disabled"
                checked={twoFactorType === 'disabled'}
                onChange={(e) => setTwoFactorType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">غیرفعال</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
              <input
                type="radio"
                name="twoFactor"
                value="email"
                checked={twoFactorType === 'email'}
                onChange={(e) => setTwoFactorType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">فعال‌سازی احراز هویت دو مرحله‌ای با ایمیل</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
              <input
                type="radio"
                name="twoFactor"
                value="google"
                checked={twoFactorType === 'google'}
                onChange={(e) => setTwoFactorType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">فعال‌سازی Google Authenticator</span>
            </label>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEdit;






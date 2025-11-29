import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Phone, Save } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">پروفایل کاربری</h1>
      </div>

      {/* Profile Info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">اطلاعات شخصی</h2>
        <ProfileForm profile={profile || user} />
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">تغییر رمز عبور</h2>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn btn-secondary"
          >
            تغییر رمز عبور
          </button>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

const ProfileForm = ({ profile }: { profile: any }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });

  const mutation = useMutation(
    (data: any) => api.put('/profile/me', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('profile');
        alert('پروفایل با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        console.error('Error updating profile:', error);
        alert(error.response?.data?.error || 'خطا در به‌روزرسانی پروفایل');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">نام کامل</label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">ایمیل</label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">تلفن</label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input pr-10"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={mutation.isLoading}>
          <Save size={20} />
          {mutation.isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </div>
    </form>
  );
};

const PasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const mutation = useMutation(
    (data: any) => api.put('/profile/me/password', data),
    {
      onSuccess: () => {
        alert('رمز عبور با موفقیت تغییر یافت');
        onClose();
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || 'خطا در تغییر رمز عبور');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      alert('رمز عبور جدید و تأیید آن مطابقت ندارند');
      return;
    }
    mutation.mutate({
      current_password: formData.current_password,
      new_password: formData.new_password,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">تغییر رمز عبور</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">رمز عبور فعلی *</label>
            <input
              type="password"
              value={formData.current_password}
              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">رمز عبور جدید *</label>
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
            <label className="block text-sm font-medium mb-2">تأیید رمز عبور جدید *</label>
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

export default Profile;


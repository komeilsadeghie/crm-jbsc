import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, User, Shield, Save, Users, Settings as SettingsIcon, Upload, X, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'roles' | 'departments'>('general');

  const { data: users } = useQuery('users-list', async () => {
    const response = await api.get('/users');
    return response.data || [];
  });

  const createUserMutation = useMutation(
    (data: any) => api.post('/users', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-list');
        setShowUserModal(false);
        setEditingUser(null);
        alert('کاربر با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateUserMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/users/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-list');
        queryClient.invalidateQueries('user-permissions');
        queryClient.invalidateQueries('user-departments');
        setShowUserModal(false);
        setEditingUser(null);
        alert('کاربر با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteUserMutation = useMutation(
    (id: number) => api.delete(`/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users-list');
        alert('کاربر با موفقیت حذف شد');
      },
    }
  );

  const rolePermissions: Record<string, string[]> = {
    'designer': ['media', 'projects', 'tasks'],
    'coach': ['coaching', 'customers', 'tasks'],
    'coach_manager': ['coaching', 'customers', 'tasks', 'reports'],
    'sales_manager': ['leads', 'deals', 'customers', 'estimates', 'contracts', 'reports'],
    'admin': ['*'], // همه دسترسی‌ها
    'media_manager': ['media', 'tasks', 'reports'],
    'editor': ['media', 'knowledge-base', 'email-templates'],
    'accountant': ['expenses', 'contracts', 'invoices', 'reports'],
  };

  const roleLabels: Record<string, string> = {
    'designer': 'طراح سایت',
    'coach': 'کوچ',
    'coach_manager': 'مدیر کوچ',
    'sales_manager': 'مدیر فروش',
    'admin': 'مدیر کل',
    'media_manager': 'مدیر مدیا',
    'editor': 'ویرایشگر',
    'accountant': 'حسابدار',
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass-card">
          <h1 className="page-heading-gradient">تنظیمات</h1>
        </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'general'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <SettingsIcon className="inline-block ml-2" size={20} />
          تنظیمات عمومی
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'users'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Users className="inline-block ml-2" size={20} />
          مدیریت کاربران
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'roles'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Shield className="inline-block ml-2" size={20} />
          نقش‌ها و دسترسی‌ها
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'departments'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <Building2 className="inline-block ml-2" size={20} />
          دپارتمان‌ها
        </button>
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'departments' && <DepartmentsManagement />}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              کاربر جدید
            </button>
          </div>

          <div className="glass-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">نام کاربری</th>
                    <th className="text-right p-3">نام کامل</th>
                    <th className="text-right p-3">ایمیل</th>
                    <th className="text-right p-3">نقش</th>
                    <th className="text-right p-3">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u: any) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{u.username}</td>
                      <td className="p-3">{u.full_name || '-'}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowUserModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit size={18} />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => {
                                if (confirm('آیا مطمئن هستید؟')) {
                                  deleteUserMutation.mutate(u.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="glass-card">
          <h2 className="text-xl font-bold mb-4">نقش‌ها و دسترسی‌ها</h2>
          <div className="space-y-4">
            {Object.entries(rolePermissions).map(([role, permissions]) => (
              <div key={role} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{roleLabels[role]}</h3>
                  <span className="text-sm text-gray-600">{role}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {perm === '*' ? 'همه دسترسی‌ها' : perm}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUserModal && (
        <UserModal
          user={editingUser}
          roleLabels={roleLabels}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={async (data: any) => {
            if (editingUser) {
              await updateUserMutation.mutateAsync({ id: editingUser.id, data });
            } else {
              await createUserMutation.mutateAsync(data);
            }
          }}
        />
      )}
      </div>
    </div>
  );
};

const UserModal = ({ user, roleLabels, onClose, onSave }: any) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    role: 'user',
    hourly_rate: 0,
    facebook: '',
    linkedin: '',
    skype: '',
    email_signature: '',
    default_language: 'fa',
    direction: 'rtl',
    is_admin: false,
    is_staff: true,
    voip_extension: '',
  });

  // Reset form data when user changes (when modal opens/closes or editing different user)
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        password: '',
        role: user.role || 'user',
        hourly_rate: user.hourly_rate || 0,
        facebook: user.facebook || '',
        linkedin: user.linkedin || '',
        skype: user.skype || '',
        email_signature: user.email_signature || '',
        default_language: user.default_language || 'fa',
        direction: user.direction || 'rtl',
        is_admin: user.is_admin || false,
        is_staff: user.is_staff !== undefined ? user.is_staff : true,
        voip_extension: user.voip_extension || '',
      });
      setActiveTab('profile');
    } else {
      // Reset to defaults for new user
      setFormData({
        username: '',
        email: '',
        full_name: '',
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        role: 'user',
        hourly_rate: 0,
        facebook: '',
        linkedin: '',
        skype: '',
        email_signature: '',
        default_language: 'fa',
        direction: 'rtl',
        is_admin: false,
        is_staff: true,
        voip_extension: '',
      });
      setActiveTab('profile');
    }
  }, [user]);

  const { data: departments } = useQuery('departments', async () => {
    const response = await api.get('/tickets/departments');
    return response.data || [];
  }, {
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: allPermissions } = useQuery('permissions', async () => {
    const response = await api.get('/permissions');
    return response.data || {};
  }, {
    enabled: activeTab === 'permissions' && !!user,
  });

  const { data: userPermissions } = useQuery(
    ['user-permissions', user?.id],
    async () => {
      if (!user?.id) return [];
      const response = await api.get(`/permissions/user/${user.id}`);
      return response.data || [];
    },
    {
      enabled: activeTab === 'permissions' && !!user?.id,
    }
  );

  const { data: userDepartments } = useQuery(
    ['user-departments', user?.id],
    async () => {
      if (!user?.id) return [];
      const response = await api.get(`/permissions/user/${user.id}/departments`);
      return response.data || [];
    },
    {
      enabled: activeTab === 'permissions' && !!user?.id,
    }
  );

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (userDepartments) {
      setSelectedDepartments(userDepartments.map((d: any) => d.id));
    }
  }, [userDepartments]);

  useEffect(() => {
    if (userPermissions && allPermissions) {
      const perms: Record<string, boolean> = {};
      userPermissions.forEach((up: any) => {
        perms[up.id] = up.granted === 1;
      });
      setSelectedPermissions(perms);
    }
  }, [userPermissions, allPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields for new users
    if (!user) {
      if (!formData.username || formData.username.trim() === '') {
        alert('لطفا نام کاربری را وارد کنید');
        return;
      }
      if (!formData.email || formData.email.trim() === '') {
        alert('لطفا ایمیل را وارد کنید');
        return;
      }
      if (!formData.password || formData.password.trim() === '') {
        alert('لطفا رمز عبور را وارد کنید');
        return;
      }
      if (!formData.role || formData.role.trim() === '') {
        alert('لطفا نقش را انتخاب کنید');
        return;
      }
    }
    
    const data: any = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      full_name: formData.full_name?.trim() || null,
      first_name: formData.first_name?.trim() || null,
      last_name: formData.last_name?.trim() || null,
      phone: formData.phone?.trim() || null,
      role: formData.role,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate.toString()) : 0,
      facebook: formData.facebook?.trim() || null,
      linkedin: formData.linkedin?.trim() || null,
      skype: formData.skype?.trim() || null,
      email_signature: formData.email_signature?.trim() || null,
      default_language: formData.default_language || 'fa',
      direction: formData.direction || 'rtl',
      is_admin: formData.is_admin || false,
      is_staff: formData.is_staff !== undefined ? formData.is_staff : true,
      voip_extension: formData.voip_extension?.trim() || null,
    };
    if (formData.password && formData.password.trim() !== '') {
      data.password = formData.password;
    }
    
    try {
      await onSave(data);

      // Save permissions and departments if editing
      if (user && activeTab === 'permissions') {
        try {
          // Save permissions
          const permissions = Object.entries(selectedPermissions)
            .filter(([_, granted]) => granted)
            .map(([permission_id, _]) => ({ permission_id: parseInt(permission_id), granted: true }));
          
          await api.put(`/permissions/user/${user.id}`, { permissions });

          // Save departments
          await api.put(`/permissions/user/${user.id}/departments`, { 
            department_ids: selectedDepartments 
          });
          
          alert('دسترسی‌ها و دپارتمان‌ها با موفقیت ذخیره شدند');
        } catch (error: any) {
          alert('خطا در ذخیره دسترسی‌ها: ' + (error.response?.data?.error || error.message));
        }
      }
    } catch (error: any) {
      // Error is already handled by mutation onError callback
      console.error('Error in handleSubmit:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">{user ? 'ویرایش' : 'ایجاد'} کاربر</h2>
        
        {/* Tabs */}
        <div className="flex gap-4 border-b mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'profile'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            پروفایل
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'permissions'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              دسترسی‌ها
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'profile' && (
            <>
              {/* Role and Staff Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نقش *</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input"
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{String(label)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">مدیر سیستم</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_staff}
                      onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">عضو تیم</span>
                  </label>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نام کاربری *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ایمیل *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نام *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نام کامل</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">تلفن</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">شماره داخلی VOIP</label>
                  <input
                    type="text"
                    value={formData.voip_extension}
                    onChange={(e) => setFormData({ ...formData, voip_extension: e.target.value })}
                    className="input"
                    placeholder="مثال: 1001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نرخ ساعتی</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {user ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور *'}
                  </label>
                  <input
                    type="password"
                    required={!user}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Social Media */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">شبکه‌های اجتماعی</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Facebook</label>
                    <input
                      type="url"
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      className="input"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">LinkedIn</label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="input"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Skype</label>
                    <input
                      type="text"
                      value={formData.skype}
                      onChange={(e) => setFormData({ ...formData, skype: e.target.value })}
                      className="input"
                      placeholder="skype_username"
                    />
                  </div>
                </div>
              </div>

              {/* Language and Signature */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">زبان پیش‌فرض</label>
                  <select
                    value={formData.default_language}
                    onChange={(e) => setFormData({ ...formData, default_language: e.target.value })}
                    className="input"
                  >
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">جهت متن</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="input"
                  >
                    <option value="rtl">راست به چپ</option>
                    <option value="ltr">چپ به راست</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">امضای ایمیل</label>
                <textarea
                  value={formData.email_signature}
                  onChange={(e) => setFormData({ ...formData, email_signature: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="امضای ایمیل..."
                />
              </div>
            </>
          )}

          {activeTab === 'permissions' && user && (
            <>
              {/* Departments */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">دپارتمان‌های عضو</h3>
                <div className="grid grid-cols-3 gap-2">
                  {departments?.map((dept: any) => (
                    <label key={dept.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(dept.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDepartments([...selectedDepartments, dept.id]);
                          } else {
                            setSelectedDepartments(selectedDepartments.filter(id => id !== dept.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">دسترسی‌ها</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {allPermissions && Object.entries(allPermissions).map(([module, perms]: [string, any]) => (
                    <div key={module} className="border-b pb-4">
                      <h4 className="font-semibold mb-2 capitalize">{module}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm: any) => (
                          <label key={perm.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[perm.id] || false}
                              onChange={(e) => {
                                setSelectedPermissions({
                                  ...selectedPermissions,
                                  [perm.id]: e.target.checked,
                                });
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{perm.description || perm.capability}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GeneralSettings = () => {
  const queryClient = useQueryClient();
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery('settings', async () => {
    const response = await api.get('/settings');
    return response.data || {};
  });

  const [formData, setFormData] = useState({
    company_name: '',
    company_domain: '',
    rtl_admin_area: '1',
    rtl_customers_area: '1',
    allowed_file_types: '',
    // VOIP / Isabel configuration
    isabel_host: '',
    isabel_port: '',
    isabel_username: '',
    isabel_password: '',
    isabel_protocol: 'http',
    isabel_enabled: 'false',
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_domain: settings.company_domain || '',
        rtl_admin_area: settings.rtl_admin_area || '1',
        rtl_customers_area: settings.rtl_customers_area || '1',
        allowed_file_types: settings.allowed_file_types || '',
        isabel_host: settings.isabel_host || '',
        isabel_port: settings.isabel_port || '',
        isabel_username: settings.isabel_username || '',
        isabel_password: settings.isabel_password || '',
        isabel_protocol: settings.isabel_protocol || 'http',
        isabel_enabled: settings.isabel_enabled || 'false',
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation(
    (data: any) => api.put('/settings', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        alert('تنظیمات با موفقیت ذخیره شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const uploadLogoMutation = useMutation(
    async ({ file, type }: { file: File; type: string }) => {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('type', type);
      const response = await api.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        setUploadingLogo(null);
        alert('لوگو با موفقیت آپلود شد');
      },
      onError: (error: any) => {
        alert('خطا در آپلود لوگو: ' + (error.response?.data?.error || error.message));
        setUploadingLogo(null);
      },
    }
  );

  const deleteLogoMutation = useMutation(
    (type: string) => api.delete(`/settings/logo/${type}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('settings');
        alert('لوگو با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا در حذف لوگو: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingLogo(type);
      uploadLogoMutation.mutate({ file, type });
    }
  };

  const handleDeleteLogo = (type: string) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این لوگو را حذف کنید؟')) {
      deleteLogoMutation.mutate(type);
    }
  };

  const getLogoUrl = (type: string) => {
    const logoPath = settings?.[`logo_${type}`];
    if (logoPath) {
      // Use relative path (same domain in production)
      return logoPath.startsWith('http') ? logoPath : logoPath;
    }
    return null;
  };

  if (isLoading) {
    return <div className="glass-card p-6 text-center">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        <h2 className="text-2xl font-bold mb-6">تنظیمات عمومی</h2>

        {/* Logo Upload Sections */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">لوگوها</h3>
          
          {/* Main Logo */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">لوگوی اصلی</label>
            <div className="flex items-center gap-4">
              {getLogoUrl('main') ? (
                <div className="relative">
                  <img src={getLogoUrl('main')!} alt="Main Logo" className="h-20 w-auto object-contain" />
                  <button
                    type="button"
                    onClick={() => handleDeleteLogo('main')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                  بدون لوگو
                </div>
              )}
              <div>
                <label className="btn btn-secondary cursor-pointer">
                  <Upload size={16} className="ml-2" />
                  {uploadingLogo === 'main' ? 'در حال آپلود...' : 'آپلود لوگو'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, 'main')}
                    disabled={uploadingLogo === 'main'}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Text Logo */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">لوگوی متنی</label>
            <div className="flex items-center gap-4">
              {getLogoUrl('text') ? (
                <div className="relative">
                  <img src={getLogoUrl('text')!} alt="Text Logo" className="h-16 w-auto object-contain" />
                  <button
                    type="button"
                    onClick={() => handleDeleteLogo('text')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                  بدون لوگو
                </div>
              )}
              <div>
                <label className="btn btn-secondary cursor-pointer">
                  <Upload size={16} className="ml-2" />
                  {uploadingLogo === 'text' ? 'در حال آپلود...' : 'آپلود لوگو'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, 'text')}
                    disabled={uploadingLogo === 'text'}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">فاویکون</label>
            <div className="flex items-center gap-4">
              {getLogoUrl('favicon') ? (
                <div className="relative">
                  <img src={getLogoUrl('favicon')!} alt="Favicon" className="h-16 w-16 object-contain" />
                  <button
                    type="button"
                    onClick={() => handleDeleteLogo('favicon')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                  بدون فاویکون
                </div>
              )}
              <div>
                <label className="btn btn-secondary cursor-pointer">
                  <Upload size={16} className="ml-2" />
                  {uploadingLogo === 'favicon' ? 'در حال آپلود...' : 'آپلود فاویکون'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, 'favicon')}
                    disabled={uploadingLogo === 'favicon'}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">اطلاعات شرکت</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">نام شرکت</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="input"
              placeholder="نام شرکت"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">دامنه اصلی شرکت</label>
            <input
              type="url"
              value={formData.company_domain}
              onChange={(e) => setFormData({ ...formData, company_domain: e.target.value })}
              className="input"
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* RTL Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تنظیمات راست به چپ (RTL)</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">RTL ناحیه مدیریت</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="1"
                  checked={formData.rtl_admin_area === '1'}
                  onChange={(e) => setFormData({ ...formData, rtl_admin_area: e.target.value })}
                />
                <span>بله</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="0"
                  checked={formData.rtl_admin_area === '0'}
                  onChange={(e) => setFormData({ ...formData, rtl_admin_area: e.target.value })}
                />
                <span>خیر</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">RTL ناحیه مشتریان</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="1"
                  checked={formData.rtl_customers_area === '1'}
                  onChange={(e) => setFormData({ ...formData, rtl_customers_area: e.target.value })}
                />
                <span>بله</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="0"
                  checked={formData.rtl_customers_area === '0'}
                  onChange={(e) => setFormData({ ...formData, rtl_customers_area: e.target.value })}
                />
                <span>خیر</span>
              </label>
            </div>
          </div>
        </div>

        {/* VOIP / AGI Isabel Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تنظیمات VOIP (AGI Isabel)</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            با پر کردن تنظیمات زیر، مانیتورینگ VOIP در بخش «مانیتورینگ VOIP» فعال می‌شود.
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isabel_enabled === 'true'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isabel_enabled: e.target.checked ? 'true' : 'false',
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">فعال‌سازی مانیتورینگ VOIP</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">آدرس سرور Isabel (Host)</label>
              <input
                type="text"
                value={formData.isabel_host}
                onChange={(e) => setFormData({ ...formData, isabel_host: e.target.value })}
                className="input"
                placeholder="مثال: isabel.example.com یا 192.168.1.10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پورت (Port)</label>
              <input
                type="number"
                value={formData.isabel_port}
                onChange={(e) => setFormData({ ...formData, isabel_port: e.target.value })}
                className="input"
                placeholder="معمولاً 8088 یا 8089"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نام کاربری API</label>
              <input
                type="text"
                value={formData.isabel_username}
                onChange={(e) => setFormData({ ...formData, isabel_username: e.target.value })}
                className="input"
                placeholder="نام کاربری API در Isabel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رمز عبور API</label>
              <input
                type="password"
                value={formData.isabel_password}
                onChange={(e) => setFormData({ ...formData, isabel_password: e.target.value })}
                className="input"
                placeholder="رمز عبور API در Isabel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">پروتکل</label>
              <select
                value={formData.isabel_protocol}
                onChange={(e) => setFormData({ ...formData, isabel_protocol: e.target.value })}
                className="input"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Allowed File Types */}
        <div>
          <label className="block text-sm font-medium mb-2">انواع فایل‌های مجاز</label>
          <input
            type="text"
            value={formData.allowed_file_types}
            onChange={(e) => setFormData({ ...formData, allowed_file_types: e.target.value })}
            className="input"
            placeholder=".png,.jpg,.pdf,.doc,.docx"
          />
          <p className="text-sm text-gray-500 mt-1">انواع فایل‌ها را با کاما جدا کنید</p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
            disabled={updateSettingsMutation.isLoading}
          >
            <Save size={20} />
            {updateSettingsMutation.isLoading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </form>
    </div>
  );
};

const DepartmentsManagement = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);

  const { data: departments, isLoading, refetch } = useQuery(
    'departments',
    async () => {
      try {
        const response = await api.get('/tickets/departments');
        console.log('Fetched departments response:', response);
        console.log('Fetched departments data:', response.data);
        const depts = Array.isArray(response.data) ? response.data : [];
        console.log('Departments count:', depts.length);
        console.log('Departments:', depts);
        return depts;
      } catch (error: any) {
        console.error('Error fetching departments:', error);
        return [];
      }
    },
    {
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: false,
    }
  );

  const createMutation = useMutation(
    (data: any) => api.post('/tickets/departments', data),
    {
      onSuccess: async (response) => {
        console.log('Department created successfully:', response.data);
        // Close modal first
        setShowModal(false);
        setEditingDepartment(null);
        // Remove from cache and refetch
        queryClient.removeQueries('departments');
        queryClient.removeQueries('ticket-departments');
        // Wait a bit then refetch
        setTimeout(async () => {
          const freshData = await refetch();
          console.log('Refetched departments after create:', freshData.data);
          console.log('Departments array:', Array.isArray(freshData.data) ? freshData.data : 'Not an array');
          // Also invalidate to ensure all components update
          queryClient.invalidateQueries('departments');
          queryClient.invalidateQueries('ticket-departments');
        }, 300);
        alert('دپارتمان با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        console.error('Error creating department:', error);
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/tickets/departments/${id}`, data),
    {
      onSuccess: async () => {
        // Close modal first
        setShowModal(false);
        setEditingDepartment(null);
        // Remove from cache and refetch
        queryClient.removeQueries('departments');
        queryClient.removeQueries('ticket-departments');
        // Wait a bit then refetch
        setTimeout(async () => {
          const freshData = await refetch();
          console.log('Refetched departments after update:', freshData.data);
          // Also invalidate to ensure all components update
          queryClient.invalidateQueries('departments');
          queryClient.invalidateQueries('ticket-departments');
        }, 300);
        alert('دپارتمان با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/tickets/departments/${id}`),
    {
      onSuccess: async () => {
        // Remove from cache and refetch
        queryClient.removeQueries('departments');
        queryClient.removeQueries('ticket-departments');
        // Wait a bit then refetch
        setTimeout(async () => {
          const freshData = await refetch();
          console.log('Refetched departments after delete:', freshData.data);
          // Also invalidate to ensure all components update
          queryClient.invalidateQueries('departments');
          queryClient.invalidateQueries('ticket-departments');
        }, 300);
        alert('دپارتمان با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  if (isLoading) {
    return <div className="glass-card p-6 text-center">در حال بارگذاری...</div>;
  }

  // Debug function to test API
  const testApi = async () => {
    try {
      const response = await api.get('/tickets/departments');
      console.log('API Test Response:', response);
      console.log('API Test Data:', response.data);
      alert(`API Test: ${response.data?.length || 0} departments found`);
      // Force refetch
      await refetch();
    } catch (error: any) {
      console.error('API Test Error:', error);
      alert('API Test Error: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={testApi}
          className="btn btn-secondary flex items-center gap-2"
          title="تست API"
        >
          🔍 تست API
        </button>
        <button
          onClick={() => {
            setEditingDepartment(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          دپارتمان جدید
        </button>
      </div>

      <div className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3">ID</th>
                <th className="text-right p-3">نام</th>
                <th className="text-right p-3">ایمیل</th>
                <th className="text-right p-3">توضیحات</th>
                <th className="text-right p-3">وضعیت</th>
                <th className="text-right p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : !departments || departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    {departments === undefined ? 'در حال بارگذاری...' : `دپارتمانی یافت نشد (تعداد: ${departments?.length || 0})`}
                  </td>
                </tr>
              ) : (
                departments.map((dept: any) => {
                  console.log('Rendering department:', dept);
                  if (!dept || !dept.id) {
                    console.warn('Invalid department:', dept);
                    return null;
                  }
                  return (
                  <tr key={dept.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{dept.id}</td>
                    <td className="p-3 font-medium">{dept.name}</td>
                    <td className="p-3">{dept.email || '-'}</td>
                    <td className="p-3">{dept.description || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        dept.is_active === 1 || dept.is_active === true ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {dept.is_active === 1 || dept.is_active === true ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingDepartment(dept);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                          title="ویرایش"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('آیا مطمئن هستید که می‌خواهید این دپارتمان را حذف کنید؟')) {
                              deleteMutation.mutate(dept.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <DepartmentModal
          department={editingDepartment}
          onClose={() => {
            setShowModal(false);
            setEditingDepartment(null);
          }}
          onSave={(data: any) => {
            if (editingDepartment) {
              updateMutation.mutate({ id: editingDepartment.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
};

const DepartmentModal = ({ department, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    email: department?.email || '',
    description: department?.description || '',
    is_active: department?.is_active !== undefined ? department.is_active : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.name.trim() === '') {
      alert('لطفاً نام دپارتمان را وارد کنید');
      return;
    }
    
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">{department ? 'ویرایش' : 'ایجاد'} دپارتمان</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">نام دپارتمان *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="مثال: پشتیبانی فنی"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ایمیل دپارتمان</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="support@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">توضیحات</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="توضیحات دپارتمان..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">فعال</label>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary">
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;


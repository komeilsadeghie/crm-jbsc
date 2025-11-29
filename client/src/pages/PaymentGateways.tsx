import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Plus, Edit, Trash2, CreditCard, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { toJalali } from '../utils/dateHelper';

const PaymentGateways = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    type: 'paypal',
    is_active: false,
    test_mode: true,
    api_key: '',
    api_secret: '',
    merchant_id: '',
    webhook_secret: '',
    settings: {},
  });

  const { data: gateways, isLoading } = useQuery('payment-gateways', async () => {
    const response = await api.get('/payment-gateways');
    return response.data || [];
  });

  const { data: transactions } = useQuery('payment-transactions', async () => {
    const response = await api.get('/payment-gateways/transactions');
    return response.data || [];
  });

  const createMutation = useMutation(
    (data: any) => api.post('/payment-gateways', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payment-gateways');
        setShowModal(false);
        resetForm();
        alert('درگاه پرداخت با موفقیت ایجاد شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const updateMutation = useMutation(
    (data: any) => api.put(`/payment-gateways/${editingGateway?.id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payment-gateways');
        setShowModal(false);
        setEditingGateway(null);
        resetForm();
        alert('درگاه پرداخت با موفقیت به‌روزرسانی شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/payment-gateways/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('payment-gateways');
        alert('درگاه پرداخت با موفقیت حذف شد');
      },
      onError: (error: any) => {
        alert('خطا: ' + (error.response?.data?.error || error.message));
      },
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'paypal',
      is_active: false,
      test_mode: true,
      api_key: '',
      api_secret: '',
      merchant_id: '',
      webhook_secret: '',
      settings: {},
    });
  };

  const handleEdit = async (gateway: any) => {
    try {
      const response = await api.get(`/payment-gateways/${gateway.id}`);
      const gatewayData = response.data;
      setEditingGateway(gatewayData);
      setFormData({
        name: gatewayData.name || '',
        type: gatewayData.type || 'paypal',
        is_active: gatewayData.is_active === 1,
        test_mode: gatewayData.test_mode === 1,
        api_key: gatewayData.api_key || '',
        api_secret: gatewayData.api_secret || '',
        merchant_id: gatewayData.merchant_id || '',
        webhook_secret: gatewayData.webhook_secret || '',
        settings: gatewayData.settings ? (typeof gatewayData.settings === 'string' ? JSON.parse(gatewayData.settings) : gatewayData.settings) : {},
      });
      setShowModal(true);
    } catch (error: any) {
      alert('خطا در دریافت اطلاعات درگاه: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      alert('لطفاً نام و نوع درگاه را وارد کنید');
      return;
    }

    const submitData = {
      ...formData,
      settings: typeof formData.settings === 'string' ? JSON.parse(formData.settings) : formData.settings,
    };

    if (editingGateway) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getGatewayLabel = (type: string) => {
    const labels: Record<string, string> = {
      paypal: 'PayPal',
      stripe: 'Stripe',
      mollie: 'Mollie',
      authorize_net: 'Authorize.net',
      '2checkout': '2Checkout',
      payu_money: 'PayU Money',
      braintree: 'Braintree',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-600">درگاه‌های پرداخت</h1>
        <button
          onClick={() => {
            setEditingGateway(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          درگاه جدید
        </button>
      </div>

      {/* Gateways List */}
      <div className="glass-card overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">نوع</th>
              <th className="p-3 text-right">وضعیت</th>
              <th className="p-3 text-right">حالت</th>
              <th className="p-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">در حال بارگذاری...</td>
              </tr>
            ) : gateways?.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center">درگاهی یافت نشد</td>
              </tr>
            ) : (
              gateways?.map((gateway: any) => (
                <tr key={gateway.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{gateway.name}</td>
                  <td className="p-3">{getGatewayLabel(gateway.type)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${gateway.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {gateway.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${gateway.test_mode ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                      {gateway.test_mode ? 'تست' : 'تولید'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(gateway)}
                        className="text-green-600 hover:text-green-800"
                        title="ویرایش"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('آیا از حذف این درگاه اطمینان دارید؟')) {
                            deleteMutation.mutate(gateway.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card">
        <h2 className="text-xl font-bold mb-4">تراکنش‌های اخیر</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-right">شماره تراکنش</th>
                <th className="p-3 text-right">مشتری</th>
                <th className="p-3 text-right">مبلغ</th>
                <th className="p-3 text-right">درگاه</th>
                <th className="p-3 text-right">وضعیت</th>
                <th className="p-3 text-right">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.slice(0, 10).map((txn: any) => (
                <tr key={txn.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{txn.transaction_id}</td>
                  <td className="p-3">{txn.account_name || '-'}</td>
                  <td className="p-3">
                    {txn.amount ? `${parseFloat(txn.amount).toLocaleString()} ${txn.currency}` : '-'}
                  </td>
                  <td className="p-3">{txn.gateway_name || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      txn.status === 'completed' ? 'bg-green-100 text-green-800' :
                      txn.status === 'failed' ? 'bg-red-100 text-red-800' :
                      txn.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {txn.status === 'completed' ? 'تکمیل شده' :
                       txn.status === 'failed' ? 'ناموفق' :
                       txn.status === 'processing' ? 'در حال پردازش' :
                       txn.status === 'pending' ? 'در انتظار' :
                       txn.status === 'refunded' ? 'بازگشت شده' :
                       txn.status === 'cancelled' ? 'لغو شده' : txn.status}
                    </span>
                  </td>
                  <td className="p-3">{txn.created_at ? toJalali(txn.created_at) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <GatewayModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => {
            setShowModal(false);
            setEditingGateway(null);
            resetForm();
          }}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isLoading || updateMutation.isLoading}
        />
      )}
    </div>
  );
};

const GatewayModal = ({ formData, setFormData, onClose, onSubmit, isSubmitting }: any) => {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">درگاه پرداخت جدید</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">نام درگاه *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                placeholder="مثال: PayPal اصلی"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">نوع درگاه *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input w-full"
              >
                <option value="paypal">PayPal</option>
                <option value="stripe">Stripe</option>
                <option value="mollie">Mollie</option>
                <option value="authorize_net">Authorize.net</option>
                <option value="2checkout">2Checkout</option>
                <option value="payu_money">PayU Money</option>
                <option value="braintree">Braintree</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">فعال</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.test_mode}
                onChange={(e) => setFormData({ ...formData, test_mode: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">حالت تست</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="input w-full"
              placeholder="API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Secret</label>
            <input
              type="password"
              value={formData.api_secret}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
              className="input w-full"
              placeholder="API Secret"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Merchant ID</label>
            <input
              type="text"
              value={formData.merchant_id}
              onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
              className="input w-full"
              placeholder="Merchant ID (اختیاری)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Webhook Secret</label>
            <input
              type="password"
              value={formData.webhook_secret}
              onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              className="input w-full"
              placeholder="Webhook Secret (اختیاری)"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              انصراف
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentGateways;


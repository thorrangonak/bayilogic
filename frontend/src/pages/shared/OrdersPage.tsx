import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const ORDER_STATUSES = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Onay Bekliyor' },
  { value: 'CONFIRMED', label: 'Onaylandı' },
  { value: 'IN_PRODUCTION', label: 'Üretimde' },
  { value: 'READY', label: 'Hazır' },
  { value: 'SHIPPED', label: 'Kargoda' },
  { value: 'DELIVERED', label: 'Teslim Edildi' },
  { value: 'CANCELLED', label: 'İptal' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PRODUCTION: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Onay Bekliyor',
  CONFIRMED: 'Onaylandı',
  IN_PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal',
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.list({ status: statusFilter || undefined }),
  });

  // Fetch stats
  const { data: statsResponse } = useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: () => ordersApi.getStats(),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      ordersApi.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
    },
  });

  const orders = ordersResponse?.data || [];
  const stats = statsResponse?.data || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
      IN_PRODUCTION: ['READY', 'CANCELLED'],
      READY: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: [],
      CANCELLED: [],
    };
    return transitions[currentStatus] || [];
  };

  const handleStatusClick = (order: any) => {
    setSelectedOrder(order);
    const nextStatuses = getNextStatuses(order.status);
    if (nextStatuses.length > 0) {
      setNewStatus(nextStatuses[0]);
      setShowStatusModal(true);
    }
  };

  const handleStatusUpdate = () => {
    if (selectedOrder && newStatus) {
      updateStatusMutation.mutate({
        id: selectedOrder.id,
        status: newStatus,
        notes: statusNote || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Siparişler yüklenirken bir hata oluştu.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-500 mt-1">Sipariş takibi ve üretim yönetimi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Toplam</p>
          <p className="text-2xl font-bold mt-1">{stats.totalOrders || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Bekleyen</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.pendingOrders || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Üretimde</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{stats.inProductionOrders || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Tamamlanan</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.completedOrders || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Son 30 Gün</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{stats.recentOrders || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Toplam Ciro</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">
            {formatCurrency(stats.totalRevenue || 0)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Durum Filtresi</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Sipariş No</th>
                <th className="table-cell">Teklif No</th>
                {isAdmin && <th className="table-cell">Bayi</th>}
                <th className="table-cell">Müşteri</th>
                <th className="table-cell">Tutar</th>
                <th className="table-cell">Tarih</th>
                <th className="table-cell">Durum</th>
                <th className="table-cell">Reçete</th>
                {isAdmin && <th className="table-cell">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono font-medium">{order.orderNumber}</td>
                  <td className="table-cell">
                    <span className="text-primary-500 hover:underline cursor-pointer">
                      {order.quote?.quoteNumber || '-'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="table-cell">
                      <span className="font-medium">{order.dealer?.code}</span>
                      <br />
                      <span className="text-xs text-gray-500">{order.dealer?.companyName}</span>
                    </td>
                  )}
                  <td className="table-cell">{order.quote?.customer?.companyName || '-'}</td>
                  <td className="table-cell font-semibold">{formatCurrency(order.totalAmount || 0)}</td>
                  <td className="table-cell">{formatDate(order.createdAt)}</td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm">
                      {order._count?.recipes || 0} kalem
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="table-cell">
                      {getNextStatuses(order.status).length > 0 && (
                        <button
                          onClick={() => handleStatusClick(order)}
                          className="text-primary-500 hover:underline text-sm"
                        >
                          Durum Güncelle
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p>Sipariş bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Sipariş Durumu Güncelle</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Sipariş: <span className="font-medium text-gray-900">{selectedOrder.orderNumber}</span></p>
              <p className="text-sm text-gray-500">Mevcut Durum: <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[selectedOrder.status]}`}>{STATUS_LABELS[selectedOrder.status]}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Yeni Durum</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input"
                >
                  {getNextStatuses(selectedOrder.status).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Not (Opsiyonel)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Durum değişikliği ile ilgili not..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedOrder(null);
                  setNewStatus('');
                  setStatusNote('');
                }}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updateStatusMutation.isPending}
                className="btn btn-primary"
              >
                {updateStatusMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

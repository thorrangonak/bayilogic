import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealersApi } from '../../api/client';

interface DealerFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  profitMargin: number;
  discountRate: number;
  isActive: boolean;
}

const initialFormData: DealerFormData = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  profitMargin: 15,
  discountRate: 5,
  isActive: true,
};

export default function AdminDealersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [formData, setFormData] = useState<DealerFormData>(initialFormData);
  const [search, setSearch] = useState('');

  const queryClient = useQueryClient();

  // Fetch dealers
  const { data: dealersResponse, isLoading, error } = useQuery({
    queryKey: ['dealers', search],
    queryFn: () => dealersApi.list({ search: search || undefined }),
  });

  // Fetch stats
  const { data: statsResponse } = useQuery({
    queryKey: ['dealers', 'all-stats'],
    queryFn: () => dealersApi.getAllStats(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: dealersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      handleCloseModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => dealersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      handleCloseModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: dealersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
    },
  });

  const dealers = dealersResponse?.data || [];
  const stats = statsResponse?.data || {};

  const handleOpenModal = (dealer?: any) => {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        companyName: dealer.companyName,
        contactName: dealer.contactName || '',
        email: dealer.email || '',
        phone: dealer.phone || '',
        address: dealer.address || '',
        city: dealer.city || '',
        profitMargin: dealer.profitMargin || 15,
        discountRate: dealer.discountRate || 5,
        isActive: dealer.isActive,
      });
    } else {
      setEditingDealer(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDealer(null);
    setFormData(initialFormData);
  };

  const handleSubmit = () => {
    if (editingDealer) {
      updateMutation.mutate({ id: editingDealer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Bu bayiyi silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id);
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
          Bayiler yüklenirken bir hata oluştu.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bayiler</h1>
          <p className="text-gray-500 mt-1">Bayi yönetimi ve kâr marjı ayarları</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Yeni Bayi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Toplam Bayi</p>
          <p className="text-2xl font-bold mt-1">{stats.totalDealers || dealers.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Aktif Bayi</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {stats.activeDealers || dealers.filter((d: any) => d.isActive).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Toplam Kullanıcı</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">
            {stats.totalUsers || 0}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Ort. Kâr Marjı</p>
          <p className="text-2xl font-bold mt-1">
            %{stats.avgProfitMargin?.toFixed(1) ||
              (dealers.length > 0
                ? (dealers.reduce((sum: number, d: any) => sum + (d.profitMargin || 0), 0) / dealers.length).toFixed(1)
                : '0')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              className="input"
              placeholder="Bayi ara (firma adı, kod, yetkili)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Kod</th>
                <th className="table-cell">Firma</th>
                <th className="table-cell">Yetkili</th>
                <th className="table-cell">Şehir</th>
                <th className="table-cell">Kâr Marjı</th>
                <th className="table-cell">İndirim</th>
                <th className="table-cell">Durum</th>
                <th className="table-cell">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer: any) => (
                <tr key={dealer.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono font-medium">{dealer.code}</td>
                  <td className="table-cell font-medium">{dealer.companyName}</td>
                  <td className="table-cell">{dealer.contactName || '-'}</td>
                  <td className="table-cell">{dealer.city || '-'}</td>
                  <td className="table-cell">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      %{dealer.profitMargin || 0}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      %{dealer.discountRate || 0}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      dealer.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dealer.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleOpenModal(dealer)}
                      className="text-primary-500 hover:underline mr-3"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(dealer.id)}
                      className="text-red-500 hover:underline"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dealers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Bayi bulunamadı.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingDealer ? 'Bayi Düzenle' : 'Yeni Bayi Ekle'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Firma Adı *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Firma adı..."
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Yetkili Kişi</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ad Soyad..."
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+90..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">E-posta</label>
                <input
                  type="email"
                  className="input"
                  placeholder="email@firma.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Şehir</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Şehir..."
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Adres</label>
                <textarea
                  className="input"
                  placeholder="Adres..."
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kâr Marjı (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="15"
                  min="0"
                  max="100"
                  value={formData.profitMargin}
                  onChange={(e) => setFormData({ ...formData, profitMargin: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">İndirim Oranı (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="5"
                  min="0"
                  max="100"
                  value={formData.discountRate}
                  onChange={(e) => setFormData({ ...formData, discountRate: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span>Aktif</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleCloseModal} className="btn btn-secondary">
                İptal
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={!formData.companyName || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

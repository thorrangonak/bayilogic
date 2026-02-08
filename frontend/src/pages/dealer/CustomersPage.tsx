import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/client';

interface CustomerForm {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  taxNumber: string;
  taxOffice: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  taxNumber: '',
  taxOffice: '',
  notes: '',
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [search, setSearch] = useState('');

  // Müşterileri çek
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search, limit: 100 }),
  });

  const customers = data?.data || [];

  // Yeni müşteri oluştur
  const createMutation = useMutation({
    mutationFn: (data: CustomerForm) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      closeModal();
    },
  });

  // Müşteri güncelle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerForm }) => customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      closeModal();
    },
  });

  // Müşteri sil
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (customer: any) => {
    setEditingId(customer.id);
    setForm({
      companyName: customer.companyName || '',
      contactName: customer.contactName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      city: customer.city || '',
      address: customer.address || '',
      taxNumber: customer.taxNumber || '',
      taxOffice: customer.taxOffice || '',
      notes: customer.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.companyName) {
      alert('Firma adı gerekli');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id: string, companyName: string) => {
    if (confirm(`"${companyName}" müşterisini silmek istediğinizden emin misiniz?`)) {
      deleteMutation.mutate(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-500 mt-1">Müşteri listesi ve yönetimi</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Yeni Müşteri
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              className="input"
              placeholder="Firma adı, yetkili veya telefon ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-gray-500 text-sm">
            {customers.length} müşteri
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="animate-pulse space-y-4 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Müşteriler yüklenirken hata oluştu
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 mb-4">Henüz müşteri eklenmemiş</p>
            <button onClick={openCreateModal} className="btn btn-primary">
              İlk Müşteriyi Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Firma</th>
                  <th className="table-cell">Yetkili</th>
                  <th className="table-cell">Telefon</th>
                  <th className="table-cell">E-posta</th>
                  <th className="table-cell">Şehir</th>
                  <th className="table-cell">Teklifler</th>
                  <th className="table-cell">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{customer.companyName}</td>
                    <td className="table-cell">{customer.contactName || '-'}</td>
                    <td className="table-cell">{customer.phone || '-'}</td>
                    <td className="table-cell">{customer.email || '-'}</td>
                    <td className="table-cell">{customer.city || '-'}</td>
                    <td className="table-cell">
                      <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                        {customer._count?.quotes || 0} teklif
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => openEditModal(customer)}
                        className="text-primary-500 hover:underline mr-3"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id, customer.companyName)}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:underline disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Firma Adı *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Firma adı..."
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Yetkili Kişi</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ad Soyad..."
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+90 5xx xxx xxxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="email@firma.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Şehir</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Şehir..."
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Adres</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Açık adres..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vergi Numarası</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Vergi No..."
                    value={form.taxNumber}
                    onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Vergi Dairesi</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Vergi Dairesi..."
                    value={form.taxOffice}
                    onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Notlar</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Müşteri ile ilgili notlar..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} disabled={isSubmitting} className="btn btn-secondary">
                İptal
              </button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

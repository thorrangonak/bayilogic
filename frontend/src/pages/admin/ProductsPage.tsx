import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/client';

interface ProductUpdate {
  id: string;
  unitPrice?: number;
  gramaj?: number;
}

export default function AdminProductsPage() {
  const [filter, setFilter] = useState('ALL');
  const [systemFilter, setSystemFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editedProducts, setEditedProducts] = useState<Record<string, ProductUpdate>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    category: 'PROFIL',
    system: 'BYD100',
    unit: 'mt',
    gramaj: '',
    unitPrice: '',
  });

  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['products', filter, systemFilter, search],
    queryFn: () => productsApi.list({
      category: filter !== 'ALL' ? filter : undefined,
      system: systemFilter !== 'ALL' ? systemFilter : undefined,
      search: search || undefined,
      limit: 100,
    }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      setNewProduct({
        code: '',
        name: '',
        category: 'PROFIL',
        system: 'BYD100',
        unit: 'mt',
        gramaj: '',
        unitPrice: '',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (updates: { id: string; unitPrice?: number; gramaj?: number }[]) =>
      productsApi.bulkUpdatePrices(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditedProducts({});
    },
  });

  const products = productsResponse?.data || [];
  const categories = ['ALL', 'PROFIL', 'APARAT', 'MOTOR', 'KUMANDA', 'FABRIC'];
  const systems = ['ALL', 'BYD100', 'BYD125', 'SKY1500', 'SKY2000', 'ALL_SYSTEMS'];

  const handlePriceChange = (productId: string, field: 'unitPrice' | 'gramaj', value: string) => {
    setEditedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        id: productId,
        [field]: value ? Number(value) : undefined,
      },
    }));
  };

  const handleSaveAll = () => {
    const updates = Object.values(editedProducts).filter(u => u.unitPrice !== undefined || u.gramaj !== undefined);
    if (updates.length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  const handleCreateProduct = () => {
    if (!newProduct.code || !newProduct.name || !newProduct.unitPrice) {
      alert('Kod, ad ve fiyat zorunludur');
      return;
    }
    createMutation.mutate({
      code: newProduct.code,
      name: newProduct.name,
      category: newProduct.category,
      system: newProduct.system,
      unit: newProduct.unit,
      gramaj: newProduct.gramaj ? Number(newProduct.gramaj) : undefined,
      unitPrice: Number(newProduct.unitPrice),
    });
  };

  const hasChanges = Object.keys(editedProducts).length > 0;

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
          Ürünler yüklenirken bir hata oluştu.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürün Yönetimi</h1>
          <p className="text-gray-500 mt-1">Profil, aparat ve aksesuar fiyatlarını yönetin</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Ürün
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges || bulkUpdateMutation.isPending}
            className={`btn ${hasChanges ? 'btn-success' : 'btn-secondary opacity-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {bulkUpdateMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            {hasChanges && ` (${Object.keys(editedProducts).length})`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Kategori</label>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === cat
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tümü' : cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Sistem</label>
            <select
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              className="input"
            >
              {systems.map((sys) => (
                <option key={sys} value={sys}>
                  {sys === 'ALL' ? 'Tüm Sistemler' : sys === 'ALL_SYSTEMS' ? 'Genel' : sys}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className="text-sm text-gray-500 mb-1 block">Ara</label>
            <input
              type="text"
              className="input"
              placeholder="Kod veya isim..."
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
                <th className="table-cell">Ürün Adı</th>
                <th className="table-cell">Kategori</th>
                <th className="table-cell">Sistem</th>
                <th className="table-cell">Birim</th>
                <th className="table-cell">Gramaj (kg/m)</th>
                <th className="table-cell">Birim Fiyat (€)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product: any) => (
                <tr key={product.id} className={`hover:bg-gray-50 ${editedProducts[product.id] ? 'bg-yellow-50' : ''}`}>
                  <td className="table-cell font-mono font-medium">{product.code}</td>
                  <td className="table-cell">{product.name}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      product.category === 'PROFIL' ? 'bg-blue-100 text-blue-800' :
                      product.category === 'APARAT' ? 'bg-green-100 text-green-800' :
                      product.category === 'MOTOR' ? 'bg-orange-100 text-orange-800' :
                      product.category === 'KUMANDA' ? 'bg-purple-100 text-purple-800' :
                      'bg-pink-100 text-pink-800'
                    }`}>
                      {product.category}
                    </span>
                  </td>
                  <td className="table-cell">{product.system || '-'}</td>
                  <td className="table-cell">{product.unit}</td>
                  <td className="table-cell">
                    {product.category === 'PROFIL' ? (
                      <input
                        type="number"
                        className={`w-24 px-2 py-1 border rounded ${editedProducts[product.id]?.gramaj !== undefined ? 'border-yellow-500 bg-yellow-50' : ''}`}
                        defaultValue={product.gramaj || ''}
                        step="0.001"
                        onChange={(e) => handlePriceChange(product.id, 'gramaj', e.target.value)}
                      />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        className={`w-24 px-2 py-1 border rounded ${editedProducts[product.id]?.unitPrice !== undefined ? 'border-yellow-500 bg-yellow-50' : ''}`}
                        defaultValue={product.unitPrice || ''}
                        step="0.01"
                        onChange={(e) => handlePriceChange(product.id, 'unitPrice', e.target.value)}
                      />
                      <span className="text-gray-500">€</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Ürün bulunamadı.
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800">Önemli</p>
            <p className="text-sm text-yellow-700 mt-1">
              Fiyat değişiklikleri mevcut teklifleri etkilemez. Yeni oluşturulan tekliflerde güncel fiyatlar kullanılır.
              {hasChanges && ' Değişiklikleri kaydetmek için "Değişiklikleri Kaydet" butonuna tıklayın.'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Yeni Ürün Ekle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ürün Kodu *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ürün kodu..."
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Ürün Adı *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ürün adı..."
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Kategori</label>
                <select
                  className="input"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                >
                  <option value="PROFIL">PROFIL</option>
                  <option value="APARAT">APARAT</option>
                  <option value="MOTOR">MOTOR</option>
                  <option value="KUMANDA">KUMANDA</option>
                  <option value="FABRIC">FABRIC</option>
                </select>
              </div>
              <div>
                <label className="label">Sistem</label>
                <select
                  className="input"
                  value={newProduct.system}
                  onChange={(e) => setNewProduct({ ...newProduct, system: e.target.value })}
                >
                  <option value="BYD100">BYD100</option>
                  <option value="BYD125">BYD125</option>
                  <option value="SKY1500">SKY1500</option>
                  <option value="SKY2000">SKY2000</option>
                  <option value="ALL">Tüm Sistemler</option>
                </select>
              </div>
              <div>
                <label className="label">Birim</label>
                <select
                  className="input"
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                >
                  <option value="mt">mt (metre)</option>
                  <option value="ad">ad (adet)</option>
                  <option value="tk">tk (takım)</option>
                  <option value="m2">m² (metrekare)</option>
                </select>
              </div>
              <div>
                <label className="label">Gramaj (kg/m)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.000"
                  step="0.001"
                  value={newProduct.gramaj}
                  onChange={(e) => setNewProduct({ ...newProduct, gramaj: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Birim Fiyat (€) *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  value={newProduct.unitPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, unitPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                İptal
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

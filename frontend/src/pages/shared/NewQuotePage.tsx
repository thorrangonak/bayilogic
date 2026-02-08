import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { customersApi, quotesApi } from '../../api/client';

type SystemType = 'BYD100' | 'BYD125' | 'SKY1500' | 'SKY1600';

interface QuoteItem {
  id: string;
  systemType: SystemType;
  width: number;
  height: number;
  quantity: number;
  paintCode: string;
  includeFabric: boolean;
  fabricPrice: number;
  fabricQty: number;
  includeMotor: boolean;
  motorType: string;
  motorPrice: number;
  motorQty: number;
  remoteType: string;
  remotePrice: number;
  remoteQty: number;
  calculation?: any;
  totalCost: number;
  isCalculating: boolean;
}

const systemConfigs: Record<SystemType, { name: string; desc: string }> = {
  BYD100: { name: 'BYD100 DİKEY', desc: '100mm Dikey Zip Perde' },
  BYD125: { name: 'BYD125 DİKEY', desc: '125mm Dikey Zip Perde' },
  SKY1500: { name: 'SKY1500 TAVAN', desc: 'Yaylı Tavan Sistemi' },
  SKY1600: { name: 'SKY1600 TAVAN', desc: 'Amortisörlü Tavan' },
};

const defaultItem = (): QuoteItem => ({
  id: crypto.randomUUID(),
  systemType: 'BYD100',
  width: 3000,
  height: 3000,
  quantity: 1,
  paintCode: 'RAL 7016 TXT',
  includeFabric: false,
  fabricPrice: 0,
  fabricQty: 1,
  includeMotor: false,
  motorType: 'Somfy',
  motorPrice: 0,
  motorQty: 1,
  remoteType: 'Standart',
  remotePrice: 0,
  remoteQty: 0,
  totalCost: 0,
  isCalculating: false,
});

export default function NewQuotePage() {
  const navigate = useNavigate();

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([defaultItem()]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });

  // Müşterileri çek
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list({ limit: 100 }),
  });

  const customers = customersData?.data || [];

  // Kalem hesapla
  const calculateItem = useCallback(async (index: number, item: QuoteItem) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], isCalculating: true };
      return newItems;
    });

    try {
      const result = await quotesApi.calculate({
        systemType: item.systemType,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        includeFabric: item.includeFabric,
        fabricPrice: item.fabricPrice,
        fabricQty: item.fabricQty,
        includeMotor: item.includeMotor,
        motorType: item.motorType,
        motorPrice: item.motorPrice,
        motorQty: item.motorQty,
        remoteType: item.remoteType,
        remotePrice: item.remotePrice,
        remoteQty: item.remoteQty,
      });

      setItems((prev) => {
        const newItems = [...prev];
        if (newItems[index]) {
          newItems[index] = {
            ...newItems[index],
            calculation: result.data,
            totalCost: result.data?.grandTotal || 0,
            isCalculating: false,
          };
        }
        return newItems;
      });
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      setItems((prev) => {
        const newItems = [...prev];
        if (newItems[index]) {
          newItems[index] = { ...newItems[index], isCalculating: false };
        }
        return newItems;
      });
    }
  }, []);

  // Kalem güncellendiğinde hesapla (debounced)
  const updateItem = useCallback((index: number, updates: Partial<QuoteItem>) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...updates };

      // Debounce hesaplama
      const item = newItems[index];
      setTimeout(() => calculateItem(index, item), 500);

      return newItems;
    });
  }, [calculateItem]);

  const addItem = () => {
    const newItem = defaultItem();
    setItems((prev) => [...prev, newItem]);
    setTimeout(() => calculateItem(items.length, newItem), 100);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // İlk kalem için hesaplama
  useEffect(() => {
    if (items.length > 0 && items[0].totalCost === 0 && !items[0].isCalculating) {
      calculateItem(0, items[0]);
    }
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
    const discount = subtotal * 0.05;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * 0.2;
    const total = afterDiscount + tax;
    return { subtotal, discount, tax, total };
  }, [items]);

  // Teklif kaydet mutasyonu
  const createQuoteMutation = useMutation({
    mutationFn: async (data: { customerId: string; notes: string; validUntil: string; send: boolean }) => {
      const quoteResult = await quotesApi.create({
        customerId: data.customerId,
        notes: data.notes,
        validUntil: data.validUntil,
      });
      const quoteId = quoteResult.data.id;

      for (const item of items) {
        await quotesApi.addItem(quoteId, {
          systemType: item.systemType,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          paintCode: item.paintCode,
          includeFabric: item.includeFabric,
          fabricPrice: item.fabricPrice,
          fabricQty: item.fabricQty,
          includeMotor: item.includeMotor,
          motorType: item.motorType,
          motorPrice: item.motorPrice,
          motorQty: item.motorQty,
          remoteType: item.remoteType,
          remotePrice: item.remotePrice,
          remoteQty: item.remoteQty,
        });
      }

      if (data.send) {
        await quotesApi.send(quoteId);
      }

      return quoteResult;
    },
    onSuccess: (data) => {
      navigate(`/quotes/${data.data.id}`);
    },
  });

  const handleSave = async (sendAfterSave: boolean) => {
    if (!selectedCustomer) {
      alert('Lütfen müşteri seçin');
      return;
    }

    createQuoteMutation.mutate({
      customerId: selectedCustomer,
      notes,
      validUntil,
      send: sendAfterSave,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/quotes')} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yeni Teklif</h1>
            <p className="text-gray-500 mt-1">Yeni fiyat teklifi oluşturun</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={createQuoteMutation.isPending}
            className="btn btn-secondary disabled:opacity-50"
          >
            {createQuoteMutation.isPending ? 'Kaydediliyor...' : 'Taslak Kaydet'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={createQuoteMutation.isPending}
            className="btn btn-primary disabled:opacity-50"
          >
            {createQuoteMutation.isPending ? 'Kaydediliyor...' : 'Kaydet ve Gönder'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Müşteri Seçimi</h2>
            {customersLoading ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded" />
            ) : customers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Henüz müşteri eklenmemiş</p>
                <button onClick={() => navigate('/customers')} className="btn btn-primary">
                  Müşteri Ekle
                </button>
              </div>
            ) : (
              <select
                className="input"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">Müşteri seçin...</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} {c.contactName ? `(${c.contactName})` : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-4">
              <label className="label">Geçerlilik Tarihi</label>
              <input
                type="date"
                className="input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          {items.map((item, index) => (
            <div key={item.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Kalem {index + 1}
                  {item.isCalculating && (
                    <span className="ml-2 text-sm text-gray-400 animate-pulse">Hesaplanıyor...</span>
                  )}
                </h2>
                {items.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* System Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {(Object.keys(systemConfigs) as SystemType[]).map((sys) => (
                  <button
                    key={sys}
                    onClick={() => updateItem(index, { systemType: sys })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      item.systemType === sys ? 'border-primary-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">{systemConfigs[sys].name}</p>
                    <p className="text-xs text-gray-500">{systemConfigs[sys].desc}</p>
                  </button>
                ))}
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="label">Genişlik (mm)</label>
                  <input
                    type="number"
                    className="input"
                    value={item.width}
                    onChange={(e) => updateItem(index, { width: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Yükseklik (mm)</label>
                  <input
                    type="number"
                    className="input"
                    value={item.height}
                    onChange={(e) => updateItem(index, { height: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label">Adet</label>
                  <input
                    type="number"
                    className="input"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>
                <div>
                  <label className="label">Boya Kodu</label>
                  <select className="input" value={item.paintCode} onChange={(e) => updateItem(index, { paintCode: e.target.value })}>
                    <option>RAL 7016 TXT</option>
                    <option>RAL 9016 MAT</option>
                    <option>RAL 9005 MAT</option>
                    <option>RAL 7035 MAT</option>
                    <option>RAL 8017 MAT</option>
                  </select>
                </div>
              </div>

              {/* Fabric */}
              <div className="bg-purple-50 rounded-lg p-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={item.includeFabric}
                    onChange={(e) => updateItem(index, { includeFabric: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-purple-800">Kumaş Dahil Et</span>
                </label>
                {item.includeFabric && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Kumaş m² Fiyatı (€)</label>
                      <input
                        type="number"
                        className="input"
                        value={item.fabricPrice}
                        onChange={(e) => updateItem(index, { fabricPrice: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="label">Kumaş Katsayısı</label>
                      <input
                        type="number"
                        className="input"
                        value={item.fabricQty}
                        onChange={(e) => updateItem(index, { fabricQty: parseFloat(e.target.value) || 1 })}
                        step="0.1"
                        min="1"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-purple-800">
                        Toplam: <strong>€{(item.calculation?.fabricCost || 0).toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Motor */}
              <div className="bg-orange-50 rounded-lg p-4">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={item.includeMotor}
                    onChange={(e) => updateItem(index, { includeMotor: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-orange-800">Motor Dahil Et</span>
                </label>
                {item.includeMotor && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Motor Tipi</label>
                      <select className="input" value={item.motorType} onChange={(e) => updateItem(index, { motorType: e.target.value })}>
                        <option>Somfy</option>
                        <option>Mosel</option>
                        <option>Nice</option>
                        <option>Cherubini</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Motor Fiyatı (€)</label>
                      <input
                        type="number"
                        className="input"
                        value={item.motorPrice}
                        onChange={(e) => updateItem(index, { motorPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="label">Motor Adeti</label>
                      <input
                        type="number"
                        className="input"
                        value={item.motorQty}
                        onChange={(e) => updateItem(index, { motorQty: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="label">Kumanda Tipi</label>
                      <select className="input" value={item.remoteType} onChange={(e) => updateItem(index, { remoteType: e.target.value })}>
                        <option>Standart</option>
                        <option>Timer'lı</option>
                        <option>Wifi</option>
                        <option>Akıllı Ev</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Kumanda Fiyatı (€)</label>
                      <input
                        type="number"
                        className="input"
                        value={item.remotePrice}
                        onChange={(e) => updateItem(index, { remotePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="label">Kumanda Adeti</label>
                      <input
                        type="number"
                        className="input"
                        value={item.remoteQty}
                        onChange={(e) => updateItem(index, { remoteQty: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Calculation Details */}
              {item.calculation && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Profil:</span>
                      <span className="ml-2 font-medium">€{item.calculation.totalProfileCost?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Aparat:</span>
                      <span className="ml-2 font-medium">€{item.calculation.totalAccessoryCost?.toFixed(2)}</span>
                    </div>
                    {item.includeFabric && (
                      <div>
                        <span className="text-gray-500">Kumaş:</span>
                        <span className="ml-2 font-medium">€{item.calculation.fabricCost?.toFixed(2)}</span>
                      </div>
                    )}
                    {item.includeMotor && (
                      <div>
                        <span className="text-gray-500">Motor:</span>
                        <span className="ml-2 font-medium">€{item.calculation.motorCost?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Item Total */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-gray-600">Kalem Toplam:</span>
                <span className="text-xl font-bold text-primary-500">€{item.totalCost.toFixed(2)}</span>
              </div>
            </div>
          ))}

          {/* Add Item Button */}
          <button
            onClick={addItem}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Kalem Ekle
          </button>

          {/* Notes */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notlar</h2>
            <textarea
              className="input min-h-[100px]"
              placeholder="Teklif ile ilgili notlar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <div className="card sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Teklif Özeti</h2>

            <div className="space-y-3 mb-6">
              {items.map((item, index) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {index + 1}. {item.systemType}
                    <br />
                    <span className="text-xs text-gray-400">{item.width}x{item.height}mm × {item.quantity}</span>
                  </span>
                  <span className="font-medium">{item.isCalculating ? '...' : `€${item.totalCost.toFixed(2)}`}</span>
                </div>
              ))}
            </div>

            <hr className="my-4" />

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ara Toplam</span>
                <span>€{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>İndirim (%5)</span>
                <span>-€{totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">KDV (%20)</span>
                <span>€{totals.tax.toFixed(2)}</span>
              </div>
            </div>

            <hr className="my-4" />

            <div className="flex justify-between text-xl font-bold">
              <span>TOPLAM</span>
              <span className="text-primary-500">€{totals.total.toFixed(2)}</span>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleSave(true)}
                disabled={createQuoteMutation.isPending || !selectedCustomer}
                className="w-full btn btn-primary justify-center py-3 disabled:opacity-50"
              >
                {createQuoteMutation.isPending ? 'Kaydediliyor...' : 'Kaydet ve Gönder'}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={createQuoteMutation.isPending || !selectedCustomer}
                className="w-full btn btn-secondary justify-center disabled:opacity-50"
              >
                Taslak Olarak Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

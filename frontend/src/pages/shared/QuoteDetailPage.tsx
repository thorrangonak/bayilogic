import { useParams, useNavigate } from 'react-router-dom';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data - API'den gelecek
  const quote = {
    id,
    number: 'TKL-2024-0024',
    status: 'SENT',
    createdAt: '2024-03-15',
    validUntil: '2024-04-15',
    customer: {
      companyName: 'ABC İnşaat A.Ş.',
      contactName: 'Mehmet Kaya',
      phone: '+90 533 111 2233',
      email: 'mehmet@abcinsaat.com',
    },
    items: [
      { id: 1, system: 'BYD100 DİKEY', width: 3000, height: 2500, qty: 2, unitPrice: 450, total: 900, fabric: true, motor: 'Somfy' },
      { id: 2, system: 'SKY1500 TAVAN', width: 4000, height: 3000, qty: 1, unitPrice: 780, total: 780, fabric: false, motor: null },
    ],
    subtotal: 1680,
    discount: 84,
    tax: 319.2,
    total: 1915.2,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Taslak',
      SENT: 'Gönderildi',
      APPROVED: 'Onaylandı',
      REJECTED: 'Reddedildi',
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotes')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quote.number}</h1>
              {getStatusBadge(quote.status)}
            </div>
            <p className="text-gray-500 mt-1">
              Oluşturulma: {quote.createdAt} • Geçerlilik: {quote.validUntil}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF İndir
          </button>
          {quote.status === 'DRAFT' && (
            <button className="btn btn-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Gönder
            </button>
          )}
          {quote.status === 'APPROVED' && (
            <button className="btn btn-success">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Siparişe Dönüştür
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Teklif Kalemleri</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell">#</th>
                    <th className="table-cell">Sistem</th>
                    <th className="table-cell">Ölçü (mm)</th>
                    <th className="table-cell">Adet</th>
                    <th className="table-cell">Kumaş</th>
                    <th className="table-cell">Motor</th>
                    <th className="table-cell">Birim Fiyat</th>
                    <th className="table-cell">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="table-cell">{index + 1}</td>
                      <td className="table-cell font-medium">{item.system}</td>
                      <td className="table-cell">{item.width} x {item.height}</td>
                      <td className="table-cell">{item.qty}</td>
                      <td className="table-cell">
                        {item.fabric ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell">{item.motor || '-'}</td>
                      <td className="table-cell">€{item.unitPrice.toFixed(2)}</td>
                      <td className="table-cell font-semibold">€{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {quote.status === 'DRAFT' && (
              <button className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors">
                + Yeni Kalem Ekle
              </button>
            )}
          </div>

          {/* Totals */}
          <div className="card">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Ara Toplam</span>
                <span>€{quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>İndirim (%5)</span>
                <span className="text-red-500">-€{quote.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>KDV (%20)</span>
                <span>€{quote.tax.toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-xl font-bold">
                <span>Genel Toplam</span>
                <span className="text-primary-500">€{quote.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Müşteri Bilgileri</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Firma</p>
                <p className="font-medium">{quote.customer.companyName}</p>
              </div>
              <div>
                <p className="text-gray-500">Yetkili</p>
                <p className="font-medium">{quote.customer.contactName}</p>
              </div>
              <div>
                <p className="text-gray-500">Telefon</p>
                <p className="font-medium">{quote.customer.phone}</p>
              </div>
              <div>
                <p className="text-gray-500">E-posta</p>
                <p className="font-medium">{quote.customer.email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">İşlemler</h3>
            <div className="space-y-2">
              <button className="w-full btn btn-secondary justify-center">
                Düzenle
              </button>
              <button className="w-full btn btn-secondary justify-center">
                Kopyala
              </button>
              <button className="w-full btn text-red-600 hover:bg-red-50 justify-center">
                Sil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

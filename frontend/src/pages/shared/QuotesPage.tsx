import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function QuotesPage() {
  const [filter, setFilter] = useState('ALL');

  // Mock data - API'den gelecek
  const quotes = [
    { id: '1', number: 'TKL-2024-0024', customer: 'ABC İnşaat A.Ş.', date: '2024-03-15', amount: '€2,450.00', status: 'SENT', items: 3 },
    { id: '2', number: 'TKL-2024-0023', customer: 'XYZ Yapı Ltd.', date: '2024-03-14', amount: '€1,830.00', status: 'APPROVED', items: 2 },
    { id: '3', number: 'TKL-2024-0022', customer: 'Demo Mobilya', date: '2024-03-13', amount: '€3,120.00', status: 'DRAFT', items: 5 },
    { id: '4', number: 'TKL-2024-0021', customer: 'Örnek Dekorasyon', date: '2024-03-12', amount: '€890.00', status: 'REJECTED', items: 1 },
    { id: '5', number: 'TKL-2024-0020', customer: 'Test Mimarlık', date: '2024-03-11', amount: '€4,560.00', status: 'CONVERTED', items: 4 },
  ];

  const statusFilters = [
    { value: 'ALL', label: 'Tümü' },
    { value: 'DRAFT', label: 'Taslak' },
    { value: 'SENT', label: 'Gönderildi' },
    { value: 'APPROVED', label: 'Onaylandı' },
    { value: 'REJECTED', label: 'Reddedildi' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Taslak',
      SENT: 'Gönderildi',
      APPROVED: 'Onaylandı',
      REJECTED: 'Reddedildi',
      CONVERTED: 'Siparişe Dönüştü',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredQuotes = filter === 'ALL' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teklifler</h1>
          <p className="text-gray-500 mt-1">Tüm tekliflerinizi görüntüleyin ve yönetin</p>
        </div>
        <Link to="/quotes/new" className="btn btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Yeni Teklif
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((sf) => (
            <button
              key={sf.value}
              onClick={() => setFilter(sf.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === sf.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Teklif No</th>
                <th className="table-cell">Müşteri</th>
                <th className="table-cell">Tarih</th>
                <th className="table-cell">Kalem</th>
                <th className="table-cell">Tutar</th>
                <th className="table-cell">Durum</th>
                <th className="table-cell">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <Link to={`/quotes/${quote.id}`} className="font-medium text-primary-500 hover:underline">
                      {quote.number}
                    </Link>
                  </td>
                  <td className="table-cell">{quote.customer}</td>
                  <td className="table-cell text-gray-500">{quote.date}</td>
                  <td className="table-cell">{quote.items} kalem</td>
                  <td className="table-cell font-semibold">{quote.amount}</td>
                  <td className="table-cell">{getStatusBadge(quote.status)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="text-gray-500 hover:text-primary-500"
                        title="Görüntüle"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button
                        className="text-gray-500 hover:text-primary-500"
                        title="PDF İndir"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Bu filtreye uygun teklif bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}

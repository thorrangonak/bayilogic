import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { quotesApi, ordersApi, customersApi, dealersApi } from '../../api/client';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  // Fetch quotes stats
  const { data: quotesResponse } = useQuery({
    queryKey: ['quotes', 'stats'],
    queryFn: () => quotesApi.list({ limit: 1 }),
  });

  // Fetch orders stats
  const { data: ordersStatsResponse } = useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: () => ordersApi.getStats(),
  });

  // Fetch recent quotes
  const { data: recentQuotesResponse } = useQuery({
    queryKey: ['quotes', 'recent'],
    queryFn: () => quotesApi.list({ limit: 5 }),
  });

  // Fetch customers stats (for dealer)
  const { data: customersResponse } = useQuery({
    queryKey: ['customers', 'stats'],
    queryFn: () => customersApi.getStats(),
  });

  // Fetch dealer stats (for admin)
  const { data: dealersStatsResponse, enabled: isAdmin } = useQuery({
    queryKey: ['dealers', 'all-stats'],
    queryFn: () => dealersApi.getAllStats(),
    enabled: isAdmin,
  });

  const ordersStats = ordersStatsResponse?.data || {};
  const customersStats = customersResponse?.data || {};
  const dealersStats = dealersStatsResponse?.data || {};
  const recentQuotes = recentQuotesResponse?.data || [];
  const totalQuotes = quotesResponse?.meta?.total || 0;

  // Calculate stats based on role
  const stats = isAdmin ? [
    {
      label: 'Toplam Teklif',
      value: totalQuotes.toString(),
      change: '',
      color: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Aktif Siparişler',
      value: ((ordersStats.pendingOrders || 0) + (ordersStats.inProductionOrders || 0)).toString(),
      change: '',
      color: 'bg-yellow-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    {
      label: 'Toplam Bayi',
      value: (dealersStats.totalDealers || 0).toString(),
      change: '',
      color: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: 'Toplam Ciro',
      value: `€${((ordersStats.totalRevenue || 0) / 1000).toFixed(1)}K`,
      change: '',
      color: 'bg-purple-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ] : [
    {
      label: 'Toplam Teklif',
      value: totalQuotes.toString(),
      change: '',
      color: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Siparişlerim',
      value: (ordersStats.totalOrders || 0).toString(),
      change: '',
      color: 'bg-yellow-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
    },
    {
      label: 'Müşterilerim',
      value: (customersStats.totalCustomers || 0).toString(),
      change: '',
      color: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: 'Bu Ay Ciro',
      value: `€${((ordersStats.totalRevenue || 0) / 1000).toFixed(1)}K`,
      change: '',
      color: 'bg-purple-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'status-badge status-draft',
      SENT: 'status-badge status-sent',
      APPROVED: 'status-badge status-approved',
      REJECTED: 'status-badge status-rejected',
      EXPIRED: 'bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Taslak',
      SENT: 'Gönderildi',
      APPROVED: 'Onaylandı',
      REJECTED: 'Reddedildi',
      EXPIRED: 'Süresi Doldu',
    };
    return <span className={styles[status] || styles.DRAFT}>{labels[status] || status}</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hoş geldin, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role === 'ADMIN'
            ? 'Sistem yönetici paneline hoş geldiniz.'
            : `${user?.dealer?.companyName || 'Bayi'} paneline hoş geldiniz.`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                {stat.change && (
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                )}
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/quotes/new"
          className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary-500"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Yeni Teklif Oluştur</p>
              <p className="text-sm text-gray-500">Hızlı teklif hesaplama</p>
            </div>
          </div>
        </Link>

        <Link
          to="/customers"
          className="card hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Müşteri Ekle</p>
              <p className="text-sm text-gray-500">Yeni müşteri kaydı</p>
            </div>
          </div>
        </Link>

        <Link
          to="/quotes"
          className="card hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Tüm Teklifler</p>
              <p className="text-sm text-gray-500">Teklif listesini görüntüle</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Order Status Summary (for Admin) */}
      {isAdmin && (ordersStats.pendingOrders > 0 || ordersStats.inProductionOrders > 0) && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Durumu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600">Onay Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-700">{ordersStats.pendingOrders || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Üretimde</p>
              <p className="text-2xl font-bold text-blue-700">{ordersStats.inProductionOrders || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Tamamlanan</p>
              <p className="text-2xl font-bold text-green-700">{ordersStats.completedOrders || 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Son 30 Gün</p>
              <p className="text-2xl font-bold text-purple-700">{ordersStats.recentOrders || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Quotes */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Son Teklifler</h2>
          <Link to="/quotes" className="text-primary-500 hover:underline text-sm">
            Tümünü Gör →
          </Link>
        </div>

        {recentQuotes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Teklif No</th>
                  <th className="table-cell">Müşteri</th>
                  <th className="table-cell">Tutar</th>
                  <th className="table-cell">Durum</th>
                  <th className="table-cell">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((quote: any) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{quote.quoteNumber}</td>
                    <td className="table-cell">{quote.customer?.companyName || '-'}</td>
                    <td className="table-cell font-semibold">{formatCurrency(quote.totalAmount || 0)}</td>
                    <td className="table-cell">{getStatusBadge(quote.status)}</td>
                    <td className="table-cell">
                      <Link
                        to={`/quotes/${quote.id}`}
                        className="text-primary-500 hover:underline"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Henüz teklif oluşturulmamış.</p>
            <Link to="/quotes/new" className="text-primary-500 hover:underline mt-2 inline-block">
              İlk teklifinizi oluşturun →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

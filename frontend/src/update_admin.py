import os

filepath = r'C:\Users\user\.gemini\antigravity\scratch\reklamachi_bot\frontend\src\AdminApp.tsx'

content = """import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users, Activity, CheckCircle2, Trash2, MonitorPlay, TrendingUp, ShoppingCart, ShieldCheck, CreditCard, Bell } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    cardNumber: '',
    cardOwnerName: '',
    paymentChannelId: '',
    notifyNewPayment: true,
    notifyNewUser: true,
    listingFee: 20000,
    commissionRate: 10
  });

  const [loading, setLoading] = useState(true);

  const initData = (window as any).Telegram?.WebApp?.initData || '';

  const axiosConfig = {
    headers: {
      'x-telegram-init-data': initData
    }
  };

  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready();
      (window as any).Telegram.WebApp.expand();
    }
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await axios.get(`${API_URL}/api/admin/stats`, axiosConfig);
        setStats(res.data);
      } else if (activeTab === 'listings') {
        const res = await axios.get(`${API_URL}/api/admin/listings`, axiosConfig);
        setListings(res.data);
      } else if (activeTab === 'users') {
        const res = await axios.get(`${API_URL}/api/admin/users`, axiosConfig);
        setUsers(res.data);
      } else if (activeTab === 'sales') {
        const res = await axios.get(`${API_URL}/api/admin/sales`, axiosConfig);
        setSales(res.data);
      } else if (activeTab === 'settings') {
        const res = await axios.get(`${API_URL}/api/admin/settings`, axiosConfig);
        setSettings(res.data);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        alert("Siz admin emassiz yoki sessiya eskirgan.");
      }
      console.error(err);
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/settings`, settings, axiosConfig);
      alert('Sozlamalar saqlandi!');
    } catch (err) {
      alert('Xatolik yuz berdi');
    }
  };

  const handleDeleteListing = async (id: number) => {
    if (!window.confirm("Rostdan ham bu e'lonni o'chirmoqchimisiz?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/listings/${id}`, axiosConfig);
      fetchData();
    } catch (err) {
      alert('Xatolik yuz berdi');
    }
  };

  if (loading && !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <ShieldCheck size={48} color="var(--yt-red)" style={{ animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: 'var(--text-muted)' }}>Admin panel yuklanmoqda...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 30, maxWidth: 600, margin: '0 auto', padding: '16px 12px' }}>
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo-circle">
            <ShieldCheck size={20} color="var(--yt-red)" />
          </div>
          <div className="admin-header-title">
            YouTube<span>Bozor</span>
          </div>
        </div>
        <div className="admin-badge">Admin</div>
      </div>

      <div className="admin-nav">
        <button className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <Activity className="tab-icon" />
          Statistika
        </button>
        <button className={`admin-tab ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>
          <MonitorPlay className="tab-icon" />
          E'lonlar
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users className="tab-icon" />
          Mijozlar
        </button>
        <button className={`admin-tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          <ShoppingCart className="tab-icon" />
          Sotuvlar
        </button>
        <button className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings className="tab-icon" />
          Sozlamalar
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'stats' && stats && (
          <div>
            <h2 className="admin-section-title">Umumiy Statistika</h2>
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-card-label">Foydalanuvchilar</div>
                <div className="stat-card-value blue">{stats.totalUsers}</div>
              </div>
              <div className="stat-card purple">
                <div className="stat-card-label">Aktiv E'lonlar</div>
                <div className="stat-card-value purple">{stats.activeListings}</div>
              </div>
              <div className="stat-card red">
                <div className="stat-card-label">E'lon daromadi</div>
                <div className="stat-card-value red">
                  {stats.listingRevenue.toLocaleString()} <span className="stat-card-unit">UZS</span>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-card-label">Xarid aylanmasi</div>
                <div className="stat-card-value green">
                  {stats.purchaseRevenue.toLocaleString()} <span className="stat-card-unit">UZS</span>
                </div>
              </div>
            </div>

            <h3 className="admin-section-title" style={{ marginTop: 24, fontSize: 14 }}>E'lonlar bo'yicha tushumlar</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kanal nomi</th>
                    <th>24s</th>
                    <th>30k</th>
                    <th>Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.listingStats.map((cs: any) => (
                    <tr key={cs.id}>
                      <td className="td-main">{cs.title}</td>
                      <td>{cs.revenue1d.toLocaleString()}</td>
                      <td>{cs.revenue30d.toLocaleString()}</td>
                      <td className="td-green">{cs.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                  {stats.listingStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="admin-empty">
                        <TrendingUp className="admin-empty-icon" />
                        <br />Ma'lumot yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div>
            <h2 className="admin-section-title">Barcha E'lonlar</h2>
            {listings.map(c => (
              <div key={c.id} className="admin-listing-item">
                <div>
                  <div className="admin-listing-name">{c.channelName}</div>
                  <div className="admin-listing-meta">
                    <span className="price-inline">{c.price.toLocaleString()} UZS</span>
                    <span>• Sotuvchi: {c.seller?.firstName || c.sellerId}</span>
                  </div>
                </div>
                <button className="admin-delete-btn" onClick={() => handleDeleteListing(c.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {listings.length === 0 && (
              <div className="admin-empty">
                <MonitorPlay className="admin-empty-icon" />
                <br />E'lonlar yo'q.
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="admin-section-title">Mijozlar ({users.length})</h2>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ism</th>
                    <th>Username</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td className="td-main">{u.firstName || '-'}</td>
                      <td className="td-accent">{u.username ? `@${u.username}` : '-'}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="admin-empty">
                        <Users className="admin-empty-icon" />
                        <br />Mijozlar yo'q.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div>
            <h2 className="admin-section-title">Kanal Xaridlari Tarixi</h2>
            {sales.map(s => (
              <div key={s.id} className="admin-sale-card">
                <div className="admin-sale-header">
                  <div className="admin-sale-channel">Kanal: {s.listing?.channelName || '-'}</div>
                  <div className={`admin-status-badge ${s.status === 'COMPLETED' ? 'completed' : s.status === 'PENDING' ? 'pending' : 'default'}`}>
                    {s.status}
                  </div>
                </div>
                <div className="admin-sale-details">
                  <strong>Xaridor:</strong> {s.user?.firstName} (ID: {s.userId})<br/>
                  <strong>Summa:</strong> <span style={{ color: 'var(--success-green)' }}>{s.amount.toLocaleString()} UZS</span><br/>
                  <strong>Sana:</strong> {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="admin-empty">
                <ShoppingCart className="admin-empty-icon" />
                <br />Sotuvlar yo'q.
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="admin-section-title">Tizim Sozlamalari</h2>
            
            <div className="admin-form-section">
              <div className="admin-form-section-title"><CreditCard size={16} /> To'lov Ma'lumotlari</div>
              <div className="admin-form-group">
                <label className="admin-form-label">Karta raqami</label>
                <input value={settings.cardNumber} onChange={e => setSettings({...settings, cardNumber: e.target.value})} placeholder="8600..." />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Karta egasi ismi</label>
                <input value={settings.cardOwnerName} onChange={e => setSettings({...settings, cardOwnerName: e.target.value})} placeholder="Jahongir Tojiboyev" />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">To'lovlar keladigan kanal ID</label>
                <input value={settings.paymentChannelId} onChange={e => setSettings({...settings, paymentChannelId: e.target.value})} placeholder="-100..." style={{ marginBottom: 0 }} />
              </div>
            </div>

            <div className="admin-form-section">
              <div className="admin-form-section-title"><TrendingUp size={16} /> Moliyaviy Sozlamalar</div>
              <div className="admin-form-group">
                <label className="admin-form-label">E'lon qo'shish narxi (UZS)</label>
                <input type="number" value={settings.listingFee} onChange={e => setSettings({...settings, listingFee: Number(e.target.value)})} />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Sotuvdan komissiya foizi (%)</label>
                <input type="number" value={settings.commissionRate} onChange={e => setSettings({...settings, commissionRate: Number(e.target.value)})} style={{ marginBottom: 0 }} />
              </div>
            </div>

            <div className="admin-form-section">
              <div className="admin-form-section-title"><Bell size={16} /> Bildirishnomalar</div>
              <div className="toggle-row">
                <span className="toggle-label">Yangi to'lovlar xabari</span>
                <input type="checkbox" className="toggle-switch" checked={settings.notifyNewPayment} onChange={e => setSettings({...settings, notifyNewPayment: e.target.checked})} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">Yangi foydalanuvchilar xabari</span>
                <input type="checkbox" className="toggle-switch" checked={settings.notifyNewUser} onChange={e => setSettings({...settings, notifyNewUser: e.target.checked})} />
              </div>
            </div>

            <button className="admin-save-btn" onClick={handleSaveSettings}>
              Sozlamalarni Saqlash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminApp.tsx rewritten successfully")

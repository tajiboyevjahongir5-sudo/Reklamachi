import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users, Activity, CheckCircle2, Trash2, MonitorPlay } from 'lucide-react';

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

  // Use initData directly to get x-telegram-init-data for auth
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
      <MonitorPlay size={48} color="var(--yt-red)" style={{ animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 30, maxWidth: 600, margin: '0 auto' }}>
      <div className="header-container">
        <div className="logo-text">
          <MonitorPlay size={28} color="var(--yt-red)" /> Admin Panel
        </div>
        <div className="admin-badge">Admin</div>
      </div>

      <div className="main-glass-panel">
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            <Activity size={20} />
            Statistika
          </button>
          <button className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>
            <MonitorPlay size={20} />
            E'lonlar
          </button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} />
            Mijozlar
          </button>
          <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            <CheckCircle2 size={20} />
            Sotuvlar
          </button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} />
            Sozlamalar
          </button>
        </div>

        {activeTab === 'stats' && stats && (
          <div>
            <h2 className="section-title">Umumiy Statistika</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="inner-card">
                <div className="meta">Foydalanuvchilar</div>
                <div className="amount" style={{ color: 'var(--text-main)' }}>{stats.totalUsers}</div>
              </div>
              <div className="inner-card">
                <div className="meta">Aktiv E'lonlar</div>
                <div className="amount" style={{ color: 'var(--text-main)' }}>{stats.activeListings}</div>
              </div>
              <div className="inner-card">
                <div className="meta">E'lon daromadi</div>
                <div className="amount" style={{ color: 'var(--yt-light-red)', fontSize: 18 }}>
                  {stats.listingRevenue.toLocaleString()} <span style={{ fontSize: 12 }}>UZS</span>
                </div>
              </div>
              <div className="inner-card">
                <div className="meta">Xarid aylanmasi</div>
                <div className="amount" style={{ color: 'var(--success-green)', fontSize: 18 }}>
                  {stats.purchaseRevenue.toLocaleString()} <span style={{ fontSize: 12 }}>UZS</span>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: 12, fontSize: 16 }}>E'lonlar bo'yicha tushumlar</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '8px 4px' }}>Kanal nomi</th>
                    <th style={{ padding: '8px 4px' }}>24s</th>
                    <th style={{ padding: '8px 4px' }}>30k</th>
                    <th style={{ padding: '8px 4px' }}>Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.listingStats.map((cs: any) => (
                    <tr key={cs.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 4px', color: 'var(--text-main)' }}>{cs.title}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{cs.revenue1d.toLocaleString()}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{cs.revenue30d.toLocaleString()}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--success-green)', fontWeight: 'bold' }}>{cs.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                  {stats.listingStats.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>Ma'lumot yo'q</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div>
            <h2 className="section-title">Barcha E'lonlar</h2>
            {listings.map(c => (
              <div key={c.id} className="inner-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--text-main)' }}>{c.channelName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                    Narx: {c.price.toLocaleString()} UZS | Sotuvchi: {c.seller?.firstName || c.sellerId}
                  </div>
                </div>
                <button onClick={() => handleDeleteListing(c.id)} style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--yt-red)', padding: 8, borderRadius: 8, cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {listings.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>E'lonlar yo'q.</p>}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="section-title">Mijozlar ({users.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '8px 4px' }}>ID</th>
                    <th style={{ padding: '8px 4px' }}>Ism</th>
                    <th style={{ padding: '8px 4px' }}>Username</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{u.id}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--text-main)' }}>{u.firstName || '-'}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--yt-light-red)' }}>{u.username ? `@${u.username}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div>
            <h2 className="section-title">Kanal Xaridlari Tarixi</h2>
            {sales.map(s => (
              <div key={s.id} className="inner-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Kanal: {s.listing?.channelName || '-'}</span>
                  <span style={{ color: s.status === 'COMPLETED' ? 'var(--success-green)' : 'var(--text-muted)', fontWeight: 'bold', fontSize: 12 }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Xaridor: {s.user?.firstName} (ID: {s.userId})<br/>
                  Summa: {s.amount.toLocaleString()} UZS<br/>
                  Sana: {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {sales.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sotuvlar yo'q.</p>}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="section-title">Tizim Sozlamalari</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Karta raqami (To'lovlar uchun)</label>
              <input value={settings.cardNumber} onChange={e => setSettings({...settings, cardNumber: e.target.value})} placeholder="8600..." />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Karta egasi ismi</label>
              <input value={settings.cardOwnerName} onChange={e => setSettings({...settings, cardOwnerName: e.target.value})} placeholder="Jahongir Tojiboyev" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Bank to'lovlari keladigan kanal ID (Masalan: -100123...)</label>
              <input value={settings.paymentChannelId} onChange={e => setSettings({...settings, paymentChannelId: e.target.value})} placeholder="-100..." />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Moliyaviy Sozlamalar</h3>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>E'lon qo'shish narxi (UZS)</label>
                <input type="number" value={settings.listingFee} onChange={e => setSettings({...settings, listingFee: Number(e.target.value)})} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Sotuvdan komissiya foizi (%)</label>
                <input type="number" value={settings.commissionRate} onChange={e => setSettings({...settings, commissionRate: Number(e.target.value)})} />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12 }}>Bildirishnomalar (Adminga)</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={settings.notifyNewPayment} onChange={e => setSettings({...settings, notifyNewPayment: e.target.checked})} style={{ width: 18, height: 18, margin: 0 }} />
                <span style={{ fontSize: 14 }}>Yangi to'lovlar haqida</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.notifyNewUser} onChange={e => setSettings({...settings, notifyNewUser: e.target.checked})} style={{ width: 18, height: 18, margin: 0 }} />
                <span style={{ fontSize: 14 }}>Yangi foydalanuvchilar haqida</span>
              </label>
            </div>

            <button className="btn btn-yt" onClick={handleSaveSettings}>
              Saqlash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

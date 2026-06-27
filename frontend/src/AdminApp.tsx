import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users, Activity, Trash2, MonitorPlay, TrendingUp, ShoppingCart, ShieldCheck, CreditCard, Bell, Search, Send, PhoneOff, Phone, IdCard, Clock, Plus, X, Save, Tv, Hash, Eye, DollarSign, FileText, Tag } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListing, setNewListing] = useState({
    channelName: '',
    description: '',
    niche: 'Boshqa',
    price: 0,
    subscribers: 0,
    monthlyViews: 0,
    youtubeUrl: '',
    monetized: false
  });
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

  const handleAddListing = async () => {
    if (!newListing.channelName || !newListing.price) {
      alert("Kanal nomi va narxini kiriting!");
      return;
    }
    try {
      await axios.post(`${API_URL}/api/admin/listings`, newListing, axiosConfig);
      setShowAddListing(false);
      setNewListing({ channelName: '', description: '', niche: 'Boshqa', price: 0, subscribers: 0, monthlyViews: 0, youtubeUrl: '', monetized: false });
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="admin-section-title" style={{ margin: 0 }}>Barcha E'lonlar</h2>
              <button className="auc-btn-add" onClick={() => setShowAddListing(!showAddListing)}>
                {showAddListing ? <><X size={14} /> Yopish</> : <><Plus size={14} /> Yangi e'lon</>}
              </button>
            </div>

            {showAddListing && (
              <div className="admin-add-form">
                <div className="admin-form-section-title"><Tv size={16} /> Yangi E'lon Qo'shish</div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label"><MonitorPlay size={13} /> Kanal nomi *</label>
                  <input value={newListing.channelName} onChange={e => setNewListing({...newListing, channelName: e.target.value})} placeholder="Masalan: Tech UZ" />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label"><FileText size={13} /> Tavsif</label>
                  <textarea value={newListing.description} onChange={e => setNewListing({...newListing, description: e.target.value})} placeholder="Kanal haqida qisqacha..." rows={3} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14, resize: 'vertical', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label"><DollarSign size={13} /> Narxi (UZS) *</label>
                    <input type="number" value={newListing.price || ''} onChange={e => setNewListing({...newListing, price: Number(e.target.value)})} placeholder="500000" />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label"><Hash size={13} /> Obunchilar</label>
                    <input type="number" value={newListing.subscribers || ''} onChange={e => setNewListing({...newListing, subscribers: Number(e.target.value)})} placeholder="10000" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="admin-form-group">
                    <label className="admin-form-label"><Eye size={13} /> Oylik ko'rishlar</label>
                    <input type="number" value={newListing.monthlyViews || ''} onChange={e => setNewListing({...newListing, monthlyViews: Number(e.target.value)})} placeholder="50000" />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label"><Tag size={13} /> Kategoriya</label>
                    <select value={newListing.niche} onChange={e => setNewListing({...newListing, niche: e.target.value})} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14, fontFamily: 'Inter, sans-serif', width: '100%' }}>
                      <option value="Boshqa">Boshqa</option>
                      <option value="Texnologiya">Texnologiya</option>
                      <option value="O'yin">O'yin</option>
                      <option value="Musiqa">Musiqa</option>
                      <option value="Ta'lim">Ta'lim</option>
                      <option value="Vlog">Vlog</option>
                      <option value="Sport">Sport</option>
                      <option value="Yangiliklar">Yangiliklar</option>
                      <option value="Ko'ngilochar">Ko'ngilochar</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label"><Tv size={13} /> YouTube URL</label>
                  <input value={newListing.youtubeUrl} onChange={e => setNewListing({...newListing, youtubeUrl: e.target.value})} placeholder="https://youtube.com/@kanal" />
                </div>

                <div className="toggle-row" style={{ marginTop: 4 }}>
                  <span className="toggle-label">Monetizatsiya yoqilgan</span>
                  <input type="checkbox" className="toggle-switch" checked={newListing.monetized} onChange={e => setNewListing({...newListing, monetized: e.target.checked})} />
                </div>

                <button className="admin-save-btn" onClick={handleAddListing} style={{ marginTop: 16 }}>
                  <Save size={16} /> E'lonni Saqlash
                </button>
              </div>
            )}

            {listings.map(c => (
              <div key={c.id} className="admin-listing-item">
                <div>
                  <div className="admin-listing-name">{c.channelName}</div>
                  <div className="admin-listing-meta">
                    <span className="price-inline">{c.price.toLocaleString()} UZS</span>
                    <span>• {c.niche}</span>
                    <span>• {c.subscribers?.toLocaleString()} obunchi</span>
                    {c.seller && <span>• Sotuvchi: {c.seller.firstName || c.sellerId}</span>}
                  </div>
                </div>
                <button className="admin-delete-btn" onClick={() => handleDeleteListing(c.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {listings.length === 0 && !showAddListing && (
              <div className="admin-empty">
                <MonitorPlay className="admin-empty-icon" />
                <br />E'lonlar yo'q.
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="admin-section-title" style={{ margin: 0 }}>Foydalanuvchilar</h2>
              <span style={{ color: '#3b82f6', fontSize: 13, fontWeight: 700 }}>{users.length} ta</span>
            </div>

            <div className="admin-search-box">
              <Search size={16} />
              <input 
                placeholder="Ism, ID yoki username bo'yicha izlash..." 
                value={searchUserQuery}
                onChange={e => setSearchUserQuery(e.target.value)}
              />
            </div>

            <div className="admin-users-list">
              {users.filter(u => 
                (u.firstName || '').toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                (u.username || '').toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                u.id.includes(searchUserQuery)
              ).map(u => (
                <div key={u.id} className="admin-user-card">
                  <div className="auc-header">
                    <div className="auc-avatar">
                      {u.firstName ? u.firstName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="auc-info">
                      <div className="auc-name">{u.firstName || 'Foydalanuvchi'}</div>
                      <a href={u.username ? `https://t.me/${u.username}` : '#'} target="_blank" className="auc-username">
                        @{u.username || 'username_yoq'}
                      </a>
                    </div>
                    {u.username && (
                      <a href={`https://t.me/${u.username}`} target="_blank" className="auc-send-btn">
                        <Send size={14} />
                      </a>
                    )}
                  </div>

                  <div className="auc-details">
                    <div className="auc-meta-list">
                      <div className={`auc-meta-item ${!u.phoneNumber ? 'text-red' : ''}`}>
                        {u.phoneNumber ? <Phone size={14} /> : <PhoneOff size={14} />}
                        <span>{u.phoneNumber || 'Raqam kiritilmagan'}</span>
                      </div>
                      <div className="auc-meta-item">
                        <IdCard size={14} />
                        <span>ID: {u.id}</span>
                      </div>
                      <div className="auc-meta-item">
                        <Clock size={14} />
                        <span>{new Date(u.createdAt).toLocaleString('ru-RU').slice(0, 16)}</span>
                      </div>
                    </div>
                    
                    <div className="auc-actions">
                      {u.listings && u.listings.length > 0 ? (
                        <div className="auc-status active">
                          E'lon: {u.listings.length} ta
                        </div>
                      ) : (
                        <div className="auc-status inactive">
                          E'lon yo'q
                        </div>
                      )}
                      
                      <button className="auc-btn-info" onClick={() => {
                        alert(`${u.firstName || 'U'}da ${u.listings?.length || 0} ta e'lon bor.`);
                      }}>
                        <Plus size={14} /> E'lonlarini ko'rish
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {users.filter(u => 
                (u.firstName || '').toLowerCase().includes(searchUserQuery.toLowerCase()) || 
                (u.username || '').toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                u.id.includes(searchUserQuery)
              ).length === 0 && (
                <div className="admin-empty">
                  <Users className="admin-empty-icon" />
                  <br />Mijozlar topilmadi.
                </div>
              )}
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

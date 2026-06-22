import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Send, PlusSquare, Users, BarChart2, CheckCircle2, XCircle, Clock, Trash2, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const initData = (window as any).Telegram?.WebApp?.initData || 'query_id=mock';

type Tab = 'tolovlar' | 'xabarnoma' | 'kanal' | 'foydalanuvchilar' | 'statistika';
type Filter = 'Kutayotgan' | 'Tasdiqlangan' | 'Bekor' | 'Hammasi';

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<Tab>('tolovlar');
  const [filter, setFilter] = useState<Filter>('Hammasi');
  
  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newChannel, setNewChannel] = useState({ id: '', title: '', description: '', adPrice: '', membersCount: '' });

  const fetchAdminData = async () => {
    try {
      const headers = { 'x-telegram-init-data': initData };
      const [statsRes, channelsRes, settingsRes, adsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_URL}/api/channels`, { headers }),
        axios.get(`${API_URL}/api/admin/settings`, { headers }),
        axios.get(`${API_URL}/api/admin/ads`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setChannels(channelsRes.data);
      setSettings(settingsRes.data);
      setAds(adsRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Siz admin emassiz yoki tizim xatosi.');
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addChannel = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/channels`, newChannel, { headers: { 'x-telegram-init-data': initData } });
      setNewChannel({ id: '', title: '', description: '', adPrice: '', membersCount: '' });
      fetchAdminData();
    } catch (err) {
      alert('Xatolik');
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm("Ishonchingiz komilmi?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/channels/${id}`, { headers: { 'x-telegram-init-data': initData } });
      fetchAdminData();
    } catch (err) {
      alert('Xatolik');
    }
  };

  const saveSettings = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/settings`, settings, { headers: { 'x-telegram-init-data': initData } });
      alert("Sozlamalar saqlandi!");
    } catch (err) {
      alert('Xatolik');
    }
  };

  const filteredAds = ads.filter(ad => {
    if (filter === 'Hammasi') return true;
    if (filter === 'Kutayotgan') return ad.status === 'WAITING_CONTENT' || ad.status === 'PENDING';
    if (filter === 'Tasdiqlangan') return ad.status === 'POSTED';
    if (filter === 'Bekor') return ad.status === 'DELETED' || ad.status === 'CANCELLED';
    return true;
  });

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Yuklanmoqda...</div>;

  return (
    <div>
      <div className="header-container">
        <div className="logo-text">REKLAMACHI BOT</div>
        <div className="admin-badge">
          <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--neon-green)', borderRadius: '50%', marginRight: 6, boxShadow: '0 0 5px var(--neon-green)' }}></span>
          Admin
        </div>
      </div>

      <div className="main-glass-panel">
        <h2 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Boshqaruv Paneli</h2>
        
        <div className="tabs-container">
          <div className={`tab-btn ${activeTab === 'tolovlar' ? 'active' : ''}`} onClick={() => setActiveTab('tolovlar')}>
            <CreditCard size={24} />
            <span>To'lovlar</span>
          </div>
          <div className={`tab-btn ${activeTab === 'xabarnoma' ? 'active' : ''}`} onClick={() => setActiveTab('xabarnoma')}>
            <Send size={24} />
            <span>Sozlamalar</span>
          </div>
          <div className={`tab-btn ${activeTab === 'kanal' ? 'active' : ''}`} onClick={() => setActiveTab('kanal')}>
            <PlusSquare size={24} />
            <span>Kanal +</span>
          </div>
          <div className={`tab-btn ${activeTab === 'foydalanuvchilar' ? 'active' : ''}`} onClick={() => setActiveTab('foydalanuvchilar')}>
            <Users size={24} />
            <span>A'zolar</span>
          </div>
          <div className={`tab-btn ${activeTab === 'statistika' ? 'active' : ''}`} onClick={() => setActiveTab('statistika')}>
            <BarChart2 size={24} />
            <span>Statistika</span>
          </div>
        </div>

        {/* TOLOVLAR TAB */}
        {activeTab === 'tolovlar' && (
          <div>
            <div className="section-title">
              To'lovlar va Reklamalar <span style={{ fontSize: 14, color: 'var(--neon-cyan)' }}>{filteredAds.length} ta</span>
            </div>
            
            <div className="filter-container">
              <div className={`filter-chip ${filter === 'Kutayotgan' ? 'active' : ''}`} onClick={() => setFilter('Kutayotgan')}><Clock size={14}/> Kutayotgan</div>
              <div className={`filter-chip ${filter === 'Tasdiqlangan' ? 'active' : ''}`} onClick={() => setFilter('Tasdiqlangan')}><CheckCircle2 size={14} color="var(--neon-green)"/> Tasdiqlangan</div>
              <div className={`filter-chip ${filter === 'Bekor' ? 'active' : ''}`} onClick={() => setFilter('Bekor')}><XCircle size={14} color="var(--neon-red)"/> Bekor</div>
              <div className={`filter-chip ${filter === 'Hammasi' ? 'active' : ''}`} onClick={() => setFilter('Hammasi')}>Hammasi</div>
            </div>

            <div className="ads-list">
              {filteredAds.map(ad => (
                <div key={ad.id} className="inner-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: 15, marginBottom: 4 }}>{ad.user?.firstName || 'User'} (@{ad.user?.username || 'user'})</h4>
                      <div className="amount">{(ad.channel?.adPrice || 0).toLocaleString()} UZS</div>
                      <div className="meta">Kanal: {ad.channel?.title || 'Noma\'lum'}</div>
                      <div className="meta" style={{ fontSize: 11 }}>{new Date(ad.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      {ad.status === 'POSTED' && <CheckCircle2 color="var(--neon-green)" />}
                      {ad.status === 'WAITING_CONTENT' && <Clock color="var(--neon-orange)" />}
                      {ad.status === 'DELETED' && <XCircle color="var(--neon-red)" />}
                    </div>
                  </div>
                  
                  {/* Decorative glowing background icon */}
                  <div style={{ position: 'absolute', right: '10%', top: '20%', opacity: 0.05, transform: 'scale(3)' }}>
                    <CreditCard size={40} />
                  </div>
                </div>
              ))}
              {filteredAds.length === 0 && <p style={{ textAlign: 'center', marginTop: 20 }}>Ma'lumot topilmadi</p>}
            </div>
          </div>
        )}

        {/* XABARNOMA / SOZLAMALAR TAB */}
        {activeTab === 'xabarnoma' && (
          <div>
            <div className="section-title">Asosiy Sozlamalar</div>
            <div className="inner-card">
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Karta Raqami (To'lovlar uchun)</label>
              <input 
                value={settings.cardNumber || ''} 
                onChange={e => setSettings({...settings, cardNumber: e.target.value})} 
                placeholder="8600 1234 5678 9012"
              />
              
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>To'lov Bildirishnomasi Kanal ID</label>
              <input 
                value={settings.paymentChannelId || ''} 
                onChange={e => setSettings({...settings, paymentChannelId: e.target.value})} 
                placeholder="-1001234567890"
              />
              
              <button className="btn btn-neon" onClick={saveSettings} style={{ marginTop: 10 }}>Saqlash</button>
            </div>
          </div>
        )}

        {/* KANAL + TAB */}
        {activeTab === 'kanal' && (
          <div>
            <div className="section-title">Kanal Qo'shish</div>
            <div className="inner-card">
              <form onSubmit={addChannel}>
                <input required placeholder="Kanal ID (masalan: -100...)" value={newChannel.id} onChange={e => setNewChannel({...newChannel, id: e.target.value})} />
                <input required placeholder="Kanal Nomi" value={newChannel.title} onChange={e => setNewChannel({...newChannel, title: e.target.value})} />
                <textarea placeholder="Tavsif (ixtiyoriy)" value={newChannel.description} onChange={e => setNewChannel({...newChannel, description: e.target.value})} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input required type="number" placeholder="Reklama Narxi (UZS)" value={newChannel.adPrice} onChange={e => setNewChannel({...newChannel, adPrice: e.target.value})} />
                  <input required type="number" placeholder="Obunachilar soni" value={newChannel.membersCount} onChange={e => setNewChannel({...newChannel, membersCount: e.target.value})} />
                </div>
                <button className="btn btn-neon" type="submit" style={{ marginTop: 10 }}><Plus size={18} /> Qo'shish</button>
              </form>
            </div>

            <div className="section-title" style={{ marginTop: 30 }}>Barcha Kanallar ({channels.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {channels.map((ch: any) => (
                <div key={ch.id} className="inner-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{ch.title}</h3>
                    <p style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-muted)' }}>ID: {ch.id}</p>
                    <p style={{ margin: 0, color: 'var(--neon-orange)', fontWeight: 600 }}>{ch.adPrice.toLocaleString()} UZS</p>
                  </div>
                  <button 
                    onClick={() => deleteChannel(ch.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', padding: 10 }}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOYDALANUVCHILAR TAB */}
        {activeTab === 'foydalanuvchilar' && (
          <div>
            <div className="section-title">Foydalanuvchilar</div>
            <div className="inner-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Users size={48} color="var(--neon-cyan)" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 36, margin: 0 }}>{stats.totalUsers || 0}</h2>
              <p style={{ color: 'var(--text-muted)' }}>Botdan ro'yxatdan o'tgan barcha foydalanuvchilar soni</p>
            </div>
          </div>
        )}

        {/* STATISTIKA TAB */}
        {activeTab === 'statistika' && (
          <div>
            <div className="section-title">Umumiy Statistika</div>
            <div className="inner-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 16, background: 'rgba(0, 243, 255, 0.1)', borderRadius: '50%' }}>
                <CreditCard color="var(--neon-cyan)" size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Umumiy Daromad</p>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: 24 }}>{(stats.revenue || 0).toLocaleString()} UZS</h2>
              </div>
            </div>
            
            <div className="inner-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 16, background: 'rgba(0, 255, 136, 0.1)', borderRadius: '50%' }}>
                <Send color="var(--neon-green)" size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Faol Reklamalar</p>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: 24 }}>{stats.activeAds || 0} ta</h2>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

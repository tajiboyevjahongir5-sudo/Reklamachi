import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Send, PlusSquare, Users, BarChart2, CheckCircle2, XCircle, Clock, Trash2, Plus, Bell } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const initData = (window as any).Telegram?.WebApp?.initData || 'query_id=mock';

type Tab = 'tolovlar' | 'bildirishnoma' | 'xabarnoma' | 'kanal' | 'foydalanuvchilar' | 'statistika';
type Filter = 'Kutayotgan' | 'Tasdiqlangan' | 'Bekor' | 'Hammasi';

const CATEGORIES = ["Ta'lim", 'Texnologiya', 'Kino', 'Biznes', 'Sport', 'Yangiliklar', 'Boshqa'];

// Toggle Switch component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 52, height: 28, borderRadius: 14, position: 'relative', cursor: 'pointer',
        background: checked
          ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))'
          : 'rgba(255,255,255,0.1)',
        border: checked ? 'none' : '1px solid rgba(255,255,255,0.15)',
        transition: 'all 0.3s',
        boxShadow: checked ? '0 0 10px rgba(0,243,255,0.4)' : 'none',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 27 : 3,
        width: 22, height: 22, borderRadius: '50%', background: 'white',
        transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
      }} />
    </div>
  );
}

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<Tab>('tolovlar');
  const [filter, setFilter] = useState<Filter>('Hammasi');

  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [ads, setAds] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newChannel, setNewChannel] = useState({ id: '', title: '', description: '', category: 'Texnologiya', adPrice: '', membersCount: '', dailyViews: '', inviteLink: '' });

  const fetchAdminData = async () => {
    try {
      const headers = { 'x-telegram-init-data': initData };
      const [statsRes, channelsRes, settingsRes, adsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_URL}/api/channels`, { headers }),
        axios.get(`${API_URL}/api/admin/settings`, { headers }),
        axios.get(`${API_URL}/api/admin/ads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/admin/users`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setChannels(channelsRes.data);
      setSettings(settingsRes.data);
      setAds(adsRes.data);
      setUsers(usersRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Siz admin emassiz yoki tizim xatosi.');
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

  const addChannel = async (e: any) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/channels`, newChannel, { headers: { 'x-telegram-init-data': initData } });
      setNewChannel({ id: '', title: '', description: '', category: 'Texnologiya', adPrice: '', membersCount: '', dailyViews: '', inviteLink: '' });
      fetchAdminData();
    } catch { alert('Xatolik'); }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm("Ishonchingiz komilmi?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/channels/${id}`, { headers: { 'x-telegram-init-data': initData } });
      fetchAdminData();
    } catch { alert('Xatolik'); }
  };

  const saveSettings = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/settings`, settings, { headers: { 'x-telegram-init-data': initData } });
      alert("Sozlamalar saqlandi!");
    } catch { alert('Xatolik'); }
  };

  const filteredAds = ads.filter(ad => {
    if (filter === 'Hammasi') return true;
    if (filter === 'Kutayotgan') return ad.status === 'WAITING_CONTENT' || ad.status === 'PENDING';
    if (filter === 'Tasdiqlangan') return ad.status === 'POSTED';
    if (filter === 'Bekor') return ad.status === 'DELETED' || ad.status === 'CANCELLED';
    return true;
  });

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Yuklanmoqda...</div>;

  const TABS = [
    { key: 'tolovlar',        icon: <CreditCard size={20} />,  label: "To'lovlar" },
    { key: 'bildirishnoma',   icon: <Bell size={20} />,        label: "Bildirishnomalar" },
    { key: 'xabarnoma',       icon: <Send size={20} />,        label: "Sozlamalar" },
    { key: 'kanal',           icon: <PlusSquare size={20} />,  label: "Kanal +" },
    { key: 'foydalanuvchilar',icon: <Users size={20} />,       label: "A'zolar" },
    { key: 'statistika',      icon: <BarChart2 size={20} />,   label: "Statistika" },
  ];

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

        {/* Tabs - 3+3 grid on small screens */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {TABS.map(tab => (
            <div
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              style={{ minWidth: 'unset', flex: 'unset', padding: '10px 6px', fontSize: 11 }}
              onClick={() => setActiveTab(tab.key as Tab)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          ))}
        </div>

        {/* ---- TO'LOVLAR TAB ---- */}
        {activeTab === 'tolovlar' && (
          <div>
            <div className="section-title">
              To'lovlar va Reklamalar <span style={{ fontSize: 14, color: 'var(--neon-cyan)' }}>{filteredAds.length} ta</span>
            </div>
            <div className="filter-container">
              {(['Kutayotgan', 'Tasdiqlangan', 'Bekor', 'Hammasi'] as Filter[]).map(f => (
                <div key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'Kutayotgan' && <Clock size={13} />}
                  {f === 'Tasdiqlangan' && <CheckCircle2 size={13} color="var(--neon-green)" />}
                  {f === 'Bekor' && <XCircle size={13} color="var(--neon-red)" />}
                  {f}
                </div>
              ))}
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
                </div>
              ))}
              {filteredAds.length === 0 && <p style={{ textAlign: 'center', marginTop: 20 }}>Ma'lumot topilmadi</p>}
            </div>
          </div>
        )}

        {/* ---- BILDIRISHNOMALAR TAB ---- */}
        {activeTab === 'bildirishnoma' && (
          <div>
            <div className="section-title">Bildirishnomalar</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Qaysi hodisalar haqida bildirishnoma olishni tanlang:
            </p>

            <div className="inner-card" style={{ padding: '4px 0' }}>
              {/* Notify new payment */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Yangi To'lov Haqida</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Mijoz to'lov o'tkazganida xabar keladi</div>
                </div>
                <Toggle
                  checked={settings.notifyNewPayment ?? true}
                  onChange={v => setSettings({ ...settings, notifyNewPayment: v })}
                />
              </div>

              {/* Notify new user */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Yangi A'zo Haqida</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Yangi foydalanuvchi botga kirganida xabar keladi</div>
                </div>
                <Toggle
                  checked={settings.notifyNewUser ?? true}
                  onChange={v => setSettings({ ...settings, notifyNewUser: v })}
                />
              </div>

              {/* Notify ad posted */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Reklama Joylashtirilganda</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reklama kanalga joylashtirilganida xabar keladi</div>
                </div>
                <Toggle
                  checked={settings.notifyAdPosted ?? true}
                  onChange={v => setSettings({ ...settings, notifyAdPosted: v })}
                />
              </div>
            </div>

            <button className="btn btn-neon" onClick={saveSettings} style={{ marginTop: 16 }}>
              Saqlash
            </button>

            <div style={{ marginTop: 20, padding: 14, background: 'rgba(0,243,255,0.04)', borderRadius: 12, border: '1px solid rgba(0,243,255,0.15)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                ℹ️ Bildirishnomalar siz ko'rsatgan <strong style={{ color: 'var(--text-main)' }}>To'lov Kanali ID</strong> ga yuboriladi. Sozlamalar bo'limida ID ni to'g'ri kiriting.
              </p>
            </div>
          </div>
        )}

        {/* ---- SOZLAMALAR TAB ---- */}
        {activeTab === 'xabarnoma' && (
          <div>
            <div className="section-title">Asosiy Sozlamalar</div>
            <div className="inner-card">
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Karta Raqami</label>
              <input value={settings.cardNumber || ''} onChange={e => setSettings({ ...settings, cardNumber: e.target.value })} placeholder="8600 1234 5678 9012" />

              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Karta Egasi (Ism Familiya)</label>
              <input value={settings.cardOwnerName || ''} onChange={e => setSettings({ ...settings, cardOwnerName: e.target.value })} placeholder="Palonchiyev Pistonchi" />

              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>To'lov Bildirishnomasi Kanal ID</label>
              <input value={settings.paymentChannelId || ''} onChange={e => setSettings({ ...settings, paymentChannelId: e.target.value })} placeholder="-1001234567890" />

              <button className="btn btn-neon" onClick={saveSettings} style={{ marginTop: 10 }}>Saqlash</button>
            </div>
          </div>
        )}

        {/* ---- KANAL + TAB ---- */}
        {activeTab === 'kanal' && (
          <div>
            <div className="section-title">Kanal Qo'shish</div>
            <div className="inner-card">
              <form onSubmit={addChannel}>
                <input required placeholder="Kanal ID (masalan: -100...)" value={newChannel.id} onChange={e => setNewChannel({ ...newChannel, id: e.target.value })} />
                <input required placeholder="Kanal Nomi" value={newChannel.title} onChange={e => setNewChannel({ ...newChannel, title: e.target.value })} />
                <textarea placeholder="Tavsif (ixtiyoriy)" value={newChannel.description} onChange={e => setNewChannel({ ...newChannel, description: e.target.value })} />

                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-muted)' }}>Kategoriya</label>
                <select value={newChannel.category} onChange={e => setNewChannel({ ...newChannel, category: e.target.value })} style={{ marginBottom: 12 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <input required type="number" placeholder="Reklama Narxi (UZS)" value={newChannel.adPrice} onChange={e => setNewChannel({ ...newChannel, adPrice: e.target.value })} />
                  <input required type="number" placeholder="Obunachilar soni" value={newChannel.membersCount} onChange={e => setNewChannel({ ...newChannel, membersCount: e.target.value })} />
                </div>
                <input required type="number" placeholder="1 kunlik ko'rilish soni (View)" value={newChannel.dailyViews} onChange={e => setNewChannel({ ...newChannel, dailyViews: e.target.value })} />
                <input placeholder="Kanal linki (masalan: https://t.me/...)" value={newChannel.inviteLink} onChange={e => setNewChannel({ ...newChannel, inviteLink: e.target.value })} />

                <button className="btn btn-neon" type="submit" style={{ marginTop: 10 }}><Plus size={18} /> Qo'shish</button>
              </form>
            </div>

            <div className="section-title" style={{ marginTop: 30 }}>Barcha Kanallar ({channels.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {channels.map((ch: any) => (
                <div key={ch.id} className="inner-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{ch.title}</h3>
                    <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--text-muted)' }}>{ch.category} · ID: {ch.id.slice(0, 14)}…</p>
                    <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--text-muted)' }}>View: {ch.dailyViews || 0}</p>
                    <p style={{ margin: 0, color: 'var(--neon-orange)', fontWeight: 600 }}>{ch.adPrice.toLocaleString()} UZS</p>
                  </div>
                  <button onClick={() => deleteChannel(ch.id)} style={{ background: 'transparent', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', padding: 10 }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- A'ZOLAR TAB ---- */}
        {activeTab === 'foydalanuvchilar' && (
          <div>
            <div className="section-title">
              A'zolar Ro'yxati <span style={{ fontSize: 14, color: 'var(--neon-cyan)' }}>{users.length} ta</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users.map((u: any) => (
                <div key={u.id} className="inner-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 'bold', color: 'white',
                    boxShadow: '0 0 10px rgba(0,243,255,0.3)'
                  }}>
                    {(u.firstName || u.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.firstName || 'User'}</h4>
                    <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--text-muted)' }}>{u.username ? `@${u.username}` : `ID: ${u.id}`}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>📞 {u.phoneNumber || 'Kiritilmagan'}</p>
                  </div>
                  <a href={u.username ? `https://t.me/${u.username}` : `tg://user?id=${u.id}`} target="_blank" rel="noreferrer"
                    className="btn btn-neon" style={{ width: 'auto', padding: '8px 12px', fontSize: 12, borderRadius: 8, flexShrink: 0 }}>
                    Profil
                  </a>
                </div>
              ))}
              {users.length === 0 && <p style={{ textAlign: 'center' }}>Hali foydalanuvchilar yo'q</p>}
            </div>
          </div>
        )}

        {/* ---- STATISTIKA TAB ---- */}
        {activeTab === 'statistika' && (
          <div>
            <div className="section-title">Umumiy Statistika</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div className="inner-card" style={{ textAlign: 'center', padding: '16px 10px' }}>
                <Users color="var(--neon-cyan)" size={28} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 26, fontWeight: 800 }}>{stats.totalUsers || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>A'zolar</div>
              </div>
              <div className="inner-card" style={{ textAlign: 'center', padding: '16px 10px' }}>
                <Send color="var(--neon-green)" size={28} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 26, fontWeight: 800 }}>{stats.activeAds || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faol Reklama</div>
              </div>
            </div>
            <div className="inner-card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <CreditCard color="var(--neon-orange)" size={32} />
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Umumiy Daromad</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--neon-orange)' }}>{(stats.revenue || 0).toLocaleString()} UZS</div>
              </div>
            </div>

            <div className="section-title">Kanal bo'yicha</div>
            {stats.channelStats?.map((ch: any) => (
              <div key={ch.id} className="inner-card" style={{ marginBottom: 10 }}>
                <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 8 }}>{ch.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Daromad:</span>
                  <strong>{ch.revenue.toLocaleString()} UZS</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Faol Reklama:</span>
                  <strong>{ch.activeAds} ta</strong>
                </div>
              </div>
            ))}
            {(!stats.channelStats || stats.channelStats.length === 0) && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Kanal ma'lumotlari yo'q</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

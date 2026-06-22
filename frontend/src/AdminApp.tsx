import { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

// Mock init data for local dev
const initData = (window as any).Telegram?.WebApp?.initData || 'query_id=mock';

export default function AdminApp() {
  const [stats, setStats] = useState<any>({});
  const [channels, setChannels] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Form states
  const [newChannel, setNewChannel] = useState({ id: '', title: '', description: '', adPrice: '', membersCount: '' });

  const fetchAdminData = async () => {
    try {
      const headers = { 'x-telegram-init-data': initData };
      const [statsRes, channelsRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers }),
        axios.get(`${API_URL}/api/channels`, { headers }),
        axios.get(`${API_URL}/api/admin/settings`, { headers })
      ]);
      setStats(statsRes.data);
      setChannels(channelsRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Siz admin emassiz yoki tizim xatosi.');
    }
  };

  useEffect(() => {
    fetchAdminData();
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

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Yuklanmoqda...</div>;

  return (
    <div>
      <h1>Boshqaruv Paneli</h1>
      
      <div className="grid" style={{ marginBottom: '40px' }}>
        <div className="stat-box">
          <h3>Foydalanuvchilar</h3>
          <p>{stats.totalUsers || 0}</p>
        </div>
        <div className="stat-box">
          <h3>Umumiy Daromad</h3>
          <p>{(stats.revenue || 0).toLocaleString()} UZS</p>
        </div>
        <div className="stat-box">
          <h3>Faol Reklamalar</h3>
          <p>{stats.activeAds || 0}</p>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Asosiy Sozlamalar</h2>
        <div className="glass-card">
          <label>Karta Raqami (To'lovlar uchun)</label>
          <input 
            value={settings.cardNumber || ''} 
            onChange={e => setSettings({...settings, cardNumber: e.target.value})} 
            placeholder="8600 1234 5678 9012"
          />
          <label>To'lov Bildirishnomasi Kanal ID (Bot admin bo'lishi shart!)</label>
          <input 
            value={settings.paymentChannelId || ''} 
            onChange={e => setSettings({...settings, paymentChannelId: e.target.value})} 
            placeholder="-1001234567890"
          />
          <button className="btn" onClick={saveSettings}>Saqlash</button>
        </div>
      </div>

      <div>
        <h2>Kanallar ({channels.length})</h2>
        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <h3>Yangi kanal qo'shish</h3>
          <form onSubmit={addChannel}>
            <input required placeholder="Kanal ID (masalan: -100...)" value={newChannel.id} onChange={e => setNewChannel({...newChannel, id: e.target.value})} />
            <input required placeholder="Kanal Nomi" value={newChannel.title} onChange={e => setNewChannel({...newChannel, title: e.target.value})} />
            <textarea placeholder="Tavsif (ixtiyoriy)" value={newChannel.description} onChange={e => setNewChannel({...newChannel, description: e.target.value})} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input required type="number" placeholder="Reklama Narxi (UZS)" value={newChannel.adPrice} onChange={e => setNewChannel({...newChannel, adPrice: e.target.value})} />
              <input required type="number" placeholder="Obunachilar soni" value={newChannel.membersCount} onChange={e => setNewChannel({...newChannel, membersCount: e.target.value})} />
            </div>
            <button className="btn" type="submit"><Plus size={18} /> Qo'shish</button>
          </form>
        </div>

        <div className="grid">
          {channels.map((ch: any) => (
            <div key={ch.id} className="glass-card" style={{ position: 'relative' }}>
              <button 
                onClick={() => deleteChannel(ch.id)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}
              >
                <Trash2 size={20} />
              </button>
              <h3>{ch.title}</h3>
              <p style={{ margin: 0 }}>ID: {ch.id}</p>
              <p style={{ margin: 0 }}>Narx: {ch.adPrice.toLocaleString()} UZS</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

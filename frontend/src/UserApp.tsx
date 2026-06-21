import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Users, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Assuming we get the initData from Telegram Web App
const initData = (window as any).Telegram?.WebApp?.initData || '';
const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789'; // For local testing
const userId = tgUser?.id || MOCK_USER_ID;

export default function UserApp() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ cardNumber: '' });

  useEffect(() => {
    // Notify Telegram that the app is ready
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready();
      (window as any).Telegram.WebApp.expand();
    }

    Promise.all([
      axios.get(`${API_URL}/api/channels`),
      axios.get(`${API_URL}/api/settings`)
    ]).then(([channelsRes, settingsRes]) => {
      setChannels(channelsRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleBuy = async (channel: any) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/create-payment`, {
        channelId: channel.id,
        userId: userId
      });
      setPaymentData(res.data.payment);
      setSelectedChannel(channel);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
      setLoading(false);
    }
  };

  if (loading && !channels.length) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Yuklanmoqda...</div>;

  return (
    <div>
      <h1>Kanallar Ro'yxati</h1>
      <p style={{ textAlign: 'center' }}>Qaysi kanalga reklama berishni xohlaysiz?</p>
      
      <div className="grid">
        {channels.map((ch: any) => (
          <div key={ch.id} className="glass-card">
            <span className="badge">Avto-o'chish: 24 soat</span>
            <h2>{ch.title}</h2>
            <p>{ch.description || "Tavsif kiritilmagan"}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <Users size={16} />
                <span>{ch.membersCount.toLocaleString()} obunachi</span>
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {ch.adPrice.toLocaleString()} UZS
              </div>
            </div>
            
            <button className="btn" onClick={() => handleBuy(ch)} disabled={loading}>
              <Send size={18} /> Sotib olish
            </button>
          </div>
        ))}
      </div>

      {selectedChannel && paymentData && (
        <div className="modal-overlay" onClick={() => setSelectedChannel(null)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: '0 auto', display: 'block', marginBottom: '10px' }} />
              <h2 style={{ marginBottom: '4px' }}>To'lov qilish</h2>
              <p style={{ margin: 0 }}>To'lov tizimimiz avtomatlashtirilgan.</p>
            </div>
            
            <div style={{ background: 'var(--glass-bg)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Karta raqami (nusxalash uchun bosing):</p>
              <h2 
                style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }}
                onClick={() => {
                  navigator.clipboard.writeText(settings.cardNumber);
                  alert('Karta raqami nusxalandi!');
                }}
              >
                {settings.cardNumber || 'Karta raqami yo\'q'}
              </h2>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }}>⚠️ DIQQAT!</p>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                To'lovni tasdiqlash uchun <b>XUDDI SHU SUMMANI</b> o'tkazishingiz shart. Aks holda tizim sizni tanimaydi!
              </p>
              <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {paymentData.amount.toLocaleString()} UZS
              </div>
            </div>

            <button className="btn" onClick={() => {
               if ((window as any).Telegram?.WebApp) {
                 (window as any).Telegram.WebApp.close();
               } else {
                 setSelectedChannel(null);
               }
            }}>
              To'lov qildim (Yopish)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

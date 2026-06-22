import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Users, CheckCircle2, Eye, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789'; // For local testing
const userId = tgUser?.id || MOCK_USER_ID;

export default function UserApp() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ cardNumber: '', cardOwnerName: '' });

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
    <div style={{ paddingBottom: '20px' }}>
      <div className="header-container" style={{ justifyContent: 'center', marginBottom: 30 }}>
        <div className="logo-text" style={{ fontSize: 28, textAlign: 'center' }}>REKLAMA MARKAZI</div>
      </div>
      
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 20 }}>
        Qaysi kanalga reklama berishni xohlaysiz?
      </p>
      
      <div className="grid">
        {channels.map((ch: any) => (
          <div key={ch.id} className="inner-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ color: 'var(--neon-cyan)', fontSize: 20, margin: '0 0 8px 0' }}>{ch.title}</h3>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 12, color: 'var(--text-muted)' }}>
                24 soat (Avto)
              </span>
            </div>
            
            <p style={{ color: 'var(--text-main)', fontSize: 14, marginBottom: 16 }}>
              {ch.description || "Tavsif kiritilmagan"}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
                <Users size={16} color="var(--neon-magenta)" />
                <span>{ch.membersCount.toLocaleString()} obunachi</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
                <Eye size={16} color="var(--neon-green)" />
                <span>~ {ch.dailyViews?.toLocaleString() || 0} ta (1 kunlik view)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--neon-orange)', fontSize: 22 }}>
                {ch.adPrice.toLocaleString()} UZS
              </div>
              <button 
                className="btn btn-neon" 
                style={{ width: 'auto', padding: '10px 20px', borderRadius: 20 }}
                onClick={() => handleBuy(ch)} 
                disabled={loading}
              >
                <Send size={18} /> Sotib olish
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedChannel && paymentData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={() => setSelectedChannel(null)}>
          <div className="main-glass-panel" style={{ width: '100%', maxWidth: 400, animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <CheckCircle2 size={56} color="var(--neon-green)" style={{ margin: '0 auto', display: 'block', marginBottom: 10, filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
              <h2 style={{ color: 'var(--text-main)', fontSize: 24, margin: '0 0 8px 0' }}>To'lov qilish</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>To'lov tizimimiz to'liq avtomatlashtirilgan.</p>
            </div>
            
            <div className="inner-card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 8px 0', fontSize: 13 }}>Karta raqami (nusxalash uchun bosing):</p>
              <h2 
                style={{ margin: '0 0 8px 0', fontFamily: 'monospace', letterSpacing: 2, cursor: 'pointer', color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0, 243, 255, 0.3)' }}
                onClick={() => {
                  navigator.clipboard.writeText(settings.cardNumber);
                  alert('Karta raqami nusxalandi!');
                }}
              >
                {settings.cardNumber || 'Karta raqami yo\'q'}
              </h2>
              {settings.cardOwnerName && (
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 15, fontWeight: 500 }}>
                  Egasi: {settings.cardOwnerName}
                </p>
              )}
            </div>

            <div className="inner-card" style={{ borderColor: 'var(--neon-red)', background: 'rgba(255, 51, 102, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--neon-red)', fontWeight: 'bold' }}>
                <Info size={18} /> DIQQAT!
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5 }}>
                To'lovni avtomat tasdiqlashi uchun <b>XUDDI SHU SUMMANI</b> o'tkazishingiz shart. Bir tiyin kam yoki ko'p bo'lsa ham tizim sizni tanimaydi!
              </p>
              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 28, fontWeight: 'bold', color: 'var(--neon-orange)', textShadow: '0 0 10px rgba(255, 153, 0, 0.3)' }}>
                {paymentData.amount.toLocaleString()} UZS
              </div>
            </div>

            <button className="btn btn-neon" style={{ marginTop: 10, height: 50, fontSize: 16 }} onClick={() => {
               if ((window as any).Telegram?.WebApp) {
                 (window as any).Telegram.WebApp.close();
               } else {
                 setSelectedChannel(null);
               }
            }}>
              <CheckCircle2 size={20} /> To'lov qildim (Yopish)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

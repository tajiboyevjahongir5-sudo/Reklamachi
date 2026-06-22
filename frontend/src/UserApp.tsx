import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Send, Users, CheckCircle2, Eye, Info, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789';
const userId = tgUser?.id || MOCK_USER_ID;

const CATEGORIES = ['Hammasi', 'Texnologiya', "Ta'lim", 'Kino', 'Biznes', 'Sport', 'Yangiliklar', 'Boshqa'];

// Generate a stable color + icon for each channel based on first letter
const CHANNEL_COLORS: Record<string, string> = {
  T: 'linear-gradient(135deg, #0088cc, #00bfff)',
  X: 'linear-gradient(135deg, #ff6b35, #ff4500)',
  Y: 'linear-gradient(135deg, #ff0000, #cc0000)',
  I: 'linear-gradient(135deg, #c13584, #833ab4)',
  D: 'linear-gradient(135deg, #26a5e4, #1c7ab5)',
  A: 'linear-gradient(135deg, #00c851, #007e33)',
  default: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
};

function getChannelGradient(title: string) {
  const first = (title[0] || 'A').toUpperCase();
  return CHANNEL_COLORS[first] || CHANNEL_COLORS['default'];
}

export default function UserApp() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ cardNumber: '', cardOwnerName: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Hammasi');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
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

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      const matchCat = activeCategory === 'Hammasi' || ch.category === activeCategory;
      const matchSearch = ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [channels, activeCategory, searchQuery]);

  const handleBuy = async (channel: any) => {
    try {
      setBuying(true);
      const res = await axios.post(`${API_URL}/api/create-payment`, {
        channelId: channel.id,
        userId: userId,
        username: tgUser?.username || '',
        firstName: tgUser?.first_name || 'Foydalanuvchi'
      });
      setPaymentData(res.data.payment);
      setSelectedChannel(channel);
      setBuying(false);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      setBuying(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom: 30, maxWidth: 480, margin: '0 auto' }}>

      {/* ======= COMPACT HEADER ======= */}
      <div style={{ padding: '16px 16px 10px', position: 'relative' }}>
        {/* Glow blob — subtle, small */}
        <div style={{
          position: 'absolute', top: 0, right: 20,
          width: 120, height: 60,
          background: 'radial-gradient(ellipse, rgba(217,0,255,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h1 style={{
          fontSize: 22, fontWeight: 800, margin: '0 0 2px 0',
          background: 'linear-gradient(90deg, var(--neon-cyan) 0%, #fff 45%, var(--neon-magenta) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.3px',
        }}>
          Kanallar Katalogi
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
          Reklama uchun kanal tanlang
        </p>
      </div>

      {/* ======= SEARCH BAR — slim ======= */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,243,255,0.2)',
          borderRadius: 12, padding: '9px 13px',
          boxShadow: '0 0 14px rgba(0,243,255,0.06)',
        }}>
          <Search size={15} color="rgba(0,243,255,0.7)" style={{ flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Izlash..."
            style={{
              background: 'transparent', border: 'none', outline: 'none', margin: 0,
              color: 'var(--text-main)', fontSize: 13, width: '100%', fontFamily: 'Inter, sans-serif',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-muted)',
              width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, flexShrink: 0, padding: 0,
            }}>✕</button>
          )}
        </div>
      </div>

      {/* ======= CATEGORY PILLS — compact ======= */}
      <div style={{
        display: 'flex', gap: 6, padding: '0 16px 14px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: 20, fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: isActive
                  ? 'linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-magenta) 100%)'
                  : 'rgba(255,255,255,0.04)',
                color: isActive ? '#050510' : 'var(--text-muted)',
                boxShadow: isActive ? '0 0 10px rgba(0,243,255,0.45)' : 'none',
              }}
            >{cat}</button>
          );
        })}
      </div>

      {/* Channel List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredChannels.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            Kanal topilmadi
          </p>
        )}
        {filteredChannels.map((ch: any) => (
          <div key={ch.id} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            borderRadius: 18,
            padding: 16,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s',
          }}>
            {/* Channel Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                background: getChannelGradient(ch.title),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 'bold', color: 'white',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}>
                {ch.title[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-main)' }}>
                  {ch.title}
                </h3>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                    <Users size={12} /> {(ch.membersCount || 0).toLocaleString()}k obunachi
                  </span>
                </div>
              </div>
              <div style={{
                background: 'rgba(255,153,0,0.15)', border: '1px solid rgba(255,153,0,0.3)',
                borderRadius: 10, padding: '6px 10px', textAlign: 'right'
              }}>
                <div style={{ color: 'var(--neon-orange)', fontWeight: 800, fontSize: 15 }}>
                  {(ch.adPrice || 0).toLocaleString()}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>UZS</div>
              </div>
            </div>

            {/* Description */}
            {ch.description && (
              <p style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {ch.description}
              </p>
            )}

            {/* Stats Row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <Eye size={12} color="var(--neon-green)" />
                {(ch.dailyViews || 0).toLocaleString()} view/kun
              </span>
              <span style={{
                fontSize: 11, background: 'rgba(0,243,255,0.1)', color: 'var(--neon-cyan)',
                padding: '2px 8px', borderRadius: 8, border: '1px solid rgba(0,243,255,0.2)'
              }}>
                {ch.category || 'Boshqa'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱ 24 soat</span>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => handleBuy(ch)}
              disabled={buying}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                background: 'rgba(0,243,255,0.1)',
                border: '1px solid rgba(0,243,255,0.4)',
                color: 'var(--neon-cyan)', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,243,255,0.2)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,243,255,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,243,255,0.1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <Send size={16} /> Batafsil / Sotib olish
            </button>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {selectedChannel && paymentData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setSelectedChannel(null)}>
          <div
            style={{
              background: 'rgba(15,15,25,0.98)',
              border: '1px solid var(--glass-border)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 36px',
              width: '100%',
              maxWidth: 480,
              animation: 'slideUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }}></div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <CheckCircle2 size={56} color="var(--neon-green)"
                style={{ display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
              <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>To'lov Ma'lumotlari</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                {selectedChannel.title} uchun reklama
              </p>
            </div>

            {/* Card info */}
            <div style={{
              background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.2)',
              borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>
                Karta raqami (bosing — nusxalanadi):
              </p>
              <h2
                style={{
                  margin: '0 0 6px', fontFamily: 'monospace', fontSize: 20,
                  letterSpacing: 2, cursor: 'pointer', color: 'var(--neon-cyan)',
                  textShadow: '0 0 10px rgba(0,243,255,0.3)'
                }}
                onClick={() => {
                  navigator.clipboard.writeText(settings.cardNumber);
                  alert('Karta raqami nusxalandi!');
                }}
              >
                {settings.cardNumber || '—'}
              </h2>
              {settings.cardOwnerName && (
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14 }}>
                  {settings.cardOwnerName}
                </p>
              )}
            </div>

            {/* Warning */}
            <div style={{
              background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)',
              borderRadius: 14, padding: 14, marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--neon-red)', fontWeight: 700, marginBottom: 6 }}>
                <Info size={16} /> DIQQAT!
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
                To'lovni avtomatik tasdiqlash uchun <strong>AYNAN SHU SUMMANI</strong> o'tkazing. Bir tiyin farq ham bo'lsa tizim tanimaydi!
              </p>
              <div style={{ textAlign: 'center', fontSize: 30, fontWeight: 800, color: 'var(--neon-orange)' }}>
                {paymentData.amount.toLocaleString()} UZS
              </div>
            </div>

            <button
              style={{
                width: '100%', padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
                border: 'none', color: '#000', fontWeight: 800, fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
              onClick={() => {
                if ((window as any).Telegram?.WebApp) {
                  (window as any).Telegram.WebApp.close();
                } else {
                  setSelectedChannel(null);
                }
              }}
            >
              <CheckCircle2 size={20} /> To'lov qildim — Yopish
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

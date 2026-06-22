import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Send, Users, CheckCircle2, Eye, Info, Search, Plus, X, Wallet, ArrowDownCircle, TrendingUp } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789';
const userId = tgUser?.id || MOCK_USER_ID;

const CATEGORIES = ['Hammasi', 'Texnologiya', "Ta'lim", 'Kino', 'Biznes', 'Sport', 'Yangiliklar', 'Boshqa'];
const MAX_CHANNELS = 5;

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

// ======= MODAL STEP TYPES =======
type ModalStep = 'main' | 'payment' | 'form' | 'withdraw' | 'withdraw-success';

export default function UserApp() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ cardNumber: '', cardOwnerName: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Hammasi');
  const [buying, setBuying] = useState(false);

  // Add Channel Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('main');
  const [myChannels, setMyChannels] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState(0);
  const [hasUnusedPayment, setHasUnusedPayment] = useState(false);
  const [channelPaymentData, setChannelPaymentData] = useState<any>(null);
  const [loadingMyChannels, setLoadingMyChannels] = useState(false);

  // Channel Form
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Boshqa');
  const [formPrice, setFormPrice] = useState('');
  const [formMembers, setFormMembers] = useState('');
  const [formViews, setFormViews] = useState('');
  const [formInvite, setFormInvite] = useState('');
  const [formCard, setFormCard] = useState('');
  const [formCardName, setFormCardName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

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

  const fetchMyChannels = useCallback(async () => {
    setLoadingMyChannels(true);
    try {
      const res = await axios.get(`${API_URL}/api/user/channels?userId=${userId}`);
      setMyChannels(res.data.channels || []);
      setMyBalance(res.data.balance || 0);
      setHasUnusedPayment(res.data.hasUnusedPayment || false);
    } catch (err) {
      console.error(err);
    }
    setLoadingMyChannels(false);
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

  const openAddModal = async () => {
    setShowAddModal(true);
    setModalStep('main');
    await fetchMyChannels();
  };

  const handleChannelPayment = async () => {
    try {
      setBuying(true);
      const res = await axios.post(`${API_URL}/api/create-channel-payment`, {
        userId,
        username: tgUser?.username || '',
        firstName: tgUser?.first_name || 'Foydalanuvchi'
      });
      setChannelPaymentData(res.data.payment);
      setModalStep('payment');
      setBuying(false);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi.");
      setBuying(false);
    }
  };

  const handleSubmitChannel = async () => {
    if (!formId || !formTitle || !formPrice || !formMembers || !formCard || !formCardName) {
      alert("Barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/api/user/channels`, {
        userId,
        id: formId.trim(),
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        adPrice: Number(formPrice),
        membersCount: Number(formMembers),
        dailyViews: Number(formViews || 0),
        inviteLink: formInvite.trim(),
        cardNumber: formCard.trim(),
        cardOwnerName: formCardName.trim()
      });
      // Refresh data
      const [channelsRes] = await Promise.all([
        axios.get(`${API_URL}/api/channels`),
        fetchMyChannels()
      ]);
      setChannels(channelsRes.data);
      // Reset form
      setFormId(''); setFormTitle(''); setFormDesc(''); setFormCategory('Boshqa');
      setFormPrice(''); setFormMembers(''); setFormViews(''); setFormInvite('');
      setFormCard(''); setFormCardName('');
      setModalStep('main');
      setSubmitting(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Xatolik yuz berdi.");
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt < 1000) {
      alert("Minimal yechish summasi 1,000 UZS");
      return;
    }
    if (amt > myBalance) {
      alert("Hisobingizda yetarli mablag' yo'q");
      return;
    }
    try {
      setWithdrawing(true);
      await axios.post(`${API_URL}/api/user/withdraw`, { userId, amount: amt });
      setModalStep('withdraw-success');
      setWithdrawAmount('');
      await fetchMyChannels();
      setWithdrawing(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Xatolik yuz berdi.");
      setWithdrawing(false);
    }
  };

  // ======= STYLES =======
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-main)', fontSize: 13, fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
    </div>
  );

  // ======= ADD CHANNEL MODAL CONTENT =======
  const renderAddModalContent = () => {
    if (loadingMyChannels && modalStep === 'main') {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--neon-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Yuklanmoqda...</p>
        </div>
      );
    }

    // ======= MAIN VIEW: My Channels + Add Button =======
    if (modalStep === 'main') {
      return (
        <>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', margin: '0 auto 10px',
              background: 'rgba(217,0,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(217,0,255,0.3)', boxShadow: '0 0 15px rgba(217,0,255,0.15)'
            }}>
              <Wallet size={24} color="var(--neon-magenta)" />
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>Mening Kanallarim</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Maksimal {MAX_CHANNELS} ta kanal</p>
          </div>

          {/* Balance Card */}
          <div style={{
            background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.15)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Balans (90% daromad)</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--neon-cyan)' }}>
                {Math.floor(myBalance).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>UZS</span>
              </p>
            </div>
            {myBalance >= 1000 && (
              <button
                onClick={() => { setModalStep('withdraw'); setWithdrawAmount(''); }}
                style={{
                  background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.3)',
                  color: 'var(--neon-green)', borderRadius: 10, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                <ArrowDownCircle size={14} /> Pul yechish
              </button>
            )}
          </div>

          {/* My Channels List */}
          {myChannels.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {myChannels.map((ch: any) => (
                <div key={ch.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: getChannelGradient(ch.title),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 'bold', color: 'white'
                  }}>
                    {ch.title[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Narx: {(ch.adPrice || 0).toLocaleString()} UZS</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--neon-green)', fontSize: 14, fontWeight: 700 }}>
                      <TrendingUp size={13} /> {Math.floor(ch.earned || 0).toLocaleString()}
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>UZS daromad</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myChannels.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              Siz hali kanal qo'shmagansiz.
            </div>
          )}

          {/* Rules */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6
          }}>
            <strong style={{ color: 'var(--text-main)' }}>Qoidalar:</strong>
            <br />• Kamida 1000 obunachi &nbsp;• Ulash: 20,000 so'm &nbsp;• 10% komissiya
          </div>

          {/* Action Buttons */}
          {hasUnusedPayment ? (
            <button
              onClick={() => setModalStep('form')}
              style={{
                width: '100%', padding: 13, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--neon-green), #00c851)',
                border: 'none', color: '#000', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <CheckCircle2 size={18} /> To'lov tasdiqlangan — Kanal ma'lumotlarini kiriting
            </button>
          ) : myChannels.length >= MAX_CHANNELS ? (
            <div style={{
              textAlign: 'center', padding: 12, borderRadius: 12,
              background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.2)',
              color: 'var(--neon-red)', fontSize: 13, fontWeight: 600
            }}>
              Maksimal {MAX_CHANNELS} ta kanal limitiga yetdingiz
            </div>
          ) : (
            <button
              onClick={handleChannelPayment}
              disabled={buying}
              style={{
                width: '100%', padding: 13, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--neon-magenta), #ff007f)',
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: buying ? 0.6 : 1
              }}
            >
              <Plus size={18} /> Yangi kanal qo'shish (20,000 so'm)
            </button>
          )}
        </>
      );
    }

    // ======= PAYMENT VIEW =======
    if (modalStep === 'payment' && channelPaymentData) {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={48} color="var(--neon-green)" style={{ display: 'block', margin: '0 auto 8px', filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>Kanal qo'shish uchun to'lov</h2>
          </div>

          <div style={{
            background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.2)',
            borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>Karta raqami (bosing — nusxalanadi):</p>
            <h2
              style={{ margin: '0 0 6px', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, cursor: 'pointer', color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0,243,255,0.3)' }}
              onClick={() => { navigator.clipboard.writeText(settings.cardNumber); alert('Karta raqami nusxalandi!'); }}
            >
              {settings.cardNumber || '—'}
            </h2>
            {settings.cardOwnerName && (
              <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14 }}>{settings.cardOwnerName}</p>
            )}
          </div>

          <div style={{
            background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)',
            borderRadius: 14, padding: 14, marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--neon-red)', fontWeight: 700, marginBottom: 6 }}>
              <Info size={16} /> DIQQAT!
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
              To'lovni avtomatik tasdiqlash uchun <strong>AYNAN SHU SUMMANI</strong> o'tkazing:
            </p>
            <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: 'var(--neon-orange)' }}>
              {channelPaymentData.amount.toLocaleString()} UZS
            </div>
          </div>

          <button
            onClick={() => { setShowAddModal(false); }}
            style={{
              width: '100%', padding: 13, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
              border: 'none', color: '#000', fontWeight: 800, fontSize: 15,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <CheckCircle2 size={18} /> To'lov qildim — Yopish
          </button>
        </>
      );
    }

    // ======= FORM VIEW =======
    if (modalStep === 'form') {
      return (
        <>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-main)', textAlign: 'center' }}>Kanal ma'lumotlarini kiriting</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '55vh', overflowY: 'auto', paddingRight: 4 }}>
            <div>
              <label style={labelStyle}>Kanal ID (masalan: -1001234567890) *</label>
              <input style={inputStyle} value={formId} onChange={e => setFormId(e.target.value)} placeholder="-100..." />
            </div>
            <div>
              <label style={labelStyle}>Kanal nomi *</label>
              <input style={inputStyle} value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Kanal nomi" />
            </div>
            <div>
              <label style={labelStyle}>Kanal tavsifi</label>
              <input style={inputStyle} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Qisqa tavsif..." />
            </div>
            <div>
              <label style={labelStyle}>Kategoriya</label>
              <select style={{ ...inputStyle, appearance: 'auto' }} value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES.filter(c => c !== 'Hammasi').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Reklama narxi (UZS) *</label>
                <input style={inputStyle} type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="15000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Obunachi soni *</label>
                <input style={inputStyle} type="number" value={formMembers} onChange={e => setFormMembers(e.target.value)} placeholder="1000" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Kunlik ko'rish</label>
                <input style={inputStyle} type="number" value={formViews} onChange={e => setFormViews(e.target.value)} placeholder="500" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Invite link</label>
                <input style={inputStyle} value={formInvite} onChange={e => setFormInvite(e.target.value)} placeholder="https://t.me/..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta raqami *</label>
                <input style={inputStyle} value={formCard} onChange={e => setFormCard(e.target.value)} placeholder="8600 1234 5678 9012" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta egasi *</label>
                <input style={inputStyle} value={formCardName} onChange={e => setFormCardName(e.target.value)} placeholder="Ism Familiya" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => setModalStep('main')}
              style={{
                flex: 1, padding: 12, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              Ortga
            </button>
            <button
              onClick={handleSubmitChannel}
              disabled={submitting}
              style={{
                flex: 2, padding: 12, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
                border: 'none', color: '#000', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', opacity: submitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <CheckCircle2 size={16} /> {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </>
      );
    }

    // ======= WITHDRAW VIEW =======
    if (modalStep === 'withdraw') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <ArrowDownCircle size={48} color="var(--neon-green)" style={{ display: 'block', margin: '0 auto 8px', filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>Pul yechish</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Mavjud balans: <strong style={{ color: 'var(--neon-cyan)' }}>{Math.floor(myBalance).toLocaleString()} UZS</strong></p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Yechish summasi (UZS)</label>
            <input
              style={{ ...inputStyle, fontSize: 20, textAlign: 'center', fontWeight: 700, padding: '14px 12px' }}
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="0"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>Minimal: 1,000 UZS</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setModalStep('main')}
              style={{
                flex: 1, padding: 12, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}
            >
              Ortga
            </button>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              style={{
                flex: 2, padding: 12, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--neon-green), #00c851)',
                border: 'none', color: '#000', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', opacity: withdrawing ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <ArrowDownCircle size={16} /> {withdrawing ? 'Yuborilmoqda...' : 'Yechish'}
            </button>
          </div>
        </>
      );
    }

    // ======= WITHDRAW SUCCESS =======
    if (modalStep === 'withdraw-success') {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} color="var(--neon-green)" style={{ display: 'block', margin: '0 auto 12px', filter: 'drop-shadow(0 0 12px var(--neon-green))' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-main)' }}>So'rov qabul qilindi!</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Pul hisobingizga <strong>24 soat ichida</strong> o'tkaziladi.
          </p>
          <button
            onClick={() => setModalStep('main')}
            style={{
              padding: '12px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
              border: 'none', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer'
            }}
          >
            Tushunarli
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ paddingBottom: 30, maxWidth: 480, margin: '0 auto' }}>

      {/* ======= COMPACT HEADER ======= */}
      <div style={{ padding: '16px 16px 10px', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', top: 0, right: 20,
          width: 120, height: 60,
          background: 'radial-gradient(ellipse, rgba(217,0,255,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div>
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
        <button
          onClick={openAddModal}
          style={{
            background: 'rgba(217,0,255,0.1)',
            border: '1px solid rgba(217,0,255,0.4)',
            color: 'var(--neon-magenta)',
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 1
          }}
        >
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {/* ======= SEARCH BAR ======= */}
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

      {/* ======= CATEGORY PILLS ======= */}
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
                    <Users size={12} /> {(ch.membersCount || 0).toLocaleString()} obunachi
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

            {ch.description && (
              <p style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {ch.description}
              </p>
            )}

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

            <div style={{ display: 'flex', gap: 10 }}>
              {ch.inviteLink && (
                <a
                  href={ch.inviteLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-main)', fontWeight: 600, fontSize: 14,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    textDecoration: 'none', transition: 'all 0.2s',
                  }}
                >
                  <Eye size={16} /> Ko'rish
                </a>
              )}
              <button
                onClick={() => handleBuy(ch)}
                disabled={buying}
                style={{
                  flex: ch.inviteLink ? 1.5 : 1, padding: '12px', borderRadius: 12,
                  background: 'rgba(0,243,255,0.1)',
                  border: '1px solid rgba(0,243,255,0.4)',
                  color: 'var(--neon-cyan)', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <Send size={16} /> Sotib olish
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======= ADD CHANNEL MODAL ======= */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }} onClick={() => setShowAddModal(false)}>
          <div
            style={{
              background: 'rgba(15,15,25,0.98)',
              border: '1px solid var(--glass-border)',
              borderRadius: 24,
              padding: '20px',
              width: '100%',
              maxWidth: 420,
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: 'white', borderRadius: '50%', width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2
              }}
            >
              <X size={16} />
            </button>
            {renderAddModalContent()}
          </div>
        </div>
      )}

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
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }}></div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <CheckCircle2 size={56} color="var(--neon-green)"
                style={{ display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
              <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>To'lov Ma'lumotlari</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                {selectedChannel.title} uchun reklama
              </p>
            </div>

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

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Users, CheckCircle2, Eye, Info, Search, Plus, X, Wallet, ArrowDownCircle, TrendingUp, MonitorPlay, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789';
const userId = tgUser?.id || MOCK_USER_ID;

const CATEGORIES = ['Hammasi', 'Gaming', 'Vlog', "Ta'lim", 'Kino', 'Musiqa', 'Biznes', 'Sport', 'Texnologiya', 'Boshqa'];

type ModalStep = 'main' | 'payment' | 'form' | 'withdraw' | 'withdraw-success';

export default function UserApp() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({ cardNumber: '', cardOwnerName: '', listingFee: 20000, commissionRate: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Hammasi');
  const [buying, setBuying] = useState(false);

  // Add Listing Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('main');
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState(0);
  const [hasUnusedPayment, setHasUnusedPayment] = useState(false);
  const [listingPaymentData, setListingPaymentData] = useState<any>(null);
  const [loadingMyListings, setLoadingMyListings] = useState(false);

  // Listing Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Boshqa');
  const [formPrice, setFormPrice] = useState('');
  const [formSubs, setFormSubs] = useState('');
  const [formViews, setFormViews] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formMonetized, setFormMonetized] = useState(false);
  const [formCard, setFormCard] = useState('');
  const [formCardName, setFormCardName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready();
      (window as any).Telegram.WebApp.expand();
    }

    Promise.all([
      axios.get(`${API_URL}/api/listings`),
      axios.get(`${API_URL}/api/settings`)
    ]).then(([listingsRes, settingsRes]) => {
      setListings(listingsRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const fetchMyListings = useCallback(async () => {
    setLoadingMyListings(true);
    try {
      const res = await axios.get(`${API_URL}/api/user/listings?userId=${userId}`);
      setMyListings(res.data.listings || []);
      setMyBalance(res.data.balance || 0);
      setHasUnusedPayment(res.data.hasUnusedPayment || false);
      setSettings((prev: any) => ({ ...prev, listingFee: res.data.listingFee, commissionRate: res.data.commissionRate }));
    } catch (err) {
      console.error(err);
    }
    setLoadingMyListings(false);
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchCat = activeCategory === 'Hammasi' || l.niche === activeCategory;
      const matchSearch = l.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [listings, activeCategory, searchQuery]);

  const handleBuy = async (listing: any) => {
    try {
      setBuying(true);
      const res = await axios.post(`${API_URL}/api/create-purchase`, {
        listingId: listing.id,
        userId: userId,
        username: tgUser?.username || '',
        firstName: tgUser?.first_name || 'Foydalanuvchi'
      });
      setPaymentData(res.data.payment);
      setSelectedListing(listing);
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
    await fetchMyListings();
  };

  const handleListingPayment = async () => {
    try {
      setBuying(true);
      const res = await axios.post(`${API_URL}/api/create-listing-payment`, {
        userId,
        username: tgUser?.username || '',
        firstName: tgUser?.first_name || 'Foydalanuvchi'
      });
      setListingPaymentData(res.data.payment);
      setModalStep('payment');
      setBuying(false);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi.");
      setBuying(false);
    }
  };

  const handleSubmitListing = async () => {
    if (!formName || !formPrice || !formSubs || !formCard || !formCardName) {
      alert("Barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/api/user/listings`, {
        userId,
        channelName: formName.trim(),
        description: formDesc.trim(),
        niche: formCategory,
        price: Number(formPrice),
        subscribers: Number(formSubs),
        monthlyViews: Number(formViews || 0),
        youtubeUrl: formUrl.trim(),
        createdYear: formYear ? Number(formYear) : null,
        monetized: formMonetized,
        cardNumber: formCard.trim(),
        cardOwnerName: formCardName.trim()
      });
      
      const [listingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/listings`),
        fetchMyListings()
      ]);
      setListings(listingsRes.data);
      
      setFormName(''); setFormDesc(''); setFormCategory('Boshqa');
      setFormPrice(''); setFormSubs(''); setFormViews(''); setFormUrl('');
      setFormYear(''); setFormMonetized(false);
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
      await fetchMyListings();
      setWithdrawing(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Xatolik yuz berdi.");
      setWithdrawing(false);
    }
  };

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
      <MonitorPlay size={48} color="var(--yt-red)" style={{ animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
    </div>
  );

  const renderAddModalContent = () => {
    if (loadingMyListings && modalStep === 'main') {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <MonitorPlay size={36} color="var(--yt-red)" style={{ animation: 'pulse 1.5s infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Yuklanmoqda...</p>
        </div>
      );
    }

    if (modalStep === 'main') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%', margin: '0 auto 10px',
              background: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,0,0,0.3)', boxShadow: '0 0 15px rgba(255,0,0,0.15)'
            }}>
              <Wallet size={24} color="var(--yt-red)" />
            </div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>Mening E'lonlarim</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{settings.commissionRate}% komissiya ushlanadi</p>
          </div>

          <div style={{
            background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.15)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Balans</p>
              <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                {Math.floor(myBalance).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400 }}>UZS</span>
              </p>
            </div>
            {myBalance >= 1000 && (
              <button
                onClick={() => { setModalStep('withdraw'); setWithdrawAmount(''); }}
                style={{
                  background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.3)',
                  color: 'var(--neon-green)', borderRadius: 10, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                <ArrowDownCircle size={14} /> Pul yechish
              </button>
            )}
          </div>

          {myListings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {myListings.map((list: any) => (
                <div key={list.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.channelName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Narx: {(list.price || 0).toLocaleString()} UZS</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--neon-green)', fontSize: 14, fontWeight: 700 }}>
                      <TrendingUp size={13} /> {Math.floor(list.earned || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {myListings.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              Siz hali e'lon qo'shmagansiz.
            </div>
          )}

          {hasUnusedPayment ? (
            <button
              onClick={() => setModalStep('form')}
              style={{
                width: '100%', padding: 13, borderRadius: 14,
                background: 'var(--success-green)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <CheckCircle2 size={18} /> Kanal ma'lumotlarini kiriting
            </button>
          ) : (
            <button
              onClick={handleListingPayment}
              disabled={buying}
              style={{
                width: '100%', padding: 13, borderRadius: 14,
                background: 'var(--yt-red)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: buying ? 0.6 : 1
              }}
            >
              <Plus size={18} /> E'lon joylash ({(settings.listingFee || 20000).toLocaleString()} so'm)
            </button>
          )}
        </>
      );
    }

    if (modalStep === 'payment' && listingPaymentData) {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={48} color="var(--success-green)" style={{ display: 'block', margin: '0 auto 8px', filter: 'drop-shadow(0 0 10px var(--success-green))' }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>E'lon to'lovi</h2>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>Karta raqami (bosing — nusxalanadi):</p>
            <h2
              style={{ margin: '0 0 6px', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, cursor: 'pointer', color: 'var(--text-main)' }}
              onClick={() => { navigator.clipboard.writeText(settings.cardNumber); alert('Karta raqami nusxalandi!'); }}
            >
              {settings.cardNumber || '—'}
            </h2>
            {settings.cardOwnerName && <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14 }}>{settings.cardOwnerName}</p>}
          </div>

          <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--yt-light-red)', fontWeight: 700, marginBottom: 6 }}>
              <Info size={16} /> DIQQAT!
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
              To'lovni avtomatik tasdiqlash uchun <strong>AYNAN SHU SUMMANI</strong> o'tkazing:
            </p>
            <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: 'var(--accent-gold)' }}>
              {listingPaymentData.amount.toLocaleString()} UZS
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(false)}
            style={{ width: '100%', padding: 13, borderRadius: 14, background: 'var(--text-main)', border: 'none', color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <CheckCircle2 size={18} /> To'lov qildim — Yopish
          </button>
        </>
      );
    }

    if (modalStep === 'form') {
      return (
        <>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-main)', textAlign: 'center' }}>Kanal ma'lumotlari</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            <div>
              <label style={labelStyle}>YouTube Kanal Nomi *</label>
              <input style={inputStyle} value={formName} onChange={e => setFormName(e.target.value)} placeholder="Kanal nomi" />
            </div>
            <div>
              <label style={labelStyle}>Tavsif</label>
              <textarea style={{...inputStyle, height: 80, resize: 'none'}} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Nimalar haqida ekanligi..." />
            </div>
            <div>
              <label style={labelStyle}>Niche (Kategoriya)</label>
              <select style={{ ...inputStyle, appearance: 'auto' }} value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES.filter(c => c !== 'Hammasi').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Sotish narxi (UZS) *</label>
                <input style={inputStyle} type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="Masalan: 500000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Obunachilar *</label>
                <input style={inputStyle} type="number" value={formSubs} onChange={e => setFormSubs(e.target.value)} placeholder="10000" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Oylik ko'rishlar</label>
                <input style={inputStyle} type="number" value={formViews} onChange={e => setFormViews(e.target.value)} placeholder="50000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Yaratilgan yil</label>
                <input style={inputStyle} type="number" value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2020" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>YouTube Linki</label>
              <input style={inputStyle} value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
              <input type="checkbox" checked={formMonetized} onChange={e => setFormMonetized(e.target.checked)} style={{ width: 18, height: 18, margin: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 500 }}>Monetizatsiya yoniqmi?</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta raqami *</label>
                <input style={inputStyle} value={formCard} onChange={e => setFormCard(e.target.value)} placeholder="8600..." />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta egasi *</label>
                <input style={inputStyle} value={formCardName} onChange={e => setFormCardName(e.target.value)} placeholder="Ism Familiya" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setModalStep('main')} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Ortga</button>
            <button onClick={handleSubmitListing} disabled={submitting} style={{ flex: 2, padding: 12, borderRadius: 12, background: 'var(--yt-red)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> {submitting ? 'Saqlanmoqda...' : 'E\'lonni chiqarish'}
            </button>
          </div>
        </>
      );
    }

    if (modalStep === 'withdraw') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <ArrowDownCircle size={48} color="var(--success-green)" style={{ display: 'block', margin: '0 auto 8px', filter: 'drop-shadow(0 0 10px var(--success-green))' }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>Pul yechish</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Mavjud balans: <strong style={{ color: 'var(--text-main)' }}>{Math.floor(myBalance).toLocaleString()} UZS</strong></p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Yechish summasi (UZS)</label>
            <input style={{ ...inputStyle, fontSize: 20, textAlign: 'center', fontWeight: 700, padding: '14px 12px' }} type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0" />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>Minimal: 1,000 UZS</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setModalStep('main')} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Ortga</button>
            <button onClick={handleWithdraw} disabled={withdrawing} style={{ flex: 2, padding: 12, borderRadius: 12, background: 'var(--success-green)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: withdrawing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ArrowDownCircle size={16} /> {withdrawing ? 'Yuborilmoqda...' : 'Yechish'}
            </button>
          </div>
        </>
      );
    }

    if (modalStep === 'withdraw-success') {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CheckCircle2 size={56} color="var(--success-green)" style={{ display: 'block', margin: '0 auto 12px', filter: 'drop-shadow(0 0 12px var(--success-green))' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--text-main)' }}>So'rov qabul qilindi!</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>Pul hisobingizga <strong>24 soat ichida</strong> o'tkaziladi.</p>
          <button onClick={() => setModalStep('main')} style={{ padding: '12px 24px', borderRadius: 12, background: 'var(--text-main)', border: 'none', color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Tushunarli</button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ paddingBottom: 30, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ padding: '16px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MonitorPlay size={32} color="var(--yt-red)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Channel<span style={{ color: 'var(--yt-red)' }}>Bozor</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>YouTube kanallar savdosi</p>
          </div>
        </div>
        <button onClick={openAddModal} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-main)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={16} /> Sotish
        </button>
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 13px' }}>
          <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Kanal qidirish..." style={{ background: 'transparent', border: 'none', outline: 'none', margin: 0, color: 'var(--text-main)', fontSize: 13, width: '100%', fontFamily: 'Inter, sans-serif' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '0 16px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: isActive ? 600 : 500, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', background: isActive ? 'var(--text-main)' : 'rgba(255,255,255,0.08)', color: isActive ? '#000' : 'var(--text-muted)' }}>{cat}</button>
          );
        })}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredListings.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>Kanal topilmadi</p>}
        
        {filteredListings.map((list: any) => (
          <div key={list.id} style={{ background: 'var(--surface-dark)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 16, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {list.channelName}
                  {list.monetized && <span style={{ background: 'rgba(0,200,81,0.15)', color: 'var(--success-green)', fontSize: 10, padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Check size={10} /> Monetizatsiya</span>}
                </h3>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}><Users size={12} /> {(list.subscribers || 0).toLocaleString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}><Eye size={12} /> {(list.monthlyViews || 0).toLocaleString()}/oy</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 16 }}>{(list.price || 0).toLocaleString()}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>UZS</div>
              </div>
            </div>

            {list.description && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{list.description}</p>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>{list.niche}</span>
              {list.createdYear && <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>{list.createdYear} y.</span>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {list.youtubeUrl && (
                <a href={list.youtubeUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                  <MonitorPlay size={16} color="var(--yt-red)" /> Kanalni ko'rish
                </a>
              )}
              <button onClick={() => handleBuy(list)} disabled={buying} style={{ flex: 1.2, padding: '10px', borderRadius: 10, background: 'var(--yt-red)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Sotib olish
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: '#111', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '20px', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}><X size={16} /></button>
            {renderAddModalContent()}
          </div>
        </div>
      )}

      {selectedListing && paymentData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedListing(null)}>
          <div style={{ background: '#111', border: '1px solid var(--glass-border)', borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }}></div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <CheckCircle2 size={56} color="var(--success-green)" style={{ display: 'block', margin: '0 auto 10px', filter: 'drop-shadow(0 0 10px var(--success-green))' }} />
              <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>To'lov Ma'lumotlari</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{selectedListing.channelName} uchun to'lov</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>Karta raqami (bosing — nusxalanadi):</p>
              <h2 style={{ margin: '0 0 6px', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => { navigator.clipboard.writeText(settings.cardNumber); alert('Karta raqami nusxalandi!'); }}>
                {settings.cardNumber || '—'}
              </h2>
              {settings.cardOwnerName && <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14 }}>{settings.cardOwnerName}</p>}
            </div>
            <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--yt-light-red)', fontWeight: 700, marginBottom: 6 }}>
                <Info size={16} /> DIQQAT!
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
                To'lovni avtomatik tasdiqlash uchun <strong>AYNAN SHU SUMMANI</strong> o'tkazing:
              </p>
              <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: 'var(--accent-gold)' }}>
                {paymentData.amount.toLocaleString()} UZS
              </div>
            </div>
            <button style={{ width: '100%', padding: 14, borderRadius: 14, background: 'var(--text-main)', border: 'none', color: '#000', fontWeight: 800, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => { if ((window as any).Telegram?.WebApp) { (window as any).Telegram.WebApp.close(); } else { setSelectedListing(null); } }}>
              <CheckCircle2 size={20} /> To'lov qildim — Yopish
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { Users, CheckCircle2, Eye, Search, Plus, X, Wallet, ArrowDownCircle, TrendingUp, MonitorPlay, Info, ShoppingCart, Calendar, DollarSign, XCircle, Gamepad2, Camera, Layers, Clapperboard, Music, Briefcase, Trophy, Cpu, Sparkles, ImagePlus, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
const MOCK_USER_ID = '123456789';
const userId = tgUser?.id || MOCK_USER_ID;

const CATEGORIES = [
  { name: 'Hammasi', icon: null },
  { name: 'Gaming', icon: <Gamepad2 size={16} color="#8b5cf6" /> },
  { name: 'Vlog', icon: <Camera size={16} color="#a78bfa" /> },
  { name: "Ta'lim", icon: <Layers size={16} color="#34d399" /> },
  { name: 'Kino', icon: <Clapperboard size={16} color="#6366f1" /> },
  { name: 'Musiqa', icon: <Music size={16} color="#c084fc" /> },
  { name: 'Biznes', icon: <Briefcase size={16} color="#fbbf24" /> },
  { name: 'Sport', icon: <Trophy size={16} color="#f87171" /> },
  { name: 'Texnologiya', icon: <Cpu size={16} color="#60a5fa" /> },
  { name: 'Boshqa', icon: <Sparkles size={16} color="#f472b6" /> }
];

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
  const [formImages, setFormImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery viewer
  const [galleryListing, setGalleryListing] = useState<any>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.ready();
      (window as any).Telegram.WebApp.expand();
      (window as any).Telegram.WebApp.setHeaderColor('#0f1015');
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

  // Compress image file to base64, max width 900px, quality 0.75
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_W = 900;
          const scale = img.width > MAX_W ? MAX_W / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = e.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - formImages.length;
    const toProcess = files.slice(0, remaining);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setFormImages(prev => [...prev, ...compressed].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleViewGallery = async (listing: any) => {
    setLoadingGallery(true);
    setGalleryIndex(0);
    try {
      const res = await axios.get(`${API_URL}/api/listings/${listing.id}`);
      setGalleryListing(res.data);
    } catch {
      setGalleryListing(listing);
    }
    setLoadingGallery(false);
  };

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
        cardOwnerName: formCardName.trim(),
        images: formImages
      });
      
      const [listingsRes] = await Promise.all([
        axios.get(`${API_URL}/api/listings`),
        fetchMyListings()
      ]);
      setListings(listingsRes.data);
      
      setFormName(''); setFormDesc(''); setFormCategory('Boshqa');
      setFormPrice(''); setFormSubs(''); setFormViews(''); setFormUrl('');
      setFormYear(''); setFormMonetized(false);
      setFormCard(''); setFormCardName(''); setFormImages([]);
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k+';
    return num.toString();
  };

  const getFirstLetter = (name: string) => name ? name.charAt(0).toUpperCase() : 'C';
  const getIconColor = (name: string) => {
    const colors = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#1abc9c', '#e67e22'];
    const index = name.length % colors.length;
    return colors[index];
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
                  background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)',
                  color: 'var(--success-green)', borderRadius: 10, padding: '8px 14px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--success-green)', fontSize: 14, fontWeight: 700 }}>
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
              className="btn-gold"
              style={{ width: '100%', padding: 14, fontSize: 15, justifyContent: 'center', opacity: buying ? 0.6 : 1 }}
            >
              <Plus size={18} /> E'lon joylash ({(settings.listingFee || 20000).toLocaleString()} so'm)
            </button>
          )}
        </>
      );
    }

    // Other modal steps remain similar but with updated colors
    // ... (omitting full repetition of form code for brevity, maintaining structure)
    // For completion, I will output the rest of the modal exactly but styled appropriately.
    if (modalStep === 'payment' && listingPaymentData) {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={48} color="var(--success-green)" style={{ display: 'block', margin: '0 auto 8px', filter: 'drop-shadow(0 0 10px var(--success-green))' }} />
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-main)' }}>E'lon to'lovi</h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>Karta raqami (bosing — nusxalanadi):</p>
            <h2 style={{ margin: '0 0 6px', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2, cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => { navigator.clipboard.writeText(settings.cardNumber); alert('Karta raqami nusxalandi!'); }}>
              {settings.cardNumber || '—'}
            </h2>
            {settings.cardOwnerName && <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14 }}>{settings.cardOwnerName}</p>}
          </div>
          <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--yt-red)', fontWeight: 700, marginBottom: 6 }}>
              <Info size={16} /> DIQQAT!
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
              To'lovni avtomatik tasdiqlash uchun <strong>AYNAN SHU SUMMANI</strong> o'tkazing:
            </p>
            <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, color: 'var(--accent-gold)' }}>
              {listingPaymentData.amount.toLocaleString()} UZS
            </div>
          </div>
          <button onClick={() => setShowAddModal(false)} style={{ width: '100%', padding: 13, borderRadius: 14, background: 'var(--text-main)', border: 'none', color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Kanal nomi" />
            </div>
            <div>
              <label style={labelStyle}>Tavsif</label>
              <textarea style={{height: 80, resize: 'none'}} value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Nimalar haqida ekanligi..." />
            </div>
            <div>
              <label style={labelStyle}>Niche (Kategoriya)</label>
              <select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                {CATEGORIES.filter(c => c.name !== 'Hammasi').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Sotish narxi (UZS) *</label>
                <input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="Masalan: 500000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Obunachilar *</label>
                <input type="number" value={formSubs} onChange={e => setFormSubs(e.target.value)} placeholder="10000" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Oylik ko'rishlar</label>
                <input type="number" value={formViews} onChange={e => setFormViews(e.target.value)} placeholder="50000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Yaratilgan yil</label>
                <input type="number" value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2020" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>YouTube Linki</label>
              <input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
              <input type="checkbox" checked={formMonetized} onChange={e => setFormMonetized(e.target.checked)} style={{ width: 18, height: 18, margin: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 500 }}>Monetizatsiya yoniqmi?</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta raqami *</label>
                <input value={formCard} onChange={e => setFormCard(e.target.value)} placeholder="8600..." />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Karta egasi *</label>
                <input value={formCardName} onChange={e => setFormCardName(e.target.value)} placeholder="Ism Familiya" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>📸 Kanal screenshoti (max 3 ta)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
              {formImages.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)',
                    color: 'var(--text-muted)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600
                  }}
                >
                  <ImagePlus size={16} /> Rasm qo'shish ({formImages.length}/3)
                </button>
              )}
              {formImages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {formImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative', width: 80, height: 60, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setFormImages(prev => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute', top: 2, right: 2,
                          background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                          borderRadius: '50%', width: 18, height: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setModalStep('main')} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Ortga</button>
            <button onClick={handleSubmitListing} disabled={submitting} className="btn-gold" style={{ flex: 2, padding: 12, justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
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
            <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0" style={{ fontSize: 20, textAlign: 'center', fontWeight: 700 }} />
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
          <button onClick={() => setModalStep('main')} className="btn-gold" style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Tushunarli</button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="header-container">
        <div className="logo-wrapper">
          <div className="logo-icon-box" style={{ background: 'transparent', padding: 0, width: 36, height: 26, filter: 'drop-shadow(0 0 12px rgba(255,0,0,0.4))' }}>
            <svg viewBox="0 0 24 24" fill="var(--yt-red)" width="36" height="26">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <div>
            <h1 className="logo-title">YouTube<span>Bozor</span></h1>
            <p className="logo-subtitle">YouTube kanallar savdosi</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={openAddModal} className="btn-gold">
            <Plus size={16} strokeWidth={3} /> Sotish
          </button>
        </div>
      </div>

      <div className="search-wrapper">
        <Search size={15} color="var(--text-muted)" strokeWidth={2} />
        <input 
          className="search-input"
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          placeholder="Kanal qidirish..." 
        />
      </div>

      <div className="categories-scroll">
        {CATEGORIES.map(cat => (
          <button 
            key={cat.name} 
            onClick={() => setActiveCategory(cat.name)} 
            className={`category-pill ${activeCategory === cat.name ? 'active' : ''}`}
          >
            {cat.icon && <span style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}>{cat.icon}</span>}
            {cat.name}
          </button>
        ))}
      </div>

      <div className="listings-grid">
        {filteredListings.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', marginTop: 20 }}>Kanal topilmadi</p>}
        
        {filteredListings.map((list: any) => (
          <div key={list.id} className="premium-card">
            
            <div className="card-header">
              <div className="card-icon" style={{ color: getIconColor(list.channelName) }}>
                {list.youtubeUrl ? <MonitorPlay size={18} strokeWidth={2.5}/> : <span style={{fontWeight: 800, fontSize: 16}}>{getFirstLetter(list.channelName)}</span>}
              </div>
              <div className="card-title" title={list.channelName}>{list.channelName}</div>
            </div>

            <div className="stats-row">
              <div className="stat-item">
                <Users size={12} className="stat-icon" /> {formatNumber(list.subscribers || 0)}
              </div>
              <div className="stat-item">
                <Eye size={12} className="stat-icon" /> {formatNumber(list.monthlyViews || 0)}
              </div>
              <div className="stat-item" style={{ marginLeft: 'auto' }}>
                {list.monetized ? 
                  <CheckCircle2 size={14} color="var(--success-green)" /> : 
                  <XCircle size={14} color="var(--danger-red)" />
                }
              </div>
            </div>

            <div className="info-list">
              <div className="info-row">
                <DollarSign size={11} className="stat-icon" /> 
                Oylik Daromad: {list.monetized ? '$150+' : 'Yo\'q'}
              </div>
              {list.createdYear && (
                <div className="info-row">
                  <Calendar size={11} className="stat-icon" />
                  Kanal Yoshi: {new Date().getFullYear() - list.createdYear} yil
                </div>
              )}
            </div>
            
            <div className="price-tag">
              {(list.price || 0).toLocaleString()} UZS
            </div>

            <div className="card-actions">
              <div className="action-btn" onClick={() => !loadingGallery && handleViewGallery(list)}>
                {loadingGallery ? <MonitorPlay size={13} style={{ animation: 'pulse 1s infinite' }} /> : <Eye size={13} />}
                Ko'rish
              </div>
              
              {list.status === 'SOLD' ? (
                <div className="action-btn" style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', pointerEvents: 'none' }}>
                  Sotilgan
                </div>
              ) : (
                <div className="action-btn" onClick={() => handleBuy(list)}>
                  <ShoppingCart size={13} /> Sotib olish
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: 24, padding: '20px', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}><X size={16} /></button>
            {renderAddModalContent()}
          </div>
        </div>
      )}

      {selectedListing && paymentData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedListing(null)}>
          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--yt-red)', fontWeight: 700, marginBottom: 6 }}>
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

      {/* Gallery Modal */}
      {galleryListing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', flexShrink: 0 }}>
            <button onClick={() => setGalleryListing(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <ChevronLeft size={16} /> Orqaga
            </button>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{galleryListing.channelName}</div>
            <div style={{ width: 80 }} />
          </div>

          {/* Image Viewer */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '0 8px' }}>
            {(galleryListing.images && galleryListing.images.length > 0) ? (
              <>
                <img
                  src={galleryListing.images[galleryIndex]}
                  alt={`Screenshot ${galleryIndex + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }}
                />
                {galleryListing.images.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIndex(i => (i - 1 + galleryListing.images.length) % galleryListing.images.length)} style={{ position: 'absolute', left: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setGalleryIndex(i => (i + 1) % galleryListing.images.length)} style={{ position: 'absolute', right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <ChevronRight size={20} />
                    </button>
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                      {galleryListing.images.map((_: any, i: number) => (
                        <div key={i} onClick={() => setGalleryIndex(i)} style={{ width: 7, height: 7, borderRadius: '50%', background: i === galleryIndex ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.2s' }} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <MonitorPlay size={60} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14 }}>Rasm yuklanmagan</p>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div style={{ padding: '16px', flexShrink: 0, display: 'flex', gap: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {galleryListing.youtubeUrl ? (
              <a
                href={galleryListing.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.3)', color: 'var(--yt-red)', padding: '12px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                <ExternalLink size={16} /> YouTube Kanalga O'tish
              </a>
            ) : (
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', padding: '12px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                Havola kiritilmagan
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

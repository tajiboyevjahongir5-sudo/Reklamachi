import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import path from 'path';
import { bot } from './bot';

export const app = express();
app.use(cors());
app.use(express.json());

// --- Public Routes (Web App) ---

// Get active listings
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: { in: ['ACTIVE', 'SOLD'] } },
      select: {
        id: true, channelName: true, description: true, niche: true,
        price: true, subscribers: true, monthlyViews: true, youtubeUrl: true,
        monetized: true, createdYear: true, status: true, createdAt: true,
        sellerId: true, imageUrl: true
        // images excluded from list — fetched separately to keep response small
      }
    });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single listing with images
app.get('/api/listings/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!listing) return res.status(404).json({ error: 'Topilmadi' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create purchase payment
app.post('/api/create-purchase', async (req, res) => {
  const { listingId, userId, username, firstName } = req.body;
  
  try {
    const listing = await prisma.listing.findUnique({ where: { id: Number(listingId) } });
    if (!listing) return res.status(404).json({ error: "E'lon topilmadi" });

    // Ensure user exists
    await prisma.user.upsert({
      where: { id: String(userId) },
      update: { username, firstName },
      create: { id: String(userId), username, firstName }
    });

    const existing = await prisma.payment.findFirst({
      where: { userId: String(userId), listingId: listing.id, status: 'PENDING', type: 'PURCHASE' }
    });

    if (existing) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (existing.createdAt < fifteenMinutesAgo) {
        await prisma.payment.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
      } else {
        return res.json({ payment: existing });
      }
    }

    const pendingPayments = await prisma.payment.findMany({ where: { status: 'PENDING' }, select: { amount: true } });
    const busyAmounts = new Set(pendingPayments.map(p => p.amount));

    let randomSuffix = 0;
    for (let attempts = 0; attempts < 100; attempts++) {
      const testSuffix = Math.floor(Math.random() * 900) + 100;
      const testAmount = listing.price + testSuffix;
      if (!busyAmounts.has(testAmount)) {
        randomSuffix = testSuffix;
        break;
      }
    }
    if (randomSuffix === 0) randomSuffix = Math.floor(Math.random() * 900) + 100;

    const finalAmount = listing.price + randomSuffix;

    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        listingId: listing.id,
        amount: finalAmount,
        type: 'PURCHASE',
        status: 'PENDING'
      }
    });

    res.json({ payment });
  } catch (err) {
    console.error("Purchase Payment Error:", err);
    res.status(500).json({ error: "Failed to create purchase payment" });
  }
});

// Get settings for public view
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 1 } });
    }
    res.json({ 
      cardNumber: settings.cardNumber, 
      cardOwnerName: settings.cardOwnerName,
      listingFee: settings.listingFee,
      commissionRate: settings.commissionRate
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create listing payment
app.post('/api/create-listing-payment', async (req, res) => {
  const { userId, username, firstName } = req.body;
  try {
    await prisma.user.upsert({
      where: { id: String(userId) },
      update: { username, firstName },
      create: { id: String(userId), username, firstName }
    });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const listingFee = settings?.listingFee || 20000;

    const existing = await prisma.payment.findFirst({
      where: { userId: String(userId), type: 'LISTING', status: 'PENDING' }
    });

    if (existing) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (existing.createdAt < fifteenMinutesAgo) {
        await prisma.payment.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
      } else {
        return res.json({ payment: existing });
      }
    }

    const pendingPayments = await prisma.payment.findMany({ where: { status: 'PENDING' }, select: { amount: true } });
    const busyAmounts = new Set(pendingPayments.map(p => p.amount));

    let randomSuffix = 0;
    for (let attempts = 0; attempts < 100; attempts++) {
      const testSuffix = Math.floor(Math.random() * 900) + 100;
      const testAmount = listingFee + testSuffix;
      if (!busyAmounts.has(testAmount)) {
        randomSuffix = testSuffix;
        break;
      }
    }
    if (randomSuffix === 0) randomSuffix = Math.floor(Math.random() * 900) + 100;

    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        amount: listingFee + randomSuffix,
        type: 'LISTING',
        status: 'PENDING'
      }
    });
    res.json({ payment });
  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ error: "Failed to create listing payment" });
  }
});

// Get user listings & balance
app.get('/api/user/listings', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const commissionRate = settings?.commissionRate ?? 10;
    const sellerMultiplier = (100 - commissionRate) / 100;

    const listings = await prisma.listing.findMany({
      where: { sellerId: userId }
    });

    const listingsWithRevenue = await Promise.all(listings.map(async list => {
      const rev = await prisma.payment.aggregate({
        where: { listingId: list.id, type: 'PURCHASE', status: 'COMPLETED' },
        _sum: { amount: true }
      });
      // Revenue is based on the original listing price, not the exact paid amount which has a suffix, but we can just use the sum of paid amounts to be exact, or we can use sum of paid amounts minus suffix.
      // To be accurate, we'll just take the exact amount paid * multiplier. Suffix is tiny anyway.
      return { ...list, earned: (rev._sum.amount || 0) * sellerMultiplier };
    }));

    const totalEarned = listingsWithRevenue.reduce((sum, list) => sum + list.earned, 0);

    const withdrawals = await prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['PENDING', 'COMPLETED'] } },
      _sum: { amount: true }
    });
    const totalWithdrawn = withdrawals._sum.amount || 0;
    const balance = totalEarned - totalWithdrawn;

    const unusedPayment = await prisma.payment.findFirst({
      where: { userId, type: 'LISTING', status: 'COMPLETED' }
    });

    res.json({
      listings: listingsWithRevenue,
      balance,
      hasUnusedPayment: !!unusedPayment,
      listingFee: settings?.listingFee || 20000,
      commissionRate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Submit new listing
app.post('/api/user/listings', async (req, res) => {
  const { userId, channelName, description, niche, price, subscribers, monthlyViews, youtubeUrl, monetized, createdYear, cardNumber, cardOwnerName, images } = req.body;
  try {
    const unusedPayment = await prisma.payment.findFirst({
      where: { userId: String(userId), type: 'LISTING', status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' }
    });

    if (!unusedPayment) return res.status(403).json({ error: "Sizda tolov qilingan limit yoq" });

    const imageList: string[] = Array.isArray(images) ? images.slice(0, 3) : [];
    const listing = await prisma.listing.create({
      data: {
        channelName, description, niche: niche || 'Boshqa',
        price: Number(price), subscribers: Number(subscribers),
        monthlyViews: Number(monthlyViews || 0), youtubeUrl,
        monetized: Boolean(monetized), createdYear: createdYear ? Number(createdYear) : null,
        sellerId: String(userId), cardNumber, cardOwnerName,
        images: imageList
      }
    });

    await prisma.payment.update({
      where: { id: unusedPayment.id },
      data: { status: 'USED' }
    });

    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add listing' });
  }
});

// Withdraw money
app.post('/api/user/withdraw', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const commissionRate = settings?.commissionRate ?? 10;
    const sellerMultiplier = (100 - commissionRate) / 100;

    const listings = await prisma.listing.findMany({ where: { sellerId: String(userId) } });
    
    let totalEarned = 0;
    for (const list of listings) {
      const rev = await prisma.payment.aggregate({
        where: { listingId: list.id, type: 'PURCHASE', status: 'COMPLETED' },
        _sum: { amount: true }
      });
      totalEarned += (rev._sum.amount || 0) * sellerMultiplier;
    }

    const withdrawals = await prisma.withdrawal.aggregate({
      where: { userId: String(userId), status: { in: ['PENDING', 'COMPLETED'] } },
      _sum: { amount: true }
    });
    const totalWithdrawn = withdrawals._sum.amount || 0;
    const balance = totalEarned - totalWithdrawn;

    const requestedAmount = Number(amount);
    if (requestedAmount < 1000) return res.status(400).json({ error: "Minimal yechish summasi 1,000 UZS" });
    if (requestedAmount > balance) return res.status(400).json({ error: "Hisobingizda yetarli mablag' yo'q" });

    const firstListing = listings[0];

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: String(userId),
        amount: requestedAmount,
        cardNumber: firstListing?.cardNumber,
        cardOwnerName: firstListing?.cardOwnerName
      }
    });

    const adminId = process.env.ADMIN_ID;
    if (adminId) {
      const user = await prisma.user.findUnique({ where: { id: String(userId) } });
      bot.telegram.sendMessage(
        adminId,
        `💸 *Yangi pul yechish so'rovi!*\n\n` +
        `Sotuvchi: ${user?.firstName || 'Mijoz'} (ID: ${userId})\n` +
        `Summa: ${requestedAmount.toLocaleString()} UZS\n` +
        `Karta: \`${withdrawal.cardNumber || 'Kiritilmagan'}\` (${withdrawal.cardOwnerName || 'Kiritilmagan'})`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ To'lov yuborildi", callback_data: `withdraw_approve_${withdrawal.id}` },
              { text: "❌ Rad qilindi", callback_data: `withdraw_reject_${withdrawal.id}` }
            ]]
          }
        }
      ).catch(e => console.error(e));
    }

    res.json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// --- Admin Routes ---
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const purchaseRevenues = await prisma.payment.aggregate({
      where: { status: 'COMPLETED', type: 'PURCHASE' },
      _sum: { amount: true }
    });
    const listingRevenues = await prisma.payment.aggregate({
      where: { status: 'COMPLETED', type: 'LISTING' },
      _sum: { amount: true }
    });
    
    const activeListings = await prisma.listing.count({ where: { status: 'ACTIVE' } });
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const listings = await prisma.listing.findMany();
    const listingStats = await Promise.all(listings.map(async (list) => {
      const rev = await prisma.payment.aggregate({
        where: { listingId: list.id, status: 'COMPLETED', type: 'PURCHASE' },
        _sum: { amount: true }
      });
      const rev1d = await prisma.payment.aggregate({
        where: { listingId: list.id, status: 'COMPLETED', type: 'PURCHASE', createdAt: { gte: oneDayAgo } },
        _sum: { amount: true }
      });
      const rev30d = await prisma.payment.aggregate({
        where: { listingId: list.id, status: 'COMPLETED', type: 'PURCHASE', createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true }
      });
      
      return {
        id: list.id,
        title: list.channelName,
        revenue: rev._sum.amount || 0,
        revenue1d: rev1d._sum.amount || 0,
        revenue30d: rev30d._sum.amount || 0
      };
    }));

    res.json({ 
      totalUsers, 
      purchaseRevenue: purchaseRevenues._sum.amount || 0, 
      listingRevenue: listingRevenues._sum.amount || 0,
      activeListings, 
      listingStats 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CRUD Listings
app.get('/api/admin/listings', requireAdmin, async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({ include: { seller: true } });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/listings', requireAdmin, async (req, res) => {
  const { channelName, description, niche, price, subscribers, monthlyViews, youtubeUrl, monetized, status } = req.body;
  try {
    const listing = await prisma.listing.create({
      data: { channelName, description, niche: niche || 'Boshqa', price: Number(price), subscribers: Number(subscribers), monthlyViews: Number(monthlyViews || 0), youtubeUrl, monetized: Boolean(monetized), status: status || 'ACTIVE' }
    });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add listing' });
  }
});

app.delete('/api/admin/listings/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.payment.deleteMany({ where: { listingId: id } });
    await prisma.listing.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// Update Settings
app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  const { cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, listingFee, commissionRate } = req.body;
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, listingFee: Number(listingFee), commissionRate: Number(commissionRate) },
      create: { id: 1, cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, listingFee: Number(listingFee), commissionRate: Number(commissionRate) }
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get admin settings full
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 1 } });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Users
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        listings: true
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get Purchases History
app.get('/api/admin/sales', requireAdmin, async (req, res) => {
  try {
    const sales = await prisma.payment.findMany({
      where: { type: 'PURCHASE' },
      include: { user: true, listing: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all route for frontend SPA routing (Express 5 syntax)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

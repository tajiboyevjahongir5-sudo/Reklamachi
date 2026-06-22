import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import path from 'path';
import { bot } from './bot';

export const app = express();
app.use(cors());
app.use(express.json());

// --- Public Routes (Web App) ---

// Get channels
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create payment
app.post('/api/create-payment', async (req, res) => {
  const { channelId, userId, username, firstName } = req.body;
  
  try {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: "Kanal topilmadi" });

    // Ensure user exists in DB (upsert) before creating payment
    await prisma.user.upsert({
      where: { id: String(userId) },
      update: { username, firstName },
      create: { id: String(userId), username, firstName }
    });

    // Check if user has pending payment for this channel
    const existing = await prisma.payment.findFirst({
      where: { userId: String(userId), channelId, status: 'PENDING' }
    });

    if (existing) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (existing.createdAt < fifteenMinutesAgo) {
        await prisma.payment.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED' }
        });
      } else {
        return res.json({ payment: existing });
      }
    }

    // Generate unique random suffix for exact amount matching
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      select: { amount: true }
    });
    const busyAmounts = new Set(pendingPayments.map(p => p.amount));

    let randomSuffix = 0;
    for (let attempts = 0; attempts < 100; attempts++) {
      const testSuffix = Math.floor(Math.random() * 900) + 100;
      const testAmount = channel.adPrice + testSuffix;
      if (!busyAmounts.has(testAmount)) {
        randomSuffix = testSuffix;
        break;
      }
    }

    if (randomSuffix === 0) {
      randomSuffix = Math.floor(Math.random() * 900) + 100;
    }

    const finalAmount = channel.adPrice + randomSuffix;

    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        channelId,
        amount: finalAmount,
        status: 'PENDING'
      }
    });

    res.json({ payment });
  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});


// Get settings for public view
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 1 } });
    }
    res.json({ cardNumber: settings.cardNumber, cardOwnerName: settings.cardOwnerName });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create channel payment
app.post('/api/create-channel-payment', async (req, res) => {
  const { userId, username, firstName } = req.body;
  try {
    await prisma.user.upsert({
      where: { id: String(userId) },
      update: { username, firstName },
      create: { id: String(userId), username, firstName }
    });

    const existing = await prisma.payment.findFirst({
      where: { userId: String(userId), type: 'CHANNEL_ADD', status: 'PENDING' }
    });

    if (existing) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (existing.createdAt < fifteenMinutesAgo) {
        await prisma.payment.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED' }
        });
      } else {
        return res.json({ payment: existing });
      }
    }

    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      select: { amount: true }
    });
    const busyAmounts = new Set(pendingPayments.map(p => p.amount));

    let randomSuffix = 0;
    for (let attempts = 0; attempts < 100; attempts++) {
      const testSuffix = Math.floor(Math.random() * 900) + 100;
      const testAmount = 20000 + testSuffix;
      if (!busyAmounts.has(testAmount)) {
        randomSuffix = testSuffix;
        break;
      }
    }
    if (randomSuffix === 0) randomSuffix = Math.floor(Math.random() * 900) + 100;

    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        amount: 20000 + randomSuffix,
        type: 'CHANNEL_ADD',
        status: 'PENDING'
      }
    });
    res.json({ payment });
  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ error: "Failed to create channel payment" });
  }
});

// Get user channels & balance
app.get('/api/user/channels', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const channels = await prisma.channel.findMany({
      where: { ownerId: userId }
    });

    const channelsWithRevenue = await Promise.all(channels.map(async ch => {
      const rev = await prisma.payment.aggregate({
        where: { channelId: ch.id, type: 'AD', status: 'COMPLETED' },
        _sum: { amount: true }
      });
      return { ...ch, earned: (rev._sum.amount || 0) * 0.9 };
    }));

    const totalEarned = channelsWithRevenue.reduce((sum, ch) => sum + ch.earned, 0);

    const withdrawals = await prisma.withdrawal.aggregate({
      where: { userId, status: { in: ['PENDING', 'COMPLETED'] } },
      _sum: { amount: true }
    });
    const totalWithdrawn = withdrawals._sum.amount || 0;
    const balance = totalEarned - totalWithdrawn;

    const unusedPayment = await prisma.payment.findFirst({
      where: { userId, type: 'CHANNEL_ADD', status: 'COMPLETED' }
    });

    res.json({
      channels: channelsWithRevenue,
      balance,
      hasUnusedPayment: !!unusedPayment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Submit new channel
app.post('/api/user/channels', async (req, res) => {
  const { userId, id, title, description, category, adPrice, membersCount, dailyViews, inviteLink, cardNumber, cardOwnerName } = req.body;
  try {
    const unusedPayment = await prisma.payment.findFirst({
      where: { userId: String(userId), type: 'CHANNEL_ADD', status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' }
    });

    if (!unusedPayment) return res.status(403).json({ error: "Sizda tolov qilingan limit yoq" });

    const existingChannel = await prisma.channel.findUnique({ where: { id } });
    if (existingChannel) return res.status(400).json({ error: "Kanal ID allaqachon mavjud" });

    const channel = await prisma.channel.create({
      data: {
        id, title, description, category: category || 'Boshqa',
        adPrice: Number(adPrice), membersCount: Number(membersCount),
        dailyViews: Number(dailyViews || 0), inviteLink,
        ownerId: String(userId), cardNumber, cardOwnerName
      }
    });

    await prisma.payment.update({
      where: { id: unusedPayment.id },
      data: { status: 'USED' }
    });

    res.json(channel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

// Withdraw money
app.post('/api/user/withdraw', async (req, res) => {
  const { userId, amount } = req.body;
  try {
    const channels = await prisma.channel.findMany({ where: { ownerId: String(userId) } });
    
    let totalEarned = 0;
    for (const ch of channels) {
      const rev = await prisma.payment.aggregate({
        where: { channelId: ch.id, type: 'AD', status: 'COMPLETED' },
        _sum: { amount: true }
      });
      totalEarned += (rev._sum.amount || 0) * 0.9;
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

    const firstChannel = channels[0];

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: String(userId),
        amount: requestedAmount,
        cardNumber: firstChannel?.cardNumber,
        cardOwnerName: firstChannel?.cardOwnerName
      }
    });

    const adminId = process.env.ADMIN_ID;
    if (adminId) {
      const user = await prisma.user.findUnique({ where: { id: String(userId) } });
      bot.telegram.sendMessage(
        adminId,
        `💸 *Yangi pul yechish so'rovi!*\n\n` +
        `Foydalanuvchi: ${user?.firstName || 'Mijoz'} (ID: ${userId})\n` +
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
// Simplified admin auth: In production, you would validate the Telegram initData.
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const initData = req.headers['x-telegram-init-data']; // Minimal check for this MVP
  if (!initData && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalRevenueObj = await prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true }
    });
    const activeAds = await prisma.adTask.count({ where: { status: 'POSTED' } });
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group payments by channel
    const channels = await prisma.channel.findMany();
    const channelStats = await Promise.all(channels.map(async (ch) => {
      const rev = await prisma.payment.aggregate({
        where: { channelId: ch.id, status: 'COMPLETED' },
        _sum: { amount: true }
      });
      const rev1d = await prisma.payment.aggregate({
        where: { channelId: ch.id, status: 'COMPLETED', createdAt: { gte: oneDayAgo } },
        _sum: { amount: true }
      });
      const rev30d = await prisma.payment.aggregate({
        where: { channelId: ch.id, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true }
      });
      const active = await prisma.adTask.count({
        where: { channelId: ch.id, status: 'POSTED' }
      });
      return {
        id: ch.id,
        title: ch.title,
        revenue: rev._sum.amount || 0,
        revenue1d: rev1d._sum.amount || 0,
        revenue30d: rev30d._sum.amount || 0,
        activeAds: active
      };
    }));

    res.json({ totalUsers, revenue: totalRevenueObj._sum.amount || 0, activeAds, channelStats });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CRUD Channels
app.post('/api/admin/channels', requireAdmin, async (req, res) => {
  const { id, title, description, category, adPrice, membersCount, dailyViews, inviteLink } = req.body;
  try {
    const channel = await prisma.channel.create({
      data: { id, title, description, category: category || 'Boshqa', adPrice: Number(adPrice), membersCount: Number(membersCount), dailyViews: Number(dailyViews || 0), inviteLink }
    });
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add channel' });
  }
});

app.delete('/api/admin/channels/:id', requireAdmin, async (req, res) => {
  try {
    const channelId = req.params.id as string;
    await prisma.adTask.deleteMany({ where: { channelId } });
    await prisma.payment.deleteMany({ where: { channelId } });
    await prisma.channel.delete({ where: { id: channelId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// Update Settings
app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  const { cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, notifyAdPosted } = req.body;
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, notifyAdPosted },
      create: { id: 1, cardNumber, cardOwnerName, paymentChannelId, notifyNewPayment, notifyNewUser, notifyAdPosted }
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
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get AdTasks History
app.get('/api/admin/ads', requireAdmin, async (req, res) => {
  try {
    const ads = await prisma.adTask.findMany({
      include: { user: true, channel: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get ads' });
  }
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Catch-all route for frontend SPA routing (Express 5 syntax)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

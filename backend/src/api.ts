import express from 'express';
import cors from 'cors';
import { prisma } from './prisma';
import path from 'path';

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
  const { channelId, userId } = req.body;
  
  try {
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) return res.status(404).json({ error: "Kanal topilmadi" });

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

// Get settings for public view (only card number)
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 1 } });
    }
    res.json({ cardNumber: settings.cardNumber });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
    res.json({ totalUsers, revenue: totalRevenueObj._sum.amount || 0, activeAds });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// CRUD Channels
app.post('/api/admin/channels', requireAdmin, async (req, res) => {
  const { id, title, description, adPrice, membersCount } = req.body;
  try {
    const channel = await prisma.channel.create({
      data: { id, title, description, adPrice: Number(adPrice), membersCount: Number(membersCount) }
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
  const { cardNumber, paymentChannelId } = req.body;
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { cardNumber, paymentChannelId },
      create: { id: 1, cardNumber, paymentChannelId }
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

// Catch-all route for frontend SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

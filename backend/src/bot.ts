import { Telegraf, Markup } from 'telegraf';
import { prisma } from './prisma';
import 'dotenv/config';

export const bot = new Telegraf(process.env.BOT_TOKEN || 'dummy_token');

bot.start(async (ctx) => {
  const user = ctx.from;
  if (user) {
    await prisma.user.upsert({
      where: { id: user.id.toString() },
      update: {
        username: user.username,
        firstName: user.first_name,
      },
      create: {
        id: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
      }
    });
  }

  const webAppUrl = process.env.WEBAPP_URL || 'https://google.com';

  await ctx.reply(
    '🌟 Salom! Reklamachi botga xush kelibsiz.\nKanalimizda reklama joylashtirish uchun quyidagi tugmani bosing:',
    Markup.inlineKeyboard([
      Markup.button.webApp('📢 Reklama berish', webAppUrl)
    ])
  );
});

bot.command('admin', async (ctx) => {
  const adminId = process.env.ADMIN_ID;
  const webAppUrl = process.env.WEBAPP_URL || 'https://google.com';

  if (!adminId || ctx.from.id.toString() !== adminId) {
    return;
  }

  await ctx.reply(
    '🛠 Admin Panelga xush kelibsiz! Boshqaruv uchun pastdagi tugmani bosing.',
    Markup.inlineKeyboard([
      Markup.button.webApp('⚙️ Boshqaruv Paneli', `${webAppUrl}?admin=true`)
    ])
  );
});

function extractNumbers(text: string): number[] {
  let temp = text.replace(/\.00\b/g, '');
  const matches = temp.match(/\b\d+(?:[\s,.]\d+)*\b/g) || [];
  const results: number[] = [];
  for (const m of matches) {
    const cleanVal = m.replace(/[\s,.]/g, '');
    const num = parseInt(cleanVal, 10);
    if (!isNaN(num)) {
      results.push(num);
    }
  }
  return results;
}

// Payment notification listener
bot.on('channel_post', async (ctx) => {
  const channelId = ctx.chat.id.toString();
  
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings || settings.paymentChannelId !== channelId) {
    return; // Not the payment notification channel
  }

  const text = (ctx.channelPost as any).text || "";
  if (!text) return;

  const pendingPayments = await prisma.payment.findMany({ 
    where: { status: 'PENDING' },
    include: { channel: true }
  });

  const extractedNumbers = extractNumbers(text);
  const exactMatches: any[] = [];

  for (const num of extractedNumbers) {
    for (const payment of pendingPayments) {
      if (payment.amount === num) {
        exactMatches.push(payment);
      }
    }
  }

  const uniqueExactMatches = exactMatches.filter((p, index, self) => 
    self.findIndex(t => t.id === p.id) === index
  );

  for (const payment of uniqueExactMatches) {
    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' }
      });

      // Create an AdTask WAITING_CONTENT
      await prisma.adTask.create({
        data: {
          userId: payment.userId,
          channelId: payment.channelId,
          paymentId: payment.id,
          status: 'WAITING_CONTENT'
        }
      });

      await bot.telegram.sendMessage(
        payment.userId, 
        `✅ To'lovingiz (${payment.amount.toLocaleString()} UZS) tasdiqlandi!\n\nIltimos, **${payment.channel.title}** kanaliga joylanishi kerak bo'lgan reklama xabarini (matn, rasm yoki video) menga yuboring.`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error("Auto confirmation error for payment ID " + payment.id + ":", err);
    }
  }
});

// Listener for user ad content submission
bot.on('message', async (ctx) => {
  if (ctx.chat.type !== 'private') return;
  const userId = ctx.from.id.toString();

  const waitingTask = await prisma.adTask.findFirst({
    where: {
      userId,
      status: 'WAITING_CONTENT'
    },
    include: { channel: true },
    orderBy: { createdAt: 'asc' }
  });

  if (!waitingTask) return; // User is not expected to send an ad right now

  try {
    // Copy message to target channel
    const msg = await bot.telegram.copyMessage(waitingTask.channelId, ctx.chat.id, ctx.message.message_id);
    
    // Update AdTask
    const postedAt = new Date();
    const deleteAt = new Date(postedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

    await prisma.adTask.update({
      where: { id: waitingTask.id },
      data: {
        status: 'POSTED',
        messageIdInChannel: msg.message_id,
        postedAt,
        deleteAt
      }
    });

    await ctx.reply(`✅ Reklamangiz **${waitingTask.channel.title}** kanaliga muvaffaqiyatli joylandi!\n\nU 24 soatdan so'ng avtomatik o'chiriladi.`, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error("Error copying ad message:", err);
    if (err.description && err.description.includes('chat not found')) {
      await ctx.reply(`❌ Xatolik yuz berdi. Bot **${waitingTask.channel.title}** kanaliga post joylash uchun admin huquqiga ega emas. Iltimos, admin bilan bog'laning.`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ Xatolik yuz berdi: ${err.message}`);
    }
  }
});

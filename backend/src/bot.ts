import { Telegraf, Markup } from 'telegraf';
import { prisma } from './prisma';
import 'dotenv/config';

export const bot = new Telegraf(process.env.BOT_TOKEN || 'dummy_token');

const getWebAppUrl = (path: string = '') => {
  let url = process.env.WEBAPP_URL || 'https://google.com';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url + path;
};

bot.start(async (ctx) => {
  const user = ctx.from;
  if (user) {
    const existingUser = await prisma.user.findUnique({ where: { id: user.id.toString() } });
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

    if (!existingUser) {
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      const adminId = process.env.ADMIN_ID;
      if (settings?.notifyNewUser && adminId) {
        bot.telegram.sendMessage(
          adminId, 
          `🔔 *Yangi a'zo!*\nFoydalanuvchi: ${user.first_name} ${user.username ? `(@${user.username})` : ''}`, 
          { parse_mode: 'Markdown' }
        ).catch(() => null);
      }
    }
  }

  const webAppUrl = getWebAppUrl();

  await ctx.reply(
    '▶️ Salom! YouTube Kanal Savdosi platformasiga xush kelibsiz.\n\nKatalogdagi kanallarni ko\'rish yoki o\'z kanalingizni sotish uchun quyidagi tugmani bosing:',
    Markup.inlineKeyboard([
      Markup.button.webApp('🔥 Kanal Bozori', webAppUrl)
    ])
  );
});

bot.command('admin', async (ctx) => {
  const adminId = process.env.ADMIN_ID;
  const webAppUrl = getWebAppUrl('?admin=true');

  if (!adminId || ctx.from.id.toString() !== adminId) {
    return;
  }

  await ctx.reply(
    '👮‍♂️ Admin panelga xush kelibsiz!',
    Markup.inlineKeyboard([
      Markup.button.webApp('⚙️ Boshqaruv paneli', webAppUrl)
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
    return;
  }

  const text = (ctx.channelPost as any).text || "";
  if (!text) return;

  const pendingPayments = await prisma.payment.findMany({ 
    where: { status: 'PENDING' },
    include: { listing: true, user: true }
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

      if (payment.type === 'LISTING') {
        await bot.telegram.sendMessage(
          payment.userId, 
          `✅ YouTube kanal e'lon qilish uchun to'lovingiz (${payment.amount.toLocaleString()} UZS) tasdiqlandi!\n\nIltimos, Ilovaga kirib kanalingiz ma'lumotlarini to'ldiring.`,
          { parse_mode: 'Markdown' }
        );
        
        const adminId = process.env.ADMIN_ID;
        if (settings?.notifyNewPayment && adminId) {
          bot.telegram.sendMessage(
            adminId, 
            `💰 *Yangi E'lon To'lovi Tasdiqlandi!*\nSumma: ${payment.amount.toLocaleString()} UZS\nMijoz ID: ${payment.userId}`, 
            { parse_mode: 'Markdown' }
          ).catch(() => null);
        }
      } else if (payment.type === 'PURCHASE') {
        const listing = await prisma.listing.findUnique({
          where: { id: payment.listingId! },
          include: { seller: true }
        });

        if (listing) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { status: 'SOLD' }
          });

          let sellerUrl = `tg://user?id=${listing.sellerId}`;
          if (listing.seller?.username) {
            sellerUrl = `https://t.me/${listing.seller.username}`;
          }

          await bot.telegram.sendMessage(
            payment.userId, 
            `✅ Kanal xaridi uchun to'lovingiz (${payment.amount.toLocaleString()} UZS) tasdiqlandi!\n\nBu tugma sizni kanal egasi bilan bog'laydi, kanal egasi bilan suhbatlashing admin ko'rgach kanal sizga o'tkazib beriladi.`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[{ text: 'Kanal egasi bilan bog\'lanish', url: sellerUrl }]]
              }
            }
          );
          
          if (listing.sellerId) {
            bot.telegram.sendMessage(
              listing.sellerId,
              `🎉 *Xushxabar! Kanalingiz sotib olindi!*\n\n` +
              `Xaridor: **${payment.user?.firstName || 'Mijoz'}**\n` +
              `Kanal: **${listing.channelName}**\n` +
              `To'lov summasi: **${payment.amount.toLocaleString()} UZS**\n\n` +
              `Qo'rqmasdan kanalni o'tkazing, kanal uchun to'langan pul admin qo'lida. Kanal to'liq yangi egasiga o'tkazilgach pulingiz o'tkazib beriladi. Iltimos, xaridor bilan bog'lanib, o'tkazish jarayonini yakunlang.`,
              { parse_mode: 'Markdown' }
            ).catch(() => null);
          }
        } else {
          await bot.telegram.sendMessage(
            payment.userId, 
            `✅ Kanal xaridi uchun to'lovingiz tasdiqlandi, lekin kanal topilmadi. Admin bilan bog'laning.`,
            { parse_mode: 'Markdown' }
          );
        }

        const adminId = process.env.ADMIN_ID;
        if (settings?.notifyNewPayment && adminId) {
          bot.telegram.sendMessage(
            adminId, 
            `💰 *Yangi Kanal Xaridi!*\nKanal: ${payment.listing?.channelName}\nSumma: ${payment.amount.toLocaleString()} UZS\nXaridor ID: ${payment.userId}`, 
            { parse_mode: 'Markdown' }
          ).catch(() => null);
        }
      }
    } catch (err) {
      console.error("Auto confirmation error for payment ID " + payment.id + ":", err);
    }
  }
});

// Withdraw Handlers
bot.action(/withdraw_approve_(\d+)/, async (ctx) => {
  try {
    const withdrawalId = parseInt(ctx.match[1]);
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    
    if (!withdrawal) {
      return ctx.answerCbQuery("So'rov topilmadi", { show_alert: true });
    }
    if (withdrawal.status !== 'PENDING') {
      return ctx.answerCbQuery(`Allaqachon ${withdrawal.status}`, { show_alert: true });
    }

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'COMPLETED' }
    });

    await ctx.answerCbQuery("To'lov tasdiqlandi!");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => null);
    await ctx.reply(`✅ So'rov ID: ${withdrawalId} tasdiqlandi.`);

    await bot.telegram.sendMessage(
      withdrawal.userId,
      `✅ Hisobingiz (${withdrawal.amount.toLocaleString()} UZS) ko'rsatilgan karta raqamiga o'tkazib berildi.\n\nDaromadingiz bardavom bo'lsin, platformamizni tanlaganingiz uchun rahmat! 🌟`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error(err);
    ctx.answerCbQuery("Xatolik yuz berdi", { show_alert: true });
  }
});

bot.action(/withdraw_reject_(\d+)/, async (ctx) => {
  try {
    const withdrawalId = parseInt(ctx.match[1]);
    const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    
    if (!withdrawal) {
      return ctx.answerCbQuery("So'rov topilmadi", { show_alert: true });
    }
    if (withdrawal.status !== 'PENDING') {
      return ctx.answerCbQuery(`Allaqachon ${withdrawal.status}`, { show_alert: true });
    }

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'REJECTED' }
    });

    await ctx.answerCbQuery("So'rov rad etildi!");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => null);
    await ctx.reply(`❌ So'rov ID: ${withdrawalId} rad etildi.`);

    await bot.telegram.sendMessage(
      withdrawal.userId,
      `❌ Sizning pul yechish so'rovingiz (${withdrawal.amount.toLocaleString()} UZS) rad etildi. Iltimos, admin bilan bog'laning.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error(err);
    ctx.answerCbQuery("Xatolik yuz berdi", { show_alert: true });
  }
});

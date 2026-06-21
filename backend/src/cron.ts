import { prisma } from './prisma';
import { bot } from './bot';

export function startCronJobs() {
  // 1. Auto-cancel payments older than 15 minutes (every 1 minute)
  setInterval(async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const expiredPayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: fifteenMinutesAgo }
        }
      });

      if (expiredPayments.length > 0) {
        await prisma.payment.updateMany({
          where: {
            status: 'PENDING',
            createdAt: { lt: fifteenMinutesAgo }
          },
          data: { status: 'CANCELLED' }
        });

        for (const pay of expiredPayments) {
          try {
            await bot.telegram.sendMessage(
              pay.userId,
              `⏰ To'lov muddati tugadi (15 daqiqa). To'lov bekor qilindi.\n\nQaytadan urinish uchun /start buyrug'ini yuboring.`
            );
          } catch (err) {}
        }
      }
    } catch (err) {
      console.error('[CRON] Payment timeout error:', err);
    }
  }, 60 * 1000); // Every 1 minute

  // 2. Auto-delete ads after 24 hours (every 1 minute)
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredAds = await prisma.adTask.findMany({
        where: {
          status: 'POSTED',
          deleteAt: { lte: now }
        },
        include: { channel: true, user: true }
      });

      for (const ad of expiredAds) {
        try {
          if (ad.messageIdInChannel) {
            await bot.telegram.deleteMessage(ad.channelId, ad.messageIdInChannel);
          }
        } catch (err) {
          console.error(`Failed to delete message ${ad.messageIdInChannel} in ${ad.channelId}:`, err);
        }

        await prisma.adTask.update({
          where: { id: ad.id },
          data: { status: 'DELETED' }
        });

        try {
          await bot.telegram.sendMessage(
            ad.userId,
            `⏰ Sizning **${ad.channel.title}** kanaliga joylangan reklamangiz muddati (24 soat) tugadi va kanaldan o'chirildi. Hamkorlik uchun rahmat!`,
            { parse_mode: 'Markdown' }
          );
        } catch (err) {}
      }
    } catch (err) {
      console.error('[CRON] Ad deletion error:', err);
    }
  }, 60 * 1000); // Every 1 minute
}

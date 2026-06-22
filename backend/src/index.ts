import { app } from './api';
import { bot } from './bot';
import { startCronJobs } from './cron';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  // Start cron jobs
  startCronJobs();

  // Start express server
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (0.0.0.0)`);
  });

  // Start bot
  bot.launch().then(() => {
    console.log('Bot started successfully');
  }).catch((err) => {
    console.error('Bot failed to start', err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

bootstrap();

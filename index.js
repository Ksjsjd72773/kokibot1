
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('bedrock-protocol');
const axios = require('axios');

// إعدادات البوت
const TOKEN = '7648670732:AAHcQpPAq2CogKtWQQ8H65xd5ZZpW7PZ1eM';
const CHANNELS = ['@jgjghghvc', '@jhjgkghhhgc'];

const bot = new TelegramBot(TOKEN, { polling: true });
let servers = {};

// تحقق من الاشتراك
async function isUserSubscribed(userId) {
  try {
    const results = await Promise.all(CHANNELS.map(async (channel) => {
      const res = await axios.get(`https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`);
      return ['member', 'administrator', 'creator'].includes(res.data.result.status);
    }));
    return results.every(status => status);
  } catch {
    return false;
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const subscribed = await isUserSubscribed(userId);
  if (!subscribed) {
    return bot.sendMessage(chatId, '⌯ يجب عليك الاشتراك في القنوات التالية لاستخدام البوت:
' +
      CHANNELS.map(c => `- ${c}`).join('\n'));
  }

  bot.sendMessage(chatId, '⌯ أرسل IP و Port السيرفر الخاص بك بهذا الشكل:
`IP PORT`', { parse_mode: 'Markdown' });

  bot.once("message", async (msg2) => {
    const [ip, port] = msg2.text.split(" ");
    if (!ip || !port) return bot.sendMessage(chatId, '⌯ تنسيق غير صحيح. أعد المحاولة.');

    servers[chatId] = { ip, port: parseInt(port) };
    bot.sendMessage(chatId, `⌯ تم الحفظ، سيتم الدخول إلى السيرفر ${ip}:${port}`);

    connectToServer(chatId);
  });
});

function connectToServer(chatId) {
  const server = servers[chatId];
  if (!server) return;

  const client = createClient({
    host: server.ip,
    port: server.port,
    username: 'kokibot',
    offline: true
  });

  client.on('join', () => {
    bot.sendMessage(chatId, '⌯ تم الدخول للسيرفر! سأرقص الآن!');
    client.write('chat', { message: 'أنا راقصة اح اح' });
    client.write('position', { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, onGround: true });
  });

  client.on('end', () => {
    bot.sendMessage(chatId, '⌯ تم الخروج من السيرفر، سأعيد الاتصال تلقائيًا...');
    setTimeout(() => connectToServer(chatId), 5000);
  });

  client.on('error', (err) => {
    bot.sendMessage(chatId, '⌯ حدث خطأ: ' + err.message);
  });
}

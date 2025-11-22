const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');

const BOT_TOKEN = '8579547514:AAFJQR6CL_Ui2Q8-Ac0g_y4vBtwrR4tXraU';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Инициализация бота
const bot = new Telegraf(BOT_TOKEN);

// Получаем URL для мини-приложения
const getMiniAppUrl = (req) => {
  const host = req.get('host');
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

// Хранилище данных (в продакшене используйте базу данных)
const userData = new Map();

// Функция для получения данных пользователя
function getUserData(userId) {
  if (!userData.has(userId)) {
    userData.set(userId, {
      balance: {
        BTC: 0.054321,
        ETH: 1.23456,
        USDT: 1250.75
      },
      totalBalance: 4850.25,
      transactions: [
        {
          type: 'receive',
          amount: 0.012345,
          currency: 'BTC',
          hash: '0xa1b2c3d4e5f678901234567890abcdef1234567890abcdef',
          timestamp: Date.now() - 86400000,
          from: '0x742d35Cc6634C0532925a3b8Dc9F'
        },
        {
          type: 'send',
          amount: 0.005432,
          currency: 'BTC',
          hash: '0xe5f6g7h8i9j01234567890klmnopqrstuvwxyz012345',
          timestamp: Date.now() - 172800000,
          to: '0x8932d35Cc6634C0532925a3b8Dc9F'
        }
      ],
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`
    });
  }
  return userData.get(userId);
}

// Команда /start
bot.start(async (ctx) => {
  const miniAppUrl = `https://${ctx.req.headers.host}`;
  
  const welcomeText = `🚀 **Добро пожаловать в CryptoWallet!**\n\n` +
    `Ваш надежный цифровой кошелек для управления криптовалютой.\n\n` +
    `📱 **Основные функции:**\n` +
    `• Баланс и портфель\n` +
    `• Переводы между пользователями\n` +
    `• История транзакций\n` +
    `• Курсы криптовалют\n` +
    `• Безопасное хранение\n\n` +
    `Нажмите кнопку ниже, чтобы открыть кошелек 👇`;

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('📱 Открыть CryptoWallet', miniAppUrl)],
      [Markup.button.callback('💰 Мой баланс', 'balance'), Markup.button.callback('📋 История', 'history')],
      [Markup.button.callback('ℹ️ Помощь', 'help')]
    ])
  });
});

// Команда /wallet
bot.command('wallet', async (ctx) => {
  const miniAppUrl = `https://${ctx.req.headers.host}`;
  
  await ctx.reply('Откройте ваш крипто-кошелек:', {
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Открыть CryptoWallet', miniAppUrl)]
    ])
  });
});

// Обработка callback запросов
bot.action('balance', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  
  await ctx.answerCbQuery();
  await ctx.reply(`💰 **Ваш баланс:**\n\n` +
    `₿ BTC: ${user.balance.BTC.toFixed(8)}\n` +
    `Ξ ETH: ${user.balance.ETH.toFixed(6)}\n` +
    `💵 USDT: ${user.balance.USDT.toFixed(2)}\n\n` +
    `💵 **Общий баланс:** $${user.totalBalance.toFixed(2)}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('📱 Открыть кошелек', `https://${ctx.req.headers.host}`)]
    ])
  });
});

bot.action('history', async (ctx) => {
  const userId = ctx.from.id;
  const user = getUserData(userId);
  
  await ctx.answerCbQuery();
  
  const lastTransactions = user.transactions.slice(-3);
  let historyText = `📋 **Последние транзакции:**\n\n`;
  
  lastTransactions.forEach((tx, index) => {
    historyText += `${index + 1}. ${tx.type === 'send' ? '➡️ Отправлено' : '⬅️ Получено'} ${tx.amount} ${tx.currency}\n`;
    historyText += `   🔗 ${tx.hash.substring(0, 20)}...\n`;
    historyText += `   📅 ${new Date(tx.timestamp).toLocaleDateString('ru-RU')}\n\n`;
  });
  
  await ctx.reply(historyText, {
    parse_mode: 'Markdown'
  });
});

bot.action('help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`❓ **Помощь по CryptoWallet**\n\n` +
    `**Как пользоваться:**\n` +
    `• Нажмите "Открыть CryptoWallet" для доступа к кошельку\n` +
    `• Просматривайте баланс во вкладке "Портфель"\n` +
    `• Отправляйте криптовалюту через "Отправить"\n` +
    `• Следите за транзакциями в "Истории"\n\n` +
    `⚠️ **Внимание:** Это демо-версия с тестовыми данными.`, {
    parse_mode: 'Markdown'
  });
});

// API endpoint для получения данных пользователя
app.get('/api/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = getUserData(userId);
  
  res.json({
    success: true,
    data: user
  });
});

// API endpoint для отправки транзакции
app.post('/api/transaction', (req, res) => {
  const { userId, currency, amount, toAddress } = req.body;
  
  if (!userId || !currency || !amount || !toAddress) {
    return res.status(400).json({
      success: false,
      error: 'Не все поля заполнены'
    });
  }
  
  const user = getUserData(userId);
  
  // Проверка баланса
  if (user.balance[currency] < amount) {
    return res.status(400).json({
      success: false,
      error: 'Недостаточно средств'
    });
  }
  
  // Обновление баланса
  user.balance[currency] -= amount;
  
  // Добавление транзакции
  const transaction = {
    type: 'send',
    amount: amount,
    currency: currency,
    hash: '0x' + Math.random().toString(16).substr(2, 40),
    timestamp: Date.now(),
    to: toAddress
  };
  
  user.transactions.unshift(transaction);
  
  res.json({
    success: true,
    data: {
      transaction: transaction,
      newBalance: user.balance[currency]
    }
  });
});

// Запуск бота
bot.launch().then(() => {
  console.log('🤖 Crypto Bot запущен!');
});

// Обработка graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Экспорт для Vercel
module.exports = app;

const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const config = require('./config/config');
const User = require('./models/User');
const Task = require('./models/Task');
const Transaction = require('./models/Transaction');
const Withdrawal = require('./models/Withdrawal');

// Initialize bot
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

/* ---------------- USER MIDDLEWARE ---------------- */
bot.use(async (ctx, next) => {
  const telegramId = ctx.from.id;

  try {
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({
        telegramId,
        username: ctx.from.username || '',
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        languageCode: ctx.from.language_code || 'en',
        isBot: ctx.from.is_bot || false
      });

      await user.save();

      await ctx.reply(
        `Welcome to ${config.BOT_NAME}! 🎉\n\n` +
        `Earn ${config.CURRENCY_SYMBOL} by completing tasks.\n\n` +
        `Use /menu to see options.`,
        Markup.inlineKeyboard([
          [Markup.button.url('👥 Join Our Channel', 'https://t.me/yourchannel')]
        ])
      );
    } else {
      user.lastActive = new Date();
      await user.save();
    }

    ctx.state.user = user;
    return next();

  } catch (error) {
    console.error('Middleware error:', error);
    return next();
  }
});

/* ---------------- START COMMAND ---------------- */
bot.start(async (ctx) => {
  const user = ctx.state.user;

  const welcomeMessage = `
Welcome back, ${user.firstName}! 👋

${config.BOT_NAME} - Earn ${config.CURRENCY_SYMBOL} by tasks!

📊 Balance: ${config.CURRENCY_SYMBOL}${user.balance}
🎯 Level: ${user.level}
👥 Referrals: ${user.referrals.length}
`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('📋 Main Menu', 'menu')],
      [Markup.button.callback('💰 Check Balance', 'balance')],
      [Markup.button.callback('🎯 View Tasks', 'tasks')]
    ])
  });
});

/* ---------------- MENU ---------------- */
bot.command('menu', async (ctx) => {
  const user = ctx.state.user;

  const menuMessage = `
🏠 Main Menu

💰 Balance: ${config.CURRENCY_SYMBOL}${user.balance}
🎯 Level: ${user.level}
`;

  await ctx.reply(menuMessage, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Balance', 'balance'),
        Markup.button.callback('🎯 Tasks', 'tasks')
      ],
      [
        Markup.button.callback('👥 Referral', 'referral'),
        Markup.button.callback('📊 Stats', 'stats')
      ],
      [
        Markup.button.callback('💸 Withdraw', 'withdraw'),
        Markup.button.callback('🏆 Leaderboard', 'leaderboard')
      ]
    ])
  });
});

/* ---------------- BALANCE ---------------- */
bot.command('balance', async (ctx) => {
  const user = ctx.state.user;

  const transactions = await Transaction.find({ userId: user.telegramId })
    .sort({ createdAt: -1 })
    .limit(5);

  let transactionList = transactions.length
    ? transactions.map(t => {
        const sign = t.type === 'withdrawal' ? '-' : '+';
        return `${t.createdAt.toDateString()}: ${sign}${config.CURRENCY_SYMBOL}${t.amount} - ${t.description}`;
      }).join('\n')
    : 'No transactions yet.';

  await ctx.reply(
    `💰 Your Balance\n\n${config.CURRENCY_SYMBOL}${user.balance}\n\n${transactionList}`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Back to Menu', 'menu')]
      ])
    }
  );
});

/* ---------------- TASKS ---------------- */
bot.command('tasks', async (ctx) => {
  const user = ctx.state.user;

  const tasks = await Task.find({
    isActive: true,
    expiryDate: { $gt: new Date() },
    'completedBy.userId': { $ne: user.telegramId }
  }).limit(10);

  if (tasks.length === 0) {
    return ctx.reply(
      'No tasks available at the moment.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Back to Menu', 'menu')]
      ])
    );
  }

  let msg = `🎯 Available Tasks\n\n`;

  tasks.forEach((task, i) => {
    msg += `${i + 1}. ${task.title}\nReward: ${config.CURRENCY_SYMBOL}${task.reward}\n\n`;
  });

  await ctx.reply(msg, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Back to Menu', 'menu')]
    ])
  });
});

/* ---------------- REFERRAL ---------------- */
bot.command('referral', async (ctx) => {
  const user = ctx.state.user;

  const referralLink = `https://t.me/${config.BOT_USERNAME}?start=${user.telegramId}`;

  await ctx.reply(
    `👥 Referral Link:\n${referralLink}\n\nReferrals: ${user.referrals.length}`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.url('📋 Open Link', referralLink),
          Markup.button.callback('🏠 Menu', 'menu')
        ]
      ])
    }
  );
});

/* ---------------- STATS ---------------- */
bot.command('stats', async (ctx) => {
  const user = ctx.state.user;

  await ctx.reply(
    `📊 Stats\n\nBalance: ${config.CURRENCY_SYMBOL}${user.balance}\nLevel: ${user.level}`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Menu', 'menu')]
      ])
    }
  );
});

/* ---------------- WITHDRAW ---------------- */
bot.command('withdraw', async (ctx) => {
  const user = ctx.state.user;

  if (user.balance < config.MIN_WITHDRAWAL_AMOUNT) {
    return ctx.reply(
      `❌ Minimum withdrawal is ${config.MIN_WITHDRAWAL_AMOUNT}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Menu', 'menu')]
      ])
    );
  }

  await ctx.reply(
    `💸 Withdraw Request\nBalance: ${config.CURRENCY_SYMBOL}${user.balance}`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('bKash', 'withdraw_bkash'),
          Markup.button.callback('Nagad', 'withdraw_nagad')
        ],
        [
          Markup.button.callback('Crypto', 'withdraw_crypto'),
          Markup.button.callback('🏠 Menu', 'menu')
        ]
      ])
    }
  );
});

/* ---------------- CALLBACK ---------------- */
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const user = ctx.state.user;

  await ctx.answerCbQuery();

  try {
    if (data === 'menu') {
      return ctx.editMessageText('🏠 Main Menu', {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 Balance', 'balance'),
            Markup.button.callback('🎯 Tasks', 'tasks')
          ]
        ])
      });
    }

    if (data === 'balance') {
      return ctx.editMessageText(
        `💰 Balance: ${config.CURRENCY_SYMBOL}${user.balance}`,
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')]
          ])
        }
      );
    }

    if (data === 'tasks') {
      const tasks = await Task.find({ isActive: true }).limit(5);

      let msg = '🎯 Tasks\n\n';
      tasks.forEach((t, i) => {
        msg += `${i + 1}. ${t.title}\n`;
      });

      return ctx.editMessageText(msg, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Menu', 'menu')]
        ])
      });
    }

    if (data.startsWith('withdraw_')) {
      return ctx.editMessageText(
        `Withdraw: ${data}`,
        {
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')]
          ])
        }
      );
    }

  } catch (err) {
    console.error(err);
  }
});

/* ---------------- ERROR ---------------- */
bot.catch((err) => {
  console.error(err);
});

/* ---------------- LAUNCH ---------------- */
bot.launch()
  .then(() => console.log(`${config.BOT_NAME} running`));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

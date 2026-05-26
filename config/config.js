module.exports = {
  // Telegram Bot Token (এখানে নিজের টোকেন বসাবে)
  TELEGRAM_BOT_TOKEN: 'YOUR_TELEGRAM_BOT_TOKEN',

  // MongoDB Atlas URI (এখানে নিজের URI বসাবে)
  MONGODB_URI: 'mongodb+srv://mongodbpy_db_user:pPgtRKyHsm8GvJF2@cluster0.u2ft5ps.mongodb.net/?appName=Cluster0.u2ft5ps.mongodb.net/telegram-task-bot?retryWrites=true&w=majority',

  // Bot Configuration
  BOT_NAME: 'TaskBot',
  BOT_USERNAME: 'your_bot_username',

  // Currency Configuration
  CURRENCY_NAME: 'Coins',
  CURRENCY_SYMBOL: '💰',

  // Task Configuration
  DEFAULT_TASK_REWARD: 10,
  MAX_DAILY_TASKS: 20,
  TASK_EXPIRY_HOURS: 24,

  // Withdrawal Configuration
  MIN_WITHDRAWAL_AMOUNT: 100,
  WITHDRAWAL_FEE_PERCENTAGE: 5,

  // Payment Methods
  PAYMENT_METHODS: ['bKash', 'Nagad', 'Crypto'],

  // Referral Configuration
  REFERRAL_REWARD: 50,
  REFERRAL_COMMISSION_PERCENTAGE: 10,

  // Admin Telegram IDs
  ADMIN_IDS: [123456789],

  // Security Configuration
  MAX_REQUESTS_PER_MINUTE: 30,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 5,

  // Web Dashboard Configuration
  WEB_PORT: 3000,
  WEB_HOST: 'localhost',

  // Analytics
  ANALYTICS_INTERVAL_MINUTES: 60,

  // Screenshot Verification Group
  SCREENSHOT_GROUP_ID: '-1000000000000',

  // Protected Link Configuration
  LINK_EXPIRY_MINUTES: 30,
  MAX_CLICKS_PER_LINK: 1
};

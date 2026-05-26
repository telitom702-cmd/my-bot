module.exports = {
  // Telegram Bot Token
  TELEGRAM_BOT_TOKEN: 'YOUR_BOT_TOKEN',

  // Database Configuration
  MONGODB_URI: 'mongodb+srv://mongodbpy_db_user:pPgtRKyHsm8GvJF2@cluster0.u2ft5ps.mongodb.net/?appName=Cluster0',

  // Bot Configuration
  BOT_NAME: 'TaskBot',
  BOT_USERNAME: 'jacpotflm_bot',

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
  ADMIN_IDS: [8248792819],

  // Security Configuration
  MAX_REQUESTS_PER_MINUTE: 30,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 5,

  // Web Dashboard Configuration
  WEB_PORT: 3000,
  WEB_HOST: 'localhost',

  // Analytics Configuration
  ANALYTICS_INTERVAL_MINUTES: 60,

  // Screenshot Verification Group
  SCREENSHOT_GROUP_ID: '-1003194263389',

  // Protected Link Configuration
  LINK_EXPIRY_MINUTES: 30,
  MAX_CLICKS_PER_LINK: 1
};

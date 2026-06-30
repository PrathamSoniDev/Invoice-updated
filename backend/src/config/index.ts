import dotenv from "dotenv";
import path from "path";
import process from "process";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Config {
  app: {
    name: string;
    env: string;
    port: number;
    apiPrefix: string;
    url: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
    prefix: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    refreshRememberMeExpiresIn: string;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  email: {
    provider: string;
    from: string;
    fromName: string;
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
    };
    sendgrid?: { apiKey: string };
  };
  storage: {
    provider: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    authMax: number;
  };
  security: {
    bcryptSaltRounds: number;
    passwordMinLength: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    passwordResetExpiry: number;
    sessionTimeoutMinutes: number;
    maxConcurrentSessions: number;
    gatewayEncryptionKey: string;
  };
  queues: {
    email: string;
    whatsapp: string;
    export: string;
    notification: string;
    audit: string;
    sync: string;
    invoice: string;
    report: string;
    cleanup: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

const config: Config = {
  app: {
    name: getEnv("APP_NAME", "InvoiceGen"),
    env: getEnv("NODE_ENV", "development"),
    port: parseInt(getEnv("PORT", "4000"), 10),
    apiPrefix: getEnv("API_PREFIX", "/api/v1"),
    url: getEnv("APP_URL", "http://localhost:5173"),
  },
  database: {
    url: getEnv("DATABASE_URL", "mysql://root:@localhost:3306/invoicegen"),
  },
  redis: {
    url: getEnv("REDIS_URL", "redis://localhost:6379"),
    prefix: getEnv("REDIS_PREFIX", "invoicegen:"),
  },
  jwt: {
    secret: getEnv("JWT_SECRET", "dev-secret-change-in-production"),
    expiresIn: getEnv("JWT_EXPIRES_IN", "15m"),
    refreshExpiresIn: getEnv("REFRESH_TOKEN_EXPIRES_IN", "7d"),
    refreshRememberMeExpiresIn: getEnv(
      "REFRESH_TOKEN_REMEMBER_ME_EXPIRES_IN",
      "30d",
    ),
  },
  cors: {
    origins: getEnv("CORS_ORIGINS", "http://localhost:5173")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  },
  email: {
    provider: getEnv("EMAIL_PROVIDER", "log"),
    from: getEnv("EMAIL_FROM", "noreply@invoicegen.com"),
    fromName: getEnv("EMAIL_FROM_NAME", "InvoiceGen"),
  },
  storage: {
    provider: getEnv("STORAGE_PROVIDER", "local"),
  },
  rateLimit: {
    windowMs: parseInt(getEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10),
    max: parseInt(getEnv("RATE_LIMIT_MAX_REQUESTS", "100"), 10),
    authMax: parseInt(getEnv("RATE_LIMIT_AUTH_MAX", "5"), 10),
  },
  security: {
    bcryptSaltRounds: parseInt(getEnv("BCRYPT_SALT_ROUNDS", "10"), 10),
    passwordMinLength: parseInt(getEnv("PASSWORD_MIN_LENGTH", "8"), 10),
    maxLoginAttempts: parseInt(getEnv("MAX_LOGIN_ATTEMPTS", "5"), 10),
    lockoutDuration:
      parseInt(getEnv("LOGIN_LOCKOUT_DURATION_MINUTES", "30"), 10) * 60 * 1000,
    passwordResetExpiry: 60 * 60 * 1000,
    sessionTimeoutMinutes: parseInt(
      getEnv("SESSION_TIMEOUT_MINUTES", "30"),
      10,
    ),
    maxConcurrentSessions: parseInt(getEnv("MAX_CONCURRENT_SESSIONS", "5"), 10),
    gatewayEncryptionKey: getEnv(
      "GATEWAY_ENCRYPTION_KEY",
      "dev-encryption-key-32-chars-change!",
    ),
  },
  queues: {
    email: getEnv("QUEUE_EMAIL", "email:queue"),
    whatsapp: getEnv("QUEUE_WHATSAPP", "whatsapp:queue"),
    export: getEnv("QUEUE_EXPORT", "export:queue"),
    notification: getEnv("QUEUE_NOTIFICATION", "notification:queue"),
    audit: getEnv("QUEUE_AUDIT", "audit:queue"),
    sync: getEnv("QUEUE_SYNC", "sync:queue"),
    invoice: getEnv("QUEUE_INVOICE", "invoice:queue"),
    report: getEnv("QUEUE_REPORT", "report:queue"),
    cleanup: getEnv("QUEUE_CLEANUP", "cleanup:queue"),
  },
  logging: {
    level: getEnv("LOG_LEVEL", "info"),
    format: getEnv("LOG_FORMAT", "dev"),
  },
};

export default config;

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    sessionId?: string;
    host?: string;
    username?: string;
  }
}
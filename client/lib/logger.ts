const LOG_SINK = (import.meta.env.VITE_LOG_SINK_URL as string) || "";

function formatArg(a: any) {
  if (a instanceof Error) return { message: a.message, stack: a.stack };
  try {
    return typeof a === 'object' ? JSON.stringify(a) : String(a);
  } catch (e) {
    return String(a);
  }
}

function sendToSink(payload: any) {
  if (!LOG_SINK) return;
  try {
    // use navigator.sendBeacon if available for reliability on unload
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(LOG_SINK, body);
      return;
    }
    void fetch(LOG_SINK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch (e) {
    // swallow
  }
}

const logger = {
  info: (...args: unknown[]) => {
    if (import.meta.env.MODE !== 'production') console.info(...args);
    sendToSink({ level: 'info', ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.MODE !== 'production') console.warn(...args);
    sendToSink({ level: 'warn', ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  error: (...args: unknown[]) => {
    if (import.meta.env.MODE !== 'production') console.error(...args);
    sendToSink({ level: 'error', ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  debug: (...args: unknown[]) => {
    if (import.meta.env.MODE !== 'production') console.debug(...args);
    sendToSink({ level: 'debug', ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
};

export default logger;

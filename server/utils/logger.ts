import process from "process";

const LOG_SINK_URL = process.env.LOG_SINK_URL || "";

function formatArg(a: any) {
  if (a instanceof Error) return { message: a.message, stack: a.stack };
  try {
    return typeof a === 'object' ? JSON.stringify(a) : String(a);
  } catch (e) {
    return String(a);
  }
}

async function sendToSink(payload: any) {
  if (!LOG_SINK_URL) return;
  try {
    // best-effort async send; do not block
    await fetch(LOG_SINK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // ignore sink errors to avoid crashing server
  }
}

const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.info(...args);
    if (LOG_SINK_URL) sendToSink({ level: "info", ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.warn(...args);
    if (LOG_SINK_URL) sendToSink({ level: "warn", ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.error(...args);
    if (LOG_SINK_URL) sendToSink({ level: "error", ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.debug(...args);
    if (LOG_SINK_URL && process.env.NODE_ENV === "production") sendToSink({ level: "debug", ts: new Date().toISOString(), msg: args.map(formatArg) });
  },
};

export default logger;

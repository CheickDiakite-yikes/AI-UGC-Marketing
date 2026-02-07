export type PerfMeta = Record<string, string | number | boolean | null | undefined>;

const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isPerfLoggingEnabled() {
  const flag = process.env.PERF_LOGS ?? process.env.PREDI_PERF_LOGS ?? '';
  return ENABLED_VALUES.has(flag.toLowerCase());
}

function formatMeta(meta: PerfMeta) {
  const cleanEntries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (cleanEntries.length === 0) {
    return '';
  }

  return ` ${JSON.stringify(Object.fromEntries(cleanEntries))}`;
}

export function createPerfTimer(scope: string, baseMeta: PerfMeta = {}) {
  const enabled = isPerfLoggingEnabled();
  const startMs = Date.now();

  const log = (event: string, meta: PerfMeta = {}) => {
    if (!enabled) {
      return;
    }

    const elapsedMs = Date.now() - startMs;
    const mergedMeta = { ...baseMeta, ...meta };
    console.info(`[PERF] ${scope} ${event} ${elapsedMs}ms${formatMeta(mergedMeta)}`);
  };

  return {
    mark: log,
    done: (meta: PerfMeta = {}) => {
      log('done', meta);
    },
  };
}

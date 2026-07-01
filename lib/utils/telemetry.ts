type TelemetryEvent = {
  name: string;
  detail?: Record<string, unknown>;
  timestamp: string;
};

const TELEMETRY_BUFFER_LIMIT = 50;
const telemetryBuffer: TelemetryEvent[] = [];

function emitTelemetry(event: TelemetryEvent): void {
  telemetryBuffer.push(event);
  if (telemetryBuffer.length > TELEMETRY_BUFFER_LIMIT) {
    telemetryBuffer.shift();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bcost:telemetry', { detail: event }));
  }
}

export function trackEvent(name: string, detail?: Record<string, unknown>): void {
  emitTelemetry({
    name,
    detail,
    timestamp: new Date().toISOString(),
  });
}

export function getTelemetrySnapshot() {
  return telemetryBuffer.slice(-10);
}

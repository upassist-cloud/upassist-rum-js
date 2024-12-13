import { collect, UpassistRUMEvent } from './collect';
import { evalTrackingToggle, log, patchHistoryAPI } from './helpers';
import { UpassistRUMConfig, RUM_GLOBAL_CONFIG, setConfig } from './config';
import { throttle } from './throttle';
import { listenForCoreWebVitals, listenForErrors } from './listeners';

export type Command = 'track' | 'config' | 'captureError';

export interface UpassistRUMInterpreter {
  (command: 'track', eventName: string, dimensionOverrides?: any): void;
  (command: 'config', conf: Partial<UpassistRUMConfig>): void;
  (command: 'captureError', event: ErrorEvent, dimensionOverrides?: any): void;
}

export const interpret: UpassistRUMInterpreter = (
  command: Command,
  value?: UpassistRUMConfig | string | {},
  dimensionOverrides: Partial<UpassistRUMEvent> = {},
) => {
  switch (command) {
    case 'config':
      if (!value) return log('Passed empty config params');
      config(value as UpassistRUMConfig);
      break;
    case 'track':
      track(value as string, dimensionOverrides);
      break;
    case 'captureError':
      captureError(value, dimensionOverrides);
      break;
    default:
      log(`Unknown command`, command, true);
      return;
  }
};

// Throttle error events to avoid a flood of API calls in case of user mistakes
export const captureError = throttle((event: ErrorEvent, dimensionOverrides: Partial<UpassistRUMEvent> = {}) => {
  track('Error', {
    error_type: event.error?.name || 'Error',
    message: event.error?.message || event.message,
    lineno: event.lineno,
    colno: event.colno,
    filename: event.filename,
    ...dimensionOverrides,
  });
}, 1000);

export const track = (eventName: string, dimensionOverrides: Partial<UpassistRUMEvent> = {}) => {
  const callback = () => collect(eventName, dimensionOverrides);
  // Document has loaded, fire next
  if (document.readyState === 'complete') {
    setTimeout(callback, 0);
  } else {
    // Document hasn't loaded, schedule callback on load
    log('Document not ready, adding event listener');
    window.addEventListener('load', () => {
      setTimeout(callback, 0);
    });
  }
};

export const config = (params: Partial<UpassistRUMConfig>) => {
  const before = { ...RUM_GLOBAL_CONFIG };
  const after = setConfig(params);

  // If tracking mode is 'pageload' we only trigger one pageview, no SPA navigations are followed
  // If tracking mode is 'history' we trigger an initial pageview AND bind to the browser history to track clientside changes
  if (RUM_GLOBAL_CONFIG.trackMode && ['pageload', 'history'].indexOf(RUM_GLOBAL_CONFIG.trackMode) > -1) {
    if (RUM_GLOBAL_CONFIG.trackMode === 'history') {
      if (!window.upassist) browserInit();
      patchHistoryAPI();
    }

    // Send initial event once site is set for the first time
    if (!before.clientKey && after.clientKey) {
      log('Triggering initial pageview');
      track('Pageview');
    }
  }

  log(`Tracking mode: ${RUM_GLOBAL_CONFIG.trackMode}`);
};

export const load = (clientKey: string, conf?: UpassistRUMConfig): void => {
  config({
    clientKey,
    // Disable auto-track on the JS client. Most projects using this library need
    // more control over the event handlers.
    trackMode: 'off',
    ...conf,
  });
  browserInit();
};

export const browserInit = () => {
  // Check if tracking has been enabled/disabled
  evalTrackingToggle();

  // Double check upassist object before inner queue, might not have initialized yet.
  // Any commands user triggered before script has fully loaded will be present in queue
  const commandQueue = (window.upassist && window.upassist.q) || [];
  // @ts-ignore
  window.upassist = interpret;
  window.upassist.q = commandQueue;

  // Process initial queue
  for (const item of commandQueue) {
    window.upassist.apply(this, item);
  }

  // Setup basic JS error tracking
  if (RUM_GLOBAL_CONFIG.autoTrackErrors) {
    listenForErrors();
  }

  // Setup Core Web Vitals
  if (RUM_GLOBAL_CONFIG.autoTrackCoreWebVitals) {
    listenForCoreWebVitals();
  }
};

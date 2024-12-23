import { log } from './helpers';
import { captureError, track } from './commands';
import { onCLS, onFID, onLCP } from 'web-vitals';

export function listenForErrors() {
  if (!!window?.upassist?._listeningForErrors) {
    return;
  }

  window.addEventListener('error', captureError);
  window.upassist._listeningForErrors = true;

  log('Listening for errors');
}

export function listenForCoreWebVitals() {
  if (!!window?.upassist?._listeningForCoreWebVitals) {
    return;
  }

  const handler = (eventName: any, dimension: any) => (event: any) => {
    track(eventName, { [dimension]: event.value });
  };

  onCLS && onCLS(handler('WebVital', 'web_vital_cls'));
  onFID && onFID(handler('WebVital', 'web_vital_fid'));
  onLCP && onLCP(handler('WebVital', 'web_vital_lcp'));

  window.upassist._listeningForCoreWebVitals = true;

  log('Listening for Core Web Vitals');
}

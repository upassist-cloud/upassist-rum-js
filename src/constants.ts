import { UpassistRUMInterpreter } from './commands';

export const constants = {
  DEBUG_FLAG: `upassist_rum_debug`,
  TRACKING_ENABLED: `upassist_rum_enable`,
  TRACKING_DISABLED: `upassist_rum_disable`,
  SESSION_COOKIE: `_upassist_session_id`,
  CLIENT_COOKIE: `_upassist_client_id`,
};

export interface UpassistRUMGlobals {
  _previousPath: any;
  _initialPageLoadSent: boolean;
  _listeningForCoreWebVitals: any;
  _listeningForErrors: any;
  _historyPatched: boolean;
  q?: any[];
}

declare global {
  interface Window {
    upassist: UpassistRUMGlobals & UpassistRUMInterpreter;
  }
}

export interface Environment {
  production: boolean;
  apiUrl: string;
  socketUrl: string;
  /**
   * Optional default form identifier used to automatically join a session.
   * Leave empty to require manual selection from the UI.
   */
  defaultFormId?: string;
}

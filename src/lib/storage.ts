export const APP_VERSION = '1.0.0';
const STORAGE_VERSION_KEY = 'invoicegen-version';

const knownKeys = [
  'invoicegen-auth',
  'invoicegen-settings',
  'invoicegen-modules',
  'invoicegen-theme',
];

export function initLocalStorage(): void {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    knownKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
    localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION);
  }
}

export function clearAllStorage(): void {
  knownKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(STORAGE_VERSION_KEY);
}

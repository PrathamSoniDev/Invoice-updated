import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { settingsService } from '@/services/settingsService';


export function RazorpayAutoConnect() {
  const { user, isAuthenticated } = useAuthStore();
  const { gateways, isInitialized: settingsInitialized, fetchSettings } = useSettingsStore();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;
    if (!isAuthenticated || !user) return;
    if (user.role !== 'admin' && user.role !== 'super_admin') return;

    // Never auto-redirect while we're already handling a callback result on
    // this exact page load.
    if (new URLSearchParams(window.location.search).has('razorpay_oauth')) return;

    const storageKey = `razorpay_auto_connect_prompted:${user.id}`;
    if (localStorage.getItem(storageKey)) return;

    if (!settingsInitialized) {
      fetchSettings();
      return; // effect re-runs once gateways load below
    }

    if (!gateways) return; // settings failed to load — don't guess, just skip

    const alreadyConnected = gateways.razorpay.status === 'connected' || gateways.razorpay.connectionMethod === 'oauth';
    if (alreadyConnected) {
      // Nothing to prompt for — mark as handled so we don't keep checking.
      localStorage.setItem(storageKey, '1');
      return;
    }

    hasAttempted.current = true;

    (async () => {
      try {
        const { configured } = await settingsService.getRazorpayOauthConfigStatus();
        if (!configured) return; // OAuth not set up on this environment yet — silently skip, manual entry still works

        localStorage.setItem(storageKey, '1');
        const url = await settingsService.getRazorpayOauthAuthorizeUrl();
        window.location.href = url;
      } catch {
        // Best-effort only — if anything here fails, the admin can still
        // connect manually from Settings. Don't block app usage on it.
      }
    })();
  }, [isAuthenticated, user, settingsInitialized, gateways, fetchSettings]);

  return null;
}
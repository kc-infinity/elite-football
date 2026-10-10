import { useEffect } from 'react';
import defaultAppIcon from '../assets/images/football_elite_user_logo_1791597576124.jpg';

export function getAppIconUrl(): string {
  return defaultAppIcon;
}

export function syncDocumentFavicon(iconHref: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconHref;

  let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = iconHref;
}

export function useAppIcon(): {
  iconUrl: string;
} {
  useEffect(() => {
    try {
      localStorage.removeItem('fe_custom_app_icon_v1');
    } catch {
      // ignore storage errors
    }
    syncDocumentFavicon(defaultAppIcon);
  }, []);

  return {
    iconUrl: defaultAppIcon,
  };
}

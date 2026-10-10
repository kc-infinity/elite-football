import { useEffect, useState } from 'react';
import defaultAppIcon from '../assets/images/football_elite_app_icon_1791596659168.jpg';

const STORAGE_KEY = 'fe_custom_app_icon_v1';
const EVENT_NAME = 'fe_app_icon_updated';

export function getAppIconUrl(): string {
  if (typeof window === 'undefined') return defaultAppIcon;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && saved.startsWith('data:image/') ? saved : defaultAppIcon;
}

export function setCustomAppIconDataUrl(dataUrl: string | null) {
  if (typeof window === 'undefined') return;
  if (dataUrl) {
    localStorage.setItem(STORAGE_KEY, dataUrl);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  syncDocumentFavicon(getAppIconUrl());
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
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
  isCustom: boolean;
  uploadIconFile: (file: File) => void;
  resetIcon: () => void;
} {
  const [iconUrl, setIconUrl] = useState<string>(() => getAppIconUrl());

  useEffect(() => {
    syncDocumentFavicon(iconUrl);
    const handler = () => {
      const next = getAppIconUrl();
      setIconUrl(next);
      syncDocumentFavicon(next);
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, [iconUrl]);

  const uploadIconFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAppIconDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetIcon = () => {
    setCustomAppIconDataUrl(null);
  };

  return {
    iconUrl,
    isCustom: iconUrl !== defaultAppIcon,
    uploadIconFile,
    resetIcon,
  };
}

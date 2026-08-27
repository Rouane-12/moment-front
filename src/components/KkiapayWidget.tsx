import { useEffect, useRef } from 'react';

interface KkiapayWidgetProps {
  amount: number;
  onSuccess: (transactionId: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
  sandbox?: boolean;
}

declare global {
  interface Window {
    openKkiapayWidget: (config: any) => void;
    addSuccessListener: (callback: (response: any) => void) => void;
  }
}

export function KkiapayWidget({
  amount,
  onSuccess,
  onFailure,
  onClose,
  sandbox = true,
}: KkiapayWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const loadAndOpen = async () => {
      // Load the Kkiapay script
      if (!scriptLoaded.current && !window.openKkiapayWidget) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.kkiapay.me/k.js';
          script.async = true;
          script.onload = () => {
            scriptLoaded.current = true;
            resolve();
          };
          script.onerror = () => reject(new Error('Failed to load Kkiapay SDK'));
          document.body.appendChild(script);
        });
      }

      // Small delay to ensure SDK is ready
      await new Promise((r) => setTimeout(r, 200));

      if (!window.openKkiapayWidget) {
        onFailure('Module de paiement non disponible');
        return;
      }

      // Listen for success
      window.addSuccessListener((response: any) => {
        if (response.transactionId) {
          onSuccess(response.transactionId);
        }
      });

      // Open the widget
      window.openKkiapayWidget({
        amount: amount,
        key: import.meta.env['VITE_KKIAPAY_PUBLIC_KEY'] || '',
        sandbox: sandbox,
        position: 'center',
        theme: '#F5A623',
        data: '',
        name: 'MOMENT — Paiement',
        callback: '',
      });
    };

    loadAndOpen().catch((err) => {
      console.error('Kkiapay init error:', err);
      onFailure(err.message || 'Erreur lors du chargement du paiement');
    });
  }, []);

  // Listen for widget close
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'close' || event.data?.type === 'kkiapay-close') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  return <div ref={widgetRef} id="kkiapay-widget" />;
}

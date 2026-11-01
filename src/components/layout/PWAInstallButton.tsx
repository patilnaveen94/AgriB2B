import { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from '@/context/PWAInstallContext';
import { BRAND_NAME } from '@/config/brand';

export function PWAInstallButton() {
  const { canInstall, hasInstallPrompt, isIOS, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!canInstall) return null;

  const handleInstall = () => {
    if (isIOS || !hasInstallPrompt) {
      setShowInstructions(true);
      return;
    }

    void install().catch((error: unknown) => {
      console.error(`${BRAND_NAME} app installation failed:`, error);
    });
  };

  return (
    <>
      <button
        onClick={handleInstall}
        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
      >
        <Download className="h-4 w-4" />
        Install {BRAND_NAME}
      </button>

      {showInstructions && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-surface-950/60 p-4 sm:items-center"
          onClick={() => setShowInstructions(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-instructions-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="install-instructions-title"
              className="text-lg font-semibold text-surface-900"
            >
              {isIOS
                ? `Add ${BRAND_NAME} to your Home Screen`
                : `Install ${BRAND_NAME} on Android`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-surface-600">
              {isIOS ? (
                <>
                  In Safari, tap Share{' '}
                  <Share className="inline h-4 w-4 align-text-bottom" /> and
                  choose <strong>Add to Home Screen</strong>.
                </>
              ) : (
                <>
                  In Chrome, open the browser menu and choose{' '}
                  <strong>Install app</strong> or{' '}
                  <strong>Add to Home screen</strong>.
                </>
              )}
            </p>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}

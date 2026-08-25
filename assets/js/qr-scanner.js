(() => {
  'use strict';

  const modal = document.getElementById('qrScannerModal');
  const title = document.getElementById('qrScannerTitle');
  const subtitle = document.getElementById('qrScannerSubtitle');
  const readerId = 'qrScannerReader';
  const closeButtons = document.querySelectorAll('[data-close-qr-scanner]');

  let scanner = null;
  let onScan = null;
  let closing = false;

  async function stopScanner() {
    if (!scanner) return;
    try { await scanner.stop(); } catch (_) {}
    try { await scanner.clear(); } catch (_) {}
    scanner = null;
  }

  async function close() {
    if (closing) return;
    closing = true;
    await stopScanner();
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
    onScan = null;
    closing = false;
  }

  async function open(options = {}) {
    if (!modal) throw new Error('Scanner QR non disponibile.');
    if (!window.Html5Qrcode) throw new Error('Libreria scanner QR non disponibile.');

    await stopScanner();
    onScan = typeof options.onScan === 'function' ? options.onScan : null;
    title.textContent = options.title || 'Scansiona QR';
    subtitle.textContent = options.subtitle || 'Inquadra il QR personale con la fotocamera.';
    modal.hidden = false;
    document.body.classList.add('modal-open');

    scanner = new window.Html5Qrcode(readerId);

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
        return { width: size, height: size };
      },
      aspectRatio: 1
    };

    try {
      await scanner.start(
        { facingMode: 'environment' },
        config,
        async decodedText => {
          const handler = onScan;
          await close();
          if (handler) await handler(String(decodedText || '').trim());
        },
        () => {}
      );
    } catch (error) {
      await close();
      throw new Error('Impossibile avviare la fotocamera. Verifica i permessi del browser.');
    }
  }

  closeButtons.forEach(button => button.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) close();
  });

  window.CampoQrScanner = { open, close };
})();

(() => {
  'use strict';

  const standard = document.getElementById('standardWorkspace');
  const kitchen = document.getElementById('kitchenWorkspace');
  const title = document.getElementById('reservedAreaTitle');

  async function applyRole() {
    for (let i = 0; i < 120; i += 1) {
      const role = document.body.dataset.appRole || window.CAMPO_RESERVED_PROFILE?.ruolo || '';
      if (role) {
        const isKitchen = role === 'cucina';
        if (standard) standard.hidden = isKitchen;
        if (kitchen) kitchen.hidden = !isKitchen;
        if (title) title.textContent = isKitchen ? 'Area Cucina' : 'Area Segreteria';
        document.body.classList.toggle('kitchen-role', isKitchen);
        document.body.classList.toggle('standard-role', !isKitchen);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  document.addEventListener('DOMContentLoaded', applyRole);
})();

import type { Store } from './store';
import { el } from './dom';
import { canBuy, isOwned, SHOP_ITEMS, type ShopItem, type Wallet } from '@/core/economy';
import { PAUSE, SHOP } from './texts';

export interface Panel {
  readonly isOpen: boolean;
  open(): void;
  close(): void;
}

export interface ShopHooks {
  buy(id: string): void;
  toggleHat(id: string): void;
  onClose(): void;
}

function wallet(store: Store): Wallet {
  const s = store.get();
  return { feathers: s.feathers, upgrades: s.upgrades, hats: s.hats, hat: s.hat };
}

/** "Bellos Korb" shop panel. Re-renders after every action. Esc closes. */
export function createShop(root: HTMLElement, store: Store, hooks: ShopHooks): Panel {
  let overlay: HTMLElement | null = null;

  const buttonFor = (item: ShopItem, w: Wallet): HTMLButtonElement => {
    const b = el('button', 'q-btn q-shop__buy');
    b.type = 'button';
    b.dataset.testid = `shop-item-${item.id}`;
    const owned = isOwned(w, item.id);
    if (item.kind === 'hat' && owned) {
      b.textContent = w.hat === item.id ? SHOP.takeOff : SHOP.wear;
      b.addEventListener('click', () => {
        hooks.toggleHat(item.id);
        render();
      });
    } else if (owned) {
      b.textContent = item.comingSoon ? SHOP.soon : SHOP.owned;
      b.disabled = true;
    } else {
      const err = canBuy(w, item.id);
      b.textContent = err === 'funds' ? SHOP.tooExpensive : `${SHOP.buy} · ${item.price}`;
      b.disabled = err !== null;
      if (!err) b.classList.add('q-btn--buy');
      b.addEventListener('click', () => {
        hooks.buy(item.id);
        render();
      });
    }
    return b;
  };

  function render(): void {
    if (!overlay) return;
    const w = wallet(store);
    overlay.replaceChildren();
    const panel = el('div', 'q-shop__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    const head = el('div', 'q-shop__head');
    head.append(
      el('h2', 'q-shop__title', SHOP.title),
      el('div', 'q-shop__wallet', `❖ ${w.feathers}`),
    );
    panel.append(head, el('p', 'q-shop__sub', SHOP.subtitle));
    const list = el('div', 'q-shop__list');
    for (const item of SHOP_ITEMS) {
      // Secret items (Krone from the Keller) appear only once found, to wear or take off.
      if (item.secret && !isOwned(w, item.id)) continue;
      const row = el('div', `q-shop__item q-shop__item--${item.kind}`);
      const info = el('div', 'q-shop__info');
      const name = el('div', 'q-shop__name', item.name);
      if (item.comingSoon) name.append(el('span', 'q-shop__tag', SHOP.soon));
      info.append(name, el('div', 'q-shop__text', item.text));
      row.append(el('div', 'q-shop__price', String(item.price)), info, buttonFor(item, w));
      list.append(row);
    }
    panel.append(list);
    const close = el('button', 'q-btn q-btn--primary', SHOP.close);
    close.type = 'button';
    close.dataset.testid = 'shop-close';
    close.addEventListener('click', () => self.close());
    panel.append(close);
    overlay.append(panel);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      self.close();
    }
  };

  const self: Panel = {
    get isOpen() {
      return overlay !== null;
    },
    open() {
      if (overlay) return;
      overlay = el('div', 'q-shop');
      root.append(overlay);
      render();
      window.addEventListener('keydown', onKey, true);
    },
    close() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      window.removeEventListener('keydown', onKey, true);
      hooks.onClose();
    },
  };
  return self;
}

/** Minimal pause overlay (Esc away from the Korb). */
export function createPause(root: HTMLElement, onClose: () => void): Panel {
  let overlay: HTMLElement | null = null;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      self.close();
    }
  };
  const self: Panel = {
    get isOpen() {
      return overlay !== null;
    },
    open() {
      if (overlay) return;
      overlay = el('div', 'q-story');
      const card = el('div', 'q-story__card');
      card.append(el('h2', 'q-story__title', PAUSE.title), el('p', 'q-pause__text', PAUSE.text));
      const b = el('button', 'q-btn q-btn--primary', PAUSE.resume);
      b.type = 'button';
      b.addEventListener('click', () => self.close());
      card.append(b);
      overlay.append(card);
      root.append(overlay);
      window.addEventListener('keydown', onKey, true);
    },
    close() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      window.removeEventListener('keydown', onKey, true);
      onClose();
    },
  };
  return self;
}

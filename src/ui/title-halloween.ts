const CSS = `
.hw-lanterns{position:absolute;left:0;right:0;bottom:4vh;display:flex;justify-content:center;gap:12vw;pointer-events:none;z-index:1}
.hw-lantern{width:64px;height:56px;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 50% 40%,#ffb347,#ff7a1a 60%,#a63d00);position:relative;box-shadow:0 0 28px 8px rgba(255,140,40,.55);animation:hw-flicker 1.6s infinite steps(1)}
.hw-lantern::before{content:'';position:absolute;left:46%;top:-9px;width:8px;height:12px;background:#3b7a2e;border-radius:2px}
.hw-lantern::after{content:'';position:absolute;left:14px;top:18px;width:36px;height:22px;background:#1a0a00;clip-path:polygon(0 0,30% 0,15% 40%,50% 0,70% 0,85% 40%,100% 0,100% 55%,85% 100%,70% 75%,50% 100%,30% 75%,15% 100%,0 55%)}
.hw-lantern:nth-child(2){animation-delay:-.5s}.hw-lantern:nth-child(3){animation-delay:-1s}
@keyframes hw-flicker{0%{filter:brightness(1)}20%{filter:brightness(.8)}40%{filter:brightness(1.15)}60%{filter:brightness(.9)}80%{filter:brightness(1.1)}}
.hw-ghost{position:absolute;top:22vh;left:-120px;width:70px;height:90px;background:rgba(255,255,255,.55);border-radius:35px 35px 6px 6px;pointer-events:none;z-index:1;animation:hw-float 12s linear infinite;box-shadow:0 0 24px rgba(255,255,255,.5)}
.hw-ghost::before,.hw-ghost::after{content:'';position:absolute;top:26px;width:9px;height:12px;background:#000;border-radius:50%}
.hw-ghost::before{left:20px}.hw-ghost::after{right:20px}
@keyframes hw-float{0%{transform:translate(0,0)}25%{transform:translate(30vw,-30px)}50%{transform:translate(60vw,20px)}75%{transform:translate(90vw,-20px)}100%{transform:translate(calc(100vw + 200px),0)}}
@media (prefers-reduced-motion:reduce){.hw-lantern,.hw-ghost{animation:none}}
`;

const SUBTITLE = 'Süßes, Saures, Schreien';

/** Adds Halloween decoration to the title screen. Call after showTitle() has mounted. */
export function dressTitle(root: HTMLElement): void {
  if (root.querySelector('.hw-lanterns')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  const host = root.querySelector<HTMLElement>('.q-title') ?? root;

  const lanterns = document.createElement('div');
  lanterns.className = 'hw-lanterns';
  lanterns.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const l = document.createElement('div');
    l.className = 'hw-lantern';
    lanterns.append(l);
  }
  const ghost = document.createElement('div');
  ghost.className = 'hw-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  host.append(style, lanterns, ghost);

  const sub = host.querySelector<HTMLElement>('.title-sub, .q-title__sub');
  if (sub) sub.textContent = SUBTITLE;
  else {
    const s = document.createElement('div');
    s.className = 'title-sub';
    s.textContent = SUBTITLE;
    host.append(s);
  }
}

// La firma «@STACAPPELLA» disegnata ESATTAMENTE come nel film dell'episodio 1 (gioco7-ep1/film.js, firma()), su fondo nero (0-1 s) e su
// fondo bianco (1-2 s): dalle due immagini si ricavano la trasparenza e il colore della scritta, per toglierla dal video già fatto.
import * as M from './lib/motion.js';
const { W, H, font } = M;
function firma(ctx) {
  ctx.save(); ctx.font = font(46, 800, 'Sub'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.5;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillStyle = '#FFFFFF'; ctx.fillText('@STACAPPELLA', W / 2, H * 0.665); ctx.restore();
}
M.film({
  fonts: [font(70, 800, 'Sub'), font(70, 500, 'Sub'), font(46, 800, 'Sub')], samples: () => 1,
  async init() {},
  draw(ctx, u, t) { ctx.fillStyle = t < 1 ? '#000' : '#FFF'; ctx.fillRect(0, 0, W, H); },
  post(ctx, u, t) { firma(ctx); },
});

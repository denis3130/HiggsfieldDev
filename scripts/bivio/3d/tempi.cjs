// tempi.cjs: stampa l'elenco delle scene dell'episodio (inizio nel tempo della voce, nome) leggendo window.TEMPI dalla pagina del film
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
  p.on('pageerror', (e) => console.log('ERRORE', e.message));
  await p.goto('http://127.0.0.1:8765/' + (process.argv[2] || 'ep1') + '/index.html');
  await p.waitForFunction(() => window.TEMPI, null, { timeout: 180000 });
  console.log(JSON.stringify(await p.evaluate(() => window.TEMPI)));
  await b.close();
})();

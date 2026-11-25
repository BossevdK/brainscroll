// Renders the Brainscroll icon set: a stack of swipe cards with a lightning bolt.
// Usage: npm i --no-save @resvg/resvg-js@2.6.2 && node scripts/make-icons.mjs assets
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
const C = { x: 512, y: 512 };
const card = (fill, angle, extra = '', dx = 0) =>
  `<rect x="${C.x - 180}" y="${C.y - 260}" width="360" height="520" rx="64" fill="${fill}" transform="translate(${dx} 0) rotate(${angle} ${C.x} ${C.y})" ${extra}/>`;
const BOLT = 'M 566 292 L 414 540 L 500 540 L 458 732 L 618 470 L 528 470 L 584 292 Z';

const bg = `
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#241E3D"/>
      <stop offset="1" stop-color="#0E0F13"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>`;

// The card stack, scaled around the centre.
const stack = (scale, colored = true) => `
  <g transform="translate(${C.x} ${C.y}) scale(${scale}) translate(${-C.x} ${-C.y})">
    ${card(colored ? '#5EEAD4' : '#fff', 18, colored ? '' : 'opacity="0.45"', 70)}
    ${card(colored ? '#A78BFA' : '#fff', -12, colored ? '' : 'opacity="0.7"', -50)}
    ${
      colored
        ? `${card('#FACC15', 0, 'stroke="#0E0F13" stroke-width="10"')}<path d="${BOLT}" fill="#0E0F13"/>`
        : `<path fill="#fff" fill-rule="evenodd" d="M ${C.x - 116} ${C.y - 260} h 232 a 64 64 0 0 1 64 64 v 392 a 64 64 0 0 1 -64 64 h -232 a 64 64 0 0 1 -64 -64 v -392 a 64 64 0 0 1 64 -64 Z ${BOLT}"/>`
    }
  </g>`;

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`;

function png(name, body, size = 1024) {
  const r = new Resvg(svg(body), { fitTo: { mode: 'width', value: size } });
  writeFileSync(join(out, name), r.render().asPng());
  console.log('wrote', name);
}

png('icon.png', bg + stack(1.05));
png('android-icon-background.png', bg);
png('android-icon-foreground.png', stack(0.72));
png('android-icon-monochrome.png', stack(0.72, false));
png('splash-icon.png', stack(0.95));
png('favicon.png', bg + stack(1.05), 48);

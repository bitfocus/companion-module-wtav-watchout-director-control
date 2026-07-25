'use strict';
// A tiny, dependency-free PNG renderer for a 0-100% fill bar, returned as base64
// for a Companion "advanced" feedback (png64). Pure Node (zlib only) — no native
// canvas, so it installs everywhere Companion runs. Verified in scratchpad/test.

const zlib = require('zlib');

// CRC32 (PNG chunks need it).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
// Encode an RGBA pixel buffer (w*h*4) as a PNG Buffer.
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type 6 = truecolour + alpha
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // deflate / no filter / no interlace
  // raw scanlines, each prefixed with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  const n = (typeof hex === 'number') ? hex : parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Render a horizontal fill bar. opts: { w,h, fg, bg, border, vertical }
// fraction is clamped to 0..1; a null/NaN fraction renders an empty bar.
function barPng(fraction, opts) {
  opts = opts || {};
  const w = opts.w || 72, h = opts.h || 72;
  const fg = hexToRgb(opts.fg != null ? opts.fg : 0x33cc66);
  const bg = hexToRgb(opts.bg != null ? opts.bg : 0x222222);
  const border = hexToRgb(opts.border != null ? opts.border : 0x000000);
  const f = Math.max(0, Math.min(1, isFinite(Number(fraction)) ? Number(fraction) : 0));
  const vertical = !!opts.vertical;
  const rgba = Buffer.alloc(w * h * 4);
  const fillTo = vertical ? Math.round(f * h) : Math.round(f * w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let col;
      const isBorder = (x === 0 || y === 0 || x === w - 1 || y === h - 1);
      if (isBorder) col = border;
      else if (vertical ? (h - y) <= fillTo : x <= fillTo) col = fg;
      else col = bg;
      rgba[i] = col[0]; rgba[i + 1] = col[1]; rgba[i + 2] = col[2]; rgba[i + 3] = 0xff;
    }
  }
  return encodePng(w, h, rgba).toString('base64');
}

module.exports = { barPng, encodePng, crc32 };

export const DEVICES = {
  iphone: { width: 1290, height: 2796, dir: 'iphone-6_9' },
  ipad:   { width: 2048, height: 2732, dir: 'ipad-13' },
};

// Demo game: "Friday Night Poker", pot $2,100, cash unit $20.
// Nets: Daniel -400, Phil +220, Maria +380, Doyle +400, Johnny -300, Wolfgang -300.
const SHARE_TEXT = `Friday Night Poker

Total Pot: $2,100.00

Settlements:
• Doyle (Cash): $400.00 from Daniel
• Maria (Venmo @maria-ho): $300.00 from Johnny, $80.00 from Wolfgang
• Phil (Cash App $philivey): $220.00 from Wolfgang

Settled with Cash Cage
https://apps.apple.com/app/id6759301097`;

export const SLIDES = [
  {
    n: 1, template: 'device-slide.html',
    kicker: 'Settle Up', headline: ['Who Pays Who —', 'And How'],
    capture: '../captures/iphone/slide1-summary.png', tilt: true,
    cards: [
      // expanded settlement card with Pay/Copy — tune x/y/w/h on the real capture
      { x: 40, y: 900, w: 1100, h: 620, left: 40, top: 1450, scale: 0.95 },
    ],
    perDevice: { ipad: { capture: '../captures/ipad/slide1-summary.png', cards: [{ x: 60, y: 900, w: 1900, h: 620, left: 60, top: 1500, scale: 0.85, captureWidth: 2048 }] } },
  },
  {
    n: 2, template: 'message-slide.html',
    kicker: 'Share It', headline: ['Get Paid In', 'The Group Chat'],
    shareText: SHARE_TEXT, tilt: false, cards: [],
    perDevice: {},
  },
  {
    n: 3, template: 'device-slide.html',
    kicker: 'Cash Games', headline: ['Amounts That Match', 'Real Bills'],
    capture: '../captures/iphone/slide3-cashunit.png', tilt: true,
    cards: [
      { x: 40, y: 1200, w: 1100, h: 500, left: 60, top: 1500, scale: 0.95 },
    ],
    perDevice: { ipad: { capture: '../captures/ipad/slide3-cashunit.png', cards: [] } },
  },
  {
    n: 4, template: 'device-slide.html',
    kicker: 'Saved Players', headline: ['Your Table,', 'On Every Device'],
    capture: '../captures/iphone/slide4-savedplayers.png', tilt: true,
    cards: [
      { x: 40, y: 500, w: 1100, h: 400, left: 50, top: 1350, scale: 0.95 },
    ],
    perDevice: { ipad: { capture: '../captures/ipad/slide4-savedplayers.png', cards: [] } },
  },
  {
    n: 5, template: 'device-slide.html',
    kicker: 'Game Night', headline: ['Track Every', 'Buy-In & Cashout'],
    capture: '../captures/iphone/slide5-active.png', tilt: true,
    cards: [
      { x: 40, y: 700, w: 1100, h: 380, left: 45, top: 1400, scale: 0.95 },
    ],
    perDevice: { ipad: { capture: '../captures/ipad/slide5-active.png', cards: [] } },
  },
];

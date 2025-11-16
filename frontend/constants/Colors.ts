// Black & Gold Premium Theme
const goldPrimary = '#D4AF37';
const goldAccent = '#F4D03F';
const darkBg = '#0A0A0A';
const cardBg = '#1A1A1A';

const tintColorLight = goldPrimary;
const tintColorDark = goldPrimary;

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#999',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF',
    background: darkBg,
    tint: tintColorDark,
    tabIconDefault: '#666',
    tabIconSelected: goldPrimary,
    card: cardBg,
    border: '#2A2A2A',
    gold: goldPrimary,
    goldAccent: goldAccent,
    success: '#00D66F',
    danger: '#FF3B5C',
  },
};

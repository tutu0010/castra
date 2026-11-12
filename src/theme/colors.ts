export const CozyTheme = {
  // High-Contrast Dark Canvas & Surfaces
  background: '#090807',        // Deep obsidian black
  surface: '#151311',           // Matte elevated dark card
  surfaceElevated: '#211D1A',   // Secondary elevated container
  surfaceMuted: '#2B2621',      // Pill tags, action chips
  
  // High-Legibility Borders & Dividers
  border: '#2A2520',
  borderLight: '#1E1A16',
  borderStrong: '#3E3730',

  // High-Contrast Text Hierarchy
  textPrimary: '#FFFFFF',       // 100% Crisp white (maximum legibility)
  textSecondary: '#A8A196',     // Clean readable stone gray (7.8:1 contrast)
  textTertiary: '#9E968B',      // Crisp metadata (5.2:1 contrast, WCAG AA compliant)
  textInverse: '#090807',

  // High-Vibrancy Semantic Accents
  expense: '#F87171',           // Crisp clear coral red
  expenseSoft: 'rgba(239, 68, 68, 0.16)',
  income: '#34D399',            // Crisp clear emerald green
  incomeSoft: 'rgba(52, 211, 153, 0.16)',
  transfer: '#60A5FA',          // Crisp sky blue
  transferSoft: 'rgba(96, 165, 250, 0.16)',
  warning: '#FBBF24',           // Warm gold
  warningSoft: 'rgba(251, 191, 36, 0.16)',

  // Card Colors
  cardColors: [
    { id: 'slate', name: 'Obsidian Slate', hex: '#1C222B', text: '#FFFFFF', accent: '#3B475A' },
    { id: 'titanium', name: 'Graphite', hex: '#1D1E22', text: '#FFFFFF', accent: '#3C3F47' },
    { id: 'emerald', name: 'Deep Emerald', hex: '#13281E', text: '#FFFFFF', accent: '#27523E' },
    { id: 'bronze', name: 'Warm Espresso', hex: '#2A1F18', text: '#FFFFFF', accent: '#5A4334' },
    { id: 'crimson', name: 'Burgundy', hex: '#2F1819', text: '#FFFFFF', accent: '#623335' },
    { id: 'indigo', name: 'Royal Indigo', hex: '#1B1F33', text: '#FFFFFF', accent: '#373F68' },
  ],
};

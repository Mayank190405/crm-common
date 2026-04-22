export const theme = {
  colors: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    primary: '#10B981', // Emerald Green
    secondary: '#F59E0B', // Amber Gold
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    success: '#10B981',
    error: '#EF4444',
    border: '#1E293B',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      color: '#F8FAFC',
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      color: '#F8FAFC',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      color: '#F8FAFC',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: '#F8FAFC',
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      color: '#94A3B8',
    },
  }
} as const;

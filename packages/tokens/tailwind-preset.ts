import tokens from './tokens.json';

const preset = {
  theme: {
    extend: {
      colors: {
        ghost: tokens.colors,
      },
      borderRadius: {
        sm: tokens.radii.sm,
        md: tokens.radii.md,
        lg: tokens.radii.lg,
        full: tokens.radii.full,
      },
      fontSize: {
        xs: tokens.fontSizes.xs,
        sm: tokens.fontSizes.sm,
        md: tokens.fontSizes.md,
        lg: tokens.fontSizes.lg,
        xl: tokens.fontSizes.xl,
        '2xl': tokens.fontSizes.xxl,
      },
      spacing: {
        xs: tokens.spacing.xs,
        sm: tokens.spacing.sm,
        md: tokens.spacing.md,
        lg: tokens.spacing.lg,
        xl: tokens.spacing.xl,
      },
    },
  },
};

export default preset;

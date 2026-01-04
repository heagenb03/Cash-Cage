import { StyleSheet } from 'react-native';

/**
 * Shared modal layout styles for consistent button containers across all modals
 */
export const modalLayoutStyles = StyleSheet.create({
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
});

import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typeWeightRn, typography } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found.</Text>
        <Link href="/" style={styles.link}>
          Go to Home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sectionGap,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.sectionTitle,
    fontWeight: typeWeightRn.semibold,
    color: colors.textPrimary,
  },
  link: {
    marginTop: spacing.lg,
    fontSize: typography.label,
    color: colors.textPrimary,
  },
});

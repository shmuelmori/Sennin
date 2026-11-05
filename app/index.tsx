import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeaderButton } from '@/components/HeaderButton';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';
import { spacing } from '@/theme';

// Feed screen (spec §4). Empty until step 1.1 adds the paging player.
export default function FeedScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sennin',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <HeaderButton label="Sources" onPress={() => router.push('/sources')} />
              <HeaderButton label="Status" onPress={() => router.push('/status')} />
            </View>
          ),
        }}
      />
      <ScreenPlaceholder title="Feed" lines={['No videos yet.']} />
    </>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

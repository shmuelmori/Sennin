import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontSize, radius, sizes, spacing } from '@/theme';

type Props = {
  /** e.g. "312 of 320 active"; null while the list is read. */
  counter: string | null;
  search: string;
  onSearchChange: (text: string) => void;
  /** Whether the add form is open, so the + turns into a close button. */
  adding: boolean;
  onToggleAdd: () => void;
};

// The top of the Topics tab (§4): the title with the active-of-total counter
// and a round + button at the header's end, and the search bar that filters
// the list.
export function TopicsHeader({ counter, search, onSearchChange, adding, onToggleAdd }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text style={styles.title}>Topics</Text>
          {counter !== null && <Text style={styles.counter}>{counter}</Text>}
        </View>
        <Pressable
          accessibilityLabel={adding ? 'Close the add form' : 'Add topics'}
          accessibilityRole="button"
          onPress={onToggleAdd}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Ionicons name={adding ? 'close' : 'add'} color={colors.deepSeaNight} size={26} />
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Search topics"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={onSearchChange}
        placeholder="Search topics"
        placeholderTextColor={colors.silverMuted}
        returnKeyType="search"
        style={styles.search}
        value={search}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titles: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    color: colors.silver,
    fontSize: fontSize.title,
    fontWeight: 'bold',
  },
  counter: {
    color: colors.cherryBlossom,
    fontSize: fontSize.small,
  },
  add: {
    width: sizes.addButton,
    height: sizes.addButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.sunset,
  },
  pressed: {
    opacity: 0.7,
  },
  search: {
    color: colors.silver,
    fontSize: fontSize.body,
    borderColor: colors.tealMist,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
});

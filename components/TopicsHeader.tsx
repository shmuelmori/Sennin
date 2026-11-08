import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScriptTitle } from '@/components/ScriptTitle';
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

// The top of the Topics tab (§4) over the background art: the script title
// with the active-of-total counter at the header's end (over the sun, leaving
// the Sennin in view), then the search bar that filters the list with the
// round + button at its end.
export function TopicsHeader({ counter, search, onSearchChange, adding, onToggleAdd }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.hero}>
        <ScriptTitle text="Topics" size="hero" align="end" />
        {counter !== null && <Text style={styles.counter}>{counter}</Text>}
      </View>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" color={colors.silver} size={22} />
          <TextInput
            accessibilityLabel="Search topics"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={onSearchChange}
            placeholder="Search topics"
            placeholderTextColor={colors.silverMuted}
            returnKeyType="search"
            style={styles.input}
            value={search}
          />
        </View>
        <Pressable
          accessibilityLabel={adding ? 'Close the add form' : 'Add topics'}
          accessibilityRole="button"
          onPress={onToggleAdd}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Ionicons name={adding ? 'close' : 'add'} color={colors.deepSeaNight} size={32} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  hero: {
    alignItems: 'flex-end',
    minHeight: 150,
  },
  counter: {
    color: colors.silver,
    fontSize: fontSize.button,
    paddingHorizontal: spacing.sm,
    textShadowColor: colors.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.tealMist,
    backgroundColor: colors.glass,
    boxShadow: `0 0 12px ${colors.tealGlow}`,
  },
  input: {
    flex: 1,
    color: colors.silver,
    fontSize: fontSize.body + 2,
    paddingVertical: spacing.sm + 4,
  },
  add: {
    width: sizes.addButton,
    height: sizes.addButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.cherryBlossom,
    backgroundColor: colors.sunset,
    boxShadow: `0 0 16px ${colors.sunsetGlow}`,
  },
  pressed: {
    opacity: 0.8,
  },
});

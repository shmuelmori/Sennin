import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemsForm, type FormMessage } from '@/components/AddItemsForm';
import { Divider } from '@/components/Divider';
import { ItemRow } from '@/components/ItemRow';
import { SwipeToRemove } from '@/components/SwipeToRemove';
import { TopicsHeader } from '@/components/TopicsHeader';
import { useItems } from '@/hooks/useItems';
import { activeCountLabel, filterItems } from '@/lib/itemList';
import type { Item } from '@/lib/records';
import { colors, fontSize, spacing } from '@/theme';

// Expo Router requires a default export for route files.
// Topics tab (spec §4 Topics, F2, F3): every item in one alphabetical list,
// with a search bar and an active-of-total counter. The + button opens a
// form for comma-separated topics. A removed item shows in grey with
// "Restore"; any item can be deleted for good with a swipe, after asking.
export default function TopicsScreen() {
  const { items, error, add, restore, remove } = useItems();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const shown = useMemo(() => filterItems(items ?? [], search), [items, search]);

  const toggleAdd = () => {
    setAdding((open) => !open);
    setMessage(null);
  };

  const submit = async () => {
    setBusy(true);
    const result = await add(input);
    setBusy(false);
    setMessage({ text: result.message, tone: result.ok ? 'info' : 'error' });
    if (result.ok) setInput('');
  };

  const confirmDelete = (item: Item) => {
    Alert.alert(`Delete ${item.name}?`, 'It leaves the list for good. Videos already in your feed stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(item) },
    ]);
  };

  const hint =
    items === null
      ? null
      : items.length === 0
        ? 'No topics yet. Tap + to add some.'
        : shown.length === 0
          ? 'No topic matches the search.'
          : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <TopicsHeader
        counter={items === null ? null : activeCountLabel(items)}
        search={search}
        onSearchChange={setSearch}
        adding={adding}
        onToggleAdd={toggleAdd}
      />
      {adding && (
        <AddItemsForm
          value={input}
          onChangeText={setInput}
          busy={busy}
          onSubmit={() => void submit()}
          message={message}
        />
      )}
      {error !== null && <Text style={[styles.note, styles.error]}>{error}</Text>}
      {hint !== null && <Text style={styles.note}>{hint}</Text>}
      <FlatList
        data={shown}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Divider}
        initialNumToRender={20}
        renderItem={({ item }) => (
          <SwipeToRemove
            actionLabel="Delete"
            accessibilityLabel={`Delete ${item.name}`}
            onRemove={() => confirmDelete(item)}
          >
            <ItemRow name={item.name} removed={item.removed} onRestore={() => void restore(item)} />
          </SwipeToRemove>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.deepSeaNight,
  },
  note: {
    color: colors.silverMuted,
    fontSize: fontSize.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    color: colors.cherryBlossom,
  },
});

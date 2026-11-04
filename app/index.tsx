import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

// Placeholder for step 0.1. Step 0.4 replaces it with the themed Feed screen.
export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sennin' }} />
      <Text style={styles.title}>Sennin</Text>
      <Text>Scaffold is running in Expo Go.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

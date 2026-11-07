import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  /** The outline icon, for a tab that isn't open. */
  name: TabIconName;
  /** The filled icon, for the open tab. */
  activeName: TabIconName;
  focused: boolean;
  color: ColorValue;
  size: number;
};

// A bottom bar icon: filled for the open tab, outline for the others. The
// tab bar passes the color (Sunset when open, Silver otherwise).
export function TabIcon({ name, activeName, focused, color, size }: Props) {
  // The tab bar types its color as any ColorValue (also null or a number),
  // but passes the tint strings from the layout. The icon takes only strings.
  const iconColor = typeof color === 'string' ? color : undefined;
  return <Ionicons name={focused ? activeName : name} color={iconColor} size={size} />;
}

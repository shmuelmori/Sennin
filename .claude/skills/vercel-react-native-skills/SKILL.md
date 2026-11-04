---
name: vercel-react-native-skills
description: React Native and Expo best practices for building performant mobile apps. Use when building React Native components, optimizing list performance, implementing animations, or working with native modules. Triggers on tasks involving React Native, Expo, mobile performance, or native platform APIs.
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React Native Skills

Best practices for React Native and Expo apps, covering performance, animations,
UI patterns, and platform-specific optimizations.

Before writing or reviewing code in one of the areas below, read the matching
rule file. Each rule file explains why the rule matters and shows an incorrect
and a correct code example.

## When to Apply

Reference these guidelines when:

- Building React Native or Expo apps
- Optimizing list and scroll performance
- Implementing animations with Reanimated
- Working with images and media
- Configuring native modules or fonts
- Structuring monorepo projects with native dependencies

## Rule Categories by Priority

| Priority | Category           | Impact   | Prefix                                   |
| -------- | ------------------ | -------- | ---------------------------------------- |
| 1        | List Performance   | CRITICAL | `list-performance-`                      |
| 2        | Scroll Performance | HIGH     | `scroll-`                                |
| 3        | Animation          | HIGH     | `animation-`                             |
| 4        | Navigation         | HIGH     | `navigation-`                            |
| 5        | UI Patterns        | HIGH     | `ui-`                                    |
| 6        | State Management   | MEDIUM   | `react-state-`, `state-`, `react-compiler-` |
| 7        | Rendering          | MEDIUM   | `rendering-`                             |
| 8        | Design System      | MEDIUM   | `design-system-`                         |
| 9        | Monorepo           | MEDIUM   | `monorepo-`                              |
| 10       | Configuration      | LOW      | `fonts-`, `imports-`, `js-`              |

## Rules

### 1. List Performance (CRITICAL)

- [list-performance-virtualize](rules/list-performance-virtualize.md) - Use FlashList for large lists
- [list-performance-item-memo](rules/list-performance-item-memo.md) - Memoize list item components
- [list-performance-callbacks](rules/list-performance-callbacks.md) - Stabilize callback references
- [list-performance-inline-objects](rules/list-performance-inline-objects.md) - Avoid inline style objects
- [list-performance-function-references](rules/list-performance-function-references.md) - Extract functions outside render
- [list-performance-images](rules/list-performance-images.md) - Optimize images in lists
- [list-performance-item-expensive](rules/list-performance-item-expensive.md) - Move expensive work outside items
- [list-performance-item-types](rules/list-performance-item-types.md) - Use item types for heterogeneous lists

### 2. Scroll Performance (HIGH)

- [scroll-position-no-state](rules/scroll-position-no-state.md) - Never track scroll position in useState

### 3. Animation (HIGH)

- [animation-gpu-properties](rules/animation-gpu-properties.md) - Animate only transform and opacity
- [animation-derived-value](rules/animation-derived-value.md) - Use useDerivedValue for computed animations
- [animation-gesture-detector-press](rules/animation-gesture-detector-press.md) - Use Gesture.Tap instead of Pressable

### 4. Navigation (HIGH)

- [navigation-native-navigators](rules/navigation-native-navigators.md) - Use native stack and native tabs over JS navigators

### 5. UI Patterns (HIGH)

- [ui-expo-image](rules/ui-expo-image.md) - Use expo-image for all images
- [ui-image-gallery](rules/ui-image-gallery.md) - Use Galeria for image lightboxes
- [ui-pressable](rules/ui-pressable.md) - Use Pressable over TouchableOpacity
- [ui-safe-area-scroll](rules/ui-safe-area-scroll.md) - Handle safe areas in ScrollViews
- [ui-scrollview-content-inset](rules/ui-scrollview-content-inset.md) - Use contentInset for headers
- [ui-menus](rules/ui-menus.md) - Use native context menus
- [ui-native-modals](rules/ui-native-modals.md) - Use native modals when possible
- [ui-measure-views](rules/ui-measure-views.md) - Use onLayout, not measure()
- [ui-styling](rules/ui-styling.md) - Use StyleSheet.create or Nativewind

### 6. State Management (MEDIUM)

- [react-state-minimize](rules/react-state-minimize.md) - Minimize state subscriptions
- [react-state-dispatcher](rules/react-state-dispatcher.md) - Use dispatcher pattern for callbacks
- [react-state-fallback](rules/react-state-fallback.md) - Show fallback on first render
- [state-ground-truth](rules/state-ground-truth.md) - State must represent ground truth
- [react-compiler-destructure-functions](rules/react-compiler-destructure-functions.md) - Destructure for React Compiler
- [react-compiler-reanimated-shared-values](rules/react-compiler-reanimated-shared-values.md) - Handle shared values with compiler

### 7. Rendering (MEDIUM)

- [rendering-text-in-text-component](rules/rendering-text-in-text-component.md) - Wrap text in Text components
- [rendering-no-falsy-and](rules/rendering-no-falsy-and.md) - Avoid falsy && for conditional rendering

### 8. Design System (MEDIUM)

- [design-system-compound-components](rules/design-system-compound-components.md) - Use compound components over polymorphic children

### 9. Monorepo (MEDIUM)

- [monorepo-native-deps-in-app](rules/monorepo-native-deps-in-app.md) - Keep native dependencies in app package
- [monorepo-single-dependency-versions](rules/monorepo-single-dependency-versions.md) - Use single versions across packages

### 10. Configuration (LOW)

- [fonts-config-plugin](rules/fonts-config-plugin.md) - Use config plugins for custom fonts
- [imports-design-system-folder](rules/imports-design-system-folder.md) - Organize design system imports
- [js-hoist-intl](rules/js-hoist-intl.md) - Hoist Intl object creation

## Full Compiled Document

[AGENTS.md](AGENTS.md) holds every rule expanded in one file (about 2,900
lines). Read the individual rule files above first; open AGENTS.md only when you
need to scan all rules at once, such as a full code review.

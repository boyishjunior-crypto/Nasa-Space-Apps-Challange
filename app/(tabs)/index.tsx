import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/design-system';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { router } from 'expo-router';

const categories = [
  { name: 'Galaxies', icon: 'planet' as const },
  { name: 'Nebulas', icon: 'color-wand' as const },
  { name: 'Planets', icon: 'earth' as const },
  { name: 'Stars', icon: 'star' as const },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    router.push({ pathname: '/explore', params: { query } });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search missions, galaxies, nebulas..."
            placeholderTextColor={Colors.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Discover</ThemedText>
        </View>

        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <AnimatedCard
              key={category.name}
              delay={200 + index * 50}
              style={styles.categoryCardContainer}>
              <TouchableOpacity
                style={styles.categoryButton}
                onPress={() => handleSearch(category.name)}>
                <View style={styles.categoryIconContainer}>
                  <Icon
                    name={category.icon}
                    size={22}
                    color={Colors.text.primary}
                  />
                </View>
                <ThemedText style={styles.categoryText}>
                  {category.name}
                </ThemedText>
              </TouchableOpacity>
            </AnimatedCard>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A3D4A',
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['6xl'],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#52555E',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    minHeight: 50,
    marginBottom: Spacing['4xl'],
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    marginLeft: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  categoriesGrid: {
    gap: Spacing.md,
  },
  categoryCardContainer: {
    marginBottom: Spacing.md,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2C2E38',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: '#2C2E38',
  },
});

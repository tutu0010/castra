import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Search, X, Calendar, RotateCcw } from 'lucide-react-native';
import { CozyTheme } from '../theme/colors';
import { Category, DateFilterType } from '../types';
import { triggerLightHaptic } from '../utils/haptics';

interface FilterSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFilter: DateFilterType;
  onDateFilterChange: (filter: DateFilterType) => void;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  selectedType?: 'all' | 'expense' | 'income' | 'transfer';
  onTypeChange?: (type: 'all' | 'expense' | 'income' | 'transfer') => void;
  categories: Category[];
  totalResults: number;
  totalEntries: number;
}

export const FilterSearchBar: React.FC<FilterSearchBarProps> = React.memo(({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  selectedCategoryId,
  onCategoryChange,
  selectedType = 'all',
  onTypeChange,
  categories,
  totalResults,
  totalEntries,
}) => {
  const isFilterActive =
    searchQuery.trim().length > 0 ||
    dateFilter !== 'all' ||
    selectedCategoryId !== null ||
    selectedType !== 'all';

  const handleReset = () => {
    triggerLightHaptic();
    onSearchChange('');
    onDateFilterChange('all');
    onCategoryChange(null);
    if (onTypeChange) onTypeChange('all');
  };

  const TYPE_OPTIONS: { id: 'all' | 'expense' | 'income' | 'transfer'; label: string }[] = [
    { id: 'all', label: 'All Types' },
    { id: 'expense', label: 'Expenses' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfers' },
  ];

  const DATE_OPTIONS: { id: DateFilterType; label: string }[] = [
    { id: 'all', label: 'Any Date' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_30_days', label: '30 Days' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Search size={15} color={CozyTheme.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Search notes, merchants, entries..."
          placeholderTextColor={CozyTheme.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {isFilterActive ? (
          <TouchableOpacity
            onPress={handleReset}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCcw size={13} color={CozyTheme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Streamlined Single Filter Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalPills}
      >
        {/* Type Filter Pills */}
        {onTypeChange &&
          TYPE_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => {
                  triggerLightHaptic();
                  onTypeChange(opt.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}

        <View style={styles.separator} />

        {DATE_OPTIONS.map((opt) => {
          const isSelected = dateFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => {
                triggerLightHaptic();
                onDateFilterChange(opt.id);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.separator} />

        {/* Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => {
                triggerLightHaptic();
                onCategoryChange(isSelected ? null : cat.id);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.catDot,
                  { backgroundColor: cat.color },
                  isSelected && { borderColor: CozyTheme.textInverse, borderWidth: 1 },
                ]}
              />
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: CozyTheme.textPrimary,
    padding: 0,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 2,
    marginLeft: 6,
  },
  horizontalPills: {
    gap: 6,
    paddingRight: 10,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: CozyTheme.surface,
    borderWidth: 1,
    borderColor: CozyTheme.border,
  },
  pillSelected: {
    backgroundColor: CozyTheme.textPrimary,
    borderColor: CozyTheme.textPrimary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: CozyTheme.textSecondary,
  },
  pillTextSelected: {
    color: CozyTheme.textInverse,
    fontWeight: '700',
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: CozyTheme.border,
    marginHorizontal: 2,
  },
});

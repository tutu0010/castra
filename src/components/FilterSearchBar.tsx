import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Search, X, Calendar, Filter, RotateCcw } from 'lucide-react-native';
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
  categories: Category[];
  totalResults: number;
  totalEntries: number;
}

export const FilterSearchBar: React.FC<FilterSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  selectedCategoryId,
  onCategoryChange,
  categories,
  totalResults,
  totalEntries,
}) => {
  const isFilterActive = searchQuery.trim().length > 0 || dateFilter !== 'all' || selectedCategoryId !== null;

  const handleReset = () => {
    triggerLightHaptic();
    onSearchChange('');
    onDateFilterChange('all');
    onCategoryChange(null);
  };

  const DATE_OPTIONS: { id: DateFilterType; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_30_days', label: 'Past 30 Days' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Search size={16} color={CozyTheme.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="Search merchant, notes, entries..."
          placeholderTextColor={CozyTheme.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onSearchChange('');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={15} color={CozyTheme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date Range Selector Pills */}
      <View style={styles.pillRow}>
        <View style={styles.filterLeadIcon}>
          <Calendar size={13} color={CozyTheme.textSecondary} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalPills}
        >
          {DATE_OPTIONS.map((opt) => {
            const isSelected = dateFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.pill,
                  isSelected && styles.pillSelected,
                ]}
                onPress={() => {
                  triggerLightHaptic();
                  onDateFilterChange(opt.id);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Category Filter Scroll */}
      <View style={styles.pillRow}>
        <View style={styles.filterLeadIcon}>
          <Filter size={13} color={CozyTheme.textSecondary} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalPills}
        >
          <TouchableOpacity
            style={[
              styles.pill,
              selectedCategoryId === null && styles.pillSelected,
            ]}
            onPress={() => {
              triggerLightHaptic();
              onCategoryChange(null);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.pillText,
                selectedCategoryId === null && styles.pillTextSelected,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.pill,
                  isSelected && styles.pillSelected,
                ]}
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
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Status & Reset Banner (if active) */}
      {isFilterActive && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Showing {totalResults} of {totalEntries} entries
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RotateCcw size={11} color={CozyTheme.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.resetText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    marginBottom: 8,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CozyTheme.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CozyTheme.border,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: CozyTheme.textPrimary,
    padding: 0,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLeadIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  horizontalPills: {
    gap: 6,
    paddingRight: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CozyTheme.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    color: CozyTheme.textSecondary,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetText: {
    fontSize: 11,
    fontWeight: '700',
    color: CozyTheme.textPrimary,
  },
});

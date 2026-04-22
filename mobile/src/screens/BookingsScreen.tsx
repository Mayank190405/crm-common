import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput,
  TouchableOpacity
} from 'react-native';
import { theme } from '../styles/theme';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

export const BookingsScreen = () => {
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState([
    { id: '1', customer: 'Alice Johnson', unit: 'Tower A-402', status: 'Confirmed', amount: '₹1.2 Cr' },
    { id: '2', customer: 'Bob Smith', unit: 'Tower C-1205', status: 'Pending', amount: '₹85 L' },
    { id: '3', customer: 'Charlie Davis', unit: 'Tower B-901', status: 'Confirmed', amount: '₹2.1 Cr' },
  ]);

  return (
    <View style={styles.container}>
      <Text style={theme.typography.h1}>Bookings</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textDim} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by customer or unit..."
          placeholderTextColor={theme.colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList 
        data={bookings.filter(b => b.customer.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={styles.bookingCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.customerName}>{item.customer}</Text>
                <Text style={styles.unitNumber}>{item.unit}</Text>
              </View>
              <View style={[
                  styles.statusBadge, 
                  { backgroundColor: item.status === 'Confirmed' ? theme.colors.success + '20' : theme.colors.secondary + '20' }
                ]}>
                <Text style={[
                    styles.statusText, 
                    { color: item.status === 'Confirmed' ? theme.colors.success : theme.colors.secondary }
                  ]}>{item.status}</Text>
              </View>
            </View>
            
            <View style={styles.cardFooter}>
              <Text style={styles.amount}>{item.amount}</Text>
              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceSecondary,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    height: 48,
  },
  bookingCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  unitNumber: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: theme.spacing.md,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

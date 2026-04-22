import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { theme } from '../styles/theme';
import { Card } from '../components/Card';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';

export const DashboardScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ leads: 0, bookings: 0, activities: 0 });

  const fetchStats = async () => {
    try {
      // Mock stats for now or actual API calls
      // const response = await apiClient.get('/reports/dashboard-stats');
      // setStats(response.data);
      setStats({ leads: 24, bookings: 5, activities: 12 });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats().then(() => setRefreshing(false));
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={theme.typography.h1}>Dashboard</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Leads" 
          value={stats.leads.toString()} 
          icon="people" 
          color={theme.colors.primary} 
        />
        <StatCard 
          title="Bookings" 
          value={stats.bookings.toString()} 
          icon="home" 
          color={theme.colors.secondary} 
        />
      </View>

      <Text style={[theme.typography.h3, styles.sectionTitle]}>Recent Activities</Text>
      <Card style={styles.activityCard}>
        <ActivityItem 
          title="Follow-up with John Doe" 
          time="2h ago" 
          type="call" 
        />
        <ActivityItem 
          title="Site visit scheduled - Project X" 
          time="4h ago" 
          type="calendar" 
        />
        <ActivityItem 
          title="New Lead: Sarah Connor" 
          time="1d ago" 
          type="person-add" 
        />
      </Card>
    </ScrollView>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <Card style={styles.statCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{title}</Text>
  </Card>
);

const ActivityItem = ({ title, time, type }: any) => (
  <View style={styles.activityItem}>
    <View style={styles.activityDot} />
    <View style={{ flex: 1 }}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  activityCard: {
    marginBottom: theme.spacing.xxl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  activityTitle: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
});

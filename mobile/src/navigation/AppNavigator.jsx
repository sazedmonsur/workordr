import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'

import LoginScreen          from '../screens/LoginScreen'
import JobListScreen        from '../screens/JobListScreen'
import JobDetailsScreen     from '../screens/JobDetailsScreen'
import JobExecutionScreen   from '../screens/JobExecutionScreen'
import CompleteJobScreen    from '../screens/CompleteJobScreen'
import AvailabilityScreen   from '../screens/AvailabilityScreen'
import QuoteScreen          from '../screens/QuoteScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

const headerStyle = {
  headerStyle: { backgroundColor: '#1e3a8a' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
}

// Tab: Jobs stack
function JobsStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="JobList"     component={JobListScreen}      options={{ title: 'My Jobs' }} />
      <Stack.Screen name="JobDetail"   component={JobDetailsScreen}   options={{ title: 'Job Details' }} />
      <Stack.Screen name="JobExecution" component={JobExecutionScreen} options={{ title: 'Job In Progress' }} />
      <Stack.Screen name="CompleteJob" component={CompleteJobScreen}  options={{ title: 'Complete Job' }} />
      <Stack.Screen name="Quote"       component={QuoteScreen}        options={{ title: 'Create Quote' }} />
    </Stack.Navigator>
  )
}

// Bottom tab navigator (after login)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle:      { backgroundColor: '#fff', borderTopColor: '#f3f4f6' },
        tabBarActiveTintColor:   '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabel: ({ focused, color }) => (
          <Text style={{ color, fontSize: 10, fontWeight: focused ? '700' : '500' }}>
            {route.name === 'Jobs' ? 'My Jobs' : 'Availability'}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => {
          const icons = { Jobs: '⚙', Availability: '◻' }
          return <Text style={{ color, fontSize: size - 4 }}>{icons[route.name]}</Text>
        },
      })}
    >
      <Tab.Screen name="Jobs"         component={JobsStack} />
      <Tab.Screen name="Availability" component={AvailabilityScreen}
        options={{ headerShown: true, ...headerStyle, title: 'My Availability' }} />
    </Tab.Navigator>
  )
}

// Root navigator: Login → Tabs
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Tabs"  component={MainTabs} />
    </Stack.Navigator>
  )
}

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import JobListScreen from '../screens/JobListScreen'
import JobDetailsScreen from '../screens/JobDetailsScreen'
import JobExecutionScreen from '../screens/JobExecutionScreen'
import CompleteJobScreen from '../screens/CompleteJobScreen'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1d4ed8' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="JobList"
        component={JobListScreen}
        options={{ title: 'WorkOrdr — My Jobs' }}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetailsScreen}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen
        name="JobExecution"
        component={JobExecutionScreen}
        options={{ title: 'Job In Progress' }}
      />
      <Stack.Screen
        name="CompleteJob"
        component={CompleteJobScreen}
        options={{ title: 'Complete Job' }}
      />
    </Stack.Navigator>
  )
}

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { state } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {state.userToken == null ? (
        <Stack.Screen name="Auth" component={() => <></>} />
      ) : (
        <Stack.Screen name="App" component={() => <></>} />
      )}
    </Stack.Navigator>
  );
}

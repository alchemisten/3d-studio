/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';

export const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <View></View>
      </SafeAreaView>
    </>
  );
};
const styles = StyleSheet.create({});

export default App;

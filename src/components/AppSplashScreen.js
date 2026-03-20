import React from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

export default function AppSplashScreen() {
  const pulse = React.useRef(new Animated.Value(0.9)).current;
  const fade = React.useRef(new Animated.Value(0.2)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, {
            toValue: 0.95,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 0.6,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [fade, pulse]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/images/plantu-logo.png")}
        style={[styles.logo, { opacity: fade, transform: [{ scale: pulse }] }]}
        resizeMode="contain"
      />
      <Text style={styles.brand}>Plantu</Text>
      <Text style={styles.tagline}>Grow smarter, not harder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4fbf4",
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: 16,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1f6f45",
    letterSpacing: 0.4,
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: "#4f6754",
  },
});

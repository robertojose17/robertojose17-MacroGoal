
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MapMarker {
  latitude: number;
  longitude: number;
  title?: string;
}

interface MapProps {
  latitude: number;
  longitude: number;
  markers?: MapMarker[];
  style?: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function Map({ latitude, longitude, markers, style }: MapProps) {
  return <View style={[styles.container, style]} />;
}

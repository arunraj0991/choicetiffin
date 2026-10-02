import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";

export const PROVIDER_GOOGLE = "google";

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export function Marker(_props: any) {
  return null;
}

const MapView = forwardRef((props: any, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
  }));

  return <View {...props}>{props.children}</View>;
});

MapView.displayName = "MapView";

export default MapView;

import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";

export const PROVIDER_GOOGLE = "google";

export function Marker(_props) {
  return null;
}

const MapView = forwardRef((props, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
  }));

  return <View {...props}>{props.children}</View>;
});

MapView.displayName = "MapView";

export default MapView;

import { useCallback, useMemo, type ReactNode } from "react";
import { Map as MapLibreMap, type MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import styled from "styled-components";
import { Box } from "@mui/material";
import { useTileServer } from "ports/context/tile-server/tile-server.hook.ts";
import { mapStyleFor } from "infrastructure/tile-server/base-maps.ts";

const MapWrapper = styled(Box)`
  flex: 1;
  display: flex;
  position: relative;
  width: 100%;
  height: 100%;
  /* Pin the map onto its own compositing layer. Without this, layering another
     positioned element (a floating window) over the WebGL canvas can leave a
     stale/blank rectangle where Chromium fails to re-composite the canvas. */
  transform: translateZ(0);
`;

const FILL: React.CSSProperties = { width: "100%", height: "100%" };

interface MapProps {
  center: { longitude: number; latitude: number };
  zoom?: number;
  scrollZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onMapClick?: (
    coordinates: { lat: number; lng: number },
    modifiers: { shift: boolean },
  ) => void;
  children?: ReactNode;
}

export default function Map({
  center,
  zoom = 3,
  scrollZoom = false,
  minZoom = 3,
  maxZoom = 19,
  onMapClick,
  children,
}: MapProps) {
  const { baseMaps, selectedBaseMap } = useTileServer();

  // A fresh style object each render makes react-maplibre call `setStyle` on
  // every render, which reloads the raster source (and blanks the tiles); key it
  // to the selected provider instead.
  const mapStyle = useMemo(
    () => mapStyleFor(baseMaps[selectedBaseMap]),
    [baseMaps, selectedBaseMap],
  );

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const { lat, lng } = event.lngLat;
      onMapClick?.({ lat, lng }, { shift: event.originalEvent.shiftKey });
    },
    [onMapClick],
  );

  return (
    <MapWrapper>
      <MapLibreMap
        initialViewState={{ ...center, zoom }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        scrollZoom={scrollZoom}
        // Shift is our quick-pin modifier; free it from MapLibre's shift-drag
        // box-zoom, which otherwise swallows the click event.
        boxZoom={false}
        mapStyle={mapStyle}
        style={FILL}
        onClick={onMapClick ? handleClick : undefined}
      >
        {children}
      </MapLibreMap>
    </MapWrapper>
  );
}

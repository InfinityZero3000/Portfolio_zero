import React, { useEffect, useState, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { useResizeDetector } from 'react-resize-detector';

interface GlobeVizProps {
  onGlobeReady?: () => void;
}

const GlobeViz: React.FC<GlobeVizProps> = ({ onGlobeReady }) => {
  const globeEl = useRef<any>(null);
  const [countries, setCountries] = useState({ features: [] });
  const { width, height, ref } = useResizeDetector();

  // Vietnam Geo Data (Simplified) and Markers
  const markers = useMemo(() => [
    {
      name: "Hanoi",
      lat: 21.0285,
      lng: 105.8542,
      type: "star",
      color: "yellow",
      size: 1.5
    },
    {
      name: "Ho Chi Minh City",
      lat: 10.7626,
      lng: 106.6602,
      type: "pin",
      color: "#dc2626", // Brand red
      size: 1.2
    }
  ], []);

  useEffect(() => {
    // Load GeoJSON
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        if (onGlobeReady) onGlobeReady();
      })
      .catch(err => console.error("Failed to load globe data", err));
  }, [onGlobeReady]);

  useEffect(() => {
    if (globeEl.current) {
      // Small delay to ensure globe is fully mounted
      setTimeout(() => {
        if(globeEl.current) {
           globeEl.current.pointOfView({ lat: 16, lng: 106, altitude: 2 }, 2000);
           globeEl.current.controls().autoRotate = true;
           globeEl.current.controls().autoRotateSpeed = 0.5;
        }
      }, 500);
    }
  }, [width, height]); // Re-run when resized to ensure controls attach

  return (
    <div ref={ref} className="w-full h-full absolute inset-0 z-0">
      {width && height ? (
        <Globe
          ref={globeEl}
          width={width}
          height={height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={countries.features}
          polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
          polygonCapColor={(d: any) => {
             // Highlight Vietnam
             if (d.properties.NAME === 'Vietnam' || d.properties.ADMIN === 'Vietnam') {
               return 'rgba(220, 38, 38, 0.6)'; // Red with opacity
             }
             return 'rgba(20, 20, 20, 0.3)'; // Dark gray others
          }}
          polygonStrokeColor={(d: any) => {
             if (d.properties.NAME === 'Vietnam') return '#ffaaaa';
             return '#333';
          }}
          polygonAltitude={0.01}
          
          // HTML Elements for custom markers
          htmlElementsData={markers}
          htmlLat={(d: any) => d.lat}
          htmlLng={(d: any) => d.lng}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            
            if (d.type === 'star') {
              // Hanoi Star
              el.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                  <span style="font-size: 24px; color: #fbbf24; text-shadow: 0 0 10px #fbbf24;">★</span>
                  <div style="background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 2px; white-space: nowrap; border: 1px solid #fbbf24;">
                    Hanoi (Capital)
                  </div>
                </div>
              `;
            } else {
              // HCMC Pin
              el.innerHTML = `
                 <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#dc2626" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3" fill="white"></circle>
                  </svg>
                  <div style="background: rgba(220, 38, 38, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-top: 2px; white-space: nowrap; font-weight: bold;">
                    Me (HCMC)
                  </div>
                </div>
              `;
            }
            return el;
          }}
          
          atmosphereColor="#dc2626"
          atmosphereAltitude={0.15}
        />
      ) : null}
    </div>
  );
};

export default GlobeViz;
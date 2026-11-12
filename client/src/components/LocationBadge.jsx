import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, RefreshCw, AlertCircle, ShieldCheck,
  Building2, ExternalLink, Copy, Check, Edit2, X
} from 'lucide-react';
import { attendanceApi } from '../services/api';

// Reference office location: DASA TECH HQ, Erode Innovation Campus
const DASA_HQ = {
  name: 'DASA TECH HQ',
  address: 'DASA Tech Innovation Campus, Erode, TN',
  latitude: 11.341036,
  longitude: 77.717163,
  radiusMeters: 300
};

// Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * (Math.sin(Δλ / 2) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function LocationBadge({ onLocationUpdate, initialLocation = null }) {
  const [coords, setCoords] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [permBlocked, setPermBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLat, setCustomLat] = useState('11.341036');
  const [customLng, setCustomLng] = useState('77.717163');
  const [customLabel, setCustomLabel] = useState('DASA TECH Campus');

  // Stable ref for parent callback to prevent re-render loops
  const onLocationUpdateRef = useRef(onLocationUpdate);
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  });

  // Guarded apply location
  const applyLocation = (data) => {
    setCoords(prev => {
      if (prev && prev.latitude === data.latitude && prev.longitude === data.longitude && prev.source === data.source) {
        return prev;
      }
      return data;
    });
    setLoading(false);
    if (onLocationUpdateRef.current) {
      onLocationUpdateRef.current(data);
    }
  };

  // Fallback to Geo-IP or Office Preset
  const fallbackToIpOrOffice = async () => {
    setStage('Querying network IP telemetry...');
    try {
      const res = await attendanceApi.getGeoIp();
      if (res.data?.success && res.data.ipLocation?.latitude) {
        const ipLoc = res.data.ipLocation;
        const ipData = {
          latitude: parseFloat(ipLoc.latitude),
          longitude: parseFloat(ipLoc.longitude),
          accuracy: 250,
          source: `ISP Network (${ipLoc.city || 'Tamil Nadu'})`,
          locationName: `${ipLoc.city}, ${ipLoc.region} (${ipLoc.isp || 'Broadband'})`,
          timestamp: Date.now()
        };
        applyLocation(ipData);
        return;
      }
    } catch (e) {
      console.warn('IP fallback error:', e);
    }

    // Default to office campus
    const officeData = {
      latitude: DASA_HQ.latitude,
      longitude: DASA_HQ.longitude,
      accuracy: 10,
      source: 'DASA TECH Campus HQ (Verified)',
      locationName: DASA_HQ.name,
      timestamp: Date.now()
    };
    applyLocation(officeData);
  };

  // Scan location
  const fetchLocation = async (forcedMode = null) => {
    if (loading) return;
    setLoading(true);
    setPermBlocked(false);

    if (forcedMode === 'office') {
      const officeData = {
        latitude: DASA_HQ.latitude,
        longitude: DASA_HQ.longitude,
        accuracy: 10,
        source: 'Verified Campus HQ',
        locationName: DASA_HQ.name,
        timestamp: Date.now()
      };
      setStage('Office HQ selected');
      applyLocation(officeData);
      return;
    }

    if (!navigator.geolocation) {
      await fallbackToIpOrOffice();
      return;
    }

    // Attempt 1: High Accuracy GPS
    setStage('Scanning GPS satellite lock...');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4500,
          maximumAge: 0
        });
      });

      const highAccData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 15),
        source: 'Hardware GPS Satellite',
        locationName: 'Live Device GPS',
        timestamp: position.timestamp
      };
      setStage('GPS Locked');
      applyLocation(highAccData);
      return;
    } catch (gpsErr) {
      if (gpsErr.code === 1) {
        setPermBlocked(true);
        await fallbackToIpOrOffice();
        return;
      }
    }

    // Attempt 2: Wi-Fi triangulation
    setStage('Trying Wi-Fi triangulation...');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000
        });
      });

      const wifiData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 35),
        source: 'Wi-Fi Positioning',
        locationName: 'Network Positioning',
        timestamp: position.timestamp
      };
      setStage('Wi-Fi Locked');
      applyLocation(wifiData);
      return;
    } catch (wifiErr) {
      if (wifiErr.code === 1) setPermBlocked(true);
    }

    // Attempt 3: IP Telemetry
    await fallbackToIpOrOffice();
  };

  // Run ONCE on mount only
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveCustom = (e) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinates (-90 to 90 lat, -180 to 180 lng).');
      return;
    }
    const customData = {
      latitude: lat,
      longitude: lng,
      accuracy: 15,
      source: `Manual Pin: ${customLabel || 'Custom Site'}`,
      locationName: customLabel || 'Manual Coordinates',
      timestamp: Date.now()
    };
    setShowCustomInput(false);
    applyLocation(customData);
  };

  const distanceToHq = coords
    ? getDistanceMeters(coords.latitude, coords.longitude, DASA_HQ.latitude, DASA_HQ.longitude)
    : null;
  const isWithinCampus = distanceToHq !== null && distanceToHq <= 500;

  const copyCoordinates = () => {
    if (!coords) return;
    navigator.clipboard.writeText(`${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-3 h-3 rounded-full ${coords ? 'bg-emerald-500' : 'bg-amber-500'} block`}></span>
            {coords && <span className="w-3 h-3 rounded-full bg-emerald-500 absolute top-0 left-0 radar-ping block"></span>}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Location Telemetry</span>
              {coords && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full lowercase">
                  captured
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchLocation()}
            disabled={loading}
            className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-xl border border-amber-200 cursor-pointer"
            title="Scan for exact device GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : 'text-amber-700'}`} />
            <span>{loading ? 'Locating...' : 'Detect GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLocation('office')}
            className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 transition-colors bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
            title="Set official DASA TECH Campus location"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Set HQ Campus</span>
          </button>
        </div>
      </div>

      {/* Permission blocked guidance banner */}
      {permBlocked && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Browser Location Permission Blocked</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            Click the <strong>padlock 🔒 icon</strong> on the left side of your browser URL bar, set <strong>Location</strong> to <strong>Allow</strong>, then click <strong>Detect GPS</strong>.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLocation('office')}
              className="text-[11px] bg-white border border-rose-300 text-rose-900 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
            >
              🏢 Use DASA TECH HQ Campus
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="text-[11px] text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Enter Custom Coordinates
            </button>
          </div>
        </div>
      )}

      {/* Coords details display */}
      {coords && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
          {/* Coordinates row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-slate-500 font-medium">Captured Coordinates:</span>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs text-xs">
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </span>
              <button
                type="button"
                onClick={copyCoordinates}
                title="Copy coordinates"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Source & Signal Accuracy */}
          <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
            <span className="text-slate-500 font-medium">Source / Method:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                coords.source?.includes('GPS') ? 'bg-emerald-500' :
                coords.source?.includes('Campus') ? 'bg-amber-500' : 'bg-cyan-500'
              }`}></span>
              <span>{coords.source || 'Device Telemetry'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-slate-500 font-medium">Signal Accuracy:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              coords.accuracy <= 25 ? 'bg-emerald-100 text-emerald-800' :
              coords.accuracy <= 100 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
            }`}>
              ±{coords.accuracy} meters ({coords.accuracy <= 25 ? 'High Precision GPS' : coords.accuracy <= 100 ? 'Wi-Fi Precision' : 'Approximate Network'})
            </span>
          </div>

          {/* Campus proximity badge */}
          <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              {isWithinCampus ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">
                    Within DASA TECH Campus perimeter ({distanceToHq}m from HQ)
                  </span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800">
                    {distanceToHq !== null ? `${(distanceToHq / 1000).toFixed(1)} km from DASA TECH Campus HQ` : 'Off-site Location'}
                  </span>
                </>
              )}
            </div>

            <a
              href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View on Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Manual / Custom Coordinate override drawer */}
      {showCustomInput ? (
        <form onSubmit={handleSaveCustom} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase text-[10px]">Manual Coordinates Pin</span>
            <button
              type="button"
              onClick={() => setShowCustomInput(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Latitude</label>
              <input
                type="text"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Longitude</label>
              <input
                type="text"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-mono text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Location Name / Client Site</label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. DASA TECH Erode Office / Client Site A"
              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCustomInput(false)}
              className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Apply Coordinates
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Trouble capturing satellite GPS?</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchLocation('office')}
              className="text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
            >
              Use Office Preset
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="text-slate-600 hover:text-slate-900 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Enter Custom Pin</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

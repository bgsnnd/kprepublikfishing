/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
} from 'react-leaflet'
import { Locate } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix marker icon Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type LocationPickerProps = {
  latitude: number
  longitude: number
  radiusMeters: number
  onChange: (lat: number, lng: number) => void
}

function LocationPickerInner({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: LocationPickerProps) {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude, map])

  // Ambil API key dari env
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY

  return (
    <>
      {/* Layer: MapTiler Hybrid (satelit + label lengkap) */}
      {maptilerKey ? (
        <TileLayer
          url={`https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${maptilerKey}`}
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={20}
        />
      ) : (
        <>
          {/* Fallback: Esri Satelit + Label */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri'
            maxZoom={19}
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}"
            attribution='Reference &copy; Esri'
            maxZoom={19}
          />
        </>
      )}

      <Marker
        position={[latitude, longitude]}
        icon={icon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target
            const pos = marker.getLatLng()
            onChange(pos.lat, pos.lng)
          },
        }}
      />
      <Circle
        center={[latitude, longitude]}
        radius={radiusMeters}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
    </>
  )
}

export function LocationPicker({
  latitude,
  longitude,
  radiusMeters,
  onChange,
}: LocationPickerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function detectMyLocation() {
    if (!navigator.geolocation) {
      toast.error('Browser tidak support geolocation')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude)
        toast.success(
          `Lokasi ditemukan (akurasi ~${Math.round(pos.coords.accuracy)}m)`,
        )
      },
      (err) => {
        toast.error('Gagal ambil lokasi. Izinkan akses GPS.')
        console.error(err)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!mounted) {
    return <div className="h-[320px] rounded-lg border bg-muted/30" />
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectMyLocation}
        >
          <Locate className="mr-2 h-4 w-4" />
          Deteksi Lokasi Saya
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden h-[320px] relative z-0">
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
        >
          <LocationPickerInner
            latitude={latitude}
            longitude={longitude}
            radiusMeters={radiusMeters}
            onChange={onChange}
          />
        </MapContainer>
      </div>
    </div>
  )
}
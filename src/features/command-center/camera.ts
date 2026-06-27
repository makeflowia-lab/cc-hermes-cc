// Cámara compartida para gestos y rostro: MISMAS constraints (deviceId elegido + 640x480) para maximizar
// la coexistencia de dos consumidores, con reintento de errores transitorios (NotReadableError/AbortError).

export function videoConstraints(cameraId: string): MediaStreamConstraints {
  const base: MediaTrackConstraints = { width: 640, height: 480 }
  if (cameraId) base.deviceId = { exact: cameraId }
  return { video: base }
}

export async function getCameraStream(cameraId: string, retries = 4): Promise<MediaStream> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await navigator.mediaDevices.getUserMedia(videoConstraints(cameraId))
    } catch (e) {
      const name = (e as { name?: string })?.name
      const transient = name === 'NotReadableError' || name === 'AbortError'
      if (attempt >= retries || !transient) throw e
      await new Promise((r) => setTimeout(r, 600))
    }
  }
}

/** Lista las cámaras (videoinput). Las etiquetas solo aparecen tras conceder permiso una vez. */
export async function listCameras(): Promise<MediaDeviceInfo[]> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((d) => d.kind === 'videoinput')
  } catch {
    return []
  }
}

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QR({ texto, className = '' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(texto, { margin: 1, width: 560, color: { dark: '#14532d', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [texto]);
  if (!src) return <div className={`aspect-square animate-pulse rounded-2xl bg-stone-100 ${className}`} />;
  return <img src={src} alt="Código QR para unirse a la mesa" className={`aspect-square rounded-2xl ${className}`} />;
}

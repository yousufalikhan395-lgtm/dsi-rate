import { useEffect } from 'react';

interface AdSenseProps {
  slot: string;
  style?: React.CSSProperties;
}

export default function AdSense({ slot, style }: AdSenseProps) {
  useEffect(() => {
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client="ca-pub-4090743743912741"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

import { View, Image } from 'react-native';

let logoSource: any = null;
try { logoSource = require('../../../assets/logo.png'); } catch { logoSource = null; }

export default function BrandLogo({ size = 32 }: { size?: number }) {
  if (!logoSource) {
    return <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#0d9488' }} />;
  }
  return <Image source={logoSource} style={{ width: size, height: size }} resizeMode="contain" />;
}
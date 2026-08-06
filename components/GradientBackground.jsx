import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Approximates the website's --grad-bg — five radial blooms (pink top-left,
// purple bottom-right, lilac top-center, pink bottom-left, purple
// upper-right) over a white base — using large soft-edged colour blobs
// diffused by a blur layer, since RN has no native radial-gradient-on-View.
export default function GradientBackground({ children }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fff0f4', '#fdfbfe', '#f4eeff']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobPinkTL]} />
      <View style={[styles.blob, styles.blobPurpleBR]} />
      <View style={[styles.blob, styles.blobLilacTR]} />
      <View style={[styles.blob, styles.blobPinkBL]} />
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobPinkTL: { width: 420, height: 420, top: -160, left: -140, backgroundColor: 'rgba(248,184,200,0.55)' },
  blobPurpleBR: { width: 420, height: 420, bottom: -160, right: -140, backgroundColor: 'rgba(201,168,201,0.45)' },
  blobLilacTR: { width: 300, height: 300, top: -60, right: -110, backgroundColor: 'rgba(232,208,240,0.35)' },
  blobPinkBL: { width: 260, height: 260, bottom: 40, left: -100, backgroundColor: 'rgba(255,209,232,0.3)' },
});

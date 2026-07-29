import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Clean ambient gradient backdrop — white, pink, purple, soft yellow. No decorative shapes.
// Wrap any screen's content with this.
export default function GradientBackground({ children }) {
  return (
    <View style={styles.container}>
      {/* Approximates the website's --grad-bg radial bloom soup (pink
          top-left, purple bottom-right, white 50% base) using a linear
          gradient since RN has no easy multi-radial background. */}
      <LinearGradient
        colors={['#fff0f4', '#fdfbfe', '#f4eeff']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});

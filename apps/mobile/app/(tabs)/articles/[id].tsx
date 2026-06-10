import { useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ArticleDetailScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();

  return (
    <View style={styles.container}>
      <WebView source={{ uri: url }} style={styles.webview} startInLoadingState />
    </View>
  );
}

export const options = ({ route }: { route: { params: { title: string } } }) => ({
  title: route.params.title,
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});

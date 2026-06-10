import { FlatList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Article } from '@sakiyomi/shared';
import { getArticles, markArticleRead } from '../../../src/infrastructure/articleRepository';

export default function ArticlesScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({ queryKey: ['articles'], queryFn: () => getArticles() });
  const markRead = useMutation({
    mutationFn: markArticleRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['articles'] }),
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F86C6" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>読み込みに失敗しました</Text></View>;

  function handlePress(article: Article) {
    if (!article.isRead) markRead.mutate(article.id);
    router.push({ pathname: '/(tabs)/articles/[id]', params: { id: article.id, url: article.url, title: article.title } });
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.item, item.isRead && styles.read]} onPress={() => handlePress(item)}>
          <Text style={styles.feedTitle}>{item.feedTitle}</Text>
          <Text style={[styles.title, item.isRead && styles.readText]} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.date}>{new Date(item.publishedAt).toLocaleDateString('ja-JP')}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<View style={styles.center}><Text>記事がありません</Text></View>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  item: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: 'relative' },
  read: { opacity: 0.6 },
  feedTitle: { fontSize: 12, color: '#4F86C6', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
  readText: { fontWeight: '400' },
  date: { fontSize: 12, color: '#999', marginTop: 6 },
  unreadDot: { position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F86C6' },
  error: { color: 'red' },
});

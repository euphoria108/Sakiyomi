import { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeeds, addFeed, deleteFeed } from '../../../src/infrastructure/feedRepository';
import type { Feed } from '@sakiyomi/shared';

export default function FeedsScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [url, setUrl] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['feeds'], queryFn: getFeeds });

  const addMutation = useMutation({
    mutationFn: addFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setModalVisible(false);
      setUrl('');
    },
    onError: (e) => Alert.alert('エラー', e instanceof Error ? e.message : '追加に失敗しました'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  function confirmDelete(feed: Feed) {
    Alert.alert('フィードを削除', `「${feed.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteMutation.mutate(feed.id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemText}>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedUrl} numberOfLines={1}>{item.url}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>削除</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? <View style={styles.empty}><Text style={styles.emptyText}>フィードがありません{'\n'}追加ボタンから RSS/Atom URL を登録してください</Text></View> : null
        }
      />
      {isLoading && <ActivityIndicator style={styles.loader} size="large" color="#4F86C6" />}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>フィードを追加</Text>
            <TextInput style={styles.input} placeholder="RSS / Atom URL" value={url} onChangeText={setUrl}
              autoCapitalize="none" keyboardType="url" autoFocus />
            <TouchableOpacity style={styles.button} onPress={() => addMutation.mutate(url)} disabled={addMutation.isPending || !url}>
              {addMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>追加</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setModalVisible(false); setUrl(''); }}>
              <Text style={styles.cancel}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemText: { flex: 1 },
  feedTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  feedUrl: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#ff4444', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', color: '#999', lineHeight: 22 },
  loader: { position: 'absolute', top: '50%', left: '50%' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4F86C6', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 },
  button: { backgroundColor: '#4F86C6', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { textAlign: 'center', marginTop: 14, color: '#999', fontSize: 15 },
});

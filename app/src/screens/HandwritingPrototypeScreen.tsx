import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  Image,
  type LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  SkiaInkCanvas,
  type EditorTool,
  type SkiaInkCanvasHandle,
} from '../components/handwriting/SkiaInkCanvas';
import { EditorViewport, LayerDragOverlay } from '../components/handwriting/EditorViewport';
import {
  InkInputAdapter,
  supportsNativeInkInput,
} from '../components/handwriting/InkInputAdapter';
import { colors, spacing } from '../constants/theme';
import {
  copyHandwritingAsset,
  writeHandwritingThumbnail,
} from '../data/handwritingAssetFiles';
import { useHandwritingEditor, type SaveStatus } from '../hooks/useHandwritingEditor';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { HandwritingLayer, HandwritingPage, PageBackground } from '../types/handwriting';
import {
  addImageLayer,
  addPage,
  addStickerLayer,
  deleteLayer,
  deletePage,
  duplicatePage,
  getPageInkStrokes,
  movePage,
  moveLayer,
  selectPage,
  setPageBackground,
  setPageInkStrokes,
  setPageThumbnail,
  updateLayer,
} from '../utils/handwritingDocument';
import { isTablet } from '../utils/isTablet';

type Props = NativeStackScreenProps<RootStackParamList, 'HandwritingPrototype'>;

const BACKGROUNDS: Array<{ label: string; value: PageBackground }> = [
  { label: '무지', value: { type: 'preset', preset: 'blank' } },
  { label: '줄', value: { type: 'preset', preset: 'lined' } },
  { label: '격자', value: { type: 'preset', preset: 'grid' } },
  { label: '도트', value: { type: 'preset', preset: 'dot' } },
  { label: '크림', value: { type: 'preset', preset: 'cream' } },
];

const STICKERS = [
  { id: 'heart', label: '하트' },
  { id: 'star', label: '별' },
  { id: 'flower', label: '꽃' },
  { id: 'pin', label: '위치' },
] as const;

const INK_COLORS = ['#3D3A39', '#C84C5A', '#3568A8', '#3B7D5B', '#E6A23C'] as const;
const STROKE_WIDTHS = [2, 4, 8, 14] as const;

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: '불러오는 중…',
  saved: '저장됨',
  dirty: '변경사항 있음',
  saving: '저장 중…',
  error: '저장 실패',
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.toolButton, active && styles.toolButtonActive, disabled && styles.disabled]}
    >
      <Text style={[styles.toolButtonText, active && styles.toolButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PageTab({
  page,
  index,
  selected,
  onSelect,
  onMove,
}: {
  page: HandwritingPage;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (targetIndex: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8,
        onPanResponderGrant: () => setDragging(true),
        onPanResponderRelease: (_, gesture) => {
          setDragging(false);
          const offset = Math.round(gesture.dx / 72);
          if (offset !== 0) onMove(index + offset);
        },
        onPanResponderTerminate: () => setDragging(false),
      }),
    [index, onMove],
  );
  const preset = page.background.type === 'preset' ? page.background.preset : 'image';

  return (
    <View {...responder.panHandlers} style={[styles.pageTab, selected && styles.pageTabSelected, dragging && styles.pageTabDragging]}>
      <Pressable onPress={onSelect} style={styles.pageTabPressable}>
        {page.thumbnailUri ? (
          <Image source={{ uri: page.thumbnailUri }} style={styles.pageMiniature} />
        ) : (
          <View style={[styles.pageMiniature, preset === 'cream' && styles.creamPage]} />
        )}
        <Text style={styles.pageNumber}>{index + 1}</Text>
      </Pressable>
    </View>
  );
}

export function HandwritingPrototypeScreen({ navigation, route }: Props) {
  const { diary } = route.params;
  const insets = useSafeAreaInsets();
  const leaveAllowed = useRef(false);
  const canvasRef = useRef<SkiaInkCanvasHandle>(null);
  const lastThumbnailContent = useRef('');
  const [tool, setTool] = useState<EditorTool>('pen');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [fingerDrawing, setFingerDrawing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [renderedPageSize, setRenderedPageSize] = useState({ width: 1, height: 1 });
  const [color, setColor] = useState<string>('#3D3A39');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const {
    document,
    canUndo,
    canRedo,
    saveStatus,
    commit,
    replaceWithoutHistory,
    undo,
    redo,
    saveNow,
  } = useHandwritingEditor(diary.id);

  const captureCurrentThumbnail = useCallback(async () => {
    if (!document) return;
    const page =
      document.pages.find((candidate) => candidate.id === document.selectedPageId) ??
      document.pages[0];
    if (!page) return;
    const bytes = await canvasRef.current?.makePngSnapshot();
    if (!bytes) return;
    const uri = writeHandwritingThumbnail(diary.id, document.id, page.id, bytes);
    // 썸네일 갱신은 사용자 편집이 아니므로 undo 스택과 자동 저장 시계를 건드리지 않는다.
    replaceWithoutHistory((current) => setPageThumbnail(current, page.id, uri), false);
    return uri;
  }, [diary.id, document, replaceWithoutHistory]);

  const saveWithThumbnail = useCallback(async () => {
    await captureCurrentThumbnail();
    await saveNow(true);
  }, [captureCurrentThumbnail, saveNow]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leaveAllowed.current) return;
        event.preventDefault();
        void saveWithThumbnail()
          .then(() => {
            leaveAllowed.current = true;
            navigation.dispatch(event.data.action);
          })
          .catch(() => {
            Alert.alert('저장 실패', '필기 문서를 저장한 뒤 다시 시도해 주세요.');
          });
      }),
    [navigation, saveWithThumbnail],
  );

  const selectedPageForThumbnail = document?.pages.find(
    (page) => page.id === document.selectedPageId,
  );
  const thumbnailContentKey = selectedPageForThumbnail
    ? JSON.stringify({
        id: selectedPageForThumbnail.id,
        background: selectedPageForThumbnail.background,
        layers: selectedPageForThumbnail.layers,
      })
    : '';

  useEffect(() => {
    if (!thumbnailContentKey || saveStatus !== 'dirty') return;
    if (lastThumbnailContent.current === thumbnailContentKey) return;
    const timer = setTimeout(() => {
      lastThumbnailContent.current = thumbnailContentKey;
      void captureCurrentThumbnail().catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [captureCurrentThumbnail, saveStatus, thumbnailContentKey]);

  if (!isTablet()) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.missing}>이 기능은 태블릿에서만 지원됩니다.</Text>
        <Pressable onPress={navigation.goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>{SAVE_LABELS[saveStatus]}</Text>
      </View>
    );
  }

  const selectedPage =
    document.pages.find((page) => page.id === document.selectedPageId) ?? document.pages[0]!;
  const selectedIndex = document.pages.findIndex((page) => page.id === selectedPage.id);
  const selectedPreset =
    selectedPage.background.type === 'preset' ? selectedPage.background.preset : 'image';
  const selectedLayer = selectedPage.layers.find((layer) => layer.id === selectedLayerId);
  const nativeInkActive =
    supportsNativeInkInput && (tool === 'pen' || tool === 'highlighter' || tool === 'eraser');

  async function pickImage(useAsBackground: boolean) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('사진 접근 권한이 필요합니다', '설정에서 사진 접근 권한을 허용해 주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    addManagedImage(asset.uri, asset.width, asset.height, useAsBackground);
  }

  function addManagedImage(
    sourceUri: string,
    width: number | undefined,
    height: number | undefined,
    useAsBackground = false,
  ) {
    try {
      const uri = copyHandwritingAsset(diary.id, document!.id, sourceUri);
      if (useAsBackground) {
        commit((current) =>
          setPageBackground(current, selectedPage.id, { type: 'image', assetUri: uri }),
        );
      } else {
        commit((current) =>
          addImageLayer(current, selectedPage.id, uri, width ?? 1200, height ?? 900),
        );
        setTool('select');
      }
    } catch {
      Alert.alert('이미지 추가 실패', '이미지를 필기 문서로 복사하지 못했습니다.');
    }
  }

  function transformSelectedLayer(
    transform: (layer: Exclude<HandwritingLayer, { type: 'ink' }>) => HandwritingLayer,
  ) {
    if (!selectedLayer || selectedLayer.type === 'ink') return;
    commit((current) => updateLayer(current, selectedPage.id, selectedLayer.id, (layer) =>
      layer.type === 'ink' ? layer : transform(layer),
    ));
  }

  function handlePageLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setRenderedPageSize({ width, height });
  }

  function confirmDeletePage() {
    if (document!.pages.length === 1) return;
    Alert.alert('페이지 삭제', `${selectedIndex + 1}번 페이지를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => commit((current) => deletePage(current, selectedPage.id)),
      },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack}>
          <Text style={styles.headerAction}>닫기</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{diary.title}</Text>
          <Text style={[styles.saveStatus, saveStatus === 'error' && styles.saveError]}>
            {SAVE_LABELS[saveStatus]}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() =>
              void captureCurrentThumbnail().then((uri) => {
                if (uri) setPreviewUri(uri);
              })
            }
          >
            <Text style={styles.headerAction}>PNG 보기</Text>
          </Pressable>
          <Pressable onPress={() => void saveWithThumbnail()}>
            <Text style={styles.headerAction}>저장</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.historyToolbar}
      >
        <ToolbarButton label="실행 취소" disabled={!canUndo} onPress={undo} />
        <ToolbarButton label="다시 실행" disabled={!canRedo} onPress={redo} />
        <View style={styles.toolbarDivider} />
        {(['pen', 'highlighter', 'eraser', 'select', 'navigate'] as EditorTool[]).map((value) => (
          <ToolbarButton
            key={value}
            label={{ pen: '펜', highlighter: '형광펜', eraser: '지우개', select: '선택', navigate: '이동' }[value]}
            active={tool === value}
            onPress={() => setTool(value)}
          />
        ))}
        <ToolbarButton
          label={fingerDrawing ? '손가락 필기 켜짐' : '손가락 필기 꺼짐'}
          active={fingerDrawing}
          onPress={() => setFingerDrawing((enabled) => !enabled)}
        />
        {INK_COLORS.map((inkColor) => (
          <Pressable
            accessibilityLabel={`잉크 색상 ${inkColor}`}
            key={inkColor}
            onPress={() => setColor(inkColor)}
            style={[
              styles.colorButton,
              { backgroundColor: inkColor },
              color === inkColor && styles.colorButtonSelected,
            ]}
          />
        ))}
        {STROKE_WIDTHS.map((width) => (
          <ToolbarButton
            key={width}
            label={`${width}px`}
            active={strokeWidth === width}
            onPress={() => setStrokeWidth(width)}
          />
        ))}
      </ScrollView>

      <View style={styles.pageActions}>
        <ToolbarButton label="+페이지" onPress={() => commit(addPage)} />
        <ToolbarButton label="복제" onPress={() => commit((current) => duplicatePage(current, selectedPage.id))} />
        <ToolbarButton label="삭제" disabled={document.pages.length === 1} onPress={confirmDeletePage} />
        <Text style={styles.dragHint}>페이지를 좌우로 드래그하여 순서 변경</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageStrip}>
        {document.pages.map((page, index) => (
          <PageTab
            key={page.id}
            page={page}
            index={index}
            selected={page.id === selectedPage.id}
            onSelect={() => {
              setSelectedLayerId(null);
              replaceWithoutHistory((current) => selectPage(current, page.id));
            }}
            onMove={(targetIndex) => commit((current) => movePage(current, page.id, targetIndex))}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.backgroundToolbar}>
        <Text style={styles.backgroundLabel}>배경</Text>
        {BACKGROUNDS.map(({ label, value }) => {
          const preset = value.type === 'preset' ? value.preset : 'image';
          return (
            <ToolbarButton
              key={label}
              label={label}
              active={selectedPreset === preset}
              onPress={() => commit((current) => setPageBackground(current, selectedPage.id, value))}
            />
          );
        })}
        <ToolbarButton label="사용자 이미지" active={selectedPreset === 'image'} onPress={() => void pickImage(true)} />
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assetToolbar}>
        <Text style={styles.backgroundLabel}>레이어</Text>
        <ToolbarButton label="갤러리 사진" onPress={() => void pickImage(false)} />
        {(diary.photos ?? []).map((photo, index) => (
          <ToolbarButton
            key={photo.id}
            label={`다이어리 사진 ${index + 1}`}
            onPress={() => addManagedImage(photo.fileUri, undefined, undefined)}
          />
        ))}
        {STICKERS.map((sticker) => (
          <ToolbarButton
            key={sticker.id}
            label={`스티커 · ${sticker.label}`}
            onPress={() => {
              commit((current) => addStickerLayer(current, selectedPage.id, sticker.id));
              setTool('select');
            }}
          />
        ))}
      </ScrollView>

      {selectedPage.layers.some((layer) => layer.type !== 'ink') ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerToolbar}>
          {selectedPage.layers.filter((layer) => layer.type !== 'ink').map((layer) => (
            <ToolbarButton key={layer.id} label={layer.name} active={layer.id === selectedLayerId} onPress={() => { setSelectedLayerId(layer.id); setTool('select'); }} />
          ))}
          {selectedLayer && selectedLayer.type !== 'ink' ? (
            <>
              <View style={styles.toolbarDivider} />
              <ToolbarButton label="←" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, x: layer.transform.x - 20 } }))} />
              <ToolbarButton label="→" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, x: layer.transform.x + 20 } }))} />
              <ToolbarButton label="↑" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, y: layer.transform.y - 20 } }))} />
              <ToolbarButton label="↓" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, y: layer.transform.y + 20 } }))} />
              <ToolbarButton label="크게" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, scaleX: Math.min(4, layer.transform.scaleX * 1.1), scaleY: Math.min(4, layer.transform.scaleY * 1.1) } }))} />
              <ToolbarButton label="작게" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, scaleX: Math.max(0.2, layer.transform.scaleX / 1.1), scaleY: Math.max(0.2, layer.transform.scaleY / 1.1) } }))} />
              <ToolbarButton label="회전" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, rotation: (layer.transform.rotation + 15) % 360 } }))} />
              <ToolbarButton label="앞으로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, 1))} />
              <ToolbarButton label="뒤로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, -1))} />
              <ToolbarButton label="레이어 삭제" onPress={() => { commit((current) => deleteLayer(current, selectedPage.id, selectedLayer.id)); setSelectedLayerId(null); }} />
            </>
          ) : null}
        </ScrollView>
      ) : null}

      <View style={styles.workspace}>
        <EditorViewport
          fingerNavigationOnly={nativeInkActive && !fingerDrawing}
          navigationEnabled={tool === 'navigate' || (nativeInkActive && !fingerDrawing)}
        >
        <View style={styles.pageCanvas} onLayout={handlePageLayout}>
          <SkiaInkCanvas
            ref={canvasRef}
            key={selectedPage.id}
            strokes={getPageInkStrokes(selectedPage)}
            layers={selectedPage.layers}
            pageWidth={selectedPage.width}
            pageHeight={selectedPage.height}
            background={selectedPage.background}
            tool={tool}
            color={color}
            width={strokeWidth}
            renderInk={!nativeInkActive}
            onStrokesChange={(strokes) =>
              commit((current) => setPageInkStrokes(current, selectedPage.id, strokes))
            }
          />
          {nativeInkActive ? (
            <InkInputAdapter
              strokes={getPageInkStrokes(selectedPage)}
              pageWidth={selectedPage.width}
              pageHeight={selectedPage.height}
              tool={tool}
              color={color}
              width={strokeWidth}
              fingerDrawing={fingerDrawing}
              onStrokesChange={(strokes) =>
                commit((current) => setPageInkStrokes(current, selectedPage.id, strokes))
              }
            />
          ) : null}
          {tool === 'select' && selectedLayer && selectedLayer.type !== 'ink' ? (
            <LayerDragOverlay
              layer={selectedLayer}
              pageWidth={selectedPage.width}
              pageHeight={selectedPage.height}
              renderedWidth={renderedPageSize.width}
              renderedHeight={renderedPageSize.height}
              onMove={(deltaX, deltaY) =>
                transformSelectedLayer((layer) => ({
                  ...layer,
                  transform: {
                    ...layer.transform,
                    x: layer.transform.x + deltaX,
                    y: layer.transform.y + deltaY,
                  },
                }))
              }
            />
          ) : null}
        </View>
        </EditorViewport>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
        transparent
        visible={previewUri !== null}
      >
        <Pressable onPress={() => setPreviewUri(null)} style={styles.previewBackdrop}>
          {previewUri ? <Image resizeMode="contain" source={{ uri: previewUri }} style={styles.previewImage} /> : null}
          <Text style={styles.previewHint}>탭하여 닫기</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  missing: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.lg, textAlign: 'center' },
  loadingText: { color: colors.textMuted, marginTop: spacing.md },
  backButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 10, backgroundColor: colors.primarySoft },
  backButtonText: { color: colors.primary, fontWeight: '700' },
  header: { minHeight: 60, alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  headerCenter: { alignItems: 'center' },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  headerAction: { color: colors.primary, fontSize: 15, fontWeight: '800', minWidth: 44 },
  saveStatus: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  saveError: { color: '#B42318' },
  historyToolbar: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toolbarDivider: { backgroundColor: colors.border, height: 24, marginHorizontal: spacing.xs, width: 1 },
  toolButton: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  toolButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toolButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  toolButtonTextActive: { color: '#FFFFFF' },
  colorButton: { borderColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, height: 30, width: 30 },
  colorButtonSelected: { borderColor: colors.primary, transform: [{ scale: 1.12 }] },
  disabled: { opacity: 0.35 },
  pageActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  dragHint: { color: colors.textMuted, fontSize: 11, marginLeft: spacing.sm },
  pageStrip: { gap: spacing.sm, padding: spacing.md },
  pageTab: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1 },
  pageTabSelected: { borderColor: colors.primary, borderWidth: 2 },
  pageTabDragging: { opacity: 0.55, transform: [{ scale: 1.04 }] },
  pageTabPressable: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, padding: 6 },
  pageMiniature: { backgroundColor: '#FFFFFF', borderColor: '#E4E4E4', borderWidth: 1, height: 40, width: 30 },
  creamPage: { backgroundColor: '#FFF7E3' },
  pageNumber: { color: colors.text, fontSize: 12, fontWeight: '700' },
  backgroundToolbar: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  assetToolbar: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  layerToolbar: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  backgroundLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  workspace: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.md, paddingTop: 0 },
  pageCanvas: { aspectRatio: 3 / 4, backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: 4, borderWidth: 1, elevation: 4, height: '100%', maxHeight: 720, maxWidth: 540, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  previewBackdrop: { alignItems: 'center', backgroundColor: 'rgba(20, 20, 20, 0.88)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  previewImage: { aspectRatio: 3 / 4, maxHeight: '88%', width: '70%' },
  previewHint: { color: '#FFFFFF', fontSize: 13, marginTop: spacing.md },
});

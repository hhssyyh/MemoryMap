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
  HandwritingEditorPanel,
  type HandwritingPanelSection,
} from '../components/handwriting/HandwritingEditorPanel';
import { HandwritingToolbar } from '../components/handwriting/HandwritingToolbar';
import { EditorViewport, LayerDragOverlay } from '../components/handwriting/EditorViewport';
import {
  InkInputAdapter,
  supportsNativeInkInput,
} from '../components/handwriting/InkInputAdapter';
import {
  SkiaInkCanvas,
  type EditorTool,
  type SkiaInkCanvasHandle,
} from '../components/handwriting/SkiaInkCanvas';
import { colors, shadows, spacing } from '../constants/theme';
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
  moveLayer,
  movePage,
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
  { label: '줄 노트', value: { type: 'preset', preset: 'lined' } },
  { label: '격자', value: { type: 'preset', preset: 'grid' } },
  { label: '도트', value: { type: 'preset', preset: 'dot' } },
  { label: '크림색', value: { type: 'preset', preset: 'cream' } },
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
  dirty: '저장 대기 중',
  saving: '저장 중…',
  error: '저장 실패',
};

function PanelButton({
  label,
  active = false,
  disabled = false,
  destructive = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.panelButton,
        active && styles.panelButtonActive,
        destructive && styles.panelButtonDestructive,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.panelButtonText,
          active && styles.panelButtonTextActive,
          destructive && styles.panelButtonTextDestructive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function PageCard({
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
          const offset = Math.round(gesture.dx / 80);
          if (offset !== 0) onMove(index + offset);
        },
        onPanResponderTerminate: () => setDragging(false),
      }),
    [index, onMove],
  );
  const cream = page.background.type === 'preset' && page.background.preset === 'cream';

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.pageCard,
        selected && styles.pageCardSelected,
        dragging && styles.pageCardDragging,
      ]}
    >
      <Pressable onPress={onSelect} style={styles.pageCardPressable}>
        {page.thumbnailUri ? (
          <Image source={{ uri: page.thumbnailUri }} style={styles.pageThumbnail} />
        ) : (
          <View style={[styles.pageThumbnail, cream && styles.creamPage]} />
        )}
        <Text style={styles.pageNumber}>{index + 1}</Text>
      </Pressable>
    </View>
  );
}

export function HandwritingPrototypeScreen({ navigation, route }: Props) {
  const { diary } = route.params;
  const insets = useSafeAreaInsets();
  const tablet = isTablet();
  const leaveAllowed = useRef(false);
  const canvasRef = useRef<SkiaInkCanvasHandle>(null);
  const lastThumbnailContent = useRef('');
  const [tool, setTool] = useState<EditorTool>('pen');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [fingerDrawing, setFingerDrawing] = useState(!tablet);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [panelSection, setPanelSection] = useState<HandwritingPanelSection | null>(null);
  const [renderedPageSize, setRenderedPageSize] = useState({ width: 1, height: 1 });
  const [workspaceSize, setWorkspaceSize] = useState({ width: 1, height: 1 });
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
    // 썸네일은 사용자 편집이 아니므로 undo 단계와 자동저장 기준 시각을 변경하지 않는다.
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

  // 화면 비율과 관계없이 3:4 페이지 전체가 먼저 보이도록 작업 영역 안에 맞춘다.
  const toolbarSpace = tablet ? 108 : 102;
  const availableWidth = Math.max(1, workspaceSize.width - (tablet ? 72 : 24));
  const availableHeight = Math.max(1, workspaceSize.height - toolbarSpace);
  const pageWidth = Math.min(availableWidth, availableHeight * 0.75, tablet ? 900 : 560);
  const pageHeight = pageWidth * (4 / 3);

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
      setPanelSection(null);
    } catch {
      Alert.alert('이미지 추가 실패', '이미지를 필기 문서로 복사하지 못했습니다.');
    }
  }

  function transformSelectedLayer(
    transform: (layer: Exclude<HandwritingLayer, { type: 'ink' }>) => HandwritingLayer,
  ) {
    if (!selectedLayer || selectedLayer.type === 'ink') return;
    commit((current) =>
      updateLayer(current, selectedPage.id, selectedLayer.id, (layer) =>
        layer.type === 'ink' ? layer : transform(layer),
      ),
    );
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

  function openPanel(section: HandwritingPanelSection) {
    setPanelSection(section);
  }

  function renderPanelContent() {
    if (panelSection === 'pages') {
      return (
        <>
          <SectionTitle>페이지 관리</SectionTitle>
          <View style={styles.buttonRow}>
            <PanelButton label="새 페이지" onPress={() => commit(addPage)} />
            <PanelButton
              label="복제"
              onPress={() => commit((current) => duplicatePage(current, selectedPage.id))}
            />
            <PanelButton
              destructive
              disabled={document!.pages.length === 1}
              label="삭제"
              onPress={confirmDeletePage}
            />
          </View>
          <Text style={styles.helpText}>페이지 카드를 좌우로 드래그하면 순서를 바꿀 수 있습니다.</Text>
          <View style={styles.pageGrid}>
            {document!.pages.map((page, index) => (
              <PageCard
                index={index}
                key={page.id}
                onMove={(targetIndex) =>
                  commit((current) => movePage(current, page.id, targetIndex))
                }
                onSelect={() => {
                  setSelectedLayerId(null);
                  replaceWithoutHistory((current) => selectPage(current, page.id));
                  setPanelSection(null);
                }}
                page={page}
                selected={page.id === selectedPage.id}
              />
            ))}
          </View>
        </>
      );
    }

    if (panelSection === 'style') {
      return (
        <>
          <SectionTitle>잉크 색상</SectionTitle>
          <View style={styles.buttonRow}>
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
          </View>
          <SectionTitle>펜 굵기</SectionTitle>
          <View style={styles.buttonRow}>
            {STROKE_WIDTHS.map((width) => (
              <PanelButton
                active={strokeWidth === width}
                key={width}
                label={`${width}px`}
                onPress={() => setStrokeWidth(width)}
              />
            ))}
          </View>
          <SectionTitle>손가락 입력</SectionTitle>
          <PanelButton
            active={fingerDrawing}
            label={fingerDrawing ? '손가락으로 필기' : '손가락으로 캔버스 이동'}
            onPress={() => setFingerDrawing((enabled) => !enabled)}
          />
          <Text style={styles.helpText}>
            펜이 없는 휴대폰에서는 손가락 필기를 켜고, 캔버스 이동이 필요할 때 이동 도구를 사용합니다.
          </Text>
        </>
      );
    }

    if (panelSection === 'paper') {
      return (
        <>
          <SectionTitle>종이 프리셋</SectionTitle>
          <View style={styles.buttonRow}>
            {BACKGROUNDS.map(({ label, value }) => {
              const preset = value.type === 'preset' ? value.preset : 'image';
              return (
                <PanelButton
                  active={selectedPreset === preset}
                  key={label}
                  label={label}
                  onPress={() =>
                    commit((current) => setPageBackground(current, selectedPage.id, value))
                  }
                />
              );
            })}
          </View>
          <PanelButton
            active={selectedPreset === 'image'}
            label="사진을 페이지 배경으로 사용"
            onPress={() => void pickImage(true)}
          />
        </>
      );
    }

    if (panelSection === 'insert') {
      return (
        <>
          <SectionTitle>사진</SectionTitle>
          <PanelButton label="갤러리에서 사진 추가" onPress={() => void pickImage(false)} />
          {(diary.photos ?? []).length > 0 ? <SectionTitle>다이어리 사진</SectionTitle> : null}
          <View style={styles.buttonRow}>
            {(diary.photos ?? []).map((photo, index) => (
              <PanelButton
                key={photo.id}
                label={`사진 ${index + 1}`}
                onPress={() => addManagedImage(photo.fileUri, undefined, undefined)}
              />
            ))}
          </View>
          <SectionTitle>기본 스티커</SectionTitle>
          <View style={styles.buttonRow}>
            {STICKERS.map((sticker) => (
              <PanelButton
                key={sticker.id}
                label={sticker.label}
                onPress={() => {
                  commit((current) => addStickerLayer(current, selectedPage.id, sticker.id));
                  setTool('select');
                  setPanelSection('layers');
                }}
              />
            ))}
          </View>
        </>
      );
    }

    return (
      <>
        <SectionTitle>페이지 레이어</SectionTitle>
        {selectedPage.layers.every((layer) => layer.type === 'ink') ? (
          <Text style={styles.emptyText}>사진이나 스티커를 추가하면 여기에서 편집할 수 있습니다.</Text>
        ) : (
          <View style={styles.layerList}>
            {selectedPage.layers
              .filter((layer) => layer.type !== 'ink')
              .map((layer) => (
                <PanelButton
                  active={layer.id === selectedLayerId}
                  key={layer.id}
                  label={layer.name}
                  onPress={() => {
                    setSelectedLayerId(layer.id);
                    setTool('select');
                  }}
                />
              ))}
          </View>
        )}
        {selectedLayer && selectedLayer.type !== 'ink' ? (
          <>
            <SectionTitle>선택한 레이어 조정</SectionTitle>
            <View style={styles.buttonRow}>
              <PanelButton label="←" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, x: layer.transform.x - 20 } }))} />
              <PanelButton label="→" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, x: layer.transform.x + 20 } }))} />
              <PanelButton label="↑" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, y: layer.transform.y - 20 } }))} />
              <PanelButton label="↓" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, y: layer.transform.y + 20 } }))} />
              <PanelButton label="크게" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, scaleX: Math.min(4, layer.transform.scaleX * 1.1), scaleY: Math.min(4, layer.transform.scaleY * 1.1) } }))} />
              <PanelButton label="작게" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, scaleX: Math.max(0.2, layer.transform.scaleX / 1.1), scaleY: Math.max(0.2, layer.transform.scaleY / 1.1) } }))} />
              <PanelButton label="15° 회전" onPress={() => transformSelectedLayer((layer) => ({ ...layer, transform: { ...layer.transform, rotation: (layer.transform.rotation + 15) % 360 } }))} />
              <PanelButton label="앞으로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, 1))} />
              <PanelButton label="뒤로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, -1))} />
              <PanelButton destructive label="삭제" onPress={() => { commit((current) => deleteLayer(current, selectedPage.id, selectedLayer.id)); setSelectedLayerId(null); }} />
            </View>
          </>
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }] }>
      <View style={[styles.header, !tablet && styles.headerPhone]}>
        <Pressable accessibilityLabel="필기 편집기 닫기" onPress={navigation.goBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={styles.headerTitle}>{diary.title}</Text>
          <Text style={[styles.saveStatus, saveStatus === 'error' && styles.saveError]}>
            {SAVE_LABELS[saveStatus]}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="PNG 미리보기"
          onPress={() => void captureCurrentThumbnail().then((uri) => uri && setPreviewUri(uri))}
          style={styles.headerButton}
        >
          <Text style={styles.previewButtonText}>▣</Text>
        </Pressable>
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setWorkspaceSize({ width, height });
        }}
        style={styles.workspace}
      >
        <EditorViewport
          fingerNavigationOnly={nativeInkActive && !fingerDrawing}
          navigationEnabled={tool === 'navigate' || (nativeInkActive && !fingerDrawing)}
        >
          <View
            onLayout={(event: LayoutChangeEvent) => {
              const { width, height } = event.nativeEvent.layout;
              setRenderedPageSize({ width, height });
            }}
            style={[styles.pageCanvas, { height: pageHeight, width: pageWidth }]}
          >
            <SkiaInkCanvas
              ref={canvasRef}
              key={selectedPage.id}
              background={selectedPage.background}
              color={color}
              layers={selectedPage.layers}
              onStrokesChange={(strokes) =>
                commit((current) => setPageInkStrokes(current, selectedPage.id, strokes))
              }
              pageHeight={selectedPage.height}
              pageWidth={selectedPage.width}
              renderInk={!nativeInkActive}
              strokes={getPageInkStrokes(selectedPage)}
              tool={tool}
              width={strokeWidth}
            />
            {nativeInkActive ? (
              <InkInputAdapter
                color={color}
                fingerDrawing={fingerDrawing}
                onStrokesChange={(strokes) =>
                  commit((current) => setPageInkStrokes(current, selectedPage.id, strokes))
                }
                pageHeight={selectedPage.height}
                pageWidth={selectedPage.width}
                strokes={getPageInkStrokes(selectedPage)}
                tool={tool}
                width={strokeWidth}
              />
            ) : null}
            {tool === 'select' && selectedLayer && selectedLayer.type !== 'ink' ? (
              <LayerDragOverlay
                layer={selectedLayer}
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
                pageHeight={selectedPage.height}
                pageWidth={selectedPage.width}
                renderedHeight={renderedPageSize.height}
                renderedWidth={renderedPageSize.width}
              />
            ) : null}
          </View>
        </EditorViewport>

        <View pointerEvents="box-none" style={[styles.toolbarPosition, tablet ? styles.toolbarTablet : styles.toolbarPhone]}>
          <HandwritingToolbar
            canRedo={canRedo}
            canUndo={canUndo}
            color={color}
            compact={!tablet}
            onOpenMore={() => openPanel('paper')}
            onOpenStyle={() => openPanel('style')}
            onRedo={redo}
            onToolChange={setTool}
            onUndo={undo}
            tool={tool}
            width={strokeWidth}
          />
        </View>

        <View style={[styles.quickActions, tablet ? styles.quickActionsTablet : styles.quickActionsPhone]}>
          <Pressable onPress={() => openPanel('pages')} style={styles.quickButton}>
            <Text style={styles.quickButtonText}>{selectedIndex + 1} / {document.pages.length}</Text>
          </Pressable>
          <Pressable onPress={() => openPanel('insert')} style={styles.quickButton}>
            <Text style={styles.quickButtonSymbol}>＋</Text>
          </Pressable>
        </View>
      </View>

      <HandwritingEditorPanel
        onClose={() => setPanelSection(null)}
        onSectionChange={setPanelSection}
        section={panelSection ?? 'pages'}
        tablet={tablet}
        visible={panelSection !== null}
      >
        {renderPanelContent()}
      </HandwritingEditorPanel>

      <Modal
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
        transparent
        visible={previewUri !== null}
      >
        <Pressable onPress={() => setPreviewUri(null)} style={styles.previewBackdrop}>
          {previewUri ? (
            <Image resizeMode="contain" source={{ uri: previewUri }} style={styles.previewImage} />
          ) : null}
          <Text style={styles.previewHint}>탭하여 닫기</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#EDE9E4', flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, marginTop: spacing.md },
  header: { alignItems: 'center', backgroundColor: 'rgba(248, 244, 239, 0.96)', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 56, justifyContent: 'space-between', paddingHorizontal: spacing.md, zIndex: 3 },
  headerPhone: { height: 50, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 44 },
  headerButtonText: { color: colors.primary, fontSize: 32, fontWeight: '400', lineHeight: 34 },
  previewButtonText: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800', maxWidth: '100%' },
  saveStatus: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  saveError: { color: '#B42318' },
  workspace: { flex: 1, overflow: 'hidden' },
  pageCanvas: { backgroundColor: '#FFFFFF', borderColor: '#DED7D1', borderRadius: 5, borderWidth: 1, overflow: 'hidden', ...shadows.medium },
  toolbarPosition: { left: 0, position: 'absolute', right: 0 },
  toolbarTablet: { top: 14 },
  toolbarPhone: { bottom: 10, paddingHorizontal: spacing.sm },
  quickActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, position: 'absolute' },
  quickActionsTablet: { bottom: 18, left: 18 },
  quickActionsPhone: { left: 12, top: 12 },
  quickButton: { alignItems: 'center', backgroundColor: 'rgba(255, 253, 249, 0.97)', borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', minWidth: 46, paddingHorizontal: 12, ...shadows.light },
  quickButtonText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  quickButtonSymbol: { color: colors.primary, fontSize: 22, lineHeight: 24 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.xs },
  helpText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 20, paddingVertical: spacing.lg, textAlign: 'center' },
  buttonRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  panelButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  panelButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  panelButtonDestructive: { borderColor: '#E5B8B8' },
  panelButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  panelButtonTextActive: { color: '#FFFFFF' },
  panelButtonTextDestructive: { color: '#B42318' },
  disabled: { opacity: 0.35 },
  colorButton: { borderColor: '#FFFFFF', borderRadius: 24, borderWidth: 3, height: 46, width: 46, ...shadows.light },
  colorButtonSelected: { borderColor: colors.primary, transform: [{ scale: 1.08 }] },
  pageGrid: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pageCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: 7 },
  pageCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  pageCardDragging: { opacity: 0.55, transform: [{ scale: 1.04 }] },
  pageCardPressable: { alignItems: 'center', gap: spacing.xs },
  pageThumbnail: { backgroundColor: '#FFFFFF', borderColor: '#E4E4E4', borderWidth: 1, height: 112, width: 84 },
  creamPage: { backgroundColor: '#FFF7E3' },
  pageNumber: { color: colors.text, fontSize: 12, fontWeight: '800' },
  layerList: { alignItems: 'flex-start', gap: spacing.sm },
  previewBackdrop: { alignItems: 'center', backgroundColor: 'rgba(20, 20, 20, 0.88)', flex: 1, justifyContent: 'center', padding: spacing.xl },
  previewImage: { aspectRatio: 3 / 4, maxHeight: '88%', width: '76%' },
  previewHint: { color: '#FFFFFF', fontSize: 13, marginTop: spacing.md },
});

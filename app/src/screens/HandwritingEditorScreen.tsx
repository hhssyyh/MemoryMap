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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  HandwritingEditorPanel,
  type HandwritingPanelSection,
} from '../components/handwriting/HandwritingEditorPanel';
import { HandwritingToolbar } from '../components/handwriting/HandwritingToolbar';
import { InkSelectionOverlay } from '../components/handwriting/InkSelectionOverlay';
import { EditorViewport, LayerTransformOverlay } from '../components/handwriting/EditorViewport';
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
  cleanupHandwritingAssets,
  HandwritingAssetLimitError,
  importHandwritingAsset,
  writeHandwritingThumbnail,
} from '../data/handwritingAssetFiles';
import { handwritingRepository } from '../data/HandwritingRepository';
import { useHandwritingEditor, type SaveStatus } from '../hooks/useHandwritingEditor';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  MAX_HANDWRITING_PAGES,
  MAX_HANDWRITING_STROKES,
  type HandwritingLayer,
  type HandwritingPage,
  type InkStroke,
  type PageBackground,
} from '../types/handwriting';
import {
  addImageLayer,
  addPage,
  addStickerLayer,
  canAddEditableLayer,
  canDuplicatePage,
  deleteLayer,
  deletePage,
  duplicatePage,
  constrainLayerTransform,
  countDocumentInkStrokes,
  duplicateLayer,
  getTopmostEditableLayerAtPoint,
  getPageInkStrokes,
  moveLayer,
  moveLayerTo,
  movePage,
  selectPage,
  setPageBackground,
  setPageInkStrokes,
  setPageThumbnail,
  translatePageInkStrokes,
  updateLayer,
  rotatePage,
} from '../utils/handwritingDocument';
import { createHandwritingId } from '../utils/handwriting';
import { isTablet } from '../utils/isTablet';

type Props = NativeStackScreenProps<RootStackParamList, 'HandwritingEditor'>;

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

export function HandwritingEditorScreen({ navigation, route }: Props) {
  const { diary } = route.params;
  const insets = useSafeAreaInsets();
  const tablet = isTablet();
  const leaveAllowed = useRef(false);
  const canvasRef = useRef<SkiaInkCanvasHandle>(null);
  const documentRef = useRef<ReturnType<typeof useHandwritingEditor>['document']>(null);
  const thumbnailQueueRef = useRef<Promise<unknown>>(Promise.resolve());
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
  const [viewportResetKey, setViewportResetKey] = useState(0);
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
    retrySave,
    retryLoad,
  } = useHandwritingEditor(diary.id);
  documentRef.current = document;

  const captureCurrentThumbnail = useCallback(() => {
    const requestedDocument = documentRef.current;
    const requestedPage = requestedDocument?.pages.find(
      (candidate) => candidate.id === requestedDocument.selectedPageId,
    );
    if (!requestedDocument || !requestedPage) return Promise.resolve(undefined);
    const pageId = requestedPage.id;
    const contentRevision = requestedPage.contentRevision;

    const capture = thumbnailQueueRef.current.then(async () => {
      const before = documentRef.current;
      const beforePage = before?.pages.find((candidate) => candidate.id === pageId);
      if (
        !before ||
        before.selectedPageId !== pageId ||
        !beforePage ||
        beforePage.contentRevision !== contentRevision
      ) return undefined;

      const bytes = await canvasRef.current?.makePngSnapshot();
      if (!bytes) return undefined;
      const after = documentRef.current;
      const afterPage = after?.pages.find((candidate) => candidate.id === pageId);
      if (
        !after ||
        after.selectedPageId !== pageId ||
        !afterPage ||
        afterPage.contentRevision !== contentRevision
      ) return undefined;

      const uri = writeHandwritingThumbnail(
        diary.id,
        requestedDocument.id,
        pageId,
        contentRevision,
        bytes,
      );
      // Captures are serialized and only committed while page ID and content
      // revision still match, preventing a snapshot from being attached elsewhere.
      replaceWithoutHistory((current) => setPageThumbnail(current, pageId, uri), false);
      return uri;
    });
    thumbnailQueueRef.current = capture.catch(() => undefined);
    return capture;
  }, [diary.id, replaceWithoutHistory]);

  const saveWithThumbnail = useCallback(async () => {
    await captureCurrentThumbnail();
    await saveNow(true);
    const saved = await handwritingRepository.load(diary.id);
    if (saved) cleanupHandwritingAssets(diary.id, saved.id, saved);
  }, [captureCurrentThumbnail, diary.id, saveNow]);

  const closeEditor = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // 단독 진입에서도 상세 화면 뒤에 다이어리 탭을 함께 구성해야 상세 화면의
    // 뒤로가기가 다시 막히지 않는다.
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs', params: { screen: 'Diary' } },
        {
          name: 'DiaryDetail',
          params: { diary, location: diary.location ?? '' },
        },
      ],
    });
  }, [diary, navigation]);

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
        contentRevision: selectedPageForThumbnail.contentRevision,
      })
    : '';

  useEffect(() => {
    if (!thumbnailContentKey || saveStatus !== 'dirty') return;
    if (lastThumbnailContent.current === thumbnailContentKey) return;
    const timer = setTimeout(() => {
      void captureCurrentThumbnail()
        .then((uri) => {
          if (!uri) return;
          lastThumbnailContent.current = thumbnailContentKey;
          return saveNow(true);
        })
        .catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [captureCurrentThumbnail, saveNow, saveStatus, thumbnailContentKey]);

  if (!document) {
    return (
      <View style={[styles.screen, styles.centered]}>
        {saveStatus === 'error' ? (
          <>
            <Text style={styles.loadErrorTitle}>필기 문서를 불러오지 못했습니다</Text>
            <Pressable onPress={retryLoad} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>{SAVE_LABELS[saveStatus]}</Text>
          </>
        )}
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

  // 문서 방향의 실제 비율을 유지하면서 작업 영역을 최대한 사용한다.
  const toolbarSpace = tablet ? 108 : 102;
  const availableWidth = Math.max(1, workspaceSize.width - (tablet ? 72 : 24));
  const availableHeight = Math.max(1, workspaceSize.height - toolbarSpace);
  const pageRatio = selectedPage.width / selectedPage.height;
  const pageWidth = Math.min(availableWidth, availableHeight * pageRatio, tablet ? 900 : 560);
  const pageHeight = pageWidth / pageRatio;

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
    addManagedImage(asset.uri, useAsBackground);
  }

  async function addManagedImage(
    sourceUri: string,
    useAsBackground = false,
  ) {
    if (!canAddEditableLayer(document!, selectedPage.id) && !useAsBackground) {
      Alert.alert('레이어 한도 도달', '이 페이지에는 사진과 스티커를 더 추가할 수 없습니다.');
      return;
    }
    try {
      const asset = await importHandwritingAsset(diary.id, document!.id, sourceUri);
      if (useAsBackground) {
        commit((current) =>
          setPageBackground(current, selectedPage.id, { type: 'image', asset, rotation: 0 }),
        );
      } else {
        const layerId = createHandwritingId('image-layer');
        commit((current) =>
          addImageLayer(current, selectedPage.id, asset, layerId),
        );
        setSelectedLayerId(layerId);
        setTool('select');
      }
      setPanelSection(null);
    } catch (error) {
      Alert.alert(
        '이미지 추가 실패',
        error instanceof HandwritingAssetLimitError
          ? error.message
          : '이미지를 필기 문서로 복사하지 못했습니다.',
      );
    }
  }

  function transformSelectedLayer(
    transform: (
      layer: Exclude<HandwritingLayer, { type: 'ink' }>,
    ) => Exclude<HandwritingLayer, { type: 'ink' }>,
  ) {
    if (!selectedLayer || selectedLayer.type === 'ink' || selectedLayer.locked) return;
    commit((current) =>
      updateLayer(current, selectedPage.id, selectedLayer.id, (layer) =>
        layer.type === 'ink' ? layer : (() => {
          const transformed = transform(layer);
          return {
            ...transformed,
            transform: constrainLayerTransform(selectedPage, layer, transformed.transform),
          };
        })(),
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

  function commitInkStrokes(pageId: string, strokes: InkStroke[]) {
    let accepted = true;
    commit((current) => {
      const page = current.pages.find((candidate) => candidate.id === pageId);
      if (!page) {
        accepted = false;
        return current;
      }
      const currentPageCount = getPageInkStrokes(page).length;
      const nextTotal = countDocumentInkStrokes(current) - currentPageCount + strokes.length;
      if (nextTotal > MAX_HANDWRITING_STROKES && strokes.length > currentPageCount) {
        accepted = false;
        return current;
      }
      const next = setPageInkStrokes(current, pageId, strokes);
      if (next === current) accepted = false;
      return next;
    });
    if (!accepted) {
      Alert.alert(
        '필기 한도 도달',
        `한 다이어리에는 최대 ${MAX_HANDWRITING_STROKES.toLocaleString()}개의 획과 제한된 수의 필기점을 저장할 수 있습니다.`,
      );
      return false;
    }
    return true;
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
            <PanelButton disabled={document!.pages.length >= MAX_HANDWRITING_PAGES} label="새 페이지" onPress={() => commit(addPage)} />
            <PanelButton
              disabled={!canDuplicatePage(document!, selectedPage.id)}
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
          <Text style={styles.helpText}>최대 {MAX_HANDWRITING_PAGES}페이지 · 현재 {document!.pages.length}페이지</Text>
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
                  void captureCurrentThumbnail().catch(() => undefined).finally(() => {
                    replaceWithoutHistory((current) => selectPage(current, page.id));
                    setPanelSection(null);
                  });
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
          <SectionTitle>도구</SectionTitle>
          <View style={styles.buttonRow}>
            <PanelButton disabled={!canRedo} label="다시 실행" onPress={redo} />
            <PanelButton active={tool === 'pen'} label="펜" onPress={() => setTool('pen')} />
            <PanelButton active={tool === 'highlighter'} label="마커" onPress={() => setTool('highlighter')} />
            <PanelButton active={tool === 'select'} label="선택" onPress={() => setTool('select')} />
            <PanelButton active={tool === 'lasso'} label="필기 올가미" onPress={() => setTool('lasso')} />
            <PanelButton active={tool === 'navigate'} label="이동" onPress={() => setTool('navigate')} />
          </View>
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
          <SectionTitle>페이지 방향과 보기</SectionTitle>
          <View style={styles.buttonRow}>
            <PanelButton
              label="왼쪽으로 회전"
              onPress={() => commit((current) =>
                rotatePage(current, selectedPage.id, 'counterclockwise'))}
            />
            <PanelButton
              label="오른쪽으로 회전"
              onPress={() => commit((current) =>
                rotatePage(current, selectedPage.id, 'clockwise'))}
            />
            <PanelButton label="페이지에 맞추기" onPress={() => setViewportResetKey((key) => key + 1)} />
            <PanelButton label="PNG 미리보기" onPress={() => void captureCurrentThumbnail().then((uri) => uri && setPreviewUri(uri))} />
          </View>
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
                onPress={() => void addManagedImage(photo.fileUri)}
              />
            ))}
          </View>
          <SectionTitle>기본 스티커</SectionTitle>
          <View style={styles.buttonRow}>
            {STICKERS.map((sticker) => (
              <PanelButton
                key={sticker.id}
                label={sticker.label}
                disabled={!canAddEditableLayer(document!, selectedPage.id)}
                onPress={() => {
                  const layerId = createHandwritingId('sticker-layer');
                  commit((current) =>
                    addStickerLayer(current, selectedPage.id, sticker.id, layerId),
                  );
                  setSelectedLayerId(layerId);
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
                <Pressable
                  key={layer.id}
                  onPress={() => {
                    setSelectedLayerId(layer.id);
                    setTool('select');
                  }}
                  style={[
                    styles.layerRow,
                    layer.id === selectedLayerId && styles.layerRowActive,
                  ]}
                >
                  {layer.type === 'image' ? (
                    <Image source={{ uri: layer.asset.previewUri }} style={styles.layerPreview} />
                  ) : (
                    <View style={[styles.layerPreview, styles.stickerPreview]}>
                      <Text>✦</Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.layerRowText}>{layer.name}</Text>
                  <Text style={styles.layerFlags}>
                    {layer.hidden ? '숨김 ' : ''}{layer.locked ? '잠김' : ''}
                  </Text>
                </Pressable>
              ))}
          </View>
        )}
        {selectedLayer && selectedLayer.type !== 'ink' ? (
          <>
            <SectionTitle>선택한 레이어 조정</SectionTitle>
            <TextInput
              defaultValue={selectedLayer.name}
              key={`${selectedLayer.id}-${selectedLayer.name}`}
              onEndEditing={(event) => {
                const name = event.nativeEvent.text.trim();
                if (!name || name === selectedLayer.name) return;
                commit((current) => updateLayer(
                  current,
                  selectedPage.id,
                  selectedLayer.id,
                  (layer) => ({ ...layer, name }),
                ));
              }}
              placeholder="레이어 이름"
              style={styles.layerNameInput}
            />
            <View style={styles.buttonRow}>
              <PanelButton
                active={selectedLayer.locked}
                label={selectedLayer.locked ? '잠금 해제' : '잠금'}
                onPress={() => commit((current) => updateLayer(current, selectedPage.id, selectedLayer.id, (layer) => ({ ...layer, locked: !layer.locked })))}
              />
              <PanelButton
                active={selectedLayer.hidden}
                label={selectedLayer.hidden ? '표시' : '숨김'}
                onPress={() => commit((current) => updateLayer(current, selectedPage.id, selectedLayer.id, (layer) => ({ ...layer, hidden: !layer.hidden })))}
              />
              <PanelButton
                label="복제"
                onPress={() => {
                  const duplicateId = createHandwritingId('layer');
                  commit((current) => duplicateLayer(current, selectedPage.id, selectedLayer.id, duplicateId));
                  setSelectedLayerId(duplicateId);
                }}
              />
              <PanelButton label="앞으로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, 1))} />
              <PanelButton label="뒤로" onPress={() => commit((current) => moveLayer(current, selectedPage.id, selectedLayer.id, -1))} />
              <PanelButton label="맨 앞으로" onPress={() => commit((current) => moveLayerTo(current, selectedPage.id, selectedLayer.id, 'front'))} />
              <PanelButton label="맨 뒤로" onPress={() => commit((current) => moveLayerTo(current, selectedPage.id, selectedLayer.id, 'back'))} />
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
        <Pressable accessibilityLabel="필기 편집기 닫기" onPress={closeEditor} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={saveStatus === 'error' ? '저장 다시 시도' : undefined}
          disabled={saveStatus !== 'error'}
          onPress={() => void retrySave(true).catch(() => undefined)}
          style={styles.headerCenter}
        >
          <Text numberOfLines={1} style={styles.headerTitle}>{diary.title}</Text>
          <Text style={[styles.saveStatus, saveStatus === 'error' && styles.saveError]}>
            {SAVE_LABELS[saveStatus]}{saveStatus === 'error' ? ' · 다시 시도' : ''}
          </Text>
        </Pressable>
        <View style={styles.headerButton} />
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          setWorkspaceSize({ width, height });
        }}
        style={styles.workspace}
      >
        <EditorViewport
          deferSingleTouch={tool === 'select'}
          fingerNavigationOnly={nativeInkActive && !fingerDrawing}
          navigationEnabled={tool === 'navigate' || tool === 'select' || (nativeInkActive && !fingerDrawing)}
          resetKey={viewportResetKey}
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
              onStrokesChange={(strokes) => commitInkStrokes(selectedPage.id, strokes)}
              pageHeight={selectedPage.height}
              pageWidth={selectedPage.width}
              renderInk={!supportsNativeInkInput}
              strokes={getPageInkStrokes(selectedPage)}
              tool={tool}
              width={strokeWidth}
            />
            {supportsNativeInkInput ? (
              <InkInputAdapter
                color={color}
                enabled={nativeInkActive}
                fingerDrawing={fingerDrawing}
                onStrokesChange={commitInkStrokes}
                onError={(error) => Alert.alert('필기 입력 오류', error.message)}
                pageHeight={selectedPage.height}
                pageId={selectedPage.id}
                pageWidth={selectedPage.width}
                strokes={getPageInkStrokes(selectedPage)}
                tool={tool}
                width={strokeWidth}
              />
            ) : null}
            {tool === 'lasso' ? (
              <InkSelectionOverlay
                key={selectedPage.id}
                onMove={(selectedIds, delta) => commit((current) =>
                  translatePageInkStrokes(current, selectedPage.id, selectedIds, delta))}
                pageHeight={selectedPage.height}
                pageWidth={selectedPage.width}
                renderedHeight={renderedPageSize.height}
                renderedWidth={renderedPageSize.width}
                strokes={getPageInkStrokes(selectedPage)}
              />
            ) : null}
            {tool === 'select' ? (
              <Pressable
                accessibilityLabel="레이어 선택 영역"
                onPress={(event) => {
                  const hit = getTopmostEditableLayerAtPoint(selectedPage, {
                    x: (event.nativeEvent.locationX / Math.max(1, renderedPageSize.width)) *
                      selectedPage.width,
                    y: (event.nativeEvent.locationY / Math.max(1, renderedPageSize.height)) *
                      selectedPage.height,
                  });
                  setSelectedLayerId(hit?.id ?? null);
                }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {tool === 'select' && selectedLayer && selectedLayer.type !== 'ink' && !selectedLayer.locked && !selectedLayer.hidden ? (
              <LayerTransformOverlay
                layer={selectedLayer}
                onCommit={(transform) =>
                  transformSelectedLayer((layer) => ({ ...layer, transform }))
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
            canUndo={canUndo}
            color={color}
            compact={!tablet}
            onOpenMore={() => openPanel('style')}
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
  loadErrorTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  header: { alignItems: 'center', backgroundColor: 'rgba(248, 244, 239, 0.96)', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', height: 56, justifyContent: 'space-between', paddingHorizontal: spacing.md, zIndex: 3 },
  headerPhone: { height: 50, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 44 },
  headerButtonText: { color: colors.primary, fontSize: 32, fontWeight: '400', lineHeight: 34 },
  previewButtonText: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: spacing.sm },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800', maxWidth: '100%' },
  saveStatus: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  saveError: { color: '#B42318' },
  layerRow: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  layerRowActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  layerPreview: { backgroundColor: '#EEE8E2', borderRadius: 6, height: 40, width: 40 },
  stickerPreview: { alignItems: 'center', justifyContent: 'center' },
  layerRowText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '700' },
  layerFlags: { color: colors.textMuted, fontSize: 11 },
  layerNameInput: { backgroundColor: '#FFFFFF', borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
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

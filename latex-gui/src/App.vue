<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  createEmptyDocument,
  generateLatex,
  type DocumentRoot,
  type DocNode,
  type TableNode,
  type FigureNode,
  type TableColumn,
} from './latexModel';

const doc = ref<DocumentRoot>(createEmptyDocument());
const selectedId = ref<string | null>(null);
const showAdvanced = ref(true);

const latexCode = computed(() => generateLatex(doc.value));

// cell color picker state
const selectedCell = ref<{ row: number; col: number } | null>(null);
const customColorInput = ref('yellow!20');

// -------- node helpers --------

function collectNodes(root: DocumentRoot): DocNode[] {
  const res: DocNode[] = [];
  const walk = (n: DocNode) => {
    res.push(n);
    n.children?.forEach((c) => walk(c));
  };
  root.children.forEach((c) => walk(c));
  return res;
}

const flatNodes = computed(() => collectNodes(doc.value));

function selectNode(id: string) {
  selectedId.value = id;
  selectedCell.value = null;
}

function findNodeById(id: string | null): DocNode | null {
  if (!id) return null;
  const queue: DocNode[] = [...doc.value.children];
  while (queue.length) {
    const n = queue.shift()!;
    if (n.id === id) return n;
    n.children?.forEach((c) => queue.push(c));
  }
  return null;
}

const selectedNode = computed<DocNode | null>(() => findNodeById(selectedId.value));

// find parent + index of a node
function findParentAndIndex(
  root: DocumentRoot,
  id: string
): { parent: DocNode | DocumentRoot; index: number } | null {
  const stack: (DocNode | DocumentRoot)[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    const children = node.children ?? [];
    const idx = children.findIndex((c) => c.id === id);
    if (idx !== -1) return { parent: node, index: idx };
    children.forEach((c) => stack.push(c));
  }
  return null;
}

// -------- reordering --------

function moveSelected(delta: number) {
  if (!selectedId.value) return;
  const found = findParentAndIndex(doc.value, selectedId.value);
  if (!found) return;

  const { parent, index } = found;
  if (!parent.children) return;

  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= parent.children.length) return;

  const arr = parent.children;
  const removed = arr.splice(index, 1)[0] as DocNode;
  arr.splice(newIndex, 0, removed);
}

function moveUp() {
  moveSelected(-1);
}

function moveDown() {
  moveSelected(1);
}

// -------- add node actions --------

function addChapter() {
  const chapter: DocNode = {
    id: 'chap-' + Date.now(),
    type: 'chapter',
    title: 'New Chapter',
    children: [],
  };
  doc.value.children.push(chapter);
}

function addSection() {
  let target: DocNode | DocumentRoot = doc.value;

  if (selectedNode.value) {
    if (
      selectedNode.value.type === 'chapter' ||
      selectedNode.value.type === 'section' ||
      selectedNode.value.type === 'subsection'
    ) {
      target = selectedNode.value;
    }
  }

  target.children = target.children || [];
  target.children.push({
    id: 'sec-' + Date.now(),
    type: 'section',
    title: 'New Section',
    children: [],
  });
}

function addSubsection() {
  const sel = selectedNode.value;
  if (!sel || (sel.type !== 'section' && sel.type !== 'subsection')) return;
  sel.children = sel.children || [];
  sel.children.push({
    id: 'sub-' + Date.now(),
    type: 'subsection',
    title: 'New Subsection',
    children: [],
  });
}

function addText() {
  const target = selectedNode.value ?? doc.value;
  target.children = target.children || [];
  target.children.push({
    id: 'txt-' + Date.now(),
    type: 'text',
    content: 'Write text here.',
  });
}

function addTable() {
  const target = selectedNode.value ?? doc.value;
  const rows = 3;
  const cols = 3;

  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => '')
  );
  const cellColors = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as string | null)
  );
  const columns: TableColumn[] = Array.from({ length: cols }, () => ({
    align: 'c',
  }));

  const t: TableNode = {
    id: 'tab-' + Date.now(),
    type: 'table',
    rows,
    cols,
    cells,
    cellColors,
    caption: 'Table caption',
    label: 'table:label',
    columns,
    hasHeader: true,
    widthMode: 'natural',
    maxWidthFactor: 1.0,
    hPadding: '0.5em',
    tableStyle: 'default',
    children: [],
  };
  target.children = target.children || [];
  target.children.push(t);
}

function addFigure() {
  const target = selectedNode.value ?? doc.value;
  const f: FigureNode = {
    id: 'fig-' + Date.now(),
    type: 'figure',
    imagePath: 'figures/example.png',
    width: 0.8,
    caption: 'Figure caption',
    label: 'figure:label',
    children: [],
  };
  target.children = target.children || [];
  target.children.push(f);
}

function addPageBreak() {
  const target = selectedNode.value ?? doc.value;
  target.children = target.children || [];
  target.children.push({
    id: 'pb-' + Date.now(),
    type: 'pagebreak',
    children: [],
  } as DocNode);
}

// helpers for UI

function iconForNode(n: DocNode): string {
  switch (n.type) {
    case 'chapter':
      return 'C';
    case 'section':
      return 'H';
    case 'subsection':
      return 'h';
    case 'table':
      return '▦';
    case 'figure':
      return '▣';
    case 'text':
      return '¶';
    case 'pagebreak':
      return '⤵';
    default:
      return '•';
  }
}

function selectCell(r: number, c: number) {
  selectedCell.value = { row: r, col: c };
}

function setCellColor(color: string | null) {
  const node = selectedNode.value;
  if (!node || node.type !== 'table' || !selectedCell.value) return;
  const t = node as TableNode;
  const { row, col } = selectedCell.value;
  if (!t.cellColors[row]) return;
  t.cellColors[row][col] = color;
}
</script>

<template>
  <div class="app">
    <!-- Top app bar -->
    <header class="appbar">
      <div class="appbar-left">
        <span class="logo">LaTeX Builder</span>
        <span class="divider" />

        <!-- Chapter only for report -->
        <button v-if="doc.docClass === 'report'" class="primary" @click="addChapter">
          + Chapter
        </button>

        <button class="ghost" @click="addSection">+ Section</button>
        <button class="ghost" @click="addSubsection">+ Subsection</button>
        <button class="ghost" @click="addText">+ Text</button>
        <button class="ghost" @click="addTable">+ Table</button>
        <button class="ghost" @click="addFigure">+ Figure</button>
        <button class="ghost" @click="addPageBreak">+ New page</button>
      </div>
      <div class="appbar-right">
        <button class="icon-btn" @click="moveUp" title="Move up">▲</button>
        <button class="icon-btn" @click="moveDown" title="Move down">▼</button>
        <button class="ghost" @click="showAdvanced = !showAdvanced">
          {{ showAdvanced ? 'Hide advanced' : 'Show advanced' }}
        </button>
      </div>
    </header>

    <div class="layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <section class="card doc-card">
          <h3>Document</h3>
          <label>
            <span>Title</span>
            <input v-model="doc.title" />
          </label>
          <label>
            <span>Author</span>
            <input v-model="doc.author" />
          </label>
          <div class="inline">
            <label>
              <span>Class</span>
              <select v-model="doc.docClass">
                <option value="article">article</option>
                <option value="report">report</option>
              </select>
            </label>
            <label class="checkbox">
              <input type="checkbox" v-model="doc.includeToc" />
              <span>TOC</span>
            </label>
          </div>
        </section>

        <section class="card">
          <h3>Outline</h3>
          <ul class="outline">
            <li v-for="n in flatNodes" :key="n.id" :class="{ selected: n.id === selectedId }" @click="selectNode(n.id)">
              <span class="icon">{{ iconForNode(n) }}</span>
              <span class="label">
                {{
                  n.title
                  ?? (n.type === 'table'
                    ? (n as TableNode).caption
                    : n.type === 'figure'
                      ? (n as FigureNode).caption
                      : n.type === 'pagebreak'
                        ? 'Page break'
                        : n.id)
                }}
              </span>
            </li>
          </ul>
        </section>
      </aside>

      <!-- Editor -->
      <main class="editor">
        <div v-if="selectedNode" class="card editor-card">
          <header class="editor-header">
            <h2>
              {{
                selectedNode.type === 'chapter'
                  ? 'Chapter'
                  : selectedNode.type === 'section'
                    ? 'Section'
                    : selectedNode.type === 'subsection'
                      ? 'Subsection'
                      : selectedNode.type === 'table'
                        ? 'Table'
                        : selectedNode.type === 'figure'
                          ? 'Figure'
                          : selectedNode.type === 'pagebreak'
                            ? 'Page break'
                            : 'Text'
              }}
            </h2>
          </header>

          <!-- Chapter / Section / Subsection -->
          <section v-if="
            selectedNode.type === 'chapter' ||
            selectedNode.type === 'section' ||
            selectedNode.type === 'subsection'
          ">
            <label>
              <span>Title</span>
              <input v-model="selectedNode.title" />
            </label>
          </section>

          <!-- Text -->
          <section v-else-if="selectedNode.type === 'text'">
            <label>
              <span>Text</span>
              <textarea v-model="selectedNode.content" rows="10" />
            </label>
          </section>

          <!-- TABLE EDITOR -->
          <section v-else-if="selectedNode.type === 'table'">
            <div class="two-col">
              <label>
                <span>Caption</span>
                <input v-model="(selectedNode as TableNode).caption" />
              </label>
              <label>
                <span>Label</span>
                <input v-model="(selectedNode as TableNode).label" />
              </label>
            </div>

            <label class="checkbox">
              <input type="checkbox" v-model="(selectedNode as TableNode).hasHeader" />
              <span>First row is header</span>
            </label>

            <!-- Table style -->
            <div class="pill-group">
              <span class="pill-label">Style</span>
              <button class="pill" :class="{ active: (selectedNode as TableNode).tableStyle === 'default' }"
                @click="(selectedNode as TableNode).tableStyle = 'default'">
                Default
              </button>
              <button class="pill" :class="{ active: (selectedNode as TableNode).tableStyle === 'booktabs' }"
                @click="(selectedNode as TableNode).tableStyle = 'booktabs'">
                Booktabs
              </button>
              <button class="pill" :class="{ active: (selectedNode as TableNode).tableStyle === 'striped' }"
                @click="(selectedNode as TableNode).tableStyle = 'striped'">
                Striped
              </button>
              <button class="pill" :class="{ active: (selectedNode as TableNode).tableStyle === 'minimal' }"
                @click="(selectedNode as TableNode).tableStyle = 'minimal'">
                Minimal
              </button>
            </div>

            <!-- Width control -->
            <div class="pill-group">
              <span class="pill-label">Width</span>
              <button class="pill" :class="{ active: (selectedNode as TableNode).widthMode === 'natural' }"
                @click="(selectedNode as TableNode).widthMode = 'natural'">
                Natural
              </button>
              <button class="pill" :class="{ active: (selectedNode as TableNode).widthMode === 'textwidth' }"
                @click="(selectedNode as TableNode).widthMode = 'textwidth'">
                Fit page
              </button>
              <button class="pill" :class="{ active: (selectedNode as TableNode).widthMode === 'resize' }"
                @click="(selectedNode as TableNode).widthMode = 'resize'">
                Custom %
              </button>
            </div>

            <div v-if="(selectedNode as TableNode).widthMode === 'resize'" class="slider-row">
              <span>Width: {{ Math.round((selectedNode as TableNode).maxWidthFactor * 100) }}%</span>
              <input type="range" min="50" max="120" step="5" :value="(selectedNode as TableNode).maxWidthFactor * 100"
                @input="(selectedNode as TableNode).maxWidthFactor = ($event.target as HTMLInputElement).valueAsNumber / 100" />
            </div>

            <div v-if="showAdvanced" class="advanced">
              <h3>Columns</h3>
              <div v-for="(col, cIndex) in (selectedNode as TableNode).columns" :key="cIndex" class="col-config">
                <span class="muted">Col {{ cIndex + 1 }}</span>
                <select v-model="col.align">
                  <option value="l">Left</option>
                  <option value="c">Center</option>
                  <option value="r">Right</option>
                </select>
                <input v-model="col.width" placeholder="width (e.g. 3cm, optional)" />
              </div>

              <label>
                <span>Horizontal padding (\\tabcolsep)</span>
                <input v-model="(selectedNode as TableNode).hPadding" placeholder="0.5em, 2pt, etc." />
              </label>
            </div>

            <h3 class="section-title">Size & cells</h3>
            <div class="size-row">
              <span>Rows: {{ (selectedNode as TableNode).rows }}</span>
              <div>
                <button class="mini" @click="
                  (selectedNode as TableNode).rows++;
                (selectedNode as TableNode).cells.push(
                  Array.from(
                    { length: (selectedNode as TableNode).cols },
                    () => ''
                  )
                );
                (selectedNode as TableNode).cellColors.push(
                  Array.from(
                    { length: (selectedNode as TableNode).cols },
                    () => null
                  )
                );
                ">
                  + row
                </button>
                <button class="mini" @click="
                  (selectedNode as TableNode).rows = Math.max(
                    1,
                    (selectedNode as TableNode).rows - 1
                  );
                (selectedNode as TableNode).cells.pop();
                (selectedNode as TableNode).cellColors.pop();
                ">
                  − row
                </button>
              </div>
              <span>Cols: {{ (selectedNode as TableNode).cols }}</span>
              <div>
                <button class="mini" @click="
                  (selectedNode as TableNode).cols++;
                (selectedNode as TableNode).columns.push({ align: 'c' });
                (selectedNode as TableNode).cells.forEach(r => r.push(''));
                (selectedNode as TableNode).cellColors.forEach(r => r.push(null));
                ">
                  + col
                </button>
                <button class="mini" @click="
                  (selectedNode as TableNode).cols = Math.max(
                    1,
                    (selectedNode as TableNode).cols - 1
                  );
                (selectedNode as TableNode).columns.pop();
                (selectedNode as TableNode).cells.forEach(r => r.pop());
                (selectedNode as TableNode).cellColors.forEach(r => r.pop());
                ">
                  − col
                </button>
              </div>
            </div>

            <!-- Cell color picker -->
            <div class="cell-color-panel">
              <span class="muted">Cell color:</span>
              <button class="color-swatch none" @click="setCellColor(null)">None</button>
              <button class="color-swatch" style="background:#fef9c3" @click="setCellColor('yellow!20')" />
              <button class="color-swatch" style="background:#fee2e2" @click="setCellColor('red!15')" />
              <button class="color-swatch" style="background:#dcfce7" @click="setCellColor('green!15')" />
              <button class="color-swatch" style="background:#e0f2fe" @click="setCellColor('blue!15')" />
              <input v-model="customColorInput" @keyup.enter="setCellColor(customColorInput)"
                placeholder="custom (e.g. gray!10)" />
            </div>

            <div class="table-grid">
              <table class="cells">
                <tr v-for="(row, rIndex) in (selectedNode as TableNode).cells" :key="rIndex">
                  <td v-for="(cell, cIndex) in row" :key="cIndex" :class="{
                    selected:
                      selectedCell &&
                      selectedCell.row === rIndex &&
                      selectedCell.col === cIndex,
                  }" @click="selectCell(rIndex, cIndex)">
                    <input v-model="row[cIndex]" :placeholder="`r${rIndex + 1}c${cIndex + 1}`" />
                  </td>
                </tr>
              </table>
            </div>
          </section>

          <!-- FIGURE -->
          <section v-else-if="selectedNode.type === 'figure'">
            <label>
              <span>Image path</span>
              <input v-model="(selectedNode as FigureNode).imagePath" />
            </label>
            <div class="two-col">
              <label>
                <span>Caption</span>
                <input v-model="(selectedNode as FigureNode).caption" />
              </label>
              <label>
                <span>Label</span>
                <input v-model="(selectedNode as FigureNode).label" />
              </label>
            </div>
            <label>
              <span>Width (fraction of text width)</span>
              <input type="range" min="30" max="100" step="5" :value="(selectedNode as FigureNode).width * 100"
                @input="(selectedNode as FigureNode).width = ($event.target as HTMLInputElement).valueAsNumber / 100" />
              <span class="muted">
                {{ Math.round((selectedNode as FigureNode).width * 100) }}%
              </span>
            </label>
          </section>

          <!-- PAGEBREAK -->
          <section v-else-if="selectedNode.type === 'pagebreak'">
            <p class="hint">
              This node inserts a <code>\\newpage</code> command to start a new page.
            </p>
          </section>
        </div>

        <p v-else class="empty-hint">Select an item on the left to edit it.</p>
      </main>

      <!-- Preview -->
      <section class="preview">
        <div class="card preview-card">
          <header class="preview-header">
            <h3>Generated LaTeX</h3>
          </header>
          <textarea :value="latexCode" readonly />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #111827;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.appbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 50px;
  border-bottom: 1px solid #1f2937;
  background: #020617;
}

.appbar-left,
.appbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  font-weight: 600;
  letter-spacing: 0.03em;
}

.divider {
  width: 1px;
  height: 20px;
  background: #374151;
  margin: 0 8px;
}

.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 260px minmax(320px, 1.3fr) minmax(320px, 1fr);
}

button {
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 5px 10px;
  background: transparent;
  color: inherit;
}

button.primary {
  background: #3b82f6;
  color: #f9fafb;
}

button.primary:hover {
  background: #2563eb;
}

button.ghost {
  background: #0b1120;
  border: 1px solid #1f2937;
}

button.ghost:hover {
  border-color: #4b5563;
}

.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid #1f2937;
  background: #020617;
}

.icon-btn:hover {
  border-color: #4b5563;
}

.mini {
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 999px;
  background: #0b1120;
  border: 1px solid #1f2937;
}

.mini:hover {
  border-color: #4b5563;
}

.card {
  background: #020617;
  border-radius: 10px;
  border: 1px solid #1f2937;
  padding: 12px 12px 10px;
  margin: 10px;
}

.doc-card {
  margin-bottom: 8px;
}

.editor-card {
  margin: 10px 10px 6px;
}

.preview-card {
  height: calc(100% - 20px);
  margin: 10px 10px 10px 0;
}

.sidebar {
  border-right: 1px solid #1f2937;
  padding: 6px 0;
  overflow: auto;
}

h3 {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  font-size: 12px;
}

label span {
  color: #9ca3af;
}

input,
select,
textarea {
  border-radius: 7px;
  border: 1px solid #1f2937;
  padding: 5px 8px;
  background: #020617;
  color: #e5e7eb;
  font-size: 13px;
  outline: none;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #3b82f6;
}

textarea {
  resize: vertical;
  min-height: 160px;
}

.inline {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inline label {
  flex: 1;
  margin-bottom: 0;
}

.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.checkbox span {
  margin-top: 1px;
}

.outline {
  list-style: none;
  padding: 0;
  margin: 0;
}

.outline li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.outline li:hover {
  background: #020617;
}

.outline li.selected {
  background: #111827;
  border: 1px solid #1f2937;
}

.icon {
  width: 18px;
  text-align: center;
  color: #6b7280;
}

.label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor {
  border-right: 1px solid #1f2937;
  padding: 0 6px;
  overflow: auto;
}

.editor-header h2 {
  margin: 0 0 4px;
  font-size: 16px;
}

.hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #9ca3af;
}

.empty-hint {
  margin: 16px;
  color: #6b7280;
  font-size: 13px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.section-title {
  margin-top: 14px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #9ca3af;
}

.size-row {
  display: grid;
  grid-template-columns: auto auto auto auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
}

.pill-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 10px 0;
}

.pill-label {
  font-size: 12px;
  color: #9ca3af;
  margin-right: 4px;
}

.pill {
  border-radius: 999px;
  padding: 3px 9px;
  border: 1px solid #1f2937;
  background: #020617;
  font-size: 12px;
}

.pill.active {
  border-color: #3b82f6;
  background: #111827;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin: 4px 0 10px;
}

.slider-row input[type='range'] {
  flex: 1;
}

.advanced {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #1f2937;
}

.table-grid {
  border-radius: 8px;
  border: 1px solid #1f2937;
  overflow: auto;
}

.cells {
  border-collapse: collapse;
  width: 100%;
}

.cells td {
  border: 1px solid #1f2937;
  padding: 2px;
}

.cells td.selected {
  outline: 2px solid #3b82f6;
}

.cells input {
  width: 100%;
  border-radius: 4px;
  font-size: 12px;
  padding: 3px 4px;
}

.preview {
  padding: 0 6px;
  overflow: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.preview textarea {
  width: 100%;
  height: calc(100% - 32px);
  background: #020617;
  border-radius: 8px;
  border: 1px solid #1f2937;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  padding: 8px;
  color: #d1d5db;
}

.muted {
  color: #9ca3af;
  font-size: 12px;
}

.cell-color-panel {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.color-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #4b5563;
  padding: 0;
}

.color-swatch.none {
  width: auto;
  padding: 2px 6px;
  background: #020617;
}
</style>

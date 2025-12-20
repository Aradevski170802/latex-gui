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

function deleteNodeWithChildren(id: string | null) {
  if (!id) return;
  const found = findParentAndIndex(doc.value, id);
  if (!found) return;

  const { parent, index } = found;
  if (!parent.children) return;

  parent.children.splice(index, 1); // removes node + its subtree
  selectedId.value = null;
  selectedCell.value = null;
}


function deleteNodeOnly(id: string | null) {
  if (!id) return;
  const found = findParentAndIndex(doc.value, id);
  if (!found) return;

  const { parent, index } = found;
  if (!parent.children) return;

  const [removed] = parent.children.splice(index, 1);

  if (removed && removed.children && removed.children.length > 0) {
    parent.children.splice(index, 0, ...removed.children);
  }

  selectedId.value = null;
  selectedCell.value = null;
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

        <button class="ghost" @click="deleteNodeWithChildren(selectedId)" :disabled="!selectedId">
          Delete node + children
        </button>

        <button class="ghost" @click="deleteNodeOnly(selectedId)" :disabled="!selectedId">
          Delete node only
        </button>
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

        <!-- outline-card is flex & scrolls -->
        <section class="card outline-card">
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
            <!-- ... unchanged table editor ... -->
          </section>

          <!-- FIGURE -->
          <section v-else-if="selectedNode.type === 'figure'">
            <!-- ... unchanged figure editor ... -->
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

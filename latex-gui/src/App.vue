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
  type EquationNode,
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
function addEquation() {
  const target = selectedNode.value ?? doc.value;
  target.children = target.children || [];
  target.children.push({
    id: 'eq-' + Date.now(),
    type: 'equation',
    mode: 'display',
    latex: 'E = mc^2',
    numbered: true,
    children: [],
  } as EquationNode);
}

function currentEquation(): EquationNode | null {
  const n = selectedNode.value;
  return n && n.type === 'equation' ? (n as EquationNode) : null;
}

// very simple "append" helpers; you can later make them cursor-aware
function insertFrac() {
  const eq = currentEquation();
  if (!eq) return;
  eq.latex += ' \\frac{a}{b}';
}

function insertBinom() {
  const eq = currentEquation();
  if (!eq) return;
  eq.latex += ' \\binom{n}{k}';
}

function insertAlignEnvironment() {
  const eq = currentEquation();
  if (!eq) return;
  // switch this node to display, non-inline, with align
  eq.mode = 'display';
  eq.numbered = false; // we'll use align* for multi-lines
  // a starter template with alignment points &
  eq.latex = 'a &= b + c \\\\\n&= d + e';
}

// declare operator in preamble-like macro area or inside equation
function insertDeclareOperator() {
  const eq = currentEquation();
  if (!eq) return;
  // common pattern: \DeclareMathOperator{\Var}{Var}
  // For now, just help user add an operator usage:
  eq.latex += ' \\operatorname{Var}(X)';
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
    case 'equation':
      return '∑';
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
        <button class="ghost" @click="addEquation">+ Equation</button>
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
                            : selectedNode.type === 'equation'
                              ? 'Equation'
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
          <section v-else-if="selectedNode.type === 'equation'">
            <div class="two-col">
              <label>
                <span>Mode</span>
                <select v-model="(selectedNode as EquationNode).mode">
                  <option value="inline">Inline</option>
                  <option value="display">Display</option>
                </select>
              </label>
              <label v-if="(selectedNode as EquationNode).mode === 'display'">
                <span>Numbered</span>
                <input type="checkbox" v-model="(selectedNode as EquationNode).numbered" />
              </label>
            </div>

            <label>
              <span>Equation LaTeX</span>
              <textarea v-model="(selectedNode as EquationNode).latex" rows="4" />
            </label>

            <div class="math-snippets">
              <span class="muted">Quick inserts:</span>
              <button class="mini" @click="insertFrac">\\frac{a}{b}</button>
              <button class="mini" @click="insertBinom">\\binom{n}{k}</button>
              <button class="mini" @click="insertAlignEnvironment">align*</button>
              <button class="mini" @click="insertDeclareOperator">\\operatorname{Var}</button>
            </div>
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

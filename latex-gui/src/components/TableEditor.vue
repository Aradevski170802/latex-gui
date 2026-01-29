<script setup lang="ts">
import { computed } from 'vue';
import type { TableNode } from '../latexModel';
import { useSelection } from '../composables/useSelection';

const props = defineProps<{
    node: TableNode;
    showAdvanced: boolean;
}>();

const { selectCell, setCellColor, selectedCell } = useSelection();

// Helper to determine if a cell is selected
function isCellSelected(r: number, c: number) {
    return selectedCell.value?.row === r && selectedCell.value?.col === c;
}

</script>

<template>
    <div class="table-editor">
        <div class="two-col">
            <label>
                <span>Caption</span>
                <input v-model="props.node.caption" />
            </label>
            <label>
                <span>Label</span>
                <input v-model="props.node.label" />
            </label>
        </div>

        <label class="checkbox">
            <input type="checkbox" v-model="props.node.hasHeader" />
            <span>First row is header</span>
        </label>

        <!-- Table style -->
        <div class="pill-group">
            <span class="pill-label">Style</span>
            <button class="pill" :class="{ active: props.node.tableStyle === 'default' }"
                @click="props.node.tableStyle = 'default'">
                Default
            </button>
            <button class="pill" :class="{ active: props.node.tableStyle === 'booktabs' }"
                @click="props.node.tableStyle = 'booktabs'">
                Booktabs
            </button>
            <button class="pill" :class="{ active: props.node.tableStyle === 'striped' }"
                @click="props.node.tableStyle = 'striped'">
                Striped
            </button>
            <button class="pill" :class="{ active: props.node.tableStyle === 'minimal' }"
                @click="props.node.tableStyle = 'minimal'">
                Minimal
            </button>
        </div>

        <!-- Width control -->
        <div class="pill-group">
            <span class="pill-label">Width</span>
            <button class="pill" :class="{ active: props.node.widthMode === 'natural' }"
                @click="props.node.widthMode = 'natural'">
                Natural
            </button>
            <button class="pill" :class="{ active: props.node.widthMode === 'textwidth' }"
                @click="props.node.widthMode = 'textwidth'">
                Fit page
            </button>
            <button class="pill" :class="{ active: props.node.widthMode === 'resize' }"
                @click="props.node.widthMode = 'resize'">
                Custom %
            </button>
        </div>

        <div v-if="props.node.widthMode === 'resize'" class="slider-row">
            <span>Width: {{ Math.round(props.node.maxWidthFactor * 100) }}%</span>
            <input type="range" min="50" max="120" step="5" :value="props.node.maxWidthFactor * 100"
                @input="props.node.maxWidthFactor = ($event.target as HTMLInputElement).valueAsNumber / 100" />
        </div>

        <div v-if="props.showAdvanced" class="advanced">
            <h3>Columns</h3>
            <div v-for="(col, cIndex) in props.node.columns" :key="cIndex" class="col-config">
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
                <input v-model="props.node.hPadding" placeholder="0.5em, 2pt, etc." />
            </label>
        </div>

        <h3 class="section-title">Size & cells</h3>
        <div class="size-row">
            <span>Rows: {{ props.node.rows }}</span>
            <div>
                <button class="mini" @click="
                    props.node.rows++;
                props.node.cells.push(
                    Array.from(
                        { length: props.node.cols },
                        () => ''
                    )
                );
                props.node.cellColors.push(
                    Array.from(
                        { length: props.node.cols },
                        () => null
                    )
                );
                ">
                    + row
                </button>
                <button class="mini" @click="
                    props.node.rows = Math.max(1, props.node.rows - 1);
                props.node.cells.pop();
                props.node.cellColors.pop();
                ">
                    − row
                </button>
            </div>
            <span>Cols: {{ props.node.cols }}</span>
            <div>
                <button class="mini" @click="
                    props.node.cols++;
                props.node.columns.push({ align: 'c' });
                props.node.cells.forEach(r => r.push(''));
                props.node.cellColors.forEach(r => r.push(null));
                ">
                    + col
                </button>
                <button class="mini" @click="
                    props.node.cols = Math.max(1, props.node.cols - 1);
                props.node.columns.pop();
                props.node.cells.forEach(r => r.pop());
                props.node.cellColors.forEach(r => r.pop());
                ">
                    − col
                </button>
            </div>
        </div>

        <!-- Cell Grid Editor -->
        <div class="grid-editor" :style="{ gridTemplateColumns: `repeat(${props.node.cols}, 1fr)` }">
            <div v-for="(row, rIndex) in props.node.cells" :key="'r' + rIndex" style="display:contents">
                <div v-for="(cellVal, cIndex) in row" :key="'c' + cIndex" class="cell-wrapper"
                    :class="{ selected: isCellSelected(rIndex, cIndex) }" @click="selectCell(rIndex, cIndex)">
                    <input v-model="row[cIndex]" />
                </div>
            </div>
        </div>

        <!-- Cell Color Actions -->
        <div class="color-actions" v-if="selectedCell">
            <span>Cell color:</span>
            <button class="mini" @click="setCellColor('yellow!20')">Yellow</button>
            <button class="mini" @click="setCellColor('red!20')">Red</button>
            <button class="mini" @click="setCellColor('blue!20')">Blue</button>
            <button class="mini" @click="setCellColor(null)">Clear</button>
        </div>

    </div>
</template>

<style scoped>
.grid-editor {
    display: grid;
    gap: 4px;
    margin-top: 10px;
}

.cell-wrapper input {
    width: 100%;
    min-width: 40px;
}

.cell-wrapper.selected input {
    border-color: var(--primary-color);
    background: #f0f8ff;
}

.color-actions {
    margin-top: 10px;
    display: flex;
    gap: 5px;
    align-items: center;
}
</style>

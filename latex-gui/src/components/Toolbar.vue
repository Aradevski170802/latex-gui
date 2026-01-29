<script setup lang="ts">
import { useDocument } from '../composables/useDocument';
import { useSelection } from '../composables/useSelection';

const {
    doc,
    addChapter,
    addSection,
    addSubsection,
    addText,
    addTable,
    addFigure,
    addEquation,
    addPageBreak,
    deleteNode,
    deleteNodeOnly,
    moveNode,
} = useDocument();

const { selectedId, selectedNode } = useSelection();

const showAdvanced = defineModel('showAdvanced'); // Example of using model for simple prop

function onAddChapter() {
    addChapter();
}

// Helper to determine target for adds
function getAddTarget() {
    if (selectedNode.value && ['chapter', 'section', 'subsection'].includes(selectedNode.value.type)) {
        return selectedNode.value;
    }
    return doc.value;
}

function onAddSection() {
    addSection(getAddTarget());
}
function onAddSubsection() {
    addSubsection(getAddTarget());
}
function onAddText() {
    addText(getAddTarget());
}
function onAddTable() {
    addTable(getAddTarget());
}
function onAddFigure() {
    addFigure(getAddTarget());
}
function onAddEquation() {
    addEquation(getAddTarget());
}
function onAddPageBreak() {
    addPageBreak(getAddTarget());
}

function onDeleteNodeWithChildren() {
    if (selectedId.value) deleteNode(selectedId.value);
}

function onDeleteNodeOnly() {
    if (selectedId.value) deleteNodeOnly(selectedId.value);
}

function onMoveUp() {
    if (selectedId.value) moveNode(selectedId.value, -1);
}
function onMoveDown() {
    if (selectedId.value) moveNode(selectedId.value, 1);
}

</script>

<template>
    <header class="appbar">
        <div class="appbar-left">
            <span class="logo">LaTeX Builder</span>
            <span class="divider" />

            <!-- Chapter only for report -->
            <button v-if="doc.docClass === 'report'" class="primary" @click="onAddChapter">
                + Chapter
            </button>

            <button class="ghost" @click="onAddSection">+ Section</button>
            <button class="ghost" @click="onAddSubsection">+ Subsection</button>
            <button class="ghost" @click="onAddText">+ Text</button>
            <button class="ghost" @click="onAddTable">+ Table</button>
            <button class="ghost" @click="onAddFigure">+ Figure</button>
            <button class="ghost" @click="onAddEquation">+ Equation</button>
            <button class="ghost" @click="onAddPageBreak">+ New page</button>

            <button class="ghost" @click="onDeleteNodeWithChildren" :disabled="!selectedId">
                Delete node + children
            </button>

            <button class="ghost" @click="onDeleteNodeOnly" :disabled="!selectedId">
                Delete node only
            </button>
        </div>

        <div class="appbar-right">
            <button class="icon-btn" @click="onMoveUp" title="Move up">▲</button>
            <button class="icon-btn" @click="onMoveDown" title="Move down">▼</button>
            <button class="ghost" @click="showAdvanced = !showAdvanced">
                {{ showAdvanced ? 'Hide advanced' : 'Show advanced' }}
            </button>
        </div>
    </header>
</template>

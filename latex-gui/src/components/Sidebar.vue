<script setup lang="ts">
import { useDocument } from '../composables/useDocument';
import { useSelection } from '../composables/useSelection';
import type { DocNode, TableNode, FigureNode } from '../latexModel';

const { doc, flatNodes } = useDocument();
const { selectedId, selectNode } = useSelection();

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
</script>

<template>
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
                <li v-for="n in flatNodes" :key="n.id" :class="{ selected: n.id === selectedId }"
                    @click="selectNode(n.id)">
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
</template>

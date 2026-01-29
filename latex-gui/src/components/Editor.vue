<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSelection } from '../composables/useSelection';
import type { EquationNode, TableNode, FigureNode } from '../latexModel';
import TableEditor from './TableEditor.vue';

const { selectedNode, selectedId } = useSelection(); // We might need to handle snippets for Equation

defineProps<{
    showAdvanced: boolean;
}>();

// Math Snippets logic can be here or extracted further
// For simplicity, keeping snippets here as it's part of Editor logic
type MathSnippetCategory = 'Fractions' | 'Binomials' | 'Sums & products' | 'Brackets' | 'Operators' | 'Align';

interface MathSnippet {
    id: string;
    label: string;
    description?: string;
    template: string;
    category: MathSnippetCategory;
}

const selectedSnippetId = ref<string | ''>('');

const mathSnippets: MathSnippet[] = [
    // Fractions
    { id: 'frac-basic', label: '\\frac{a}{b}', template: '\\frac{a}{b}', category: 'Fractions', description: 'Basic fraction' },
    { id: 'frac-inline', label: '\\dfrac{a}{b}', template: '\\dfrac{a}{b}', category: 'Fractions', description: 'Display-style fraction' },
    // Binomials
    { id: 'binom', label: '\\binom{n}{k}', template: '\\binom{n}{k}', category: 'Binomials', description: 'Binomial coefficient' },
    // Sums
    { id: 'sum-i-n', label: '\\sum', template: '\\sum_{i=1}^n a_i', category: 'Sums & products', description: 'Sum' },
    // ... (Can add more from original App.vue if needed)
    { id: 'align', label: 'align*', template: 'a &= b + c \\\\\n  &= d + e', category: 'Align', description: 'Aligned equations' },
];

function onSnippetSelected() {
    if (!selectedSnippetId.value || !selectedNode.value || selectedNode.value.type !== 'equation') return;
    const snippet = mathSnippets.find(s => s.id === selectedSnippetId.value);
    if (!snippet) return;

    const eq = selectedNode.value as EquationNode;

    if (snippet.category === 'Align') {
        eq.mode = 'display';
        eq.numbered = false;
    }

    if (!eq.latex || eq.latex.trim() === '') {
        eq.latex = snippet.template;
    } else {
        eq.latex += ' ' + snippet.template;
    }
    selectedSnippetId.value = '';
}

</script>

<template>
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
            <section v-if="['chapter', 'section', 'subsection'].includes(selectedNode.type)">
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

            <!-- Equation -->
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

                <label class="math-select-label">
                    <span>Insert preset</span>
                    <select v-model="selectedSnippetId" class="math-snippet-select" @change="onSnippetSelected">
                        <option value="">Choose formula…</option>
                        <option v-for="snippet in mathSnippets" :key="snippet.id" :value="snippet.id"
                            :title="snippet.description">
                            {{ snippet.label }}
                        </option>
                    </select>
                </label>
            </section>

            <!-- TABLE EDITOR -->
            <TableEditor v-else-if="selectedNode.type === 'table'" :node="(selectedNode as TableNode)"
                :show-advanced="showAdvanced" />

            <!-- FIGURE EDITOR -->
            <section v-else-if="selectedNode.type === 'figure'">
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
                    <span>Image Path</span>
                    <input v-model="(selectedNode as FigureNode).imagePath" />
                </label>
                <label>
                    <span>Width (0-1)</span>
                    <input type="number" step="0.1" min="0.1" max="1.0" v-model="(selectedNode as FigureNode).width" />
                </label>
            </section>

        </div>
        <div v-else class="empty-state">
            <p>Select a node to edit</p>
        </div>
    </main>
</template>

<style scoped>
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #888;
}
</style>

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
type MathSnippetCategory = 'Fractions' | 'Binomials' | 'Sums & products' | 'Brackets' | 'Operators' | 'Align' | 'Integrals' | 'Limits' | 'Matrices' | 'Greek Letters' | 'Arrows' | 'Trigonometry' | 'Logarithms' | 'Roots' | 'Sets' | 'Miscellaneous';

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
    { id: 'frac-partial', label: '\\frac{\\partial f}{\\partial x}', template: '\\frac{\\partial f}{\\partial x}', category: 'Fractions', description: 'Partial derivative' },
    { id: 'frac-chain', label: '\\frac{dy}{dx}', template: '\\frac{dy}{dx}', category: 'Fractions', description: 'Derivative' },
    // Binomials
    { id: 'binom', label: '\\binom{n}{k}', template: '\\binom{n}{k}', category: 'Binomials', description: 'Binomial coefficient' },
    { id: 'binom-large', label: '\\dbinom{n}{k}', template: '\\dbinom{n}{k}', category: 'Binomials', description: 'Display binomial' },
    // Sums & products
    { id: 'sum-i-n', label: '\\sum_{i=1}^n a_i', template: '\\sum_{i=1}^n a_i', category: 'Sums & products', description: 'Sum from i=1 to n' },
    { id: 'sum-infty', label: '\\sum_{n=0}^\\infty x^n', template: '\\sum_{n=0}^\\infty x^n', category: 'Sums & products', description: 'Infinite sum' },
    { id: 'prod-i-n', label: '\\prod_{i=1}^n a_i', template: '\\prod_{i=1}^n a_i', category: 'Sums & products', description: 'Product' },
    { id: 'int-a-b', label: '\\int_a^b f(x) \\, dx', template: '\\int_a^b f(x) \\, dx', category: 'Integrals', description: 'Definite integral' },
    { id: 'int-indef', label: '\\int f(x) \\, dx', template: '\\int f(x) \\, dx', category: 'Integrals', description: 'Indefinite integral' },
    { id: 'int-double', label: '\\iint_D f(x,y) \\, dx dy', template: '\\iint_D f(x,y) \\, dx dy', category: 'Integrals', description: 'Double integral' },
    { id: 'int-triple', label: '\\iiint_V f(x,y,z) \\, dx dy dz', template: '\\iiint_V f(x,y,z) \\, dx dy dz', category: 'Integrals', description: 'Triple integral' },
    // Limits
    { id: 'lim-x-a', label: '\\lim_{x \\to a} f(x)', template: '\\lim_{x \\to a} f(x)', category: 'Limits', description: 'Limit as x approaches a' },
    { id: 'lim-infty', label: '\\lim_{x \\to \\infty} f(x)', template: '\\lim_{x \\to \\infty} f(x)', category: 'Limits', description: 'Limit at infinity' },
    // Matrices
    { id: 'matrix-2x2', label: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', template: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'Matrices', description: '2x2 matrix' },
    { id: 'matrix-3x3', label: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', template: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', category: 'Matrices', description: '3x3 matrix' },
    { id: 'matrix-det', label: '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', template: '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'Matrices', description: 'Determinant' },
    // Greek Letters
    { id: 'alpha', label: '\\alpha', template: '\\alpha', category: 'Greek Letters', description: 'Alpha' },
    { id: 'beta', label: '\\beta', template: '\\beta', category: 'Greek Letters', description: 'Beta' },
    { id: 'gamma', label: '\\gamma', template: '\\gamma', category: 'Greek Letters', description: 'Gamma' },
    { id: 'delta', label: '\\delta', template: '\\delta', category: 'Greek Letters', description: 'Delta' },
    { id: 'epsilon', label: '\\epsilon', template: '\\epsilon', category: 'Greek Letters', description: 'Epsilon' },
    { id: 'theta', label: '\\theta', template: '\\theta', category: 'Greek Letters', description: 'Theta' },
    { id: 'lambda', label: '\\lambda', template: '\\lambda', category: 'Greek Letters', description: 'Lambda' },
    { id: 'mu', label: '\\mu', template: '\\mu', category: 'Greek Letters', description: 'Mu' },
    { id: 'pi', label: '\\pi', template: '\\pi', category: 'Greek Letters', description: 'Pi' },
    { id: 'sigma', label: '\\sigma', template: '\\sigma', category: 'Greek Letters', description: 'Sigma' },
    { id: 'phi', label: '\\phi', template: '\\phi', category: 'Greek Letters', description: 'Phi' },
    { id: 'omega', label: '\\omega', template: '\\omega', category: 'Greek Letters', description: 'Omega' },
    // Arrows
    { id: 'rightarrow', label: '\\rightarrow', template: '\\rightarrow', category: 'Arrows', description: 'Right arrow' },
    { id: 'leftarrow', label: '\\leftarrow', template: '\\leftarrow', category: 'Arrows', description: 'Left arrow' },
    { id: 'Rightarrow', label: '\\Rightarrow', template: '\\Rightarrow', category: 'Arrows', description: 'Implies' },
    { id: 'Leftarrow', label: '\\Leftarrow', template: '\\Leftarrow', category: 'Arrows', description: 'Implied by' },
    { id: 'leftrightarrow', label: '\\leftrightarrow', template: '\\leftrightarrow', category: 'Arrows', description: 'Bidirectional arrow' },
    // Trigonometry
    { id: 'sin', label: '\\sin x', template: '\\sin x', category: 'Trigonometry', description: 'Sine' },
    { id: 'cos', label: '\\cos x', template: '\\cos x', category: 'Trigonometry', description: 'Cosine' },
    { id: 'tan', label: '\\tan x', template: '\\tan x', category: 'Trigonometry', description: 'Tangent' },
    { id: 'arcsin', label: '\\arcsin x', template: '\\arcsin x', category: 'Trigonometry', description: 'Arcsine' },
    { id: 'arccos', label: '\\arccos x', template: '\\arccos x', category: 'Trigonometry', description: 'Arccosine' },
    { id: 'arctan', label: '\\arctan x', template: '\\arctan x', category: 'Trigonometry', description: 'Arctangent' },
    // Logarithms
    { id: 'log', label: '\\log x', template: '\\log x', category: 'Logarithms', description: 'Natural log' },
    { id: 'ln', label: '\\ln x', template: '\\ln x', category: 'Logarithms', description: 'Natural log' },
    { id: 'log10', label: '\\log_{10} x', template: '\\log_{10} x', category: 'Logarithms', description: 'Log base 10' },
    { id: 'logb', label: '\\log_b x', template: '\\log_b x', category: 'Logarithms', description: 'Log base b' },
    // Roots
    { id: 'sqrt', label: '\\sqrt{x}', template: '\\sqrt{x}', category: 'Roots', description: 'Square root' },
    { id: 'nthroot', label: '\\sqrt[n]{x}', template: '\\sqrt[n]{x}', category: 'Roots', description: 'Nth root' },
    // Sets
    { id: 'in', label: 'x \\in S', template: 'x \\in S', category: 'Sets', description: 'Element of' },
    { id: 'notin', label: 'x \\notin S', template: 'x \\notin S', category: 'Sets', description: 'Not element of' },
    { id: 'subset', label: 'A \\subset B', template: 'A \\subset B', category: 'Sets', description: 'Subset' },
    { id: 'subseteq', label: 'A \\subseteq B', template: 'A \\subseteq B', category: 'Sets', description: 'Subset or equal' },
    { id: 'emptyset', label: '\\emptyset', template: '\\emptyset', category: 'Sets', description: 'Empty set' },
    { id: 'union', label: 'A \\cup B', template: 'A \\cup B', category: 'Sets', description: 'Union' },
    { id: 'intersection', label: 'A \\cap B', template: 'A \\cap B', category: 'Sets', description: 'Intersection' },
    // Brackets
    { id: 'paren', label: '(a)', template: '(a)', category: 'Brackets', description: 'Parentheses' },
    { id: 'bracket', label: '[a]', template: '[a]', category: 'Brackets', description: 'Square brackets' },
    { id: 'brace', label: '\\{a\\}', template: '\\{a\\}', category: 'Brackets', description: 'Curly braces' },
    { id: 'abs', label: '|x|', template: '|x|', category: 'Brackets', description: 'Absolute value' },
    // Operators
    { id: 'pm', label: '\\pm', template: '\\pm', category: 'Operators', description: 'Plus-minus' },
    { id: 'mp', label: '\\mp', template: '\\mp', category: 'Operators', description: 'Minus-plus' },
    { id: 'times', label: '\\times', template: '\\times', category: 'Operators', description: 'Times' },
    { id: 'div', label: '\\div', template: '\\div', category: 'Operators', description: 'Division' },
    { id: 'cdot', label: '\\cdot', template: '\\cdot', category: 'Operators', description: 'Center dot' },
    { id: 'neq', label: '\\neq', template: '\\neq', category: 'Operators', description: 'Not equal' },
    { id: 'leq', label: '\\leq', template: '\\leq', category: 'Operators', description: 'Less or equal' },
    { id: 'geq', label: '\\geq', template: '\\geq', category: 'Operators', description: 'Greater or equal' },
    { id: 'approx', label: '\\approx', template: '\\approx', category: 'Operators', description: 'Approximately equal' },
    { id: 'propto', label: '\\propto', template: '\\propto', category: 'Operators', description: 'Proportional to' },
    // Align
    { id: 'align', label: 'align*', template: 'a &= b + c \\\\\n  &= d + e', category: 'Align', description: 'Aligned equations' },
    { id: 'align-numbered', label: 'align', template: 'a &= b + c \\\\\n  &= d + e', category: 'Align', description: 'Numbered aligned equations' },
    // Miscellaneous
    { id: 'infty', label: '\\infty', template: '\\infty', category: 'Miscellaneous', description: 'Infinity' },
    { id: 'partial', label: '\\partial', template: '\\partial', category: 'Miscellaneous', description: 'Partial derivative symbol' },
    { id: 'nabla', label: '\\nabla', template: '\\nabla', category: 'Miscellaneous', description: 'Nabla operator' },
    { id: 'forall', label: '\\forall', template: '\\forall', category: 'Miscellaneous', description: 'For all' },
    { id: 'exists', label: '\\exists', template: '\\exists', category: 'Miscellaneous', description: 'There exists' },
    { id: 'therefore', label: '\\therefore', template: '\\therefore', category: 'Miscellaneous', description: 'Therefore' },
    { id: 'because', label: '\\because', template: '\\because', category: 'Miscellaneous', description: 'Because' },
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
                    <input v-model="selectedSnippetId" list="math-snippets" class="math-snippet-input" @change="onSnippetSelected" placeholder="Type or select formula…" />
                    <datalist id="math-snippets">
                        <option v-for="snippet in mathSnippets" :key="snippet.id" :value="snippet.id" :title="snippet.description">
                            {{ snippet.label }}
                        </option>
                    </datalist>
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

.math-snippet-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
}
</style>

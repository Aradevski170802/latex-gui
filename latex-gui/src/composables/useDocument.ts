import { ref, computed } from 'vue';
import {
    createEmptyDocument,
    type DocumentRoot,
    type DocNode,
    type TableNode,
    type FigureNode,
    type TableColumn,
    type EquationNode,
} from '../latexModel';

const doc = ref<DocumentRoot>(createEmptyDocument());

export function useDocument() {
    const flatNodes = computed(() => collectNodes(doc.value));

    function collectNodes(root: DocumentRoot): DocNode[] {
        const res: DocNode[] = [];
        const walk = (n: DocNode) => {
            res.push(n);
            n.children?.forEach((c) => walk(c));
        };
        root.children.forEach((c) => walk(c));
        return res;
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

    // Actions
    function addChapter() {
        const chapter: DocNode = {
            id: 'chap-' + Date.now(),
            type: 'chapter',
            title: 'New Chapter',
            children: [],
        };
        doc.value.children.push(chapter);
    }

    function addSection(target: DocNode | DocumentRoot = doc.value) {
        // Logic from App.vue: if target is not a container, maybe fall back? 
        // But caller should handle "active selection" logic. 
        // We'll assume 'target' is where we want to append, or we logic check it.

        // In App.vue logic:
        // if selected is chapter/section/subsection -> target = selected
        // else target = doc

        // Here we just append to the passed target (if it has children)
        if (!target.children) target.children = [];

        target.children.push({
            id: 'sec-' + Date.now(),
            type: 'section',
            title: 'New Section',
            children: [],
        });
    }

    function addSubsection(target: DocNode | DocumentRoot) {
        // App.vue only allowed adding subsection if selected is section/subsection
        if (target.type !== 'section' && target.type !== 'subsection') return;

        target.children = target.children || [];
        target.children.push({
            id: 'sub-' + Date.now(),
            type: 'subsection',
            title: 'New Subsection',
            children: [],
        });
    }

    function addText(target: DocNode | DocumentRoot = doc.value) {
        target.children = target.children || [];
        target.children.push({
            id: 'txt-' + Date.now(),
            type: 'text',
            content: 'Write text here.',
        });
    }

    function addTable(target: DocNode | DocumentRoot = doc.value) {
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

    function addFigure(target: DocNode | DocumentRoot = doc.value) {
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

    function addPageBreak(target: DocNode | DocumentRoot = doc.value) {
        target.children = target.children || [];
        target.children.push({
            id: 'pb-' + Date.now(),
            type: 'pagebreak',
            children: [],
        } as DocNode);
    }

    function addEquation(target: DocNode | DocumentRoot = doc.value) {
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

    function deleteNode(id: string) {
        const found = findParentAndIndex(doc.value, id);
        if (!found) return;
        const { parent, index } = found;
        if (!parent.children) return;
        parent.children.splice(index, 1);
    }

    function deleteNodeOnly(id: string) {
        const found = findParentAndIndex(doc.value, id);
        if (!found) return;
        const { parent, index } = found;
        if (!parent.children) return;

        const [removed] = parent.children.splice(index, 1);
        if (removed && removed.children && removed.children.length > 0) {
            parent.children.splice(index, 0, ...removed.children);
        }
    }

    function moveNode(id: string, delta: number) {
        const found = findParentAndIndex(doc.value, id);
        if (!found) return;
        const { parent, index } = found;
        if (!parent.children) return;

        const newIndex = index + delta;
        if (newIndex < 0 || newIndex >= parent.children.length) return;

        const arr = parent.children;
        const removed = arr.splice(index, 1)[0] as DocNode;
        arr.splice(newIndex, 0, removed);
    }

    return {
        doc,
        flatNodes,
        findNodeById,
        findParentAndIndex,
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
        moveNode
    };
}

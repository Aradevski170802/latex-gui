import { ref, computed } from 'vue';
import { useDocument } from './useDocument';
import type { DocNode, TableNode } from '../latexModel';

// Singleton state might be preferred if we want to share clean selection
// But standard composable pattern often returns new refs. 
// Given the app structure, let's make a shared state for selection so Sidebar and Editor sync automatically.

const selectedId = ref<string | null>(null);
const selectedCell = ref<{ row: number; col: number } | null>(null);

export function useSelection() {
    const { findNodeById } = useDocument();

    const selectedNode = computed<DocNode | null>(() => findNodeById(selectedId.value));

    function selectNode(id: string) {
        selectedId.value = id;
        selectedCell.value = null;
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

    function clearSelection() {
        selectedId.value = null;
        selectedCell.value = null;
    }

    return {
        selectedId,
        selectedNode,
        selectedCell,
        selectNode,
        selectCell,
        setCellColor,
        clearSelection
    };
}

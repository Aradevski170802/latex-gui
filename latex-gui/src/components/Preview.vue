<script setup lang="ts">
import { computed } from 'vue';
import { useDocument } from '../composables/useDocument';
import { generateLatex } from '../latexModel';

const { doc } = useDocument();
const latexCode = computed(() => generateLatex(doc.value));
</script>

<template>
    <section class="preview">
        <div class="card preview-card">
            <header class="preview-header">
                <h3>Generated LaTeX</h3>
            </header>
            <textarea :value="latexCode" readonly />
        </div>
    </section>
</template>

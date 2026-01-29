<script setup lang="ts">
import { ref } from 'vue';
import Toolbar from './components/Toolbar.vue';
import Sidebar from './components/Sidebar.vue';
import Editor from './components/Editor.vue';
import Preview from './components/Preview.vue';

const showAdvanced = ref(true);
</script>

<template>
  <div class="app">
    <Toolbar v-model:showAdvanced="showAdvanced" />

    <div class="layout">
      <Sidebar />
      <Editor :show-advanced="showAdvanced" />
      <Preview />
    </div>
  </div>
</template>

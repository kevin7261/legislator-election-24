<script>
  /**
   * 🏠 HomeView.vue - 主頁面組件
   *
   * 顯示全屏議會席位圖
   */

  import MapTab from '../tabs/MapTab.vue';

  export default {
    name: 'HomeView',
    components: { MapTab },
  };
</script>

<template>
  <!-- 🏠 全屏容器 -->
  <div class="vh-100 vw-100 overflow-hidden">
    <!-- 🏛️ 議會席位圖組件（全屏） -->
    <MapTab />
  </div>
</template>

<style>
  @import '../assets/css/common.css';
</style>

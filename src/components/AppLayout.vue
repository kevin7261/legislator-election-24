<script>
  /**
   * 📐 AppLayout.vue - 應用程式布局
   *
   * 包含左側導航欄和主內容區域
   */

  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  export default {
    name: 'AppLayout',
    setup() {
      const route = useRoute();
      const router = useRouter();

      const currentPath = computed(() => {
        // 获取当前路径，去掉 base path
        const path = route.path;
        return path;
      });

      const navItems = [
        { path: '/circle', label: '圓形視圖', icon: '⭕' },
        { path: '/rect', label: '方形視圖', icon: '▢' },
        { path: '/bar', label: '長條圖視圖', icon: '📊' },
        { path: '/bar2', label: '長條圖視圖2', icon: '📈' },
        { path: '/treemap', label: '樹狀圖視圖', icon: '📦' },
      ];

      const isActive = (path) => {
        return currentPath.value === path || currentPath.value.startsWith(path + '/');
      };

      const navigateTo = (path) => {
        router.push(path);
      };

      return {
        currentPath,
        navItems,
        navigateTo,
        isActive,
      };
    },
  };
</script>

<template>
  <div class="app-layout">
    <!-- 左側導航欄 -->
    <aside class="sidebar">
      <nav class="nav-menu">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 主內容區域 -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
  .app-layout {
    display: flex !important;
    width: 100% !important;
    height: 100vh !important;
    background: #ffffff;
    position: relative;
    z-index: 1;
  }

  .sidebar {
    width: 200px !important;
    background: #f8f9fa !important;
    border-right: 1px solid #e9ecef;
    padding: 20px 0;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    display: block !important;
  }

  .nav-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 12px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    text-decoration: none;
    color: #495057;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .nav-item:hover {
    background: #e9ecef;
    color: #212529;
  }

  .nav-item.active {
    background: #4d96ff;
    color: #ffffff;
  }

  .nav-item.active:hover {
    background: #3d7fdf;
  }

  .nav-icon {
    font-size: 20px;
    line-height: 1;
  }

  .nav-label {
    flex: 1;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
</style>


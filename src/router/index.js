/**
 * 🚀 Vue Router 路由配置
 *
 * 長照空間分析系統的路由管理
 * 使用 Vue Router 4 進行單頁應用程式路由控制
 *
 * @author 長照空間分析團隊
 * @version 1.0.0
 */

import { createRouter, createWebHistory } from 'vue-router';
import CircleView from '../views/CircleView.vue';
import RectView from '../views/RectView.vue';
import BarView from '../views/BarView.vue';
import BarView2 from '../views/BarView2.vue';
import TreemapView from '../views/TreemapView.vue';

/**
 * 📍 路由配置陣列
 * 定義應用程式的所有路由規則
 */
const routes = [
  {
    path: '/', // 🏠 根路徑，重定向到 circle
    redirect: '/circle',
  },
  {
    path: '/circle', // ⭕ 圓形視圖
    name: 'CircleView',
    component: CircleView,
  },
  {
    path: '/rect', // ▢ 方形視圖
    name: 'RectView',
    component: RectView,
  },
  {
    path: '/bar', // 📊 長條圖視圖
    name: 'BarView',
    component: BarView,
  },
  {
    path: '/bar2', // 📈 長條圖視圖2（交錯版）
    name: 'BarView2',
    component: BarView2,
  },
  {
    path: '/treemap', // 📦 樹狀圖視圖
    name: 'TreemapView',
    component: TreemapView,
  },
];

/**
 * 🛣️ 路由器實例創建
 *
 * 配置說明：
 * - history: 使用 HTML5 History API 模式
 * - base: 設定應用程式的基礎路徑為 '/legislator-election-24/'
 * - routes: 路由配置陣列
 */
const router = createRouter({
  history: createWebHistory('/legislator-election-24/'),
  routes,
});

export default router;

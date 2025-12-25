<script>
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * 🗺️ MapTab.vue - D3.js 台灣地圖組件
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * @fileoverview
   * 這是一個基於 D3.js 的台灣地圖視覺化組件，同時顯示縣市界線和登革熱網格數據。
   * 本組件負責載入、處理和渲染台灣直轄市、縣(市)界線和登革熱病例網格數據。
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 📋 核心功能
   * ─────────────────────────────────────────────────────────────────────────
   * 1. 縣市邊界渲染：
   *    ✓ 載入直轄市、縣(市)界線1140318.geojson
   *    ✓ 繪製所有台灣直轄市、縣(市)界線
   *
   * 2. 登革熱網格渲染：
   *    ✓ 載入 dengue_grid_counts_1km_2023_land_only.geojson
   *    ✓ 根據 level 屬性繪製5級風險等級網格
   *    ✓ 只顯示病例數 > 0 的網格
   *    ✓ 使用5級色票：深藍(1) → 綠(2) → 黃橙(3) → 橙(4) → 紅(5)（最上層）
   *
   * 3. 視覺元素：
   *    ✓ 縣市界線：淺灰細邊框，無填充（底層）
   *    ✓ 登革熱網格：5級色票填充，無邊框（最上層）
   *    ✓ 白色地圖背景
   *
   * 4. 交互功能：
   *    ✓ 滾輪縮放控制
   *    ✓ 拖動平移導航
   *    ✓ 滑鼠懸停顯示網格屬性資訊
   *    ✓ 網格高亮效果
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 🎨 配色主題
   * ─────────────────────────────────────────────────────────────────────────
   * 白色      #ffffff  → 地圖背景
   * 淺灰色    #cccccc  → 縣市邊框
   * 無填充    none     → 縣市區域
   * 5級色票            → 登革熱風險等級（最上層）
   *   Level 1  #1a237e → 深藍色
   *   Level 2  #4caf50 → 綠色
   *   Level 3  #fbc02d → 黃橙色
   *   Level 4  #ff6f00 → 橙色
   *   Level 5  #d32f2f → 紅色
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 🛠️ 技術棧
   * ─────────────────────────────────────────────────────────────────────────
   * @requires vue                 - Vue 3.2+ (Composition API)
   * @requires d3                  - D3.js 7.8+ (地圖繪製庫)
   * @requires @/stores/dataStore  - Pinia 狀態管理
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 📁 數據來源
   * ─────────────────────────────────────────────────────────────────────────
   * 直轄市、縣(市)界線：直轄市、縣(市)界線1140318.geojson
   * 登革熱網格數據：dengue_grid_counts_1km_2023_land_only.geojson
   * 路徑：public/data/geojson/
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 🔧 使用方式
   * ─────────────────────────────────────────────────────────────────────────
   * <MapTab @map-ready="handleMapReady" />
   *
   * @event map-ready - 地圖初始化完成時觸發，返回地圖實例
   *
   * ─────────────────────────────────────────────────────────────────────────
   * 📝 維護者
   * ─────────────────────────────────────────────────────────────────────────
   * @author Kevin Cheng
   * @version 4.0.0
   * @since 2024
   * @license MIT
   *
   * ═══════════════════════════════════════════════════════════════════════════
   */

  // ═══════════════════════════════════════════════════════════════════════════
  // 📦 依賴導入 (Dependencies Import)
  // ═══════════════════════════════════════════════════════════════════════════

  // Vue 3 核心功能
  import { ref, onMounted, onUnmounted, nextTick } from 'vue';

  // D3.js 地圖庫
  import * as d3 from 'd3';

  // Pinia 狀態管理
  import { useDataStore } from '@/stores/dataStore';

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 組件定義 (Component Definition)
  // ═══════════════════════════════════════════════════════════════════════════

  export default {
    name: 'MapTab',

    // 組件觸發的事件
    emits: [
      'map-ready', // 地圖初始化完成時觸發，傳遞地圖實例
    ],

    /**
     * ───────────────────────────────────────────────────────────────────────
     * 🎬 組件設置函數 (Component Setup Function)
     * ───────────────────────────────────────────────────────────────────────
     * 使用 Vue 3 Composition API 設置組件邏輯
     *
     * @param {Object} _ - Props（本組件不使用）
     * @param {Object} context - 設置上下文
     * @param {Function} context.emit - 事件觸發函數
     * @returns {Object} 返回模板可用的響應式數據和方法
     */
    setup(_, { emit }) {
      // ═══════════════════════════════════════════════════════════════════════
      // 📦 狀態管理與依賴 (State Management & Dependencies)
      // ═══════════════════════════════════════════════════════════════════════

      // Pinia 數據存儲（保留供未來擴展使用）
      // eslint-disable-next-line no-unused-vars
      const dataStore = useDataStore();

      // ═══════════════════════════════════════════════════════════════════════
      // 🗺️ 地圖相關變數 (Map-Related Variables)
      // ═══════════════════════════════════════════════════════════════════════

      /**
       * 地圖 DOM 容器引用
       * @type {Ref<HTMLElement|null>}
       */
      const mapContainer = ref(null);

      /**
       * D3.js SVG 元素
       * @type {d3.Selection|null}
       */
      let svg = null;

      /**
       * D3.js 投影函數
       * @type {d3.GeoProjection|null}
       */
      let projection = null;

      /**
       * D3.js 路徑生成器
       * @type {d3.GeoPath|null}
       */
      let path = null;

      /**
       * D3.js 縮放行為
       * @type {d3.ZoomBehavior|null}
       */
      let zoom = null;

      /**
       * SVG 主容器組
       * @type {d3.Selection|null}
       */
      let g = null;

      /**
       * 工具提示元素
       * @type {HTMLElement|null}
       */
      let tooltip = null;

      /**
       * Grid 版面配置（grid 模式專用）
       * @type {{
       *   minX: number,
       *   maxX: number,
       *   minY: number,
       *   maxY: number,
       *   cellSize: number,
       *   offsetX: number,
       *   offsetY: number
       * } | null}
       */
      let gridLayoutConfig = null;

      // ═══════════════════════════════════════════════════════════════════════
      // 🎛️ 控制狀態 (Control States)
      // ═══════════════════════════════════════════════════════════════════════

      /**
       * 地圖就緒狀態標記
       * true = 地圖已初始化完成，false = 尚未初始化
       * @type {Ref<boolean>}
       */
      const isMapReady = ref(false);

      /**
       * 地圖容器唯一 ID
       * 使用隨機字符串確保多實例時不會衝突
       * @type {Ref<string>}
       */
      const mapContainerId = ref(`leaflet-map-${Math.random().toString(36).substr(2, 9)}`);

      /**
       * 顯示模式
       * 'map' = 使用地圖投影顯示（目前結果）
       * 'grid' = 直接使用 grid_x, grid_y 繪製網格
       * @type {Ref<string>}
       */
      const displayMode = ref('map');

      // ═══════════════════════════════════════════════════════════════════════
      // 📊 GeoJSON 數據儲存 (GeoJSON Data Storage)
      // ═══════════════════════════════════════════════════════════════════════

      /**
       * 區界 GeoJSON 數據（臺北市）
       * 來源：臺北市區界圖_20220915.geojson
       * @type {Ref<Object|null>}
       */
      const countyData = ref(null);

      /**
       * 網格 GeoJSON 數據（臺北市 500m 方格）
       * 來源：grid_with_weighted_angle_stats_500m.geojson
       * @type {Ref<Object|null>}
       */
      const hexData = ref(null);

      /**
       * 登革熱網格 GeoJSON 數據（保留以兼容）
       * 來源：dengue_grid_counts_1km_2023_land_only.geojson
       * @type {Ref<Object|null>}
       */
      const dengueData = ref(null);

      /**
       * 📥 載入直轄市、縣(市)界線 GeoJSON 數據
       */
      const loadCountyData = async () => {
        try {
          console.log('[MapTab] 開始載入直轄市、縣(市)界線 GeoJSON 數據...');

          // 載入臺北市區界 GeoJSON 檔案
          const countyResponse = await fetch(
            `${process.env.BASE_URL}data/geojson/臺北市區界圖_20220915.geojson`
          );

          // 檢查響應
          if (!countyResponse.ok) {
            throw new Error(`直轄市、縣(市)界線數據載入失敗: HTTP ${countyResponse.status}`);
          }

          // 解析 JSON
          countyData.value = await countyResponse.json();

          console.log('[MapTab] 臺北市區界數據載入成功');
          console.log('  - 區數量:', countyData.value.features?.length || 0);

          return true;
        } catch (error) {
          console.error('[MapTab] 直轄市、縣(市)界線數據載入失敗:', error);
          return false;
        }
      };

      /**
       * 🛠️ 創建工具提示元素
       */
      const createTooltip = () => {
        if (!mapContainer.value) return;

        // 移除已存在的工具提示
        const existingTooltip = mapContainer.value.querySelector('.map-tooltip');
        if (existingTooltip) {
          existingTooltip.remove();
        }

        // 創建新的工具提示元素
        tooltip = document.createElement('div');
        tooltip.className = 'map-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.padding = '4px 8px';

        mapContainer.value.appendChild(tooltip);
        console.log('[MapTab] 工具提示元素創建成功');
      };

      /**
       * 📥 載入網格 GeoJSON 數據
       */
      const loadHexData = async () => {
        try {
          console.log('[MapTab] 開始載入 500m 方格 GeoJSON 數據...');

          // 載入臺北市 500m 方格 GeoJSON 檔案
          const hexResponse = await fetch(
            `${process.env.BASE_URL}data/geojson/grid_with_weighted_angle_stats_500m.geojson`
          );

          // 檢查響應
          if (!hexResponse.ok) {
            throw new Error(`方格數據載入失敗: HTTP ${hexResponse.status}`);
          }

          // 解析 JSON
          hexData.value = await hexResponse.json();

          console.log('[MapTab] 500m 方格數據載入成功');
          console.log('  - 網格數量:', hexData.value.features?.length || 0);

          return true;
        } catch (error) {
          console.error('[MapTab] 500m 方格數據載入失敗:', error);
          return false;
        }
      };

      /**
       * 📥 載入登革熱網格 GeoJSON 數據
       */
      // eslint-disable-next-line no-unused-vars
      const loadDengueData = async () => {
        try {
          console.log('[MapTab] 開始載入登革熱網格 GeoJSON 數據...');

          // 載入登革熱網格 GeoJSON 檔案
          const dengueResponse = await fetch(
            `${process.env.BASE_URL}data/geojson/dengue_grid_counts_1km_2023_land_only.geojson`
          );

          // 檢查響應
          if (!dengueResponse.ok) {
            throw new Error(`登革熱網格數據載入失敗: HTTP ${dengueResponse.status}`);
          }

          // 解析 JSON
          dengueData.value = await dengueResponse.json();

          console.log('[MapTab] 登革熱網格數據載入成功');
          console.log('  - 網格數量:', dengueData.value.features?.length || 0);

          return true;
        } catch (error) {
          console.error('[MapTab] 登革熱網格數據載入失敗:', error);
          return false;
        }
      };

      /**
       * 📊 Jenks Natural Breaks 分類函數
       * @param {Array} data - 數據陣列
       * @param {number} nClasses - 分類數量
       * @returns {Array} 分類閾值陣列
       */
      // eslint-disable-next-line no-unused-vars
      const jenksNaturalBreaks = (data, nClasses) => {
        if (!data || data.length === 0) return [];

        const sortedData = [...data].sort((a, b) => a - b);
        const dataLength = sortedData.length;

        // 如果要分類數大於數據點數，返回數據點數
        if (nClasses > dataLength) {
          nClasses = dataLength;
        }

        // 初始化矩陣
        const matrix = [];
        for (let i = 0; i < dataLength + 1; i++) {
          matrix[i] = [];
          for (let j = 0; j < nClasses + 1; j++) {
            matrix[i][j] = 0;
          }
        }

        // 計算下三角矩陣（方差）
        const lowerClassLimit = [];
        for (let i = 0; i < dataLength + 1; i++) {
          lowerClassLimit[i] = [];
          for (let j = 0; j < nClasses + 1; j++) {
            lowerClassLimit[i][j] = 0;
          }
        }

        let variance = 0;

        // 計算方差
        for (let i = 1; i < nClasses + 1; i++) {
          matrix[0][i] = 1;
          lowerClassLimit[0][i] = 0;
          for (let j = 1; j < dataLength + 1; j++) {
            matrix[j][i] = Infinity;
          }
        }

        for (let l = 0; l < dataLength; l++) {
          let sum = 0;
          let sumSquares = 0;
          let w = 0;

          for (let m = 0; m < l + 1; m++) {
            const lowerClassLimitIndex = l - m + 1;
            const val = sortedData[lowerClassLimitIndex - 1];
            w++;
            sum += val;
            sumSquares += val * val;
            variance = sumSquares - (sum * sum) / w;
            const i4 = lowerClassLimitIndex - 1;

            if (i4 !== 0) {
              for (let j = 2; j < nClasses + 1; j++) {
                if (matrix[l][j] >= variance + matrix[i4][j - 1]) {
                  lowerClassLimit[l][j] = lowerClassLimitIndex;
                  matrix[l][j] = variance + matrix[i4][j - 1];
                }
              }
            }
          }

          lowerClassLimit[l][1] = 1;
          matrix[l][1] = variance;
        }

        // 提取分類閾值
        const classMarkers = [];
        let k = dataLength;
        for (let j = nClasses; j > 0; j--) {
          const id = lowerClassLimit[k][j] - 2;
          classMarkers[j - 1] = sortedData[id + 1];
          k = lowerClassLimit[k][j] - 1;
        }

        return classMarkers;
      };

      /**
       * 🗺️ 繪製直轄市、縣(市)界線
       */
      const drawCounties = () => {
        if (!g || !countyData.value) {
          console.error(
            '[MapTab] 無法繪製直轄市、縣(市)界線: g=',
            !!g,
            'countyData=',
            !!countyData.value
          );
          return;
        }

        try {
          console.log('[MapTab] 開始繪製直轄市、縣(市)界線 GeoJSON');

          // 繪製所有行政區（臺北市）
          g.selectAll('.county')
            .data(countyData.value.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'county')
            .attr('fill', 'none')
            .attr('stroke', '#222')
            .attr('stroke-width', 1.2)
            .attr('stroke-opacity', 0.9)
            .attr('vector-effect', 'non-scaling-stroke');

          console.log('[MapTab] 直轄市、縣(市)界線 GeoJSON 繪製完成');
        } catch (error) {
          console.error('[MapTab] 直轄市、縣(市)界線 GeoJSON 繪製失敗:', error);
        }
      };

      /**
       * 🏗️ 創建網格畫布（不依賴地圖投影）
       * 用於 grid 模式，直接使用 grid_x, grid_y 繪製
       */
      // eslint-disable-next-line no-unused-vars
      const createGridCanvas = () => {
        if (!mapContainer.value) return false;

        const rect = mapContainer.value.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[MapTab] 容器尺寸為零，延遲初始化');
          return false;
        }

        try {
          // 清除舊的 SVG
          if (svg) {
            svg.remove();
          }

          projection = null;
          path = null;
          gridLayoutConfig = null;

          const width = rect.width;
          const height = rect.height;

          // 創建 SVG 元素（不帶地圖投影）
          svg = d3
            .select(mapContainer.value)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', '#ffffff'); // 白色背景

          // 創建容器組（不使用地圖投影）
          g = svg.append('g');

          // 設置縮放行為（用於網格縮放）
          zoom = d3
            .zoom()
            .scaleExtent([0.5, 50]) // 允許縮放 0.5x 到 50x
            .on('zoom', (event) => {
              g.attr('transform', event.transform);
            });

          svg.call(zoom);

          // 重置縮放狀態，確保切換模式時不會受到之前模式的影響
          svg.call(zoom.transform, d3.zoomIdentity);

          // 創建工具提示元素
          createTooltip();

          isMapReady.value = true;

          console.log('[MapTab] 網格畫布創建成功');
          return true;
        } catch (error) {
          console.error('[MapTab] 網格畫布創建失敗:', error);
          return false;
        }
      };

      /**
       * 🗺️ 繪製六角形網格（Grid 模式版本）
       * 使用 grid_x、grid_y 排列，不依賴 GeoJSON coordinates
       */
      const drawHexGridOnly = () => {
        if (!g || !hexData.value) {
          console.error('[MapTab] 無法繪製方格: g=', !!g, 'hexData=', !!hexData.value);
          return;
        }

        try {
          console.log('[MapTab] 開始繪製方格（Grid 模式，使用 grid_x/grid_y）');

          // 先清除舊的圖層（包括縣市界線）
          g.selectAll('.hex-grid').remove();
          g.selectAll('.county').remove();

          const gridsWithXY = (hexData.value.features || []).filter((feature) => {
            const gx = feature?.properties?.grid_x;
            const gy = feature?.properties?.grid_y;
            return Number.isFinite(gx) && Number.isFinite(gy);
          });

          if (gridsWithXY.length === 0) {
            console.warn('[MapTab] 無法找到 grid_x 或 grid_y 屬性');
            gridLayoutConfig = null;
            return;
          }

          const gridXValues = gridsWithXY.map((d) => d.properties.grid_x);
          const gridYValues = gridsWithXY.map((d) => d.properties.grid_y);

          const minX = d3.min(gridXValues);
          const maxX = d3.max(gridXValues);
          const minY = d3.min(gridYValues);
          const maxY = d3.max(gridYValues);

          const svgWidth =
            (svg ? +svg.attr('width') : null) || mapContainer.value.getBoundingClientRect().width;
          const svgHeight =
            (svg ? +svg.attr('height') : null) || mapContainer.value.getBoundingClientRect().height;

          if (
            !Number.isFinite(svgWidth) ||
            !Number.isFinite(svgHeight) ||
            svgWidth === 0 ||
            svgHeight === 0
          ) {
            console.warn('[MapTab] SVG 尺寸無效，無法繪製 grid');
            gridLayoutConfig = null;
            return;
          }

          const padding = 40;
          const availableWidth = Math.max(svgWidth - padding * 2, 0);
          const availableHeight = Math.max(svgHeight - padding * 2, 0);

          const rangeX = Math.max(maxX - minX + 1, 1);
          const rangeY = Math.max(maxY - minY + 1, 1);

          const cellSize = Math.min(availableWidth / rangeX, availableHeight / rangeY);

          if (!Number.isFinite(cellSize) || cellSize <= 0) {
            console.warn('[MapTab] 計算出的 cellSize 無效:', cellSize);
            gridLayoutConfig = null;
            return;
          }

          const actualWidth = cellSize * rangeX;
          const actualHeight = cellSize * rangeY;

          const offsetX = (svgWidth - actualWidth) / 2;
          const offsetY = (svgHeight - actualHeight) / 2;

          gridLayoutConfig = {
            minX,
            maxX,
            minY,
            maxY,
            cellSize,
            offsetX,
            offsetY,
          };

          const strokeWidth = Math.max(cellSize * 0.06, 0.4);

          const hexCells = g
            .selectAll('.hex-grid')
            .data(gridsWithXY, (d) => `${d.properties.grid_x}-${d.properties.grid_y}`)
            .join('rect')
            .attr('class', 'hex-grid')
            .attr('x', (d) => offsetX + (d.properties.grid_x - minX) * cellSize)
            .attr('y', (d) => offsetY + (maxY - d.properties.grid_y) * cellSize)
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', strokeWidth)
            .attr('stroke-opacity', 0.7)
            .attr('shape-rendering', 'crispEdges')
            .attr('vector-effect', 'non-scaling-stroke')
            .style('cursor', 'pointer');

          hexCells
            .on('mouseover', function (event, d) {
              d3.select(this)
                .attr('stroke-width', strokeWidth * 1.3)
                .attr('stroke-opacity', 1);
              if (tooltip) {
                const properties = d.properties || {};
                let tooltipHTML = '';
                Object.keys(properties).forEach((key) => {
                  const value = properties[key];
                  tooltipHTML += `<div><strong>${key}:</strong> ${value !== null && value !== undefined ? value : 'N/A'}</div>`;
                });
                tooltip.innerHTML = tooltipHTML;
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
                tooltip.style.opacity = 1;
              }
            })
            .on('mousemove', function (event) {
              if (tooltip) {
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
              }
            })
            .on('mouseout', function () {
              d3.select(this).attr('stroke-width', strokeWidth).attr('stroke-opacity', 0.7);
              if (tooltip) {
                tooltip.style.opacity = 0;
              }
            });

          console.log('[MapTab] 方格（Grid 模式）繪製完成', {
            cells: gridsWithXY.length,
            cellSize,
            offsetX,
            offsetY,
          });

          // 在每個方格中心繪製借車/還車角度箭頭
          drawAngleArrows();
        } catch (error) {
          console.error('[MapTab] 方格繪製失敗:', error);
          gridLayoutConfig = null;
        }
      };

      /**
       * 🗺️ 繪製網格（使用 grid_x, grid_y，不使用座標）
       * 完全獨立的實現，不依賴地圖投影
       */
      // eslint-disable-next-line no-unused-vars
      const drawGridOnly = () => {
        if (!g || !dengueData.value) {
          console.error('[MapTab] 無法繪製網格: g=', !!g, 'dengueData=', !!dengueData.value);
          return;
        }

        try {
          console.log('[MapTab] 開始繪製網格（使用 grid_x, grid_y）');

          // 清除舊的網格
          g.selectAll('.dengue-grid').remove();

          // 顏色映射
          const levelColors = {
            0: '#e0e0e0', // 淡灰色（level 0）
            1: '#1a237e', // 深藍色（深色）
            2: '#4caf50', // 綠色（較亮）
            3: '#fbc02d', // 黃橙色（金色）
            4: '#ff6f00', // 橙色（明亮）
            5: '#d32f2f', // 紅色（深色）
          };

          // 顏色映射函數
          const getColorByLevel = (level) => {
            if (level === 0 || level === null || level === undefined) {
              return levelColors[0];
            }
            return levelColors[level] || levelColors[1];
          };

          // 透明度映射函數
          const getOpacityByLevel = (level) => {
            const levelNum = level || 0;
            const opacityMap = {
              0: 0.5,
              1: 0.7,
              2: 0.75,
              3: 0.8,
              4: 0.85,
              5: 0.9,
            };
            return opacityMap[levelNum] || opacityMap[0];
          };

          // 過濾有 grid_x 和 grid_y 的數據
          const gridsWithXY = dengueData.value.features.filter(
            (d) =>
              d.properties.grid_x !== null &&
              d.properties.grid_x !== undefined &&
              d.properties.grid_y !== null &&
              d.properties.grid_y !== undefined
          );

          if (gridsWithXY.length === 0) {
            console.error('[MapTab] 無法找到 grid_x 或 grid_y 屬性');
            return;
          }

          // 計算 grid_x 和 grid_y 的範圍
          const gridXValues = gridsWithXY.map((d) => d.properties.grid_x);
          const gridYValues = gridsWithXY.map((d) => d.properties.grid_y);

          const minX = d3.min(gridXValues);
          const maxX = d3.max(gridXValues);
          const minY = d3.min(gridYValues);
          const maxY = d3.max(gridYValues);

          console.log('[MapTab] Grid 範圍:', { minX, maxX, minY, maxY });

          // 獲取 SVG 尺寸（在 svg 尚未建立時回退到容器尺寸）
          const svgWidth =
            (svg ? +svg.attr('width') : null) || mapContainer.value.getBoundingClientRect().width;
          const svgHeight =
            (svg ? +svg.attr('height') : null) || mapContainer.value.getBoundingClientRect().height;

          // 創建比例尺（帶有一些邊距）
          const padding = 50;
          const availableWidth = svgWidth - 2 * padding;
          const availableHeight = svgHeight - 2 * padding;

          // 計算 grid 範圍（包括邊界）
          const rangeX = maxX - minX + 1;
          const rangeY = maxY - minY + 1;

          // 計算理論單元大小（根據可用空間和範圍）
          const cellWidthFromX = availableWidth / rangeX;
          const cellHeightFromY = availableHeight / rangeY;

          // 使用較小的值作為統一的單元大小，確保所有網格都是正方形且能完整顯示
          const cellSize = Math.min(cellWidthFromX, cellHeightFromY);

          // 根據實際單元大小計算實際使用的空間
          const actualWidth = cellSize * rangeX;
          const actualHeight = cellSize * rangeY;

          // 計算居中偏移量
          const offsetX = (svgWidth - actualWidth) / 2;
          const offsetY = (svgHeight - actualHeight) / 2;

          // 創建比例尺（使用統一的單元大小，並居中顯示）
          const scaleX = d3
            .scaleLinear()
            .domain([minX, maxX + 1])
            .range([offsetX, offsetX + actualWidth]);
          // Y 軸：grid_y 最小值在上方，最大值在下方（SVG 坐標系：y=0 在頂部，向下遞增）
          const scaleY = d3
            .scaleLinear()
            .domain([minY, maxY + 1])
            .range([offsetY, offsetY + actualHeight]);

          console.log('[MapTab] Grid 單元大小:', {
            cellSize,
            rangeX,
            rangeY,
            cellWidthFromX,
            cellHeightFromY,
          });

          // 網格單元大小（統一為正方形）
          const cellWidth = cellSize;
          const cellHeight = cellSize;

          // 按 level 排序：level 0 在底層，level 1-5 在上層
          const sortedGrids = gridsWithXY.sort((a, b) => {
            const levelA = a.properties.level || 0;
            const levelB = b.properties.level || 0;
            return levelA - levelB;
          });

          // 繪製網格矩形
          g.selectAll('.dengue-grid')
            .data(sortedGrids)
            .enter()
            .append('rect')
            .attr('class', 'dengue-grid')
            .attr('x', (d) => scaleX(d.properties.grid_x))
            .attr('y', (d) => scaleY(d.properties.grid_y))
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('fill', (d) => getColorByLevel(d.properties.level))
            .attr('fill-opacity', (d) => getOpacityByLevel(d.properties.level))
            .attr('stroke', 'none')
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
              d3.select(this).attr('fill-opacity', 1);
              if (tooltip) {
                const properties = d.properties;
                // 顯示所有 properties 欄位
                let tooltipHTML = '';
                Object.keys(properties).forEach((key) => {
                  const value = properties[key];
                  tooltipHTML += `<div><strong>${key}:</strong> ${value !== null && value !== undefined ? value : 'N/A'}</div>`;
                });
                tooltip.innerHTML = tooltipHTML;
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
                tooltip.style.opacity = 1;
              }
            })
            .on('mousemove', function (event) {
              if (tooltip) {
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
              }
            })
            .on('mouseout', function (event, d) {
              const level = d.properties.level || 0;
              d3.select(this).attr('fill-opacity', getOpacityByLevel(level));
              if (tooltip) {
                tooltip.style.opacity = 0;
              }
            });

          console.log('[MapTab] 網格繪製完成');
          console.log('  - 網格數量:', sortedGrids.length);
        } catch (error) {
          console.error('[MapTab] 網格繪製失敗:', error);
        }
      };

      /**
       * 🎛️ 切換顯示模式
       * @param {string} mode - 'map' 或 'grid'
       */
      const toggleDisplayMode = async (mode) => {
        displayMode.value = mode;
        console.log('[MapTab] 切換顯示模式:', mode);

        if (displayMode.value === 'map') {
          gridLayoutConfig = null;
          // 地圖模式：需要地圖投影，載入縣市界線和六角形網格
          if (!countyData.value) {
            await loadCountyData();
          }
          if (!hexData.value) {
            await loadHexData();
          }

          // 清除舊的 SVG（如果從其他模式切換過來）
          if (svg && !projection) {
            svg.remove();
            svg = null;
          }

          if (!projection || !path) {
            // 如果還沒有創建地圖，先創建
            const rect = mapContainer.value.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const width = rect.width;
              const height = rect.height;

              // 清除舊的 SVG
              if (svg) {
                svg.remove();
              }

              // 創建 SVG 和地圖投影
              svg = d3
                .select(mapContainer.value)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background', '#ffffff');

              projection = d3.geoMercator();
              if (countyData.value) {
                projection.fitExtent(
                  [
                    [20, 20],
                    [width - 20, height - 20],
                  ],
                  countyData.value
                );
              } else {
                projection
                  .center([121, 25.05])
                  .scale(45000)
                  .translate([width / 2, height / 2]);
              }

              path = d3.geoPath().projection(projection);
              g = svg.append('g');

              zoom = d3
                .zoom()
                .scaleExtent([0.8, 12])
                .on('zoom', (event) => {
                  g.attr('transform', event.transform);
                });

              svg.call(zoom);

              // 重置縮放狀態，確保切換模式時不會受到之前模式的影響
              svg.call(zoom.transform, d3.zoomIdentity);

              createTooltip();
              isMapReady.value = true;
            }
          } else {
            // 如果已經創建了地圖，重置縮放狀態
            if (svg && zoom) {
              svg.call(zoom.transform, d3.zoomIdentity);
            }
          }
          // 繪製縣市界線和六角形網格
          drawCounties();
          drawHexGrid();
        } else {
          // 清除縣市界線數據（不需要）
          countyData.value = null;
          gridLayoutConfig = null;

          // Grid 模式：載入六角形網格數據，使用 grid_x/grid_y 排列
          if (!hexData.value) {
            await loadHexData();
          }

          if (!createGridCanvas()) {
            console.warn('[MapTab] Grid 畫布建立失敗，暫停繪圖');
            return;
          }

          // 繪製六角形網格（Grid 模式，使用 grid_x/grid_y）
          drawHexGridOnly();
        }
      };

      /**
       * 🗺️ 繪製六角形網格（使用大陸地區人民核准定居數據）
       */
      const drawHexGrid = () => {
        if (!g || !hexData.value || !path) {
          console.error(
            '[MapTab] 無法繪製方格: g=',
            !!g,
            'hexData=',
            !!hexData.value,
            'path=',
            !!path
          );
          return;
        }

        try {
          console.log('[MapTab] 開始繪製方格 GeoJSON');

          // 先清除舊的圖層
          g.selectAll('.hex-grid').remove();
          // Map 模式：使用地圖投影繪製（使用 GeoJSON coordinates）
          console.log('[MapTab] 使用 Map 模式繪製（地圖投影）');
          console.log('[MapTab] path generator:', !!path, 'g:', !!g);

          // 直接繪製所有網格（無分類、無填色）
          const hexPaths = g
            .selectAll('.hex-grid')
            .data(hexData.value.features)
            .enter()
            .append('path')
            .attr('d', path)
            .attr('class', 'hex-grid')
            .attr('fill', 'none')
            .attr('stroke', '#999')
            .attr('stroke-width', 0.5)
            .attr('stroke-opacity', 0.7)
            .attr('shape-rendering', 'crispEdges')
            .attr('vector-effect', 'non-scaling-stroke')
            .style('cursor', 'pointer');

          console.log('[DEBUG] 繪製了多少個 path 元素:', hexPaths.size());

          hexPaths
            .on('mouseover', function (event, d) {
              d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2);
              if (tooltip) {
                const properties = d.properties;
                // 顯示所有 properties 欄位
                let tooltipHTML = '';
                Object.keys(properties).forEach((key) => {
                  const value = properties[key];
                  tooltipHTML += `<div><strong>${key}:</strong> ${value !== null && value !== undefined ? value : 'N/A'}</div>`;
                });
                tooltip.innerHTML = tooltipHTML;
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
                tooltip.style.opacity = 1;
              }
            })
            .on('mousemove', function (event) {
              if (tooltip) {
                const [mouseX, mouseY] = d3.pointer(event, mapContainer.value);
                tooltip.style.left = mouseX + 10 + 'px';
                tooltip.style.top = mouseY - 10 + 'px';
              }
            })
            .on('mouseout', function () {
              d3.select(this).attr('fill-opacity', 0.8).attr('stroke-width', 0.5);
              if (tooltip) {
                tooltip.style.opacity = 0;
              }
            });

          console.log('[MapTab] 方格（地圖模式）繪製完成');
          console.log('  - SVG 中的 path 元素數量:', g.selectAll('path').size());
          console.log('  - hex-grid class 元素數量:', g.selectAll('.hex-grid').size());

          // 在每個方格中心繪製借車/還車角度箭頭
          drawAngleArrows();
        } catch (error) {
          console.error('[MapTab] 方格繪製失敗:', error);
        }
      };

      // （已移除）原本用於除錯的紅點顯示函數 drawGridCentroids

      // 已移除：原 SVG marker 箭頭尖端

      /**
       * 🧭 在每個網格的中心畫出借車/還車角度的箭頭
       * - 借車：綠色，使用 marker 'arrow-borrow'
       * - 還車：藍色，使用 marker 'arrow-return'
       *
       * 網格模式：使用 grid_x/grid_y 計算格心（直接轉換為 SVG 座標）
       * 地圖模式：使用 grid_x/grid_y 計算格心，但透過 GeoJSON coordinates 的中心點經過 projection 轉換
       */
      const drawAngleArrows = () => {
        if (!g || !hexData.value) return;

        const isGridMode = displayMode.value === 'grid';

        // 先清除舊的箭頭
        g.selectAll('.angle-arrows').remove();

        const arrowsGroup = g
          .append('g')
          .attr('class', 'angle-arrows')
          .attr('pointer-events', 'none');

        // 確保箭頭圖層在最上層
        if (arrowsGroup.raise) arrowsGroup.raise();

        const features = hexData.value.features || [];

        let validBorrow = 0;
        let validReturn = 0;
        let sampleCentroids = [];

        features.forEach((feature, idx) => {
          const borrowDeg = feature.properties?.['借車角度平均'];
          const returnDeg = feature.properties?.['還車角度平均'];
          const gridX = feature?.properties?.grid_x;
          const gridY = feature?.properties?.grid_y;

          if (!Number.isFinite(gridX) || !Number.isFinite(gridY)) return;

          let cx, cy;
          let arrowLengthForFeature = 12;

          if (isGridMode && gridLayoutConfig) {
            // 網格模式：使用 grid_x/grid_y 直接計算 SVG 座標
            const { cellSize, offsetX, offsetY, minX, maxY } = gridLayoutConfig;
            cx = offsetX + (gridX - minX + 0.5) * cellSize;
            cy = offsetY + (maxY - gridY + 0.5) * cellSize;
            arrowLengthForFeature = Math.max(Math.min((cellSize || 0) * 0.42, 22), 5);
          } else if (projection && path) {
            // 地圖模式：從 GeoJSON coordinates 計算 polygon 中心，透過 projection 轉換
            try {
              // 使用 d3.geoCentroid 從 GeoJSON coordinates 計算地理中心
              const centroid = d3.geoCentroid(feature);
              const projected = projection(centroid);
              cx = projected?.[0];
              cy = projected?.[1];

              // 如果 geoCentroid 失敗，回退到 path.centroid
              if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
                [cx, cy] = path.centroid(feature);
              }

              // 根據 polygon 大小計算箭頭長度
              if (Number.isFinite(cx) && Number.isFinite(cy)) {
                try {
                  const bounds = path.bounds(feature);
                  if (bounds && bounds.length === 2) {
                    const width = Math.abs(bounds[1][0] - bounds[0][0]);
                    const height = Math.abs(bounds[1][1] - bounds[0][1]);
                    const minSize = Math.min(width, height);
                    if (Number.isFinite(minSize) && minSize > 0) {
                      arrowLengthForFeature = Math.max(Math.min(minSize * 0.4, 26), 6);
                    } else {
                      arrowLengthForFeature = 14;
                    }
                  }
                } catch (err) {
                  arrowLengthForFeature = 14;
                }
              }
            } catch (e) {
              try {
                [cx, cy] = path.centroid(feature);
                arrowLengthForFeature = 14;
              } catch (err) {
                console.warn('Centroid calculation failed:', err);
                return;
              }
            }
          } else {
            return;
          }

          if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
            return;
          }

          // 記錄前幾個 centroid 位置用於調試
          if (idx < 5 && (borrowDeg || returnDeg)) {
            sampleCentroids.push({ gridX, gridY, cx, cy, borrowDeg, returnDeg });
          }

          const drawOneArrow = (deg, color, markerId, offsetSign, pointToCenter = false) => {
            if (deg === null || deg === undefined || Number.isNaN(deg)) return;
            // 以指南針角度為準：正上方=0°，順時針增加
            const rad = ((deg - 90) * Math.PI) / 180;
            const dx = Math.cos(rad) * arrowLengthForFeature;
            const dy = Math.sin(rad) * arrowLengthForFeature;

            const ox = 0;
            const oy = 0;

            const x1 = pointToCenter ? cx + ox - dx : cx + ox;
            const y1 = pointToCenter ? cy + oy - dy : cy + oy;
            const x2 = pointToCenter ? cx + ox : cx + ox + dx;
            const y2 = pointToCenter ? cy + oy : cy + oy + dy;

            arrowsGroup
              .append('line')
              .attr('x1', x1)
              .attr('y1', y1)
              .attr('x2', x2)
              .attr('y2', y2)
              .style('stroke', color)
              .attr('stroke-width', Math.max(arrowLengthForFeature * 0.12, 1.6))
              .attr('stroke-linecap', 'round')
              .attr('stroke-opacity', 1)
              .attr('class', 'angle-arrow');
          };

          // 借車角度箭頭（綠）從中心朝外
          const beforeB = arrowsGroup.selectAll('.angle-arrow').size();
          if (borrowDeg !== null && borrowDeg !== undefined && !Number.isNaN(borrowDeg)) {
            drawOneArrow(borrowDeg, '#4caf50', 'arrow-borrow', 1, false);
          }
          const afterB = arrowsGroup.selectAll('.angle-arrow').size();
          if (afterB > beforeB) validBorrow++;

          // 還車角度箭頭（藍）朝向中心
          const beforeR = arrowsGroup.selectAll('.angle-arrow').size();
          if (returnDeg !== null && returnDeg !== undefined && !Number.isNaN(returnDeg)) {
            drawOneArrow(returnDeg + 180, '#0068b7', 'arrow-return', -1, true);
          }
          const afterR = arrowsGroup.selectAll('.angle-arrow').size();
          if (afterR > beforeR) validReturn++;
        });

        let bbox = null;
        try {
          bbox = arrowsGroup.node()?.getBBox?.();
        } catch (e) {
          bbox = null;
        }

        // 將箭頭圖層再次置頂
        if (arrowsGroup.raise) arrowsGroup.raise();

        console.log('[MapTab] 角度箭頭繪製完成', {
          mode: isGridMode ? 'grid' : 'map',
          features: features.length,
          validBorrow,
          validReturn,
          totalArrows: arrowsGroup.selectAll('.angle-arrow').size(),
          bbox,
          sampleCentroids,
        });
      };

      // 圖例功能已移除（不再進行分類著色）

      /**
       * 🏗️ 創建地圖實例
       * 初始化 D3.js 地圖並設定基本配置
       */
      const createMap = (fitFeature = null) => {
        if (!mapContainer.value) return false;

        const rect = mapContainer.value.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[MapTab] 容器尺寸為零，延遲初始化');
          return false;
        }

        try {
          const width = rect.width;
          const height = rect.height;

          // 台灣中心位置：緯度 23.5°, 經度 121°

          // 創建 SVG 元素
          svg = d3
            .select(mapContainer.value)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background', '#ffffff'); // 白色背景

          // 創建投影 - 若有資料則自動貼齊區界（含 20px 邊距）
          projection = d3.geoMercator();
          if (fitFeature) {
            projection.fitExtent(
              [
                [20, 20],
                [width - 20, height - 20],
              ],
              fitFeature
            );
          } else {
            projection
              .center([121, 25.05])
              .scale(45000)
              .translate([width / 2, height / 2]);
          }

          // 創建路徑生成器
          path = d3.geoPath().projection(projection);

          // 創建容器組
          g = svg.append('g');

          // 設置縮放行為
          zoom = d3
            .zoom()
            .scaleExtent([0.8, 12])
            .on('zoom', (event) => {
              g.attr('transform', event.transform);
            });

          svg.call(zoom);

          // 重置縮放狀態，確保切換模式時不會受到之前模式的影響
          svg.call(zoom.transform, d3.zoomIdentity);

          // 創建工具提示元素
          createTooltip();

          isMapReady.value = true;

          // 將地圖實例傳遞給父組件
          emit('map-ready', { svg, projection, path });

          console.log('[MapTab] D3.js 地圖創建成功');
          return true;
        } catch (error) {
          console.error('[MapTab] D3.js 地圖創建失敗:', error);
          return false;
        }
      };

      /**
       * 🚀 初始化地圖
       * 根據初始顯示模式創建對應的視圖
       */
      const initMap = async () => {
        let attempts = 0;
        const maxAttempts = 20;

        // 根據顯示模式載入不同的數據
        if (displayMode.value === 'map') {
          // 地圖模式：需要載入縣市界線和六角形網格數據
          console.log('[MapTab] 開始載入地圖模式數據...');
          const [countyLoaded, hexLoaded] = await Promise.all([loadCountyData(), loadHexData()]);

          if (!countyLoaded) {
            console.error('[MapTab] 無法載入直轄市、縣(市)界線數據');
            return;
          }

          if (!hexLoaded) {
            console.error('[MapTab] 無法載入六角形網格數據');
            return;
          }

          console.log('[MapTab] 所有數據載入完成，開始創建地圖');

          const tryCreateMap = async () => {
            if (attempts >= maxAttempts) {
              console.error('[MapTab] 地圖初始化失敗，已達到最大嘗試次數');
              return;
            }

            attempts++;
            console.log(`[MapTab] 嘗試創建地圖 (${attempts}/${maxAttempts})`);

            if (createMap(countyData.value)) {
              console.log('[MapTab] 地圖創建成功，開始繪製圖層');
              // 先繪製縣市界線（底層）
              drawCounties();
              // 再繪製六角形網格（上層）
              drawHexGrid();
            } else {
              console.log('[MapTab] 地圖創建失敗，100ms 後重試');
              setTimeout(tryCreateMap, 100);
            }
          };

          tryCreateMap();
        } else {
          // Grid 模式：需要載入六角形網格數據，需要地圖投影來繪製
          console.log('[MapTab] 開始載入網格模式數據...');
          const hexLoaded = await loadHexData();

          if (!hexLoaded) {
            console.error('[MapTab] 無法載入六角形網格數據');
            return;
          }

          console.log('[MapTab] 數據載入完成，開始創建網格視圖');

          const tryCreateGrid = async () => {
            if (attempts >= maxAttempts) {
              console.error('[MapTab] 網格初始化失敗，已達到最大嘗試次數');
              return;
            }

            attempts++;
            console.log(`[MapTab] 嘗試創建網格視圖 (${attempts}/${maxAttempts})`);

            if (createMap()) {
              console.log('[MapTab] 網格視圖創建成功，開始繪製六角形網格');
              drawHexGridOnly();
            } else {
              console.log('[MapTab] 網格視圖創建失敗，100ms 後重試');
              setTimeout(tryCreateGrid, 100);
            }
          };

          tryCreateGrid();
        }
      };

      // 處理窗口大小調整（重新繪製整個地圖）
      let resizeTimer = null;
      const handleResize = () => {
        // 防抖處理，避免頻繁重繪
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          console.log('[MapTab] 窗口大小調整，重新繪製地圖');
          initMap();
        }, 300);
      };

      // 🧹 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          initMap();
        });

        // 監聽窗口大小調整
        window.addEventListener('resize', handleResize);
      });

      // 🧹 生命週期：組件卸載
      onUnmounted(() => {
        // 清除 resize timer
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }

        // 移除 resize 監聽器
        window.removeEventListener('resize', handleResize);

        if (svg) {
          svg.remove();
          svg = null;
        }

        // 清理工具提示
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }

        projection = null;
        path = null;
        zoom = null;
        g = null;
        isMapReady.value = false;
      });

      // 📤 返回組件公開的屬性和方法
      return {
        mapContainer,
        mapContainerId,
        displayMode,
        toggleDisplayMode,
      };
    },
  };
</script>

<template>
  <!-- 🗺️ 地圖主容器 -->
  <div id="map-container" class="h-100 w-100 position-relative bg-transparent z-0">
    <!-- 🗺️ Leaflet 地圖容器 -->
    <div :id="mapContainerId" ref="mapContainer" class="h-100 w-100"></div>

    <!-- 🎛️ 左側中間控制面板 -->
    <div
      class="position-absolute"
      style="top: 50%; left: 0; transform: translateY(-50%); z-index: 1000; padding: 1rem"
    >
      <div class="bg-dark bg-opacity-75 rounded-3 p-3">
        <!-- 🎛️ 顯示模式選擇區域 -->
        <div class="">
          <div class="d-flex flex-column gap-1">
            <button
              type="button"
              class="btn border-0 my-country-btn my-font-sm-white px-4 py-3"
              :class="[displayMode === 'map' ? 'active' : '']"
              @click="toggleDisplayMode('map')"
            >
              地圖模式
            </button>
            <button
              type="button"
              class="btn border-0 my-country-btn my-font-sm-white px-4 py-3"
              :class="[displayMode === 'grid' ? 'active' : '']"
              @click="toggleDisplayMode('grid')"
            >
              網格模式
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  @import '../assets/css/common.css';

  #map-container {
    overflow: hidden;
  }

  :deep(.leaflet-container) {
    background: #ffffff; /* 白色背景 */
  }

  :deep(.leaflet-popup-content-wrapper) {
    background: rgba(0, 43, 127, 0.95); /* 諾魯深藍色半透明 */
    color: #ffc61e; /* 金黃色文字 */
    border: 2px solid #ffc61e; /* 金黃色邊框 */
  }

  :deep(.leaflet-popup-tip) {
    background: rgba(0, 43, 127, 0.95); /* 諾魯深藍色半透明 */
  }

  :deep(.leaflet-tooltip) {
    background-color: rgba(0, 43, 127, 0.95) !important; /* 諾魯深藍色 */
    color: #ffc61e !important; /* 金黃色文字 */
    border: 1px solid #ffc61e !important; /* 金黃色邊框 */
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 4px;
    line-height: 1.4;
  }

  :deep(.map-tooltip) {
    background-color: #333; /* 深灰色背景 */
    color: #fff; /* 白色文字 */
    border: none; /* 無邊框 */
  }
</style>

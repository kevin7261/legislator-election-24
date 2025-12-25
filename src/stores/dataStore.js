/**
 * 📦 數據存儲模組 (Data Store Module)
 *
 * 管理城市圖層數據和地圖導航功能
 * 使用 Pinia 狀態管理系統和 Vue 3 Composition API
 */

// 核心依賴
import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as d3 from 'd3';

/**
 * 🏪 數據存儲商店定義 (Data Store Definition)
 *
 * 使用 Pinia 的 defineStore 創建一個名為 'data' 的狀態管理商店。
 * 採用 Composition API 語法，提供更好的 TypeScript 支援和代碼組織。
 *
 * @returns {Object} 包含所有狀態和方法的商店對象
 */
export const useDataStore = defineStore(
  'data',
  () => {
    // ------------------------------------------------------------
    // 地圖實例管理
    const mapInstance = ref(null);

    const setMapInstance = (map) => {
      mapInstance.value = map;
    };

    // ------------------------------------------------------------
    // 當選立委數據管理
    const electedLegislators = ref([]);
    const isLoadingLegislators = ref(false);
    const legislatorsError = ref(null);

    /**
     * 載入當選立委 CSV 數據
     * @returns {Promise<void>}
     */
    const loadElectedLegislators = async () => {
      if (isLoadingLegislators.value) return;
      if (electedLegislators.value.length > 0) return; // 已載入則不重複載入

      isLoadingLegislators.value = true;
      legislatorsError.value = null;

      try {
        const data = await d3.csv('/data/csv/elected_legislators_final.csv');

        // 將得票數轉換為數字
        const processedData = data.map((d) => ({
          ...d,
          得票數: d.得票數 ? parseInt(d.得票數, 10) : 0,
        }));

        electedLegislators.value = processedData;

        // eslint-disable-next-line no-console
        console.log('[DataStore] 當選立委數據載入完成，共', processedData.length, '筆');
      } catch (error) {
        legislatorsError.value = error;
        // eslint-disable-next-line no-console
        console.error('[DataStore] 載入當選立委數據失敗:', error);
      } finally {
        isLoadingLegislators.value = false;
      }
    };

    return {
      // 地圖實例
      mapInstance,
      setMapInstance,

      // 當選立委數據
      electedLegislators,
      isLoadingLegislators,
      legislatorsError,
      loadElectedLegislators,
    };
  },
  {
    persist: true,
  }
);

<script>
  /**
   * 🏛️ MapTab.vue - 議會席位圖組件
   *
   * 使用 D3.js 繪製半圓形議會席位圖，共 79 席
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';

  export default {
    name: 'MapTab',
    setup() {
      const containerRef = ref(null);
      let svg = null;
      let g = null;

      /**
       * 計算半圓形排列的席位位置
       * @returns {Array} 席位數據陣列，每個元素包含 { x, y, angle, row, index }
       */
      const calculateSeatPositions = () => {
        const seats = [];
        const centerX = 0;
        const centerY = 0;

        // 定義每排的席數，形成半圓形排列（參考圖片樣式）
        // 從內排到外排，席數逐漸增加：5, 7, 9, 11, 13, 15, 19 = 79 席
        const seatsPerRow = [5, 7, 9, 11, 13, 15, 19];

        let seatIndex = 0;
        const baseRadius = 60; // 第一排（最內排）的基礎半徑
        const radiusStep = 50; // 每排半徑增加量

        seatsPerRow.forEach((seatsInRow, rowIndex) => {
          const radius = baseRadius + rowIndex * radiusStep;

          // 計算角度範圍：完整的半圓形（180度），從左到右
          const angleSpan = Math.PI; // 完整的半圓
          const startAngle = Math.PI; // 從左邊開始 (180度)
          const angleStep = angleSpan / (seatsInRow + 1); // 均勻分佈，留出邊距

          for (let i = 0; i < seatsInRow; i++) {
            const angle = startAngle + angleStep * (i + 1);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            seats.push({
              x,
              y,
              angle: (angle * 180) / Math.PI, // 轉換為度數
              row: rowIndex,
              index: seatIndex,
              id: seatIndex + 1,
            });

            seatIndex++;
          }
        });

        return seats;
      };

      /**
       * 繪製議會席位圖
       */
      const drawParliamentSeats = () => {
        if (!containerRef.value) return;

        // 清除舊的 SVG
        if (svg) {
          svg.remove();
        }

        const container = containerRef.value;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // 計算縮放和居中
        const seats = calculateSeatPositions();

        // 計算所有席位的邊界
        const xExtent = d3.extent(seats, (d) => d.x);
        const yExtent = d3.extent(seats, (d) => d.y);
        const extentWidth = xExtent[1] - xExtent[0];
        const extentHeight = yExtent[1] - yExtent[0];

        // 添加邊距
        const padding = 100;
        const availableWidth = width - padding * 2;
        const availableHeight = height - padding * 2;

        // 計算縮放比例
        const scale = Math.min(availableWidth / extentWidth, availableHeight / extentHeight) * 0.9; // 稍微縮小一點，留出更多空間

        // 計算偏移量（居中）
        const centerX = width / 2;
        const centerY = height / 2;
        const offsetX = centerX - ((xExtent[0] + xExtent[1]) / 2) * scale;
        const offsetY = centerY - ((yExtent[0] + yExtent[1]) / 2) * scale;

        // 創建 SVG（黑色背景）
        svg = d3
          .select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', '#000000');

        // 創建主容器組
        g = svg.append('g').attr('transform', `translate(${offsetX}, ${offsetY}) scale(${scale})`);

        // 繪製席位（統一顏色，參考圖片樣式）
        const seatRadius = 8; // 較小的圓點，類似圖片
        const seatGroup = g.append('g').attr('class', 'seats');

        seatGroup
          .selectAll('.seat')
          .data(seats)
          .enter()
          .append('circle')
          .attr('class', 'seat')
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('r', seatRadius)
          .attr('fill', '#4a90e2') // 統一顏色，後續可根據需要分組
          .attr('stroke', 'none')
          .attr('cursor', 'pointer')
          .on('mouseover', function () {
            d3.select(this).attr('fill', '#6ba3e8').attr('opacity', 0.8);
          })
          .on('mouseout', function () {
            d3.select(this).attr('fill', '#4a90e2').attr('opacity', 1);
          });

        console.log('[MapTab] 議會席位圖繪製完成，共', seats.length, '席');
      };

      /**
       * 處理窗口大小調整
       */
      let resizeTimer = null;
      const handleResize = () => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          console.log('[MapTab] 窗口大小調整，重新繪製席位圖');
          drawParliamentSeats();
        }, 300);
      };

      // 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          drawParliamentSeats();
        });
        window.addEventListener('resize', handleResize);
      });

      // 生命週期：組件卸載
      onUnmounted(() => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        window.removeEventListener('resize', handleResize);

        if (svg) {
          svg.remove();
          svg = null;
        }
        g = null;
      });

      return {
        containerRef,
      };
    },
  };
</script>

<template>
  <div ref="containerRef" class="parliament-container"></div>
</template>

<style scoped>
  @import '../assets/css/common.css';

  .parliament-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000000;
  }
</style>

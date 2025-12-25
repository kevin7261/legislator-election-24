<script>
  /**
   * ▢ RectView.vue - 方形議會席位圖
   *
   * 使用 D3.js 繪製方形網格議會席位圖
   * 三個網格群，每個 6*7，政黨顏色區分
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  import AppLayout from '../components/AppLayout.vue';

  export default {
    name: 'RectView',
    components: { AppLayout },
    setup() {
      const containerRef = ref(null);
      let svg = null;
      const candidateData = ref([]);

      // 政黨資料
      const partyData = [
        { id: 'IND', name: '無黨籍', count: 2, color: '#95A5A6' }, // 優雅的灰色
        { id: 'DPP', name: '民進黨', count: 38, color: '#6BCB77' }, // 清新的綠色
        { id: 'KMT', name: '國民黨', count: 39, color: '#4D96FF' }, // 明亮的藍色
      ];

      // ⚙️ 面積計算配置：面積 = 得票數 / areaDivisor
      const areaDivisor = 18;

      // 網格配置：每個網格群 6*7 = 42 個格子
      const gridCols = 6;
      const gridRows = 7;
      const gridSize = gridCols * gridRows; // 42

      // 截取名字的第一個空白前的部分
      const getShortName = (name) => {
        if (!name) return '';
        const firstSpaceIndex = name.indexOf(' ');
        if (firstSpaceIndex > 0) {
          return name.substring(0, firstSpaceIndex);
        }
        return name;
      };

      // 政黨名稱對應
      const partyNameMap = {
        民主進步黨: 'DPP',
        中國國民黨: 'KMT',
        無: 'IND',
      };

      /**
       * 讀取 CSV 資料並排序
       */
      const loadCandidateData = async () => {
        try {
          const data = await d3.csv(
            '/legislator-election-24/data/csv/elected_legislators_final.csv'
          );

          // 將得票數轉換為數字
          data.forEach((d) => {
            d.得票數 = +d.得票數;
            d.partyId = partyNameMap[d.推薦之政黨] || 'IND';
          });

          // 按照政黨和得票數排序
          data.sort((a, b) => {
            // 先按政黨排序（無黨籍、民進黨、國民黨）
            const partyOrder = { IND: 0, DPP: 1, KMT: 2 };
            const partyDiff = partyOrder[a.partyId] - partyOrder[b.partyId];
            if (partyDiff !== 0) return partyDiff;

            // 同政黨內按得票數降序排序
            return b.得票數 - a.得票數;
          });

          candidateData.value = data;
          return data;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('讀取 CSV 資料失敗:', error);
          return [];
        }
      };

      /**
       * 繪製方形網格議會席位圖
       */
      const drawRectSeats = async () => {
        if (!containerRef.value) return;

        // 讀取候選人資料
        const candidates = await loadCandidateData();
        if (candidates.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('無法讀取候選人資料，使用預設編號');
        }

        // 清除舊的 SVG
        if (svg) {
          svg.remove();
        }

        const container = containerRef.value;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // 計算總席位數
        const totalSeats = d3.sum(partyData, (d) => d.count);

        // 三個網格群的配置
        const numGrids = 3;
        const gridSpacing = 40; // 網格群之間的間距
        const padding = 60; // 整體邊距

        // 計算每個網格群的大小
        const availableWidth = width - padding * 2 - gridSpacing * (numGrids - 1);
        const gridWidth = availableWidth / numGrids;
        const gridHeight = height - padding * 2;

        // 計算每個方塊的大小（考慮間距）
        const cellPadding = 4;
        const cellWidth = (gridWidth - cellPadding * (gridCols + 1)) / gridCols;
        const cellHeight = (gridHeight - cellPadding * (gridRows + 1)) / gridRows;

        // 分配席位到三個網格群
        // 網格群1：民進黨 38 個
        // 網格群2：國民黨 39 個 + 無黨籍 2 個 = 41 個
        // 網格群3：留空或顯示總數

        const gridAssignments = [
          {
            party: 'DPP',
            count: partyData[1].count, // 38
            startIndex: 0,
          },
          {
            party: 'KMT',
            count: partyData[2].count, // 39
            startIndex: partyData[1].count, // 38
          },
          {
            party: 'IND',
            count: partyData[0].count, // 2
            startIndex: partyData[1].count + partyData[2].count, // 77
          },
        ];

        // 準備所有席位的資料
        const allSeats = [];
        let globalIndex = 0;

        gridAssignments.forEach((assignment, gridIndex) => {
          const party = partyData.find((p) => p.id === assignment.party);
          const partyCandidates = candidates.filter((c) => c.partyId === assignment.party);

          // 在該網格群內分配席位
          for (let i = 0; i < assignment.count && i < gridSize; i++) {
            const row = Math.floor(i / gridCols);
            const col = i % gridCols;

            const candidate = partyCandidates[i] || null;

            allSeats.push({
              gridIndex,
              row,
              col,
              party: party.id,
              partyName: party.name,
              color: party.color,
              candidateName: candidate ? candidate.候選人姓名 : `編號${i + 1}`,
              votes: candidate ? candidate.得票數 : 0,
              rank: i + 1,
            });

            globalIndex++;
          }
        });

        // 計算每個方塊的大小（根據得票數）
        const baseSize = Math.min(cellWidth, cellHeight) * 0.9; // 預設大小
        allSeats.forEach((seat) => {
          if (seat.votes && seat.votes > 0) {
            // 面積 = 得票數 / areaDivisor
            // 方形面積 = side²，所以 side = √(得票數 / areaDivisor)
            const area = seat.votes / areaDivisor;
            seat.size = Math.sqrt(area);
            // 限制最大和最小尺寸
            seat.size = Math.max(seat.size, baseSize * 0.3);
            seat.size = Math.min(seat.size, baseSize);
          } else {
            seat.size = baseSize * 0.5;
          }
        });

        // 創建 SVG
        svg = d3
          .select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', '#FFFFFF');

        // 創建主容器組，水平垂直置中
        const g = svg.append('g').attr('transform', `translate(${padding}, ${padding})`);

        // 繪製三個網格群
        gridAssignments.forEach((assignment, gridIndex) => {
          const gridX = gridIndex * (gridWidth + gridSpacing);
          const gridG = g.append('g').attr('transform', `translate(${gridX}, 0)`);

          // 繪製該網格群的席位
          const gridSeats = allSeats.filter((s) => s.gridIndex === gridIndex);

          gridSeats.forEach((seat) => {
            const x = seat.col * (cellWidth + cellPadding) + cellPadding + cellWidth / 2;
            const y = seat.row * (cellHeight + cellPadding) + cellPadding + cellHeight / 2;

            const seatGroup = gridG
              .append('g')
              .attr('class', 'seat-group')
              .attr('transform', `translate(${x}, ${y})`);

            // 繪製方形（使用政黨顏色）
            seatGroup
              .append('rect')
              .attr('class', 'seat-rect')
              .attr('x', -seat.size / 2)
              .attr('y', -seat.size / 2)
              .attr('width', seat.size)
              .attr('height', seat.size)
              .attr('fill', seat.color)
              .attr('opacity', 0.5)
              .attr('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.7);
              })
              .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.5);
              });

            // 字體設定
            const nameFontSize = 14;
            const fontFamily =
              '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';
            const textColor = '#333333';

            // 繪製姓名（居中）
            seatGroup
              .append('text')
              .attr('class', 'seat-name')
              .attr('text-anchor', 'middle')
              .attr('x', 0)
              .attr('y', 0)
              .style('font-size', `${nameFontSize}px`)
              .style('font-weight', '700')
              .style('font-family', fontFamily)
              .style('fill', textColor)
              .style('letter-spacing', '0.3px')
              .style('pointer-events', 'none')
              .style('dominant-baseline', 'middle')
              .text(getShortName(seat.candidateName || ''));
          });
        });

        // 繪製總席次（在底部中央）
        const totalSeatsFontSize = 48;
        const fontFamily =
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';
        svg
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('x', width / 2)
          .attr('y', height - 20)
          .style('font-size', `${totalSeatsFontSize}px`)
          .style('font-weight', '700')
          .style('font-family', fontFamily)
          .style('fill', '#1a1a1a')
          .style('letter-spacing', '2px')
          .style('opacity', 0.85)
          .text(totalSeats);

        // eslint-disable-next-line no-console
        console.log('[RectView] 方形網格議會席位圖繪製完成，共', totalSeats, '席');
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
          drawRectSeats();
        }, 300);
      };

      // 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          drawRectSeats();
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
      });

      return {
        containerRef,
      };
    },
  };
</script>

<template>
  <AppLayout>
    <div ref="containerRef" class="rect-container"></div>
  </AppLayout>
</template>

<style scoped>
  .rect-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.seat-group) {
    transition: all 0.2s ease;
  }

  :deep(.seat-rect:hover) {
    filter: brightness(1.2);
  }

  :deep(.seat-name) {
    user-select: none;
  }
</style>


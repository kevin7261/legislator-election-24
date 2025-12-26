<script>
  /**
   * 📦 TreemapView.vue - 樹狀圖議會席位圖
   *
   * 使用 D3.js 繪製樹狀圖（Treemap）
   * 三個政黨分組，每個候選人顯示為方塊
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  import AppLayout from '../components/AppLayout.vue';

  export default {
    name: 'TreemapView',
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
       * 繪製樹狀圖
       */
      const drawTreemap = async () => {
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

        // 佈局參數
        const padding = { top: 60, right: 20, bottom: 60, left: 20 };

        // 準備樹狀圖資料結構
        const root = {
          name: 'root',
          children: partyData.map((party) => {
            const partyCandidates = candidates.filter((c) => c.partyId === party.id);
            return {
              name: party.name,
              partyId: party.id,
              color: party.color,
              children: partyCandidates.slice(0, party.count).map((c, i) => ({
                name: c.候選人姓名,
                value: c.得票數 || 1, // 得票數作為方塊大小
                rank: i + 1,
                district: `${c.縣市}${c.選舉區別}`,
                votes: c.得票數,
                partyId: party.id,
                partyColor: party.color,
              })),
            };
          }),
        };

        // 創建層次結構
        const hierarchy = d3.hierarchy(root).sum((d) => d.value);

        // 創建 treemap 布局
        const treemap = d3
          .treemap()
          .size([width - padding.left - padding.right, height - padding.top - padding.bottom])
          .paddingInner(2)
          .paddingOuter(4)
          .paddingTop(30); // 為政黨標籤留空間

        // 計算布局
        treemap(hierarchy);

        // 創建 SVG
        svg = d3
          .select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', '#FFFFFF');

        // 創建 tooltip
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'seat-tooltip')
          .style('position', 'absolute')
          .style('padding', '12px 16px')
          .style('background', 'rgba(0, 0, 0, 0.85)')
          .style('color', '#ffffff')
          .style('border-radius', '8px')
          .style('font-size', '14px')
          .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', 1000)
          .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.3)');

        // 創建主容器組
        const g = svg.append('g').attr('transform', `translate(${padding.left}, ${padding.top})`);

        // 繪製政黨分組
        const partyGroups = g
          .selectAll('.party-group')
          .data(hierarchy.children)
          .enter()
          .append('g')
          .attr('class', 'party-group');

        // 繪製每個候選人的方塊
        const candidateNodes = partyGroups
          .selectAll('.candidate-node')
          .data((d) => d.children)
          .enter()
          .append('g')
          .attr('class', 'candidate-node')
          .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

        // 繪製方塊
        candidateNodes
          .append('rect')
          .attr('width', (d) => d.x1 - d.x0)
          .attr('height', (d) => d.y1 - d.y0)
          .attr('fill', (d) => d.data.partyColor)
          .attr('opacity', 0.5)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .attr('cursor', 'pointer')
          .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 0.7);

            // 顯示 tooltip
            const tooltipContent = [
              `<div style="font-weight: 700; margin-bottom: 4px;">${d.data.name || ''}</div>`,
              d.data.district ? `<div style="margin-bottom: 4px;">選區：${d.data.district}</div>` : '',
              d.data.rank ? `<div style="margin-bottom: 4px;">排名：第 ${d.data.rank} 名</div>` : '',
              d.data.votes ? `<div>得票數：${d.data.votes.toLocaleString('zh-TW')} 票</div>` : '',
            ].filter(Boolean).join('');

            tooltip.html(tooltipContent).style('opacity', 1);
          })
          .on('mousemove', function (event) {
            tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY - 10}px`);
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.5);
            tooltip.style('opacity', 0);
          });

        // 繪製候選人姓名（只在方塊足夠大時顯示）
        const nameFontSize = 12;
        const fontFamily =
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';

        candidateNodes
          .filter((d) => d.x1 - d.x0 > 60 && d.y1 - d.y0 > 30) // 只在方塊足夠大時顯示文字
          .append('text')
          .attr('x', (d) => (d.x1 - d.x0) / 2)
          .attr('y', (d) => (d.y1 - d.y0) / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', `${nameFontSize}px`)
          .style('font-weight', '700')
          .style('font-family', fontFamily)
          .style('fill', '#333333')
          .style('pointer-events', 'none')
          .text((d) => getShortName(d.data.name || ''));

        // 繪製政黨標籤（在每個政黨區域的上方）
        partyGroups
          .append('text')
          .attr('x', (d) => {
            // 找到該政黨第一個子節點的 x 位置
            const firstChild = d.children[0];
            return firstChild ? firstChild.x0 : 0;
          })
          .attr('y', (d) => {
            const firstChild = d.children[0];
            return firstChild ? firstChild.y0 - 5 : 0;
          })
          .attr('font-size', '16px')
          .attr('font-weight', '600')
          .attr('font-family', fontFamily)
          .attr('fill', '#333333')
          .text((d) => d.data.name);

        // 繪製總席次（在底部中央）
        const totalSeatsFontSize = 48;
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
        console.log('[TreemapView] 樹狀圖繪製完成，共', totalSeats, '席');
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
          drawTreemap();
        }, 300);
      };

      // 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          drawTreemap();
        });
        window.addEventListener('resize', handleResize);
      });

      // 生命週期：組件卸載
      onUnmounted(() => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        window.removeEventListener('resize', handleResize);

        // 移除 tooltip
        d3.selectAll('.seat-tooltip').remove();

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
    <div ref="containerRef" class="treemap-container"></div>
  </AppLayout>
</template>

<style scoped>
  .treemap-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.candidate-node) {
    transition: all 0.2s ease;
  }

  :deep(.candidate-node rect:hover) {
    filter: brightness(1.2);
  }

  :deep(.candidate-node text) {
    user-select: none;
  }
</style>


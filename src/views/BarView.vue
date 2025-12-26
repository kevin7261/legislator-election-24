<script>
  /**
   * 📊 BarView.vue - 橫向長條圖議會席位圖
   *
   * 使用 D3.js 繪製橫向長條圖
   * 三個政黨分組，每個長條顯示候選人
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  import AppLayout from '../components/AppLayout.vue';

  export default {
    name: 'BarView',
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
       * 繪製橫向長條圖
       */
      const drawBarChart = async () => {
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
        const padding = { top: 60, right: 40, bottom: 60, left: 40 };
        const partySpacing = 40; // 政黨之間的間距
        const barSpacing = 4; // 長條之間的間距
        const availableHeight = height - padding.top - padding.bottom - partySpacing * (partyData.length - 1);

        // 為每個政黨分配候選人
        const partyGroups = partyData.map((party) => {
          const partyCandidates = candidates.filter((c) => c.partyId === party.id);
          return {
            ...party,
            candidates: partyCandidates.slice(0, party.count).map((c, i) => ({
              name: c.候選人姓名,
              votes: c.得票數,
              rank: i + 1,
              district: `${c.縣市}${c.選舉區別}`,
            })),
          };
        });

        // 計算每個政黨區域的高度
        const partyHeights = partyGroups.map((party) => {
          // 每個政黨的高度 = (可用高度 / 總席位數) * 該政黨的席位數
          return (availableHeight / totalSeats) * party.count;
        });

        // 計算每個長條的寬度（根據得票數）
        const maxVotes = d3.max(candidates, (d) => d.得票數) || 1;
        const availableWidth = width - padding.left - padding.right;
        const maxBarWidth = availableWidth * 0.8; // 最大長條寬度為可用寬度的80%

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

        let currentY = 0;

        // 繪製每個政黨的長條圖
        partyGroups.forEach((party, partyIndex) => {
          const partyHeight = partyHeights[partyIndex];
          const partyG = g.append('g').attr('transform', `translate(0, ${currentY})`);

          // 繪製政黨標籤
          partyG
            .append('text')
            .attr('x', -10)
            .attr('y', partyHeight / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
            .style('fill', '#333333')
            .text(party.name);

          // 計算每個長條的高度
          const barHeight = (partyHeight - barSpacing * (party.candidates.length - 1)) / party.candidates.length;

          // 繪製每個候選人的長條
          party.candidates.forEach((candidate, candidateIndex) => {
            const barY = candidateIndex * (barHeight + barSpacing);
            const barWidth = candidate.votes > 0
              ? (candidate.votes / maxVotes) * maxBarWidth
              : maxBarWidth * 0.1; // 如果沒有得票數，使用最小寬度

            const barGroup = partyG
              .append('g')
              .attr('transform', `translate(0, ${barY})`);

            // 繪製長條背景
            barGroup
              .append('rect')
              .attr('x', 0)
              .attr('y', 0)
              .attr('width', barWidth)
              .attr('height', barHeight)
              .attr('fill', party.color)
              .attr('opacity', 0.5)
              .attr('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.7);

                // 顯示 tooltip
                const tooltipContent = [
                  `<div style="font-weight: 700; margin-bottom: 4px;">${candidate.name || ''}</div>`,
                  candidate.district ? `<div style="margin-bottom: 4px;">選區：${candidate.district}</div>` : '',
                  candidate.rank ? `<div style="margin-bottom: 4px;">排名：第 ${candidate.rank} 名</div>` : '',
                  candidate.votes ? `<div>得票數：${candidate.votes.toLocaleString('zh-TW')} 票</div>` : '',
                ].filter(Boolean).join('');

                tooltip
                  .html(tooltipContent)
                  .style('opacity', 1);
              })
              .on('mousemove', function (event) {
                tooltip
                  .style('left', `${event.pageX + 10}px`)
                  .style('top', `${event.pageY - 10}px`);
              })
              .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.5);
                tooltip.style('opacity', 0);
              });

            // 繪製候選人姓名
            const nameFontSize = Math.min(barHeight * 0.4, 12);
            barGroup
              .append('text')
              .attr('x', 8)
              .attr('y', barHeight / 2)
              .attr('dominant-baseline', 'middle')
              .style('font-size', `${nameFontSize}px`)
              .style('font-weight', '700')
              .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
              .style('fill', '#333333')
              .style('pointer-events', 'none')
              .text(getShortName(candidate.name || ''));

            // 繪製得票數（在長條右側）
            if (candidate.votes > 0) {
              barGroup
                .append('text')
                .attr('x', barWidth + 8)
                .attr('y', barHeight / 2)
                .attr('dominant-baseline', 'middle')
                .style('font-size', `${nameFontSize}px`)
                .style('font-weight', '500')
                .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
                .style('fill', '#666666')
                .style('pointer-events', 'none')
                .text(candidate.votes.toLocaleString('zh-TW'));
            }
          });

          currentY += partyHeight + partySpacing;
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
        console.log('[BarView] 橫向長條圖繪製完成，共', totalSeats, '席');
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
          drawBarChart();
        }, 300);
      };

      // 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          drawBarChart();
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
    <div ref="containerRef" class="bar-container"></div>
  </AppLayout>
</template>

<style scoped>
  .bar-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.bar-group) {
    transition: all 0.2s ease;
  }

  :deep(.bar-rect:hover) {
    filter: brightness(1.2);
  }

  :deep(.bar-name) {
    user-select: none;
  }
</style>


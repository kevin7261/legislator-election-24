<script>
  /**
   * 📊 BarView2.vue - 橫向長條圖議會席位圖（交錯版）
   *
   * 使用 D3.js 繪製橫向長條圖
   * 國民黨靠左、民進黨靠右，按名字交錯顯示
   * 無黨籍放最下方
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  import AppLayout from '../components/AppLayout.vue';

  export default {
    name: 'BarView2',
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
       * 繪製交錯長條圖
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

        // 佈局參數
        const padding = { top: 60, right: 40, bottom: 120, left: 40 };

        // 分離候選人
        const kmtCandidates = candidates.filter((c) => c.partyId === 'KMT').slice(0, 39);
        const dppCandidates = candidates
          .filter((c) => c.partyId === 'DPP')
          .slice(0, 38)
          .sort((a, b) => a.得票數 - b.得票數); // 民進黨由低排到高
        const indCandidates = candidates.filter((c) => c.partyId === 'IND').slice(0, 2);

        // 計算總席位數
        const totalSeats = kmtCandidates.length + dppCandidates.length + indCandidates.length;

        // 合併國民黨和無黨籍，並按得票數一起排序（單數行顯示）
        const leftSideCandidates = [...kmtCandidates, ...indCandidates].sort((a, b) => {
          // 按得票數降序排序
          return b.得票數 - a.得票數;
        });

        // 計算每個長條的高度
        const availableHeight = height - padding.top - padding.bottom;
        const mainBarHeight = 4; // Bar高度固定為4px
        const barSpacing = 0; // Bar之間的間距為0px（非常緊湊）
        const rowHeight = mainBarHeight + 6 + barSpacing; // 每行總高度（包含bar、文字和bar間距）

        // 計算每個長條的寬度（根據得票數）
        const maxVotes = d3.max(candidates, (d) => d.得票數) || 1;
        const availableWidth = width - padding.left - padding.right;
        const maxBarWidth = availableWidth; // 最大得票數的長條寬度（100%寬度，從一邊延伸到另一邊）

        // 計算統計數據 - 國民黨+無黨籍
        const leftSideVotes = leftSideCandidates.map((d) => d.得票數 || 0);
        const leftTotalVotes = d3.sum(leftSideVotes); // 總和
        const leftAverageVotes = leftSideVotes.length > 0 ? leftTotalVotes / leftSideVotes.length : 0; // 平均
        const leftSortedVotes = [...leftSideVotes].sort((a, b) => a - b);
        const leftMedianVotes = leftSortedVotes.length > 0
          ? leftSortedVotes.length % 2 === 0
            ? (leftSortedVotes[leftSortedVotes.length / 2 - 1] + leftSortedVotes[leftSortedVotes.length / 2]) / 2
            : leftSortedVotes[Math.floor(leftSortedVotes.length / 2)]
          : 0; // 中位數

        // 計算統計數據 - 民進黨
        const dppVotes = dppCandidates.map((d) => d.得票數 || 0);
        const dppTotalVotes = d3.sum(dppVotes); // 總和
        const dppAverageVotes = dppVotes.length > 0 ? dppTotalVotes / dppVotes.length : 0; // 平均
        const dppSortedVotes = [...dppVotes].sort((a, b) => a - b);
        const dppMedianVotes = dppSortedVotes.length > 0
          ? dppSortedVotes.length % 2 === 0
            ? (dppSortedVotes[dppSortedVotes.length / 2 - 1] + dppSortedVotes[dppSortedVotes.length / 2]) / 2
            : dppSortedVotes[Math.floor(dppSortedVotes.length / 2)]
          : 0; // 中位數

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


        // 繪製國民黨+無黨籍和民進黨（交錯顯示）
        let currentY = 0;
        let leftIndex = 0;
        let dppIndex = 0;
        let rowIndex = 1; // 從第1行開始

        // 交替顯示，直到所有候選人都顯示完
        while (leftIndex < leftSideCandidates.length || dppIndex < dppCandidates.length) {
          const barY = currentY;
          const isOddRow = rowIndex % 2 === 1; // 單數行

          if (isOddRow && leftIndex < leftSideCandidates.length) {
            // 單數行：國民黨或無黨籍（從最左往右畫）
            const candidate = leftSideCandidates[leftIndex];
            const isInd = candidate.partyId === 'IND';
            const barWidth = candidate.得票數 > 0
              ? (candidate.得票數 / maxVotes) * maxBarWidth
              : maxBarWidth * 0.1;

            const barGroup = g
              .append('g')
              .attr('transform', `translate(0, ${barY})`);

            // 繪製長條背景
            barGroup
              .append('rect')
              .attr('x', 0)
              .attr('y', 0)
              .attr('width', barWidth)
              .attr('height', mainBarHeight)
              .attr('fill', isInd ? partyData[0].color : partyData[2].color) // 無黨籍或國民黨顏色
              .attr('opacity', 0.5)
              .attr('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.7);

                const tooltipContent = [
                  `<div style="font-weight: 700; margin-bottom: 4px;">${candidate.候選人姓名 || ''}</div>`,
                  candidate.縣市 && candidate.選舉區別 ? `<div style="margin-bottom: 4px;">選區：${candidate.縣市}${candidate.選舉區別}</div>` : '',
                  `<div style="margin-bottom: 4px;">排名：第 ${leftIndex + 1} 名</div>`,
                  candidate.得票數 ? `<div>得票數：${candidate.得票數.toLocaleString('zh-TW')} 票</div>` : '',
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

            // 名字寫在bar外面（左側）
            barGroup
              .append('text')
              .attr('x', -8)
              .attr('y', mainBarHeight + 4)
              .attr('text-anchor', 'end')
              .attr('dominant-baseline', 'middle')
              .style('font-size', '10px')
              .style('font-weight', '700')
              .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
              .style('fill', '#333333')
              .style('pointer-events', 'none')
              .text(getShortName(candidate.候選人姓名 || ''));

            leftIndex++;
          } else if (!isOddRow && dppIndex < dppCandidates.length) {
            // 偶數行：民進黨（從最右往左畫）
            const candidate = dppCandidates[dppIndex];
            const barWidth = candidate.得票數 > 0
              ? (candidate.得票數 / maxVotes) * maxBarWidth
              : maxBarWidth * 0.1;

            const barGroup = g
              .append('g')
              .attr('transform', `translate(${availableWidth - barWidth}, ${barY})`);

            // 繪製長條背景
            barGroup
              .append('rect')
              .attr('x', 0)
              .attr('y', 0)
              .attr('width', barWidth)
              .attr('height', mainBarHeight)
              .attr('fill', partyData[1].color) // 民進黨顏色
              .attr('opacity', 0.5)
              .attr('cursor', 'pointer')
              .on('mouseover', function () {
                d3.select(this).attr('opacity', 0.7);

                const tooltipContent = [
                  `<div style="font-weight: 700; margin-bottom: 4px;">${candidate.候選人姓名 || ''}</div>`,
                  candidate.縣市 && candidate.選舉區別 ? `<div style="margin-bottom: 4px;">選區：${candidate.縣市}${candidate.選舉區別}</div>` : '',
                  `<div style="margin-bottom: 4px;">排名：第 ${dppIndex + 1} 名</div>`,
                  candidate.得票數 ? `<div>得票數：${candidate.得票數.toLocaleString('zh-TW')} 票</div>` : '',
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

            // 名字寫在bar外面（右側）
            barGroup
              .append('text')
              .attr('x', barWidth + 8)
              .attr('y', mainBarHeight + 4)
              .attr('text-anchor', 'start')
              .attr('dominant-baseline', 'middle')
              .style('font-size', '10px')
              .style('font-weight', '700')
              .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif')
              .style('fill', '#333333')
              .style('pointer-events', 'none')
              .text(getShortName(candidate.候選人姓名 || ''));

            dppIndex++;
          }

          // 移動到下一行（無論是否有候選人）
          currentY += rowHeight;
          rowIndex++;
        }

        // 繪製政黨標籤
        const fontFamily =
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';

        // 國民黨標籤（左側）
        g.append('text')
          .attr('x', 10)
          .attr('y', -10)
          .attr('text-anchor', 'start')
          .style('font-size', '16px')
          .style('font-weight', '600')
          .style('font-family', fontFamily)
          .style('fill', '#333333')
          .text('國民黨');

        // 民進黨標籤（右側）
        g.append('text')
          .attr('x', availableWidth - 10)
          .attr('y', -10)
          .attr('text-anchor', 'end')
          .style('font-size', '16px')
          .style('font-weight', '600')
          .style('font-family', fontFamily)
          .style('fill', '#333333')
          .text('民進黨');

        // 繪製統計信息（下方）
        const statsFontSize = 14;
        const statsY1 = availableHeight + 30; // 第一行（國民黨+無黨籍）
        const statsY2 = availableHeight + 50; // 第二行（民進黨）

        // 國民黨+無黨籍統計（左側）
        g.append('text')
          .attr('x', 0)
          .attr('y', statsY1)
          .attr('text-anchor', 'start')
          .style('font-size', `${statsFontSize}px`)
          .style('font-weight', '600')
          .style('font-family', fontFamily)
          .style('fill', '#333333')
          .text('國民黨+無黨籍：');

        g.append('text')
          .attr('x', 120)
          .attr('y', statsY1)
          .attr('text-anchor', 'start')
          .style('font-size', `${statsFontSize}px`)
          .style('font-weight', '400')
          .style('font-family', fontFamily)
          .style('fill', '#666666')
          .text(`總和 ${leftTotalVotes.toLocaleString('zh-TW')} / 平均 ${Math.round(leftAverageVotes).toLocaleString('zh-TW')} / 中位數 ${Math.round(leftMedianVotes).toLocaleString('zh-TW')}`);

        // 民進黨統計（右側）
        g.append('text')
          .attr('x', availableWidth)
          .attr('y', statsY2)
          .attr('text-anchor', 'end')
          .style('font-size', `${statsFontSize}px`)
          .style('font-weight', '600')
          .style('font-family', fontFamily)
          .style('fill', '#333333')
          .text('民進黨：');

        g.append('text')
          .attr('x', availableWidth - 80)
          .attr('y', statsY2)
          .attr('text-anchor', 'end')
          .style('font-size', `${statsFontSize}px`)
          .style('font-weight', '400')
          .style('font-family', fontFamily)
          .style('fill', '#666666')
          .text(`總和 ${dppTotalVotes.toLocaleString('zh-TW')} / 平均 ${Math.round(dppAverageVotes).toLocaleString('zh-TW')} / 中位數 ${Math.round(dppMedianVotes).toLocaleString('zh-TW')}`);

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
        console.log('[BarView2] 交錯長條圖繪製完成，共', totalSeats, '席');
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


<script>
  /**
   * ⭕ CircleView.vue - 圓形議會席位圖
   *
   * 使用 D3.js 繪製半圓形議會席位圖
   * 5 排、下方平、政黨顏色區分
   */

  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import * as d3 from 'd3';
  import AppLayout from '../components/AppLayout.vue';

  export default {
    name: 'CircleView',
    components: { AppLayout },
    setup() {
      const containerRef = ref(null);
      let svg = null;
      const candidateData = ref([]);

      // 政黨資料：從中間開始分配（無黨籍、民進黨、國民黨）
      // 使用更美觀的配色方案
      const partyData = [
        { id: 'IND', name: '無黨籍', count: 2, color: '#95A5A6' }, // 優雅的灰色，中間
        { id: 'DPP', name: '民進黨', count: 38, color: '#6BCB77' }, // 清新的綠色，左側
        { id: 'KMT', name: '國民黨', count: 39, color: '#4D96FF' }, // 明亮的藍色，右側
      ];

      // ⚙️ 面積計算配置：面積 = 得票數 / areaDivisor
      // 調整此值可以改變圓圈大小（值越大，圓圈越小）
      const areaDivisor = 18;

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
       * 核心算法：生成座位座標
       * @param {number} totalSeats - 總席位數
       * @param {number} rowCount - 排數
       * @param {number} innerRadius - 內圈半徑
       * @param {number} outerRadius - 外圈半徑
       * @returns {Array} 座位座標陣列
       */
      const generateParliamentSeats = (totalSeats, rowCount, innerRadius, outerRadius) => {
        const seats = [];

        // 計算每一層半徑
        const radii = [];
        const step = (outerRadius - innerRadius) / (rowCount - 1);
        for (let i = 0; i < rowCount; i++) {
          radii.push(innerRadius + i * step);
        }

        // 計算每一層的弧長，用來分配座位數量
        // 公式：弧長 = PI * r
        const arcLengths = radii.map((r) => Math.PI * r);
        const totalArcLength = d3.sum(arcLengths);

        let seatsAllocated = 0;
        const rowCounts = arcLengths.map((len, i) => {
          // 最後一排用減法確保總數精確等於 totalSeats
          if (i === rowCount - 1) {
            return totalSeats - seatsAllocated;
          }
          const count = Math.round(totalSeats * (len / totalArcLength));
          seatsAllocated += count;
          return count;
        });

        // 生成每個座位的座標（從內圈往外圈）
        rowCounts.forEach((count, rowIndex) => {
          const r = radii[rowIndex];
          // 角度範圍：從 PI (180度, 左邊) 到 0 (0度, 右邊)
          const angleStep = Math.PI / (count - 1 || 1); // 避免除以0

          for (let i = 0; i < count; i++) {
            const angle = Math.PI - i * angleStep;

            // 極座標轉笛卡兒座標
            seats.push({
              x: r * Math.cos(angle),
              y: r * Math.sin(angle),
              r: r,
              theta: angle,
              row: rowIndex,
            });
          }
        });

        // 根據角度排序（從左到右）
        seats.sort((a, b) => b.theta - a.theta);

        // 為每個座位添加編號（從 1 開始）
        seats.forEach((seat, index) => {
          seat.number = index + 1;
        });

        return seats;
      };

      /**
       * 繪製議會席位圖
       */
      const drawParliamentSeats = async () => {
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

        // 計算總席位數（從政黨資料計算）
        const totalSeats = d3.sum(partyData, (d) => d.count);

        // 根據容器大小計算合適的半徑
        const maxRadius = Math.min(width * 0.45, height * 0.85);
        const innerRadius = maxRadius * 0.3;
        const outerRadius = maxRadius * 0.95;

        // 生成座位座標（5排）
        const seatCoords = generateParliamentSeats(totalSeats, 5, innerRadius, outerRadius);

        // 將政黨資料展開並合併到座標資料中（從中間開始分配）
        const finalData = new Array(seatCoords.length).fill(null);
        const centerIndex = Math.floor(seatCoords.length / 2); // 中間座位索引

        // 先分配無黨籍（中間，2個座位）
        const indParty = partyData[0]; // 無黨籍
        // 無黨籍應該在索引 38, 39（中間偏左），這樣國民黨才能有 39 個座位
        const indStartIndex = centerIndex - 1;
        for (let i = 0; i < indParty.count; i++) {
          const seatIndex = indStartIndex + i;
          if (seatIndex >= 0 && seatIndex < seatCoords.length) {
            finalData[seatIndex] = {
              ...seatCoords[seatIndex],
              party: indParty.id,
              partyName: indParty.name,
              color: indParty.color,
              partySeatNumber: i + 1, // 黨內編號從 1 開始
            };
          }
        }

        // 向左分配民進黨（38個座位）
        const dppParty = partyData[1]; // 民進黨
        let dppSeatNumber = 1;
        // 從無黨籍左邊開始分配，確保分配 38 個
        for (let i = indStartIndex - 1; i >= 0; i--) {
          if (finalData[i] === null && dppSeatNumber <= dppParty.count) {
            finalData[i] = {
              ...seatCoords[i],
              party: dppParty.id,
              partyName: dppParty.name,
              color: dppParty.color,
              partySeatNumber: dppSeatNumber++,
            };
          }
        }

        // 向右分配國民黨（39個座位）
        const kmtParty = partyData[2]; // 國民黨
        let kmtSeatNumber = 1;
        // 從無黨籍右邊開始分配，確保分配 39 個
        for (let i = indStartIndex + indParty.count; i < seatCoords.length; i++) {
          if (finalData[i] === null && kmtSeatNumber <= kmtParty.count) {
            finalData[i] = {
              ...seatCoords[i],
              party: kmtParty.id,
              partyName: kmtParty.name,
              color: kmtParty.color,
              partySeatNumber: kmtSeatNumber++,
            };
          }
        }

        // 過濾掉未分配的座位（應該全部都有分配）
        const filteredData = finalData.filter((d) => d !== null);

        // 按照排數（從內圈到外圈）重新分配編號
        // 將座位按政黨分組，然後按排數排序分配編號
        const partyGroups = {
          [indParty.id]: [],
          [dppParty.id]: [],
          [kmtParty.id]: [],
        };

        filteredData.forEach((seat) => {
          partyGroups[seat.party].push(seat);
        });

        // 對每個政黨的座位，按照排數（row）從外到內排序，然後分配候選人姓名
        Object.keys(partyGroups).forEach((partyId) => {
          const seats = partyGroups[partyId];
          // 按排數排序：row 越大（外圈）越前面，這樣外圈上方會是編號 1
          // 同排時，按照距離中間的角度距離排序（中間上方的編號最小）
          seats.sort((a, b) => {
            if (a.row !== b.row) {
              return b.row - a.row; // 排數大的（外圈）在前
            }
            // 同排時，計算到中間（Math.PI / 2）的角度距離
            const centerAngle = Math.PI / 2; // 90度，正上方
            const distA = Math.abs(a.theta - centerAngle);
            const distB = Math.abs(b.theta - centerAngle);
            return distA - distB; // 距離中間越近的越前面
          });

          // 找到該政黨的候選人列表
          const partyCandidates = candidates.filter((c) => c.partyId === partyId);

          // 分配候選人姓名、排名和得票數
          seats.forEach((seat, index) => {
            if (index < partyCandidates.length) {
              const candidate = partyCandidates[index];
              seat.candidateName = candidate.候選人姓名;
              seat.rank = index + 1; // 黨內排名
              seat.votes = candidate.得票數; // 得票數
            } else {
              seat.candidateName = `編號${index + 1}`;
              seat.rank = index + 1;
              seat.votes = 0;
            }
          });
        });

        // 預設半徑（用於沒有得票數的情況）
        const baseRadius = Math.min(maxRadius / 14, 18);

        // 為每個座位計算半徑（根據得票數）
        // 面積 = 得票數 / areaDivisor
        // 面積 = π × r²，所以 r = √(得票數 / (areaDivisor × π))
        filteredData.forEach((seat) => {
          if (seat.votes && seat.votes > 0) {
            // 半徑 = √(得票數 / (areaDivisor × π))
            seat.radius = Math.sqrt(seat.votes / (areaDivisor * Math.PI));
          } else {
            // 如果沒有得票數，使用預設半徑
            seat.radius = baseRadius;
          }
        });

        // 創建 SVG
        svg = d3
          .select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', '#FFFFFF');

        // 計算整個半圓的高度（用於垂直居中）
        const maxY = d3.max(filteredData, (d) => d.y);
        const minY = d3.min(filteredData, (d) => d.y);
        // 計算圖形的中心點y坐標
        const centerY = (maxY + minY) / 2;
        // 計算垂直居中位置：SVG中心 - 圖形中心（注意y軸翻轉，所以用 -centerY）
        const translateY = height / 2 - -centerY;

        // 創建主容器組，水平垂直置中
        const g = svg.append('g').attr('transform', `translate(${width / 2}, ${translateY})`);

        // 為每個座位創建一個組（包含圓圈和文字）
        const seatGroups = g
          .selectAll('.seat-group')
          .data(filteredData)
          .enter()
          .append('g')
          .attr('class', 'seat-group')
          .attr('transform', (d) => `translate(${d.x}, ${-d.y})`);

        // 繪製背景圓圈（使用政黨顏色）
        seatGroups
          .append('circle')
          .attr('class', 'seat-circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', (d) => d.radius || baseRadius)
          .attr('fill', (d) => d.color)
          .attr('opacity', 0.5)
          .attr('cursor', 'pointer')
          .on('mouseover', function () {
            d3.select(this).attr('opacity', 0.7);
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.5);
          });

        // 字體設定
        const nameFontSize = 14; // 姓名字體大小
        const fontFamily =
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", Arial, sans-serif';
        const textColor = '#333333'; // 統一顏色

        // 繪製姓名（居中）
        seatGroups
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
          .text((d) => getShortName(d.candidateName || ''));

        // 繪製中間的大數字（總席次）
        const totalSeatsFontSize = Math.min(maxRadius / 3, 60);
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('x', 0)
          .attr('y', -10)
          .style('font-size', `${totalSeatsFontSize}px`)
          .style('font-weight', '700')
          .style('font-family', fontFamily)
          .style('fill', '#1a1a1a') // 深色文字
          .style('letter-spacing', '2px')
          .style('opacity', 0.85)
          .text(totalSeats);

        // eslint-disable-next-line no-console
        console.log('[CircleView] 議會席位圖繪製完成，共', totalSeats, '席');
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
      });

      return {
        containerRef,
      };
    },
  };
</script>

<template>
  <AppLayout>
    <div ref="containerRef" class="parliament-container"></div>
  </AppLayout>
</template>

<style scoped>
  .parliament-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #ffffff;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.seat) {
    transition: all 0.2s ease;
  }

  :deep(.seat:hover) {
    filter: brightness(1.2);
  }

  :deep(.seat-number) {
    user-select: none;
  }
</style>


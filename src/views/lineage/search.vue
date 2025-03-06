<template>
  <n-flex vertical>
    <n-spin :show="selectConditionLoading">
      <div class="search-condition-box">
        <n-flex>
          <n-select
            placeholder="选择数据库连接"
            :options="connectionList"
            v-model:value="currentConnection"
            label-field="connectionName"
            value-field="id"
            @update:value="updateConnection"
          />
          <n-select
            placeholder="选择数据库模式"
            v-if="currentDataBaseType === 'pgsql'"
            :options="schemaList"
            label-field="schemaName"
            value-field="schemaName"
            v-model:value="currentSchema"
            @update:value="updatePgDb"
          />
          <n-select
            placeholder="选择数据库"
            :options="databaseList"
            v-model:value="currentDatabase"
            label-field="databaseName"
            value-field="databaseName"
            @update:value="updateDatabase"
          />
          <n-select
            placeholder="选择表名"
            :options="tableList"
            v-model:value="currentTable"
            label-field="tableName"
            value-field="tableName"
            @update:value="updateTable"
            clearable
          />
          <n-button class="search-button" type="info" @click="searchLineageTableRelation"
            >查询
          </n-button>
        </n-flex>
      </div>
    </n-spin>
    <div ref="chartDom" class="select-result-box" id="relationGraph"></div>
  </n-flex>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import {
    getConnectionListByType,
    retrieveNeo4jTable,
    updateDbConnection,
  } from '@/api/lineage/search';
  import { getPgDbList } from '@/api/database/database';
  import * as echarts from 'echarts/core';
  import {
    TitleComponent,
    TitleComponentOption,
    TooltipComponent,
    TooltipComponentOption,
  } from 'echarts/components';
  import { GraphChart, GraphSeriesOption } from 'echarts/charts';
  import { CanvasRenderer } from 'echarts/renderers';
  import { useMessage } from 'naive-ui';
  const message = useMessage();
  echarts.use([TitleComponent, TooltipComponent, GraphChart, CanvasRenderer]);

  type EChartsOption = echarts.ComposeOption<
    TitleComponentOption | TooltipComponentOption | GraphSeriesOption
  >;

  const chartDom = ref<HTMLElement | null>(null);
  const myChart = ref<echarts.ECharts | null>(null);

  //选择条件loading效果
  const selectConditionLoading = ref(false);
  //选中的数据库类型
  let currentDataBaseType = ref('');
  //数据库连接集合
  let connectionList = ref([] as any);
  //选中的数据库连接
  let currentConnection = ref('');
  //数据库集合
  let databaseList = ref([] as any);
  //选中的数据库
  let currentDatabase = ref('');
  //pgsql的schema集合
  let schemaList = ref([] as any);
  //选中的schema
  let currentSchema = ref('');

  //临时表集合包含该数据库下的所有表，后续根据选择的数据库得出表集合
  let tempTableList = [];
  //表集合
  let tableList = ref([] as any);
  //选中的表
  let currentTable = ref('');
  //所有节点
  const nodes = ref<any[]>([]);
  //所有边
  const edges = ref<any[]>([]);

  // 处理异步数据的方法
  const processGraphData = (apiDataList: any[]) => {
    const nodeMap = new Map<string, any>();
    const linkSet = new Set<string>(); // 防止重复边

    apiDataList.forEach((apiData) => {
      // 处理当前节点
      const currentNode = {
        id: apiData.id,
        name: apiData.tableName,
        ip: apiData.connectionIp,
        port: apiData.connectionPort,
        database: apiData.databaseName,
        schema: apiData.schemaName,
        tableComment: apiData.tableComment,
      };
      if (!nodeMap.has(currentNode.id)) {
        nodeMap.set(currentNode.id, currentNode);
      }
      // 处理关系
      apiData.outgoingRelationShip?.forEach((relation: any) => {
        const target = relation.to;
        const targetNode = {
          id: target.id,
          name: target.tableName,
          ip: target.connectionIp,
          port: target.connectionPort,
          database: target.databaseName,
          schema: target.schemaName,
          tableComment: target.tableComment,
        };

        if (!nodeMap.has(targetNode.id)) {
          nodeMap.set(targetNode.id, targetNode);
        }
        // 生成唯一边标识
        const edgeKey = `${currentNode.id}-${targetNode.id}-${relation.relation}`;
        if (!linkSet.has(edgeKey)) {
          edges.value.push({
            source: currentNode.id,
            target: targetNode.id,
            label: relation.relation,
            lineStyle: {
              type: relation.relation === 'JOIN' ? 'dashed' : 'solid', // 根据关系类型区分样式
            },
          });
          linkSet.add(edgeKey);
        }
      });
    });

    nodes.value = Array.from(nodeMap.values());
  };
  const getConnectionList = async () => {
    selectConditionLoading.value = true;
    let tempConnections = await getConnectionListByType();
    if (!tempConnections) {
      console.error('获取数据库连接失败');
      selectConditionLoading.value = false;
      return;
    }
    connectionList.value = tempConnections.map((connection) => ({
      id: connection.id,
      connectionName: connection.connectionName + '(' + connection.type + ')',
    }));
    currentConnection.value = connectionList.value[0].id;
    currentDataBaseType.value = connectionList.value[0].type;
    selectConditionLoading.value = false;
    updateConnection(currentConnection.value);
  };
  const getPgDbs = async () => {
    if (currentDataBaseType.value !== 'pgsql') {
      return;
    }
    selectConditionLoading.value = true;
    let tempDb = await getPgDbList({ id: currentConnection.value });
    schemaList = tempDb.map((db) => ({
      schemaName: db,
    }));
    currentSchema.value = schemaList[0].schemaName;
    selectConditionLoading.value = false;
  };
  const searchLineageTableRelation = async () => {
    let obj = { id: '', databaseName: '', schemaName: '', tableName: '' };
    obj.id = currentConnection.value;
    obj.databaseName =
      currentDataBaseType.value === 'mysql' ? currentDatabase.value : currentSchema.value;
    obj.schemaName = currentDataBaseType.value === 'mysql' ? '' : currentDatabase.value;
    obj.tableName = currentTable.value;
    try {
      const result = await retrieveNeo4jTable(obj);
      if (!result) {
        message.info('无图数据！');
        return;
      }
      processGraphData(result as any);
      // 数据准备好后初始化图表
      initChart();
    } catch (error) {
      console.error('数据获取失败:', error);
    }
  };
  // 生成HSL颜色函数
  const generateHSLColor = (seed: string) => {
    // 通过hash生成确定性的数值
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = Math.abs(hash % 360); // 色相 0-359
    const s = 70 + Math.abs(hash % 15); // 饱和度 70-85%
    const l = 50 + Math.abs(hash % 10); // 亮度 50-60%

    return `hsl(${h}, ${s}%, ${l}%)`;
  };
  const initChart = () => {
    if (!chartDom.value || nodes.value.length === 0) return;
    myChart.value?.dispose(); // 清除旧实例
    myChart.value = echarts.init(chartDom.value);
    myChart.value.showLoading({
      text: '加载中',
      fontSize: 16,
      textColor: '#000',
    });
    const option: EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const data = params.data;
            return `
            <div>表名：${data.name}</div>
             ${data.tableComment ? `<div>表注释：${data.tableComment}</div></div>` : ''}
                ${data.schema ? `<div>Schema: ${data.schema}</div>` : ''}
            <div>数据库: ${data.database}</div>
          `;
          }
          return `${params.data.label} 关系`;
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          force: {
            repulsion: 150,
            edgeLength: 100,
            gravity: 0.1,
          },
          draggable: true,
          focusNodeAdjacency: true,
          data: nodes.value.map((node) => ({
            ...node,
            symbolSize: node.schema ? 40 : 50, // 根据schema存在调整大小
            itemStyle: {
              color: ({ data }: { data: any }) => generateHSLColor(data.database),
            },
          })),
          links: edges.value,
          edgeSymbol: ['none', 'arrow'],
          edgeLabel: {
            show: true,
            formatter: '{@label}',
            fontSize: 12,
          },
          label: {
            show: true,
            position: 'right',
            distance: 10,
            formatter: '{b}',
          },
          lineStyle: {
            curveness: 0.3,
            opacity: 0.8,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
            },
            lineStyle: {
              width: 3,
            },
          },
        },
      ],
    };
    myChart.value.setOption(option);
    setTimeout(() => {
      myChart.value.hideLoading();
    }, 1000);
  };
  const updateConnection = async (value: string) => {
    selectConditionLoading.value = true;
    let temp = connectionList.value.filter((item) => {
      return item.id === currentConnection.value;
    });
    let regex = /\((.+?)\)/g;
    currentDataBaseType.value = temp[0].connectionName
      .match(regex)[0]
      .replace('(', '')
      .replace(')', '');
    getPgDbs();
    // 切换数据库连接
    let tempDatabaseLists = await updateDbConnection({
      id: value,
      pgDbName: currentSchema.value,
    });
    if (!tempDatabaseLists) {
      console.log('该连接数据库为空');
      return;
    }
    databaseList.value = tempDatabaseLists.map((database) => ({
      databaseName: database.databaseName,
    }));
    tempTableList = tempDatabaseLists.map((database) => ({
      database: database.databaseName,
      tableList: database.tableStructureInfoDtoList,
    }));
    currentDatabase.value = databaseList.value[0].databaseName;
    updateDatabase(currentDatabase.value);
    selectConditionLoading.value = false;
  };
  const updateDatabase = (value: string) => {
    let tempTable = tempTableList.find((item) => item.database === value).tableList;
    tableList.value = tempTable.map((table) => ({
      tableName: table.tableName,
    }));
    currentTable.value = '';
  };

  const updatePgDb = async (value: string) => {
    selectConditionLoading.value = true;
    let tempDatabaseLists = await updateDbConnection({
      id: currentConnection.value,
      pgDbName: value,
    });
    databaseList.value = tempDatabaseLists.map((database) => ({
      databaseName: database.databaseName,
    }));
    tempTableList = tempDatabaseLists.map((database) => ({
      database: database.databaseName,
      tableList: database.tableStructureInfoDtoList,
    }));
    updateDatabase(currentDatabase.value);
    selectConditionLoading.value = false;
  };
  onMounted(() => {
    getConnectionList();
  });
</script>

<style lang="less" scoped>
  .search-condition-box {
    /deep/ .n-select {
      width: 17.9%;
    }
  }

  .search-button {
    /deep/ .n-button {
      width: 85px;
    }
  }

  .select-result-box {
    height: 485px;
    width: 100%;
  }
</style>

<template>
  <n-flex vertical style="height: calc(100vh - 120px)">
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
            clearable
          />
          <n-button class="search-button" type="info" @click="searchLineageTableRelation"
            >查询
          </n-button>
        </n-flex>
      </div>
    </n-spin>
    <div ref="chartDom" class="select-result-box"></div>
  </n-flex>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { getConnectionLists, retrieveNeo4jTable, updateDbConnection } from '@/api/lineage/search';
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
  const processGraphData = (apiDataList: any[]) => {
    const nodeMap = new Map<string, any>();
    const edges: any[] = [];
    const linkSet = new Set<string>();

    apiDataList.forEach((apiData) => {
      const isCurrentNode = apiData.tableName === currentTable.value;
      // 处理当前节点
      const currentNode = {
        id: apiData.id,
        name: apiData.tableName,
        isCurrent: isCurrentNode,
        meta: {
          ip: apiData.connectionIp,
          port: apiData.connectionPort,
          database: apiData.databaseName,
          schema: apiData.schemaName,
          comment: apiData.tableComment,
        },
      };
      nodeMap.set(currentNode.id, currentNode);

      // 处理所有关系（通过direction区分上下游）
      apiData.outgoingRelationShip?.forEach((relation: any) => {
        const targetNode = {
          id: relation.to.id,
          name: relation.to.tableName,
          meta: {
            ip: relation.to.connectionIp,
            port: relation.to.connectionPort,
            database: relation.to.databaseName,
            schema: relation.to.schemaName,
            comment: relation.to.tableComment,
          },
        };
        nodeMap.set(targetNode.id, targetNode);

        // 根据方向确定边的流向
        const isUpstream = relation.direction === 'UPSTREAM';
        const [sourceId, targetId] = isUpstream
          ? [targetNode.id, currentNode.id] // 上游反转方向
          : [currentNode.id, targetNode.id]; // 下游保持原方向

        // 生成唯一边标识（考虑方向）
        const edgeKey = `${sourceId}-${targetId}-${relation.relationFiled}`;
        if (linkSet.has(edgeKey)) return;

        edges.push({
          source: sourceId,
          target: targetId,
          label: relation.relationFiled,
          lineStyle: {
            type: isUpstream ? 'dashed' : 'solid',
          },
          properties: {
            direction: relation.direction,
            relationshipId: relation.id,
          },
        });
        linkSet.add(edgeKey);
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      stats: {
        totalNodes: nodeMap.size,
        totalEdges: edges.length,
        upstreamCount: edges.filter((e) => e.properties.direction === 'UPSTREAM').length,
        downstreamCount: edges.filter((e) => e.properties.direction === 'DOWNSTREAM').length,
      },
    };
  };
  const getConnectionList = async () => {
    selectConditionLoading.value = true;
    let tempConnections = await getConnectionLists();
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
    if (!currentTable.value) {
      message.error('请选择要查询的表');
      return;
    }
    if (!chartDom.value) return;
    // 初始化图表实例（若不存在）
    if (!myChart.value) {
      myChart.value = echarts.init(chartDom.value);
      myChart.value.on('dblclick', handleNodeDoubleClick);
    }
    if (myChart.value) {
      myChart.value.showLoading();
    }
    let obj = {
      id: currentConnection.value,
      databaseName: '',
      schemaName: '',
      tableName: currentTable.value,
    };
    obj.databaseName =
      currentDataBaseType.value === 'mysql' ? currentDatabase.value : currentSchema.value;
    obj.schemaName = currentDataBaseType.value === 'mysql' ? '' : currentDatabase.value;
    try {
      const result = await retrieveNeo4jTable(obj);
      if (!result) {
        message.info('无图数据！');
        return;
      }
      const { nodes: processedNodes, edges: processedEdges } = processGraphData(result as any);
      nodes.value = processedNodes;
      edges.value = processedEdges;
      // 数据准备好后初始化图表
      initChart();
    } catch (error) {
      console.error('数据获取失败:', error);
    } finally {
      if (myChart.value) {
        myChart.value.hideLoading();
      }
    }
  };
  const handleNodeDoubleClick = async (nodeData: any) => {
    const requestParams = {
      id: currentConnection.value,
      databaseName: nodeData.meta.database,
      schemaName: nodeData.meta.schema,
      tableName: nodeData.name,
    };
    try {
      if (myChart.value) {
        myChart.value.showLoading();
      }
      const result = await retrieveNeo4jTable(requestParams);
      const { nodes: newNodes, edges: newEdges } = processGraphData(result as any);
      mergeGraphData(newNodes, newEdges); // 合并数据
      updateChart(); // 更新图表
    } catch (error) {
      console.error('Failed to load node relations:', error);
    } finally {
      if (myChart.value) {
        myChart.value.hideLoading();
      }
    }
  };
  const mergeGraphData = (newNodes: any[], newEdges: any[]) => {
    // 节点去重（按 id）
    const existingNodeIds = new Set(nodes.value.map((n) => n.id));
    newNodes.forEach((node) => {
      if (!existingNodeIds.has(node.id)) {
        nodes.value.push(node);
        existingNodeIds.add(node.id);
      }
    });
    // 边去重（按 source-target-label）
    const existingEdgeKeys = new Set(edges.value.map((e) => `${e.source}-${e.target}-${e.label}`));
    newEdges.forEach((edge) => {
      const edgeKey = `${edge.source}-${edge.target}-${edge.label}`;
      if (!existingEdgeKeys.has(edgeKey)) {
        edges.value.push(edge);
        existingEdgeKeys.add(edgeKey);
      }
    });
  };
  const updateChart = () => {
    if (!myChart.value) return;

    const option: EChartsOption = {
      series: [
        {
          type: 'graph',
          data: nodes.value.map((node) => ({
            ...node,
            symbolSize: node.isCurrent ? 100 : 90,
            itemStyle: {
              color: node.isCurrent ? '#67C23A' : '#6EA8FF', // 当前节点绿色
              borderColor: node.isCurrent ? '#5DA934' : '#4A89FF',
              borderWidth: node.isCurrent ? 2 : 1,
              emphasis: {
                color: node.isCurrent ? '#5DA934' : '#409EFF',
              },
            },
          })),
          links: edges.value.map((edge) => ({
            ...edge,
            lineStyle: {
              type: edge.properties.direction === 'UPSTREAM' ? 'dashed' : 'solid',
              curveness: 0.3,
            },
          })),
        },
      ],
    };

    // 增量更新图表
    myChart.value.setOption(option, { notMerge: false });
  };
  const initChart = () => {
    if (!chartDom.value || nodes.value.length === 0) return;
    myChart.value?.dispose(); // 清除旧实例
    myChart.value = echarts.init(chartDom.value);

    myChart.value.on('dblclick', async (params) => {
      if (params.dataType === 'node') {
        const nodeData = params.data;
        await handleNodeDoubleClick(nodeData);
      }
    });
    const option: EChartsOption = {
      tooltip: {
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const data = params.data;
            return `
            <div>表名：${data.name}</div>
             ${data.meta.comment ? `<div>表注释：${data.meta.comment}</div></div>` : ''}
                ${data.meta.schema ? `<div>Schema: ${data.meta.schema}</div>` : ''}
            <div>数据库: ${data.meta.database}</div>
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
            repulsion: 250,
            edgeLength: 200,
            gravity: 0.05,
            layoutAnimation: true,
          },
          draggable: true,
          focusNodeAdjacency: true,
          legendHoverLink: true,
          roam: true,
          data: nodes.value.map((node) => ({
            ...node,
            symbolSize: node.isCurrent ? 100 : 90,
            itemStyle: {
              color: node.isCurrent ? '#67C23A' : '#6EA8FF', // 当前节点绿色
              borderColor: node.isCurrent ? '#5DA934' : '#4A89FF',
              borderWidth: node.isCurrent ? 2 : 1,
              emphasis: {
                color: node.isCurrent ? '#5DA934' : '#409EFF',
              },
            },
          })),
          links: edges.value.map((edge) => ({
            ...edge,
            lineStyle: {
              type: edge.properties.direction === 'UPSTREAM' ? 'dashed' : 'solid',
              color:
                edge.properties.direction === 'UPSTREAM'
                  ? '#FF8800' // 上游橙色
                  : '#0099FF', // 下游蓝色
              curveness: 0.3,
            },
          })),
          edgeSymbol: ['none', 'arrow'],
          edgeLabel: {
            show: true,
            formatter: '{@label}',
            fontSize: 12,
          },
          label: {
            show: true,
            position: 'inside',
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
    if (tempTable.length > 0) {
      currentTable.value = tableList.value[0].tableName;
    } else {
      currentTable.value = '';
    }
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
    :deep(.n-select) {
      width: 17.9%;
    }
  }

  .search-button {
    :deep(.n-button) {
      width: 85px;
    }
  }

  .select-result-box {
    height: 80%;
    width: 100%;
  }
</style>

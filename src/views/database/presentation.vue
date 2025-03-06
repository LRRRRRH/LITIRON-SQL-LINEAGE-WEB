<template>
  <n-flex>
    <div class="database-container-left">
      <n-spin :show="connectionListLoading">
        <n-select
          v-model:value="selectedConnectionValue"
          filterable
          label-field="connectionName"
          value-field="id"
          placeholder="选择连接"
          :options="list.connectionList"
          @update:value="updateConnection"
        />
        <n-select
          v-if="selectedConnectionType === 'pgsql'"
          v-model:value="selectedDatabaseValue"
          filterable
          label-field="databaseName"
          value-field="databaseName"
          placeholder="选择数据库"
          :options="list.databaseList"
          @update:value="updateDatabase"
        />
      </n-spin>
      <n-spin :show="treeStructureLoading">
        <n-scrollbar x-scrollable class="database-scrollbar" style="height: 430px">
          <n-tree
            ref="tree"
            block-line
            :data="list.transformedTreeStructure"
            :override-default-node-click-behavior="updateSelectedStruct"
          >
          </n-tree>
        </n-scrollbar>
      </n-spin>
    </div>
    <div class="database-container-right">
      <n-spin :show="tableContentLoading">
        <n-data-table
          ref="tableRef"
          remote
          :data="list.tableContentList"
          size="small"
          :columns="list.transformedColumnsList"
          :bordered="false"
          :scroll-x="columnListLength"
          :pagination="pagination.total > 0 ? pagination : false"
          :max-height="420"
          :min-height="420"
          striped
        />
      </n-spin>
    </div>
  </n-flex>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import type { TreeOverrideNodeClickBehavior } from 'naive-ui';
  import { useDialog, useMessage } from 'naive-ui';
  import {
    getDatabaseConnectionList,
    getPgDbList,
    getTableAllDetails,
    updateDatabaseConnection,
  } from '@/api/database/database';
  import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE_SIZES,
    PAGE_SIZES,
  } from '@/constant/tableConstant';

  const message = useMessage();
  const dialog = useDialog();
  const tableContentLoading = ref(false);
  const connectionListLoading = ref(false);
  const treeStructureLoading = ref(false);

  let selectedConnectionType = '';
  let selectedConnectionId = '';
  let selectedConnectionValue = ref('');
  let selectedDatabaseValue = ref('');
  let columnListLength = 1360;
  const list = reactive({
    connectionList: [] as any,
    connectionTreeStructureList: [] as any,
    databaseList: [] as any,
    transformedTreeStructure: [] as any,
    columnsList: [] as any,
    transformedColumnsList: [] as any,
    tableContentList: [] as any,
  });
  //分页
  const pagination = reactive({
    page: DEFAULT_PAGE, //受控模式下的当前页
    pageSize: DEFAULT_PAGE_SIZE, //受控模式下的分页大小,每一页的数据大小
    showSizePicker: true, //是否显示每页条数
    pageSizes: DEFAULT_PAGE_SIZES, //每页条数,可自定义
    showQuickJumper: true,
    total: 0, //总条数
    get pageCount() {
      return Math.ceil(this.total / this.pageSize);
    },
    prefix: () => {
      //分页前缀
      return '共 ' + pagination.total + ' 项';
    },
    onChange: (page) => {
      //切换第几页时
      pagination.page = page;
      loadDataTableDetails();
    },
    onPageSizeChange: (pageSize) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
      loadDataTableDetails();
    },
  });
  const selectedStructInfo = ref({
    database: '',
    table: '',
  });
  const updateSelectedStruct: TreeOverrideNodeClickBehavior = ({ option }) => {
    if (option.children) {
      return 'toggleExpand';
    }
    let splittedStructInfoList = typeof option.key === 'string' ? option.key.split('.') : [];
    selectedStructInfo.value.database = splittedStructInfoList[0];
    selectedStructInfo.value.table = splittedStructInfoList[1];
    getAllColumns();
    loadDataTableDetails();

    return 'default';
  };
  const loadDataTableDetails = async () => {
    tableContentLoading.value = true;
    await getTableAllDetails({
      tableName: selectedStructInfo.value.database + '.' + selectedStructInfo.value.table,
      connectionId: selectedConnectionId,
      pageSize: pagination.pageSize,
      pageNumber: pagination.page,
    })
      .then((res) => {
        list.tableContentList = res.data;
        pagination.total = res.count;
        tableContentLoading.value = false;
      })
      .catch((error) => {
        console.error(error);
        tableContentLoading.value = false;
      });
  };
  const getAllConnection = async () => {
    connectionListLoading.value = true;
    list.connectionList = await getDatabaseConnectionList();
    connectionListLoading.value = false;
  };
  const updateDatabase = async (value: string) => {
    connectionListLoading.value = true;
    list.connectionTreeStructureList = await updateDatabaseConnection({
      id: selectedConnectionId,
      pgDbName: value,
    });
    list.transformedTreeStructure = list.connectionTreeStructureList.map((tree) => ({
      label: tree.databaseName,
      key: tree.databaseName,
      children:
        tree.tableStructureInfoDtoList && tree.tableStructureInfoDtoList.length > 0
          ? tree.tableStructureInfoDtoList.map((child) => ({
              label:
                child.tableName + (child.tableComment === '' ? '' : '(' + child.tableComment + ')'),
              key: tree.databaseName + '.' + child.tableName,
            }))
          : [],
    }));
    connectionListLoading.value = false;
  };
  const getPgDbs = async () => {
    connectionListLoading.value = true;
    let tempDb = await getPgDbList({ id: selectedConnectionId });
    list.databaseList = tempDb.map((db) => ({
      databaseName: db,
    }));
    selectedDatabaseValue.value = list.databaseList[0].databaseName;
    connectionListLoading.value = false;
  };
  const getAllColumns = () => {
    let tableList = list.connectionTreeStructureList.filter((connectionTreeStructure) => {
      return connectionTreeStructure.databaseName === selectedStructInfo.value.database;
    });
    let columnList = tableList[0].tableStructureInfoDtoList.filter((table) => {
      return table.tableName === selectedStructInfo.value.table;
    });
    list.transformedColumnsList = columnList[0].columnStructureInfoDtoList.map((column) => ({
      title:
        column.columnName + (column.columnComment === '' ? '' : '(' + column.columnComment + ')'),
      key: column.columnName,
      ellipsis: {
        tooltip: true,
      },
      width: 130,
      resizable: true,
    }));
    columnListLength = list.transformedColumnsList.length * 130;
  };
  const updateConnection = async (value: string) => {
    selectedConnectionId = value;
    try {
      treeStructureLoading.value = true;
      selectedConnectionType = list.connectionList.find((item) => item.id === value).type;
      if (selectedConnectionType === 'pgsql') {
        getPgDbs();
      }
      list.connectionTreeStructureList = await updateDatabaseConnection({
        id: value,
        pgDbName: selectedDatabaseValue.value,
      });
      treeStructureLoading.value = false;
    } catch (Error) {
      console.error(Error);
      treeStructureLoading.value = false;
    }
    list.transformedTreeStructure = list.connectionTreeStructureList.map((tree) => ({
      label: tree.databaseName,
      key: tree.databaseName,
      children:
        tree.tableStructureInfoDtoList && tree.tableStructureInfoDtoList.length > 0
          ? tree.tableStructureInfoDtoList.map((child) => ({
              label:
                child.tableName + (child.tableComment === '' ? '' : '(' + child.tableComment + ')'),
              key: tree.databaseName + '.' + child.tableName,
            }))
          : [],
    }));
  };

  onMounted(() => {
    getAllConnection().then(() => {
      if (list.connectionList.length > 0) {
        selectedConnectionValue.value = list.connectionList[0].connectionName;
        selectedConnectionId = list.connectionList[0].id;
        updateConnection(selectedConnectionId);
      }
    });
  });
</script>
<style lang="less" scoped>
  .database-container-left {
    width: 17%;
  }

  .database-container-right {
    width: 81%;
    height: 100%;
  }

  .database-scrollbar {
    height: 620px;
  }

  .custom-tree-node {
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-label {
    max-width: 200px;
  }
</style>

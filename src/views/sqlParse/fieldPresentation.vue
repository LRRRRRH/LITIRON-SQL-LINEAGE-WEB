<template>
  <n-flex>
    <n-spin class="parse-box" :show="parseLoading">
      <n-spin class="select-spin-box" :show="selectConditionLoading">
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
              :options="pgDbNameList"
              label-field="schemaName"
              value-field="schemaName"
              v-model:value="currentPgDbName"
            />
          </n-flex>
        </div>
      </n-spin>
      <div class="top-box">
        <div class="top-box-upload">
          <n-upload
            action=""
            :headers="{
              'naive-info': 'hello!',
            }"
            :data="{
              'naive-data': 'cool! naive!',
            }"
            :max="1"
            :default-upload="false"
            @before-upload="beforeUpload"
            @change="loadTextFile"
          >
            <n-button>上传SQL文件</n-button>
          </n-upload>
        </div>
      </div>
      <div class="presentation-box">
        <div class="presentation-box-left">
          <div class="left-title"><strong>解析内容</strong></div>
          <div class="parse-content">
            <n-input
              v-model:value.trim="parseContent"
              type="textarea"
              autofocus
              placeholder="请输入要解析的语句或者选择上传SQL文件"
            />
          </div>
        </div>
        <div class="presentation-box-middle">
          <div class="top-box-button">
            <n-button type="primary" @click="() => parseSqlContent(parseContent)">解析-></n-button>
          </div>
        </div>
        <div class="presentation-box-right">
          <div class="right-title"><strong>解析结果</strong></div>
          <div class="parse-result">
            <n-card hoverable>
              <n-scrollbar style="height: 380px">
                <div v-if="!parseSuccess" class="error-container">
                  <n-alert type="error" :bordered="false">
                    {{ parseErrorReason }}
                  </n-alert>
                </div>
                <n-table
                  :bordered="true"
                  v-if="parseResult && parseResult.length > 0"
                  :single-line="false"
                  :zebra="true"
                  size="small"
                >
                  <thead>
                    <tr>
                      <th v-if="currentDataBaseType === 'mysql'">数据库名</th>
                      <th v-else>模式名</th>
                      <th>表名</th>
                      <th>表注释</th>
                      <th>字段名</th>
                      <th>字段注释</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-if="parseSuccess">
                      <tr v-for="(item, index) in parseResult" :key="index">
                        <td v-if="currentDataBaseType === 'mysql'">{{
                          item.databaseName || '-'
                        }}</td>
                        <td v-else>{{ item.schemaName || '-' }}</td>
                        <td>{{ item.tableName || '-' }}</td>
                        <td>{{ item.tableComment || '-' }}</td>
                        <td>{{ item.columnName || '-' }}</td>
                        <td>{{ item.columnComment || '-' }}</td>
                      </tr>
                    </template>
                  </tbody>
                </n-table>
                <!-- 空数据提示 -->
                <div v-else-if="parseSuccess" class="empty-tip">
                  <n-empty description="暂无解析结果"></n-empty>
                </div>
              </n-scrollbar>
            </n-card>
          </div>
        </div>
      </div>
    </n-spin>
  </n-flex>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { useMessage } from 'naive-ui';
  import { Parser } from 'node-sql-parser';
  import { getConnectionLists, updateDbConnection } from '@/api/lineage/search';
  import { getPgDbList } from '@/api/database/database';
  import { parseRelationColumns } from '@/api/sql/parse';

  let parseContent = ref('');
  let parseResult = ref([]);
  let parseErrorReason = ref('');
  let parseSuccess = ref(true);
  //选择条件loading效果
  const selectConditionLoading = ref(false);
  const parseLoading = ref(false);

  const message = useMessage();
  //数据库连接集合
  let connectionList = ref([] as any);
  //选中的数据库连接
  let currentConnection = ref('');
  //选中的数据库类型
  let currentDataBaseType = ref('');
  //pgsql的schema集合
  let pgDbNameList = ref([] as any);
  //选中的schema
  let currentPgDbName = ref('');
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
      pgDbName: currentPgDbName.value,
    });
    if (!tempDatabaseLists) {
      console.log('该连接数据库为空');
      return;
    }
    selectConditionLoading.value = false;
  };
  const getPgDbs = async () => {
    if (currentDataBaseType.value !== 'pgsql') {
      return;
    }
    selectConditionLoading.value = true;
    let tempDb = await getPgDbList({ id: currentConnection.value });
    pgDbNameList = tempDb.map((db) => ({
      schemaName: db,
    }));
    currentPgDbName.value = pgDbNameList[0].schemaName;
    selectConditionLoading.value = false;
  };
  const beforeUpload = (data: { file: any; fileList: any }) => {
    if (data.file.file?.type !== 'text/plain') {
      message.error('只能上传txt格式的文件，请重新上传');
      return false;
    }
    return true;
  };
  const loadTextFile = async (fileList) => {
    if (fileList.event) {
      const file = fileList.fileList[0].file;
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e: Event) => {
        const readerEvent = e as ProgressEvent<FileReader>;
        const result = readerEvent.target?.result;
        if (typeof result === 'string') {
          parseContent.value = result;
        } else {
          parseContent.value = '';
        }
      };
      reader.onerror = () => {
        console.error('Error reading file');
        message.error('解析失败，请重试！');
        parseContent.value = '';
      };
    }
  };
  const parseSqlContent = async (parseContent) => {
    if (!parseContent) {
      message.error('解析内容不能为空！');
      return false;
    }
    parseLoading.value = true;
    if (currentDataBaseType.value === 'mysql') {
      currentPgDbName.value = '';
    }
    const parser = new Parser();
    try {
      const sqlList = parseContent.split(';');
      for (const sql of sqlList) {
        // 去除空格和换行符
        const trimmedSql = sql.trim();
        if (!trimmedSql) continue;
        // 语法解析
        parser.parse(sql);
      }
      // 业务解析
      let obj = {
        sql: parseContent,
        connectionId: currentConnection.value,
        pgDbName: currentPgDbName.value,
      };
      let tempResult = await parseRelationColumns(obj);
      console.log('tempResult', tempResult);
      if (!tempResult) {
        parseLoading.value = false;
        parseErrorReason.value = '未解析出有效字段结构';
        return;
      }
      const results = [];
      const tempSet = new Set([...tempResult]);
      results.push(...Array.from(tempSet));
      parseResult.value = results;
      if (!parseSuccess.value) {
        parseErrorReason.value = '未解析出有效字段结构';
      }
      parseSuccess.value = true;
      parseLoading.value = false;
    } catch (error) {
      parseSuccess.value = false;
      parseErrorReason.value = '解析失败\n' + error;
      console.error('SQL语法错误:', error);
      parseLoading.value = false;
      message.error('SQL语法错误，解析失败，请重试！');
    }
  };
  onMounted(() => {
    getConnectionList();
  });
</script>
<style lang="less" scoped>
  .top-box {
    display: flex;
    width: 100%;
  }

  .parse-box {
    width: 100%;
  }

  .search-condition-box {
    width: 100%;

    :deep(.n-select) {
      width: 25%;
    }
  }

  .top-box-select {
    width: 20%;
  }

  .top-box-upload {
    width: 100%;
    height: 20%;

    :deep(.n-upload-trigger) {
      width: 52.5%;
    }

    :deep(.n-button--default-type) {
      width: 100%;
      height: 100%;
    }

    :deep(.n-upload) {
      display: flex;
    }

    :deep(.n-upload-file-list) {
      margin-top: 0;
      width: 47.5%;

      :deep(.n-upload-file-info) {
        padding-top: 0 !important;
      }
    }
  }

  .presentation-box {
    width: 100%;
    height: calc(100vh - 200px);
    display: flex;
  }

  .presentation-box-left {
    width: 53%;
    border: #515a6e 1px solid;
    height: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    flex-flow: column;
    padding-top: 5px;
  }

  .presentation-box-middle {
    display: flex;
    width: 7%;
    margin-left: 8px;
    align-items: center;
  }

  .presentation-box-right {
    border: #515a6e 1px solid;
    width: 40%;
    height: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    flex-flow: column;
    padding-top: 5px;
  }

  .left-title {
    font-size: 15px;
    margin: 0 auto;
    height: 6%;
  }

  .right-title {
    font-size: 15px;
    margin: 0 auto;
    height: 6%;
  }

  .parse-content {
    padding: 5px;
    height: 90%;

    :deep(.n-input--textarea) {
      height: 100%;
    }
  }

  .select-spin-box {
    width: 100%;
  }

  .parse-result {
    padding: 5px;
    height: 90%;

    :deep(.n-card) {
      height: 100%;
    }

    :deep(.n-card__content) {
      padding: 3px 12px;
    }

    ::v-deep(.n-card) > .n-card__content:first-child,
    ::v-deep(.n-card) > .n-card__footer:first-child {
      padding-top: 4px !important;
    }
  }
</style>

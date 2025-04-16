<template>
  <n-flex vertical style="height: calc(100vh - 120px)">
    <n-spin :show="tableLoading">
      <div class="search-condition-box">
        <n-flex>
          <n-select
            placeholder="请输入数据库类型"
            :options="typeOptions"
            v-model:value="searchForm.type"
            clearable
          />
          <n-input
            v-model:value="searchForm.connectionName"
            type="text"
            clearable
            placeholder="请输入连接名"
          ></n-input>
          <n-button class="search-button" type="info" @click="getDbConnection()">查询</n-button>
          <n-button type="primary" @click="handleCreate">新建连接</n-button>
        </n-flex>
      </div>
      <n-data-table
        ref="tableRef"
        remote
        :data="list.connectionList"
        size="small"
        :columns="columns"
        :bordered="false"
        :pagination="pagination.total > 0 ? pagination : false"
        :max-height="420"
        :min-height="420"
        striped
      />
    </n-spin>
    <n-modal v-model:show="showDialog" :title="isEditMode ? '编辑连接' : '新建连接'">
      <n-card style="width: 600px" :title="isEditMode ? '编辑连接' : '新建连接'" :bordered="false">
        <n-form ref="formRef" :model="formData" :rules="rules">
          <n-form-item label="类型" path="type">
            <n-select
              v-model:value="formData.type"
              :options="typeOptions"
              placeholder="请选择数据库类型"
            />
          </n-form-item>
          <n-form-item label="连接名" path="connectionName">
            <n-input v-model:value="formData.connectionName" placeholder="请输入连接名称" />
          </n-form-item>
          <n-form-item label="IP地址" path="ip">
            <n-input v-model:value="formData.ip" placeholder="请输入数据库IP地址" />
          </n-form-item>
          <n-form-item label="端口" path="port">
            <n-input-number
              v-model:value="formData.port"
              :min="1"
              :max="65535"
              placeholder="请输入端口号"
            />
          </n-form-item>
          <n-form-item label="用户名" path="userName">
            <n-input v-model:value="formData.userName" placeholder="请输入用户名" />
          </n-form-item>
          <n-form-item label="密码" path="password">
            <n-input
              v-model:value="formData.password"
              type="password"
              placeholder="请输入密码"
              showPasswordOn="click"
            />
          </n-form-item>
        </n-form>
        <template #footer>
          <n-flex justify="end">
            <n-button @click="showDialog = false">取消</n-button>
            <n-button type="primary" :loading="submitLoading" @click="handleSubmit">
              {{ isEditMode ? '更新' : '创建' }}
            </n-button>
          </n-flex>
        </template>
      </n-card>
    </n-modal>
  </n-flex>
</template>

<script setup>
  import { h, onMounted, reactive, ref } from 'vue';
  import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZES } from '@/constant/tableConstant';
  import {
    addDatabaseConnection,
    deleteDatabaseConnection,
    editDatabaseConnection,
    getDatabaseConnectionList,
  } from '@/api/database/database';
  import { NButton, NSpace, useDialog, useMessage } from 'naive-ui';

  const message = useMessage();
  const dialog = useDialog();
  const list = reactive({
    connectionList: [],
  });
  // 表单数据结构
  const formData = reactive({
    type: null,
    connectionName: '',
    ip: '',
    port: null,
    userName: '',
    password: '',
  });
  const tableLoading = ref(false);
  const searchForm = ref({});
  const showDialog = ref(false);
  const isEditMode = ref(false);
  const submitLoading = ref(false);
  const formRef = ref(null);
  const rules = {
    type: {
      required: true,
      message: '请选择数据库类型',
      trigger: ['blur', 'change'],
    },
    connectionName: {
      required: true,
      message: '请输入连接名称',
      trigger: 'blur',
    },
    ip: {
      required: true,
      message: '请输入IP地址',
      trigger: 'blur',
    },
    port: {
      type: 'number',
      required: true,
      min: 1,
      max: 65535,
      message: '端口号必须为1-65535之间的数字',
      trigger: ['blur', 'change'],
    },
    userName: {
      required: true,
      message: '请输入用户名',
      trigger: 'blur',
    },
  };
  const typeOptions = [
    {
      label: 'mysql',
      value: 'mysql',
    },
    {
      label: 'pgsql',
      value: 'pgsql',
    },
  ];
  //分页
  const pagination = reactive({
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    showSizePicker: true,
    pageSizes: DEFAULT_PAGE_SIZES,
    showQuickJumper: true,
    total: 0,
    get pageCount() {
      return Math.ceil(this.total / this.pageSize);
    },
    prefix: () => {
      return '共 ' + pagination.total + ' 项';
    },
    onChange: (page) => {
      pagination.page = page;
    },
    onPageSizeChange: (pageSize) => {
      pagination.pageSize = pageSize;
      pagination.page = 1;
    },
  });
  const columns = [
    {
      title: '序号',
      key: 'index',
      render(row, index) {
        return index + 1;
      },
    },
    {
      title: '类型',
      key: 'type',
    },
    {
      title: '连接名',
      key: 'connectionName',
    },

    {
      title: 'ip',
      key: 'ip',
    },
    {
      title: 'port',
      key: 'port',
    },
    {
      title: '操作',
      key: 'actions',
      render(row) {
        return h(NSpace, { justify: 'start', size: 'small' }, () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => editDbConnection(row),
              type: 'primary',
              ghost: true,
            },
            { default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleDelete(row),
              type: 'error',
              ghost: true,
            },
            { default: () => '删除' }
          ),
        ]);
      },
    },
  ];
  // 新建操作
  const handleCreate = () => {
    isEditMode.value = false;
    Object.assign(formData, {
      type: null,
      connectionName: '',
      ip: '',
      port: null,
      userName: '',
      password: '',
    });
    showDialog.value = true;
  };
  // 编辑操作
  const editDbConnection = (row) => {
    isEditMode.value = true;
    Object.assign(formData, {
      id: row.id, // 假设返回数据中有id字段
      type: row.type,
      connectionName: row.connectionName,
      ip: row.ip,
      port: row.port,
      userName: row.userName,
      password: '', // 密码通常不返回，需要重新输入
    });
    showDialog.value = true;
  };
  const handleDelete = async (row) => {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除连接 "${row.connectionName}" 吗？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          tableLoading.value = true;
          await deleteDatabaseConnection({ id: row.id });
          message.success('删除成功');
          await getDbConnection(); // 刷新列表
        } catch (error) {
          message.error('删除失败: ' + error.message);
        } finally {
          tableLoading.value = false;
        }
      },
    });
  };
  // 提交表单
  const handleSubmit = async () => {
    try {
      await formRef.value?.validate();
      submitLoading.value = true;

      const api = isEditMode.value ? editDatabaseConnection : addDatabaseConnection;

      const { id, ...submitData } = formData;
      const params = isEditMode.value ? { id, ...submitData } : submitData;
      await api(params);
      message.success(isEditMode.value ? '更新成功' : '创建成功');
      showDialog.value = false;
      getDbConnection(); // 刷新列表
    } catch (error) {
      if (error instanceof Error) {
        message.error(`操作失败: ${error.message}`);
      }
    } finally {
      submitLoading.value = false;
    }
  };
  const getDbConnection = async () => {
    tableLoading.value = true;
    list.connectionList = await getDatabaseConnectionList();
    tableLoading.value = false;
    // list.value = await getDatabaseConnectionListByUid({
    //   pageSize: pagination.pageSize,
    //   pageNumber: pagination.page,
    //   type : searchForm.value.type,
    //   connectionName:searchForm.value.connectionName
    // })
    //   .then((res)=>{
    //     pagination.total = res.count;
    //     list.connectionList = res.data;
    //     tableLoading.value=false;
    //   })
    //   .catch((error) => {
    //     console.error(error);
    //     tableLoading.value = false;
    //   });
    console.log(list.connectionList);
  };
  onMounted(() => {
    getDbConnection();
  });
</script>

<style lang="less" scoped>
  .search-condition-box {
    :deep(.n-select) {
      width: 20%;
    }

    :deep(.n-input) {
      width: 20%;
    }
  }
</style>

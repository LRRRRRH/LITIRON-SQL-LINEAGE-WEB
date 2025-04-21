<template>
  <n-spin :show="formLoading" description="更新中">
    <n-grid cols="2 s:2 m:2 l:3 xl:3 2xl:3" responsive="screen">
      <n-grid-item>
        <n-form :label-width="80" :model="formValue" :rules="rules" ref="formRef">
          <n-form-item label="昵称" path="nickName">
            <n-input v-model:value="formValue.nickName" placeholder="请输入昵称" />
          </n-form-item>

          <n-form-item label="邮箱" path="email">
            <n-input placeholder="请输入邮箱" v-model:value="formValue.email" />
          </n-form-item>

          <n-form-item label="联系电话" path="phone">
            <n-input placeholder="请输入联系电话" v-model:value="formValue.phone" />
          </n-form-item>

          <n-form-item label="联系地址" path="address">
            <n-input
              v-model:value="formValue.address"
              type="textarea"
              placeholder="请输入联系地址"
            />
          </n-form-item>

          <div>
            <n-space>
              <n-button type="primary" @click="formSubmit">更新基本信息</n-button>
            </n-space>
          </div>
        </n-form>
      </n-grid-item>
    </n-grid>
  </n-spin>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { useMessage } from 'naive-ui';
  import { useUserStore } from '@/store/modules/user';
  import { updateInfo } from '@/api/system/user';
  const formLoading = ref(false);
  const rules = {
    nickName: {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入昵称'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
    email: {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入邮箱'));
        } else {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(value)) {
            callback(new Error('请输入有效的邮箱地址'));
          } else {
            callback();
          }
        }
      },
      trigger: 'blur',
    },
    phone: {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入联系电话'));
        } else {
          const phoneRegex = /^1\d{10}$/;
          if (!phoneRegex.test(value)) {
            callback(new Error('请输入有效的 11 位手机号码'));
          } else {
            callback();
          }
        }
      },
      trigger: 'input',
    },
  };

  const formRef: any = ref(null);
  const message = useMessage();

  let formValue = reactive({
    nickName: '',
    phone: '',
    email: '',
    address: '',
  });
  const userStore = useUserStore();

  function formSubmit() {
    formRef.value.validate(async (errors) => {
      if (!errors) {
        formLoading.value = true;
        await updateInfo(formValue);
        formLoading.value = false;
        message.success('更新成功');
      } else {
        message.error('验证失败，请填写完整信息');
        formLoading.value = false;
      }
    });
  }

  onMounted(() => {
    const userInfo = userStore.getUserInfo;

    formValue.address = userInfo.address || '';

    formValue.nickName = userInfo.nickName || '';

    formValue.phone = userInfo.phone || '';

    formValue.email = userInfo.email || '';
  });
</script>

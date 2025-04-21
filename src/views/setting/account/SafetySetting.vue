<template>
  <n-spin :show="formLoading" description="更新中">
    <n-grid cols="2 s:2 m:2 l:3 xl:3 2xl:3" responsive="screen">
      <n-grid-item>
        <n-form :label-width="80" :model="formValue" :rules="rules" ref="formRef">
          <!-- 旧密码 -->
          <n-form-item label="旧密码" path="oldPassword">
            <n-input
              v-model:value="formValue.oldPassword"
              type="password"
              placeholder="请输入旧密码"
            />
          </n-form-item>

          <!-- 新密码 -->
          <n-form-item label="新密码" path="newPassword">
            <n-input
              v-model:value="formValue.newPassword"
              type="password"
              placeholder="请输入6-20位新密码"
              show-password-on="click"
            />
          </n-form-item>

          <!-- 确认新密码 -->
          <n-form-item label="确认新密码" path="confirmPassword">
            <n-input
              v-model:value="formValue.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password-on="click"
            />
          </n-form-item>
          <div>
            <n-space>
              <n-button type="primary" @click="formSubmit">修改密码</n-button>
            </n-space>
          </div>
        </n-form>
      </n-grid-item>
    </n-grid>
  </n-spin>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue';
  import { useMessage } from 'naive-ui';
  import { updatePassword } from '@/api/system/user';
  import { useUserStore } from '@/store/modules/user';
  import { TABS_ROUTES } from '@/store/mutation-types';
  import { useRoute, useRouter } from 'vue-router'; // 假设API已调整

  const formLoading = ref(false);

  const rules = {
    oldPassword: {
      required: true, // 基础非空验证
      message: '旧密码不能为空',
      trigger: 'blur',
    },
    newPassword: {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入新密码'));
        } else {
          if (!/^.{6,20}$/.test(value)) {
            callback(new Error('新密码需6-20位字符'));
          } else {
            callback();
          }
        }
      },
      trigger: 'blur',
    },
    confirmPassword: {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('确认密码不能为空'));
        } else {
          if (value !== formValue.newPassword) {
            callback(new Error('两次输入的密码不一致'));
          } else {
            callback();
          }
        }
      },
      trigger: 'blur',
    },
  };

  const formRef: any = ref(null);
  const message = useMessage();

  let formValue = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const userStore = useUserStore();

  const router = useRouter();
  const route = useRoute();
  function formSubmit() {
    formRef.value.validate(async (errors) => {
      if (!errors) {
        formLoading.value = true;
        try {
          console.log(formValue);
          await updatePassword(formValue);
          message.success('密码修改成功');
          userStore.logout().then(() => {
            message.success('成功退出登录');
            // 移除标签页
            localStorage.removeItem(TABS_ROUTES);
            router
              .replace({
                name: 'Login',
                query: {
                  redirect: route.fullPath,
                },
              })
              .finally(() => location.reload());
          });
        } catch (error) {
          console.error(error);
        } finally {
          formLoading.value = false;
        }
      } else {
        const errorMessages = errors.flatMap((errorList) =>
          errorList.map((error) => error.message)
        );
        message.error(`验证失败：${errorMessages.join('；')}`);
      }
    });
  }
</script>

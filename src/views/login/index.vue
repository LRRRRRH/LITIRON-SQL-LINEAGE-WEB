<template>
  <div class="view-account">
    <div class="view-account-header"></div>
    <div class="view-account-container">
      <div class="view-account-top">
        <div class="view-account-top-logo">
          <img :src="websiteConfig.loginImage" alt="" />
        </div>
      </div>
      <div class="view-account-form" v-if="currentOption === 0">
        <n-form
          ref="formRef"
          label-placement="left"
          size="large"
          :model="formInline"
          :rules="rules"
        >
          <n-form-item path="username">
            <n-input v-model:value="formInline.username" placeholder="请输入用户名">
              <template #prefix>
                <n-icon size="18" color="#808695">
                  <PersonOutline />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="password">
            <n-input
              v-model:value="formInline.password"
              type="password"
              showPasswordOn="click"
              placeholder="请输入密码"
            >
              <template #prefix>
                <n-icon size="18" color="#808695">
                  <LockClosedOutline />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="code" class="default-color">
            <div class="flex gap-2">
              <n-input v-model:value="formInline.code" placeholder="请输入验证码" class="flex-1" />
              <div class="login-code cursor-pointer" @click="refreshCode">
                <s-identify :identify-code="identifyCode" :content-width="150" />
              </div>
            </div>
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="handleSubmit" size="large" :loading="loading" block>
              登录
            </n-button>
          </n-form-item>
          <n-form-item class="default-color">
            <div class="flex view-account-other">
              <div class="flex-initial" style="margin-left: auto">
                <a href="javascript:" @click="changeOption">注册账号</a>
              </div>
            </div>
          </n-form-item>
        </n-form>
      </div>
      <div class="view-account-form" v-if="currentOption === 1">
        <n-form
          ref="formRef"
          label-placement="left"
          size="large"
          :model="formInline"
          :rules="rules"
        >
          <n-form-item path="username">
            <n-input v-model:value="formInline.username" placeholder="请输入用户名">
              <template #prefix>
                <n-icon size="18" color="#808695">
                  <PersonOutline />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="password">
            <n-input
              v-model:value="formInline.password"
              type="password"
              show-password-on="click"
              placeholder="请输入密码"
            >
              <template #prefix>
                <n-icon size="18" color="#808695">
                  <LockClosedOutline />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="confirmPassword">
            <n-input
              v-model:value="formInline.confirmPassword"
              type="password"
              show-password-on="click"
              placeholder="请再次输入密码"
            >
              <template #prefix>
                <n-icon size="18" color="#808695">
                  <LockClosedOutline />
                </n-icon>
              </template>
            </n-input>
          </n-form-item>

          <n-form-item path="code" class="default-color">
            <div class="flex gap-2">
              <n-input v-model:value="formInline.code" placeholder="请输入验证码" class="flex-1" />
              <div class="login-code cursor-pointer" @click="refreshCode">
                <s-identify :identify-code="identifyCode" :content-width="150" />
              </div>
            </div>
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click="handleRegister" size="large" :loading="loading" block>
              立即注册
            </n-button>
          </n-form-item>

          <n-form-item class="default-color">
            <div class="flex view-account-other">
              <div class="flex-initial" style="margin-left: auto">
                <a href="#/login" @click="changeOption()">已有账号？立即登录</a>
              </div>
            </div>
          </n-form-item>
        </n-form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useUserStore } from '@/store/modules/user';
  import { useMessage } from 'naive-ui';
  import { ResultEnum } from '@/enums/httpEnum';
  import { LockClosedOutline, PersonOutline } from '@vicons/ionicons5';
  import { PageEnum } from '@/enums/pageEnum';
  import { websiteConfig } from '@/config/website.config';

  interface FormState {
    username: string;
    password: string;
  }

  const identifyCodes = '1234567890abcdefjhijklinopqrsduvwxyz'; //随机串内容
  const identifyCode = ref('');
  const formRef = ref();
  const message = useMessage();
  const loading = ref(false);
  //默认登录界面
  const currentOption = ref(0);
  const LOGIN_NAME = PageEnum.BASE_LOGIN_NAME;

  const formInline = reactive({
    username: 'admin',
    password: '123456',
    confirmPassword: '',
    code: '',
    isCaptcha: true,
  });
  const validatePasswordSame = (rule, value) => {
    return value === formInline.password;
  };
  const rules = {
    username: { required: true, message: '请输入用户名', trigger: 'blur' },
    password: { required: true, message: '请输入密码', trigger: 'blur' },
    code: {
      required: true,
      validator: (rule, value) => {
        if (!value) return new Error('请输入验证码');
        if (value.toLowerCase() !== identifyCode.value.toLowerCase()) {
          return new Error('验证码不正确');
        }
        return true;
      },
      trigger: 'blur',
    },
    confirmPassword: [
      {
        required: true,
        message: '请再次输入密码',
        trigger: 'blur',
      },
      {
        validator: validatePasswordSame,
        message: '两次输入密码不一致',
        trigger: ['blur', 'input'],
      },
    ],
  };
  const changeOption = () => {
    if (currentOption.value == 0) {
      currentOption.value = 1;
    } else currentOption.value = 0;
    formInline.confirmPassword = '';
    formInline.password = '';
    formInline.username = '';
    formInline.code = '';
  };
  const handleRegister = (e) => {
    e.preventDefault();
    formRef.value.validate(async (errors) => {
      if (!errors) {
        // 验证码校验
        if (formInline.code.toLowerCase() !== identifyCode.value.toLowerCase()) {
          message.error('验证码错误');
          refreshCode();
          return;
        }

        loading.value = true;
        message.loading('注册中...');

        try {
          // 调用注册接口
          // const res = await api.register({
          //   username: formInline.username,
          //   password: formInline.password
          // });

          // 模拟成功响应
          setTimeout(() => {
            message.success('注册成功');
            router.push('/login');
          }, 1500);
        } finally {
          loading.value = false;
        }
      }
    });
  };

  const userStore = useUserStore();

  const router = useRouter();
  const route = useRoute();

  const handleSubmit = (e) => {
    e.preventDefault();
    formRef.value.validate(async (errors) => {
      if (!errors) {
        if (formInline.code.toLowerCase() !== identifyCode.value.toLowerCase()) {
          message.error('验证码错误');
          refreshCode();
          return;
        }
        const { username, password } = formInline;
        message.loading('登录中...');
        loading.value = true;

        const params: FormState = {
          username,
          password,
        };

        try {
          const { code, message: msg } = await userStore.login(params);
          message.destroyAll();
          if (code == ResultEnum.SUCCESS) {
            const toPath = decodeURIComponent((route.query?.redirect || '/') as string);
            message.success('登录成功，即将进入系统');
            if (route.name === LOGIN_NAME) {
              router.replace('/');
            } else router.replace(toPath);
          } else {
            message.info(msg || '登录失败');
          }
        } finally {
          loading.value = false;
        }
      }
    });
  };
  const refreshCode = () => {
    identifyCode.value = '';
    makeCode(identifyCodes, 4);
  };
  const makeCode = (sourceStr, length) => {
    identifyCode.value = ''; // 每次生成前清空
    for (let i = 0; i < length; i++) {
      const randomIndex = randomNum(0, sourceStr.length);
      identifyCode.value += sourceStr[randomIndex];
    }
  };
  const randomNum = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min);
  };
  onMounted(() => {
    refreshCode();
  });
</script>

<style lang="less" scoped>
  .view-account {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: auto;

    &-container {
      flex: 1;
      padding: 32px 12px;
      max-width: 384px;
      min-width: 320px;
      margin: 0 auto;
    }

    &-top {
      padding: 32px 0;
      text-align: center;

      &-desc {
        font-size: 14px;
        color: #808695;
      }
    }

    &-other {
      width: 100%;
    }

    .default-color {
      color: #515a6e;

      .ant-checkbox-wrapper {
        color: #515a6e;
      }
    }
  }

  @media (min-width: 768px) {
    .view-account {
      background-image: url('../../assets/images/login.svg');
      background-repeat: no-repeat;
      background-position: 50%;
      background-size: 100%;
    }

    .page-account-container {
      padding: 32px 0 24px 0;
    }
  }
  .login-code {
    width: 150px;
    height: 38px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;

    canvas {
      width: 100%;
      height: 100%;
    }
  }

  .flex {
    display: flex;
    align-items: center;

    &.gap-2 {
      gap: 8px;
    }

    .flex-1 {
      flex: 1;
    }
  }
</style>

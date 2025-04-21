import { Alova } from '@/utils/http/alova/index';

/**
 * @description: 获取用户信息
 */
export function getUserInfo() {
  return Alova.Get('/user/info', {
    meta: {
      isReturnNativeResponse: true,
    },
  });
}

/**
 * @description: 用户登录
 */
export function login(params) {
  return Alova.Post('/user/login', params, {
    meta: {
      isReturnNativeResponse: true,
    },
  });
}

/**
 * @description: 用户注册
 */
export function register(params) {
  return Alova.Post('/user/register', params);
}
/**
 * @description: 用户信息修改
 */
export function updateInfo(params) {
  return Alova.Post('/user/updateInfo', params);
}

/**
 * @description: 用户修改密码
 */
export function updatePassword(params) {
  return Alova.Post('/user/updatePassword', params);
}

/**
 * @description: 用户登出
 */
export function logout(params) {
  return Alova.Post('/login/logout', {
    params,
  });
}

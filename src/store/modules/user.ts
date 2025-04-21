import { defineStore } from 'pinia';
import { store } from '@/store';
import { ACCESS_TOKEN, CURRENT_USER, IS_SCREENLOCKED } from '@/store/mutation-types';
import { ResultEnum } from '@/enums/httpEnum';

import { getUserInfo as getUserInfoApi, login } from '@/api/system/user';
import { storage } from '@/utils/Storage';

export type UserInfoType = {
  userName: string;
  nickName: string;
  email: string;
  phone: string;
  address: string;
};

export interface IUserState {
  token: string;
  userName: string;
  welcome: string;
  avatar: string;
  permissions: any[];
  info: UserInfoType;
}

export const useUserStore = defineStore({
  id: 'app-user',
  state: (): IUserState => ({
    token: storage.get(ACCESS_TOKEN, ''),
    userName: '',
    welcome: '',
    avatar: '',
    permissions: [],
    info: storage.get(CURRENT_USER, {}),
  }),
  getters: {
    getToken(): string {
      return this.token;
    },
    getAvatar(): string {
      return this.avatar;
    },
    getNickname(): string {
      return this.userName;
    },
    getPermissions(): [any][] {
      return this.permissions;
    },
    getUserInfo(): UserInfoType {
      return this.info;
    },
  },
  actions: {
    setToken(token: string) {
      this.token = token;
    },
    setAvatar(avatar: string) {
      this.avatar = avatar;
    },
    setPermissions(permissions) {
      this.permissions = permissions;
    },
    setUserInfo(info: UserInfoType) {
      this.info = info;
    },
    // 登录
    async login(params: any) {
      const response = await login(params);
      // @ts-ignore
      const { code, message } = response;
      if (code === ResultEnum.SUCCESS) {
        const ex = 7 * 24 * 60 * 60;
        storage.set(ACCESS_TOKEN, message, ex);
        storage.set(CURRENT_USER, message, ex);
        storage.set(IS_SCREENLOCKED, false);
        this.setToken(message);
        await this.getInfo();
      }
      return response;
    },

    // 获取用户信息
    async getInfo() {
      const result = await getUserInfoApi();
      const { data } = result;
      this.setUserInfo(data);
      return result;
    },

    // 登出
    async logout() {
      this.setPermissions([]);
      this.setUserInfo({ address: '', nickName: '', phone: '', userName: '', email: '' });
      storage.remove(ACCESS_TOKEN);
      storage.remove(CURRENT_USER);
    },
  },
});

// Need to be used outside the setup
export function useUser() {
  return useUserStore(store);
}

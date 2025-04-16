import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { DatabaseOutlined } from '@vicons/antd';
import { renderIcon } from '@/utils/index';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/database',
    name: 'Database',
    redirect: '/database/presentation',
    component: Layout,
    meta: {
      title: '数据库页面',
      icon: renderIcon(DatabaseOutlined),
      sort: 0,
    },
    children: [
      {
        path: 'register',
        name: 'database-register',
        meta: {
          title: '数据库注册',
        },
        component: () => import('@/views/database/register.vue'),
      },
      {
        path: 'presentation',
        name: 'database-presentation',
        meta: {
          title: '数据库展示',
        },
        component: () => import('@/views/database/presentation.vue'),
      },
    ],
  },
];

export default routes;

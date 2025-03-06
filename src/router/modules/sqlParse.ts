import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { ConsoleSqlOutlined } from '@vicons/antd';
import { renderIcon } from '@/utils/index';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/sqlParse',
    name: 'SqlParse',
    redirect: '/sqlParse/presentation',
    component: Layout,
    meta: {
      title: 'SQL解析',
      icon: renderIcon(ConsoleSqlOutlined),
      sort: 10,
    },
    children: [
      {
        path: 'presentation',
        name: 'sqlParse-presentation',
        meta: {
          title: 'SQL解析',
        },
        component: () => import('@/views/sqlParse/presentation.vue'),
      },
    ],
  },
];

export default routes;

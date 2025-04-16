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
      sort: 1,
    },
    children: [
      {
        path: 'tableParse',
        name: 'table-parse',
        meta: {
          title: '表级别SQL解析',
        },
        component: () => import('@/views/sqlParse/tablePresentation.vue'),
      },
      {
        path: 'fieldParse',
        name: 'field-parse',
        meta: {
          title: '字段级别SQL解析',
        },
        component: () => import('@/views/sqlParse/fieldPresentation.vue'),
      },
    ],
  },
];

export default routes;

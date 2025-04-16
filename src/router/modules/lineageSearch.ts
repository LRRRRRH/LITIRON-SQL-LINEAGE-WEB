import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { SearchOutlined } from '@vicons/antd';
import { renderIcon } from '@/utils';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/lineage',
    name: 'LineageSearch',
    redirect: '/lineage/tableSearch',
    component: Layout,
    meta: {
      title: '血缘查询',
      icon: renderIcon(SearchOutlined),
      sort: 2,
    },
    children: [
      {
        path: 'tableSearch',
        name: 'table-search',
        meta: {
          title: '表级别血缘查询',
        },
        component: () => import('@/views/lineage/tableSearch.vue'),
      },
      {
        path: 'filedSearch',
        name: 'filed-search',
        meta: {
          title: '字段级别血缘查询',
        },
        component: () => import('@/views/lineage/filedSearch.vue'),
      },
    ],
  },
];

export default routes;

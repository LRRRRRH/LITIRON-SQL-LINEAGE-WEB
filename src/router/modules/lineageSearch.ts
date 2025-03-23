import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { SearchOutlined } from '@vicons/antd';
import { renderIcon } from '@/utils';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/lineage',
    name: 'LineageSearch',
    redirect: '/lineage/search',
    component: Layout,
    meta: {
      title: '血缘查询',
      icon: renderIcon(SearchOutlined),
      sort: 11,
    },
    children: [
      {
        path: 'search',
        name: 'lineageSearch',
        meta: {
          title: '血缘查询',
        },
        component: () => import('@/views/lineage/search.vue'),
      },
    ],
  },
];

export default routes;

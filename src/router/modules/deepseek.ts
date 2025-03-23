import { RouteRecordRaw } from 'vue-router';
import { Layout } from '@/router/constant';
import { renderIcon } from '@/utils';
import { RobotOutlined } from '@vicons/antd';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/deepseek',
    name: 'DeepseekAsk',
    redirect: '/deepseek/ask',
    component: Layout,
    meta: {
      title: 'AI问答',
      icon: renderIcon(RobotOutlined),
      sort: 12,
    },
    children: [
      {
        path: 'ask',
        name: 'DeepseekAsk',
        meta: {
          title: 'AI问答',
        },
        component: () => import('@/views/ai/deepseek.vue'),
      },
    ],
  },
];

export default routes;

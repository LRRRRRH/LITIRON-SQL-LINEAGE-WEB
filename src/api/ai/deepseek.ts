import { Alova } from '@/utils/http/alova/index';

//deepseek问答
export function askDeepseek(params) {
  return Alova.Post('/deepseek/ask', { params });
}

import { Alova } from '@/utils/http/alova/index';

//解析sql
export function parseRelationTables(data) {
  return Alova.Post('/sql/parse/relation/table', data);
}

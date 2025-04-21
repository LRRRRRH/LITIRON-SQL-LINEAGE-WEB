import { Alova } from '@/utils/http/alova/index';

//解析表级别sql
export function parseRelationTables(data) {
  return Alova.Post('/sql/parse/relation/table', data);
}
//解析字段级别sql
export function parseRelationColumns(data) {
  return Alova.Post('/sql/parse/relation/column', data);
}

import { Alova } from '@/utils/http/alova/index';

//获取数据库连接
export function getConnectionLists() {
  return Alova.Get('/lineage/retrieve/connection');
}
//变更数据库连接,获取数据库信息
export function updateDbConnection(params) {
  return Alova.Get('/lineage/update/connection', { params });
}
//查询图数据库(表纬度)
export function retrieveNeo4jTable(data) {
  return Alova.Post('/lineage/neo4j/retrieve/table', data);
}
//查询图数据库(字段纬度)
export function retrieveNeo4jColumn(data) {
  return Alova.Post('/lineage/neo4j/retrieve/column', data);
}

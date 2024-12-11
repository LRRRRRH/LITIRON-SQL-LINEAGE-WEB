import { Alova } from '@/utils/http/alova/index';

//schema信息
export interface TypeConnectionSchema {
  schemaName: string;
  TypeConnectionSchema: TypeConnectionTable[];
}

//table信息
export interface TypeConnectionTable {
  tableComment: string;
  tableName: string;
}

//获取schema
export function updateDatabaseConnection(params) {
  return Alova.Get<{ list: TypeConnectionSchema[] }>('/database/connection/update', { params });
}

//获取所有连接信息
export function getDatabaseConnectionList() {
  return Alova.Get('/database/retrieve/connection');
}
//获取所有列结构信息
export function getTableAllColumns(params) {
  return Alova.Get('/database/retrieve/column/structure', { params });
}
//获取所有表内容
export function getTableAllDetails(data) {
  return Alova.Post('/database/retrieve/table/details', data, {
    meta: {
      isReturnNativeResponse: true,
    },
  });
}

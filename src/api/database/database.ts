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

//获取pgsql的所有数据库
export function getPgDbList(params) {
  return Alova.Get('/database/retrieve/pgDbs', { params });
}

//更新数据库连接
export function updateDatabaseConnection(params) {
  return Alova.Get<{ list: TypeConnectionSchema[] }>('/database/connection/update', { params });
}

//获取所有连接信息
export function getDatabaseConnectionList() {
  return Alova.Get('/database/retrieve/connection');
}

//获取某个用户的连接信息
export function getDatabaseConnectionListByUid(data) {
  return Alova.Post('/database/myConnection/retrieve', data, {
    meta: {
      isReturnNativeResponse: true,
    },
  });
}

//获取所有表内容
export function getTableAllDetails(data) {
  return Alova.Post('/database/retrieve/table/details', data, {
    meta: {
      isReturnNativeResponse: true,
    },
  });
}

//添加数据库连接
export function addDatabaseConnection(data) {
  return Alova.Post('/database/myConnection/add', data);
}

//编辑数据库连接
export function editDatabaseConnection(data) {
  return Alova.Post('/database/myConnection/edit', data);
}

//编辑数据库连接
export function deleteDatabaseConnection(params) {
  return Alova.Get('/database/myConnection/delete', { params });
}

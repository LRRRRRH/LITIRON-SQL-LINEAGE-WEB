<template>
  <n-flex>
    <div class="top-box">
      <div class="top-box-upload">
        <n-upload
          action=""
          :headers="{
            'naive-info': 'hello!',
          }"
          :data="{
            'naive-data': 'cool! naive!',
          }"
          :max="1"
          :default-upload="false"
          @before-upload="beforeUpload"
          @change="loadTextFile"
        >
          <n-button>上传SQL文件</n-button>
        </n-upload>
      </div>
    </div>
    <div class="presentation-box">
      <div class="presentation-box-left">
        <div class="left-title"><strong>解析内容</strong></div>
        <div class="parse-content">
          <n-input
            v-model:value.trim="parseContent"
            type="textarea"
            placeholder="请输入要解析的语句或者选择上传SQL文件"
          />
        </div>
      </div>
      <div class="presentation-box-middle"
        ><div class="top-box-button">
          <n-button type="primary" @click="parseSqlContent">解析-></n-button>
        </div></div
      >
      <div class="presentation-box-right">
        <div class="right-title"><strong>解析结果</strong></div>
        <div class="parse-result">
          <n-card hoverable style="white-space: pre-wrap"> {{ parseResult }}</n-card></div
        >
      </div>
    </div>
  </n-flex>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useMessage } from 'naive-ui';
  import { Parser } from 'js-sql-parser';
  let parseContent = ref('');
  let parseResult = ref('');
  const message = useMessage();

  const beforeUpload = (data: { file: any; fileList: any }) => {
    if (data.file.file?.type !== 'text/plain') {
      message.error('只能上传txt格式的文件，请重新上传');
      return false;
    }
    return true;
  };
  const loadTextFile = async (fileList) => {
    if (fileList.event) {
      const file = fileList.fileList[0].file;
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e: Event) => {
        const readerEvent = e as ProgressEvent<FileReader>;
        const result = readerEvent.target?.result;
        if (typeof result === 'string') {
          parseContent.value = result;
        } else {
          parseContent.value = '';
        }
      };
      reader.onerror = () => {
        console.error('Error reading file');
        message.error('解析失败，请重试！');
        parseContent.value = '';
      };
    }
  };
  const parseSqlContent = () => {
    if (validateSqlContent(parseContent.value)) {
      console.log('parseSqlContent');
    }
  };
  const validateSqlContent = (parseContent) => {
    if (!parseContent) {
      message.error('解析内容不能为空！');
      return false;
    }
    const parser = new Parser();
    try {
      const sqlList = parseContent.split(';');
      sqlList.forEach((sql) => {
        // 去除空格和换行符
        const trimmedSql = sql.trim();
        if (trimmedSql) {
          parser.parse(sql);
        }
      });
      parseResult.value = '解析成功';
      return true;
    } catch (error) {
      parseResult.value = '解析失败\n' + error;
      console.error('SQL语法错误:', error);
      message.error('SQL语法错误，解析失败，请重试！');
      return false;
    }
  };
</script>
<style lang="less" scoped>
  .top-box {
    display: flex;
    width: 100%;
  }
  .top-box-select {
    width: 20%;
  }
  .top-box-upload {
    width: 100%;
    height: 20%;
    /deep/ .n-upload-trigger {
      width: 52.5%;
    }
    /deep/ .n-button--default-type {
      width: 100%;
      height: 100%;
    }
    /deep/ .n-upload {
      display: flex;
    }
    /deep/ .n-upload-file-list {
      margin-top: 0;
      width: 47.5%;
      /deep/ .n-upload-file-info {
        padding-top: 0 !important;
      }
    }
  }
  .presentation-box {
    width: 100%;
    height: 480px;
    display: flex;
  }
  .presentation-box-left {
    width: 53%;
    border: #515a6e 1px solid;
    height: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    flex-flow: column;
    padding-top: 5px;
  }
  .presentation-box-middle {
    display: flex;
    width: 7%;
    margin-left: 8px;
    align-items: center;
  }
  .presentation-box-right {
    border: #515a6e 1px solid;
    width: 40%;
    height: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    flex-flow: column;
    padding-top: 5px;
  }
  .left-title {
    font-size: 15px;
    margin: 0 auto;
    height: 6%;
  }
  .right-title {
    font-size: 15px;
    margin: 0 auto;
    height: 6%;
  }
  .parse-content {
    padding: 5px;
    height: 90%;
    /deep/ .n-input--textarea {
      height: 100%;
    }
  }
  .parse-result {
    padding: 5px;
    height: 90%;
    /deep/ .n-card {
      height: 100%;
    }
    /deep/ .n-card__content {
      padding: 6.5px 12px;
    }
  }
</style>

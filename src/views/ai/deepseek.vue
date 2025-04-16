<template>
  <n-flex vertical>
    <div class="ai-container">
      <n-spin :show="answerLoading" description="正在生成内容...">
        <div class="answer-box">
          <n-card
            hoverable
            style="white-space: pre-wrap"
            :segmented="{
              content: true,
              footer: 'soft',
            }"
          >
            <template #header-extra> #header-extra</template>
            <n-scrollbar style="height: 280px" ref="scrollRef" class="scrollbar-chat-answer">
              <v-md-preview
                id="answer-container"
                :text="markdownParser.render(answerHtml)"
                mode="dark"
              />
              <span v-if="answerLoading" class="typing-cursor"></span>
            </n-scrollbar>
            <template #action>
              <n-button v-if="answer.value !== ''" @click="showChart">生成图表</n-button>
            </template>
          </n-card>
        </div>
        <div class="question-box">
          <n-flex style="gap: 0">
            <div class="question-box-input">
              <n-input
                type="textarea"
                placeholder="给AI发送问题"
                v-model:value="question"
                autofocus
                :autosize="{
                  minRows: 7,
                }"
                @keydown.enter="askQuestion"
              />
            </div>
            <div class="question-box-button">
              <n-button type="info" @click="askQuestion">发送</n-button>
            </div>
          </n-flex>
        </div>
      </n-spin>
    </div>
    <n-modal
      v-model:show="showChartModal"
      preset="card"
      title="图表预览"
      style="width: 80%; max-width: 800px"
    >
      <iframe :src="chartHtmlSrc" style="width: 100%; height: 500px; border: none"></iframe>
    </n-modal>
  </n-flex>
</template>

<script setup>
  import { nextTick, ref, watch } from 'vue';
  import hljs from 'highlight.js';
  import MarkdownIt from 'markdown-it';
  import VMdPreview from '@kangc/v-md-editor/lib/preview';
  import '@kangc/v-md-editor/lib/style/preview.css';
  import githubTheme from '@kangc/v-md-editor/lib/theme/github.js';
  import '@kangc/v-md-editor/lib/theme/style/github.css';

  VMdPreview.use(githubTheme);
  const answerLoading = ref(false);
  const answer = ref('');
  const answerHtml = ref('');
  const showChartModal = ref(false);
  const chartHtmlSrc = ref('');
  const question = ref('');
  const test = ref('');

  let typewriterQueue = []; // 打字机字符队列
  let typingTimer = null; // 打字机定时器

  const markdownParser = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    xhtmlOut: false,
    highlight: (code, lang) => {
      const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language: validLang }).value;
    },
  });
  function isOnlyNewlines(str) {
    const trimmed = str.trim().replace(/[\n\r\s]/g, '');
    return trimmed.length === 0;
  }
  // 核心打字机逻辑
  const startTypewriter = () => {
    typingTimer = setInterval(async () => {
      if (typewriterQueue.length > 0) {
        const chunk = typewriterQueue.shift(); // 取出整个字符串块
        if (isOnlyNewlines(chunk)) {
          console.log('chunk仅包含换行符');
        } else {
          answer.value += chunk;
          answerHtml.value = markdownParser.render(answer.value);
        }
      } else if (typingTimer) {
        console.log('清除定时器');
        clearInterval(typingTimer);
        typingTimer = null;
      }
      await nextTick();
      const container = document.getElementById('answer-container');
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 80);
  };
  // 提取Markdown中的HTML代码块
  const extractChartHtml = () => {
    const codeBlockRegex = /```html\s*?\r?\n([\s\S]*?)\s*?\r?\n```/;

    const match = codeBlockRegex.exec(answer.value);
    if (match && match[1]) {
      return match[1]
        .replace(/\r\n/g, '\n') // 统一换行符
        .trim()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }

    return null;
  };
  const showChart = () => {
    const htmlCode = extractChartHtml();
    if (htmlCode) {
      const blob = new Blob([htmlCode], { type: 'text/html' });
      chartHtmlSrc.value = URL.createObjectURL(blob);
      showChartModal.value = true;
    } else {
      window.$message.warning('未检测到有效的图表代码');
    }
  };
  // 清理URL对象
  watch(showChartModal, (newVal) => {
    if (!newVal && chartHtmlSrc.value) {
      URL.revokeObjectURL(chartHtmlSrc.value);
      chartHtmlSrc.value = '';
    }
  });
  const askQuestion = async () => {
    answer.value = ''; // 清空历史回答
    answerHtml.value = '';
    typewriterQueue = []; // 重置队列

    answerLoading.value = true;
    fetch(`/litiron/deepseek/askLangchain?content=${encodeURIComponent(question.value)}`, {
      method: 'GET',
      timeout: 6000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
    })
      .then(async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          answerLoading.value = false;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/(?<=data:)/);
          lines.slice(0, -1).forEach((line) => {
            const content = line.replace('data:', '');
            const contentRes = content.replace('data1:', 'data:');
            if (contentRes) {
              typewriterQueue.push(contentRes);
              if (!typingTimer) startTypewriter();
            }
          });
          buffer = lines[lines.length - 1] || '';
        }
        if (buffer) {
          const content = buffer.replace('data:', '');
          const contentRes = content.replace('data1:', 'data:');
          if (contentRes) {
            typewriterQueue.push(contentRes);
          }
        }

        const waitForQueueEmpty = () =>
          new Promise((resolve) => {
            const check = () => {
              if (typewriterQueue.length === 0) {
                resolve();
              } else {
                requestAnimationFrame(check);
              }
            };
            check();
          });
        await waitForQueueEmpty();
      })
      .catch((err) => {
        console.error('Stream error:', err);
      })
      .finally(() => {
        answerLoading.value = false;
        if (typingTimer) {
          clearInterval(typingTimer);
          typingTimer = null;
        }
      });
  };
</script>

<style lang="less" scoped>
  .typing-cursor::after {
    content: '|';
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }

  .ai-container {
    height: calc(100vh - 120px);

    :deep(.n-spin-container) {
      height: 100%;
    }

    :deep(.n-spin-content) {
      height: 100%;
    }
  }

  .answer-box {
    height: 65%;

    :deep(.n-card) {
      height: 100%;
    }

    :deep(.n-card__content) {
      padding-bottom: 0px;
    }
    :deep(.n-card__action) {
      padding: 0 20px;
    }
  }

  .question-box {
    margin-top: 10px;
    height: 35%;
  }

  .question-box-input {
    width: 95%;
  }

  .question-box-button {
    width: 5%;

    :deep(.n-button--medium-type) {
      padding: 0;
      height: 100%;
      width: 100%;
      font-size: 17px;
    }
  }

  #answer-container {
    height: 280px;
    overflow-y: auto;
  }

  /* 调整模态框内iframe样式 */
  .n-modal-body {
    padding: 0 !important;

    iframe {
      border-radius: 8px;
    }
  }
</style>

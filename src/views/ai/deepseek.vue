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
              <n-button v-if="answer.value !== ''">运行</n-button>
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
  </n-flex>
</template>

<script setup>
  import { nextTick, ref } from 'vue';
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
  const question = ref('');
  const test = ref('');

  let typewriterQueue = []; // 打字机字符队列
  let typingTimer = null; // 打字机定时器

  const markdownParser = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
    highlight: (code, lang) => {
      const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language: validLang }).value;
    },
  });
  // 核心打字机逻辑
  const startTypewriter = () => {
    typingTimer = setInterval(async () => {
      if (typewriterQueue.length > 0) {
        // 保留空格和标点
        const chunk = typewriterQueue.splice(0, 3).join('');
        answer.value += chunk.replace(/\\s/g, ' '); // 显式处理空格
        answerHtml.value = markdownParser.render(answer.value);
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
    }, 80); // 调整到更自然的速度
  };

  const askQuestion = async () => {
    answer.value = ''; // 清空历史回答
    answerHtml.value = '';
    typewriterQueue = []; // 重置队列

    answerLoading.value = true;
    fetch(`/litiron/deepseek/ask?content=${encodeURIComponent(question.value)}`, {
      method: 'GET',
      timeout: 300,
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
          buffer += decoder.decode(value);
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach((line) => {
            if (line.startsWith('data:')) {
              const content = line.replace('data:', '');
              typewriterQueue.push(...(content + '\n').split(''));
            }
            if (!typingTimer) {
              startTypewriter();
            }
          });
        }
        // 处理剩余数据
        if (buffer) {
          console.log('Final chunk:', buffer);
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
</style>

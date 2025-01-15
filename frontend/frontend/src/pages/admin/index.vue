<template>
  <div class="home-container">
    <h1 class="page-title">首页</h1>
    <div class="waterfall">
      <div class="note-card" v-for="note in notes" :key="note.id" @click="goToNoteDetail(note.id)">
        <!-- 显示笔记图片 -->
        <img 
          v-if="note.imgUris && note.imgUris.length > 0" 
          :src="note.imgUris[0]" 
          alt="笔记图片" 
          class="note-image" 
        />
        <h3 class="note-title">{{ note.title }}</h3>
        <p class="note-content">{{ note.content }}</p>
        <small class="note-date">{{ formatDate(note.updateTime) }}</small>
      </div>
    </div>
    <div class="load-more-container">
      <button 
        class="load-more" 
        @click="loadMoreNotes" 
        :disabled="loading || noMoreNotes"
      >
        <span v-if="loading">加载中...</span>
        <span v-else-if="noMoreNotes">没有更多内容了</span>
        <span v-else>加载更多</span>
      </button>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { getToken } from '@/composables/cookie';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'Home',
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const error = ref(null);
    const noMoreNotes = ref(false);
    const notes = ref([]);
    const page = ref(1);
    const size = ref(10);
    const userId = ref(null);

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''; // 如果没有日期，返回空字符串
      try {
        // 直接截取前16位，即 "YYYY-MM-DD HH:mm"
        return dateString.substring(0, 16);
      } catch (error) {
        console.error('日期格式化错误:', error, '日期字符串:', dateString);
        return ''; // 如果发生错误，返回空字符串
      }
    };

    // 获取笔记详情
    const fetchNoteDetails = async (note, token) => {
      try {
        const response = await axios.post(
          `/api/note/note/detail`,
          { id: note.id },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          // 将imgUris添加到笔记对象中
          note.imgUris = response.data.data.imgUris;
          // 如果需要其他详细信息，也可以在这里添加
        } else {
          console.error(`获取笔记详情失败（ID: ${note.id}）:`, response.data.message);
          note.imgUris = []; // 或者设置为默认图片
        }
      } catch (err) {
        console.error(`获取笔记详情时出错（ID: ${note.id}）:`, err);
        note.imgUris = []; // 或者设置为默认图片
      }
    };

    // 获取笔记
    const fetchNotes = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error('未找到Token！');
          alert('未找到认证信息，请重新登录。');
          return;
        }
        loading.value = true;
        const response = await axios.post(
          `/api/note/note/list`,
          { size: size.value, page: page.value },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          const fetchedNotes = response.data.data;
          if (fetchedNotes.length < size.value) {
            noMoreNotes.value = true;
          }

          // 并行获取所有笔记的详情
          const detailPromises = fetchedNotes.map(note => fetchNoteDetails(note, token));
          await Promise.all(detailPromises);

          // 将带有详情的笔记添加到notes中
          notes.value = [...notes.value, ...fetchedNotes];
        } else {
          console.error("获取笔记失败:", response.data.message);
          error.value = "获取笔记失败: " + response.data.message;
        }
      } catch (err) {
        console.error('获取笔记时出错:', err);
        error.value = "获取笔记时发生错误，请稍后重试。";
      } finally {
        loading.value = false;
      }
    };

    // 加载更多笔记
    const loadMoreNotes = () => {
      if (!noMoreNotes.value && !loading.value) {
        page.value++;
        fetchNotes();
      }
    };

    // 组件挂载时获取初始笔记
    fetchNotes();

    // 修改跳转函数
    const goToNoteDetail = (id) => {
      router.push({ 
        name: 'NoteDetail', 
        params: { 
          id,
          userId: userId.value
        } 
      });
    };

    // 获取当前用户ID
    const getCurrentUser = async () => {
      try {
        const token = getToken();
        const response = await axios.get('/api/user/user/current', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.data.success) {
          userId.value = response.data.data.id;
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    // 在组件挂载时获取用户ID
    onMounted(() => {
      getCurrentUser();
      fetchNotes();
    });

    return {
      notes,
      loadMoreNotes,
      loading,
      noMoreNotes,
      error,
      formatDate,
      goToNoteDetail,
    };
  },
};
</script>

<style scoped>
.home-container {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f0f2f5;
  background-image: linear-gradient(to bottom right, #fffaf0, #f5f5dc);
  box-sizing: border-box;
}

.page-title {
  font-size: 2.5em;
  margin-bottom: 40px;
  color: #333;
  text-align: center;
}

.waterfall {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
}

.note-card {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 25px 20px;
  border-radius: 12px;
  width: calc(33.333% - 30px);
  box-sizing: border-box;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
}

.note-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.note-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 15px;
}

.note-title {
  font-size: 1.75em;
  margin-bottom: 15px;
  color: #1a202c;
  text-align: left;
}

.note-content {
  flex-grow: 1;
  font-size: 1em;
  color: #4a5568;
  margin-bottom: 20px;
  text-align: left;
  line-height: 1.6;
}

.note-date {
  font-size: 0.85em;
  color: #a0aec0;
  text-align: left;
}

.load-more-container {
  margin-top: 40px;
  text-align: center;
}

.load-more {
  padding: 12px 30px;
  font-size: 1.1em;
  color: #ffffff;
  background-color: #3182ce;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.load-more:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
}

.load-more:not(:disabled):hover {
  background-color: #2b6cb0;
  transform: translateY(-2px);
}

.error-message {
  margin-top: 30px;
  color: #e53e3e;
  font-weight: bold;
  text-align: center;
  font-size: 1em;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .note-card {
    width: calc(50% - 30px);
  }
}

@media (max-width: 600px) {
  .note-card {
    width: 100%;
  }

  .waterfall {
    gap: 20px;
  }

  .load-more {
    width: 100%;
    padding: 12px 0;
  }
}
</style>

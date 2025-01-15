<template>
  <div class="user-profile-container">
    <el-button @click="router.back()" class="back-button">
      返回
    </el-button>
    <!-- 用户基本信息部分 -->
    <div class="user-profile">
      <div class="user-info">
        <img :src="userInfo.avatar || defaultAvatar" alt="用户头像" class="user-info__avatar" />
        <div class="user-info__details">
          <p><strong>用户名:</strong> {{ userInfo.nickName }}</p>
          <p><strong>简介:</strong> {{ userInfo.introduction || '这个人很懒，什么都没写~' }}</p>
          <p><strong>粉丝数:</strong> {{ userStats.fansTotal }}</p>
          <p><strong>关注数:</strong> {{ userStats.followingTotal }}</p>
          <p><strong>笔记总数:</strong> {{ userStats.noteTotal }}</p>
          <p><strong>点赞总数:</strong> {{ userStats.likeTotal }}</p>
          <p><strong>收藏总数:</strong> {{ userStats.collectTotal }}</p>
        </div>
      </div>
    </div>

    <!-- 用户笔记列表部分 -->
    <div class="notes-container">
      <h2>笔记列表</h2>
      <el-row :gutter="20">
        <el-col v-for="note in notes" :key="note.id" :span="6">
          <el-card 
            shadow="hover" 
            class="box-card" 
            @click="goToNoteDetail(note.id)"
            style="cursor: pointer;"
          >
            <img 
              v-if="note.imgUris && note.imgUris.length > 0" 
              :src="note.imgUris[0]" 
              alt="笔记图片"
              style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px;"
            />
            <div style="margin-top: 10px;">
              <h3 class="note-title">{{ note.title }}</h3>
              <p class="note-content">{{ note.content }}</p>
              <div class="note-date">{{ formatDate(note.updateTime) }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <div class="load-more-container">
        <el-button 
          @click="loadMoreNotes" 
          :loading="loading"
          :disabled="noMoreNotes"
        >
          {{ noMoreNotes ? '没有更多内容了' : '加载更多' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { getToken } from '@/composables/cookie';

const route = useRoute();
const router = useRouter();

// 状态变量
const userInfo = ref({});
const userStats = ref({});
const notes = ref([]);
const loading = ref(false);
const noMoreNotes = ref(false);
const page = ref(1);
const size = ref(10);
const defaultAvatar = "https://img.quanxiaoha.com/quanxiaoha/f97361c0429d4bb1bc276ab835843065.jpg";

// 获取用户基本信息
const fetchUserInfo = async () => {
  try {
    const token = getToken();
    const response = await axios.post('/api/user/user/findById', 
      { id: route.params.userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data.success) {
      userInfo.value = response.data.data;
      if (!userInfo.value.avatar) {
        userInfo.value.avatar = defaultAvatar;
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
};

// 获取用户统计信息
const fetchUserStats = async () => {
  try {
    const token = getToken();
    const response = await axios.post('/api/count/count/user',
      { userId: route.params.userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data.success) {
      userStats.value = response.data.data;
    }
  } catch (error) {
    console.error('获取用户统计信息失败:', error);
  }
};

// 获取用户笔记列表
const fetchUserNotes = async () => {
  try {
    loading.value = true;
    const token = getToken();
    const response = await axios.post('/api/note/note/UserNoteList',
      {
        userId: route.params.userId,
        page: page.value,
        size: size.value,
        visible: 0,
        status: 1
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data.success) {
      const newNotes = response.data.data;
      if (newNotes.length < size.value) {
        noMoreNotes.value = true;
      }
      notes.value = [...notes.value, ...newNotes];
    }
  } catch (error) {
    console.error('获取用户笔记失败:', error);
  } finally {
    loading.value = false;
  }
};

// 加载更多笔记
const loadMoreNotes = () => {
  if (!noMoreNotes.value && !loading.value) {
    page.value++;
    fetchUserNotes();
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''; // 如果没有日期，返回空字符串
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // 检查日期是否有效
      return ''; // 如果日期无效，返回空字符串
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return ''; // 如果发生错误，返回空字符串
  }
};

// 添加跳转到笔记详情的方法
const goToNoteDetail = (noteId) => {
  router.push({ 
    name: 'NoteDetail', 
    params: { 
      id: noteId,
      userId: route.params.userId // 传递当前用户ID
    } 
  });
};

// 初始化
onMounted(async () => {
  await fetchUserInfo();
  await fetchUserStats();
  await fetchUserNotes();
});
</script>

<style scoped>
.user-profile-container {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f9fafb;
}

.back-button {
  margin-bottom: 20px;
}

.user-profile {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 40px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  align-items: flex-start;
  gap: 30px;
}

.user-info__avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info__details {
  flex: 1;
}

.user-info__details p {
  margin: 8px 0;
  font-size: 1.1em;
  color: #333;
}

.notes-container {
  margin-top: 20px;
}

.notes-container h2 {
  margin-bottom: 20px;
  font-size: 1.5em;
  color: #333;
}

.box-card {
  margin-bottom: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer; /* 添加指针样式 */
}

.box-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.note-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 8px;
}

.note-content {
  color: #666;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-date {
  color: #999;
  font-size: 0.9em;
}

.load-more-container {
  text-align: center;
  margin-top: 20px;
  margin-bottom: 40px;
}

@media (max-width: 768px) {
  .user-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style> 
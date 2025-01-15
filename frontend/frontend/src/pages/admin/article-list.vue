<template>
  <div class="my-notes-container">
    <h1>我的笔记</h1>

    <div v-if="loading" class="loading-spinner">
      <p>加载中...</p>
    </div>

    <div v-else>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-else>
        <div class="actions" v-if="status === 1">
          <button class="publish-btn" @click="openPublishModal">发布笔记</button>
        </div>

        <div class="notes-grid">
          <div class="my-note-card" :class="{ 'is-top': note.isTop }" v-for="note in sortedNotes" :key="note.id"
               @click="goToNoteDetail(note.id)">
            <div class="note-images" v-if="note.imgUris && note.imgUris.length">
              <img v-for="(img, index) in note.imgUris" :key="index" :src="img" alt="笔记图片" class="note-image" />
            </div>
            <h3>{{ note.title }}</h3>
            <p>{{ note.content }}</p>
            <small>{{ formatDate(note.updateTime) }}</small>
            <div class="note-actions">
              <button class="edit-btn" @click.stop="editNote(note)" v-if="status === 1"
                      @mouseover="showTooltip('编辑')" @mouseleave="hideTooltip"></button>
              <button class="top-btn" @click.stop="toggleTop(note)" :class="{ active: note.isTop }"
                      @mouseover="showTooltip('置顶')" @mouseleave="hideTooltip"></button>
              <button class="visibility-btn" @click.stop="toggleVisibility(note)" :class="{ active: note.visible === 1 }"
                      @mouseover="showTooltip('可见性')" @mouseleave="hideTooltip"></button>
              <button class="delete-btn" v-if="status === 1" @click.stop="deleteNote(note)"
                      @mouseover="showTooltip('删除')" @mouseleave="hideTooltip"></button>
              <button class="restore-btn" v-else @click.stop="restoreNote(note)"
                      @mouseover="showTooltip('恢复')" @mouseleave="hideTooltip"></button>
            </div>
          </div>
        </div>
        <div
            v-if="tooltipVisible"
            class="tooltip"
            :style="{ top: tooltipPosition.top + 'px', left: tooltipPosition.left + 'px' }"
        >
          {{ tooltipText }}
        </div>
        <div class="load-more-container">
          <button class="load-more" @click="loadMoreNotes" :disabled="loading || noMoreNotes">
            <span v-if="loading">加载中...</span>
            <span v-else-if="noMoreNotes">没有更多内容了</span>
            <span v-else>加载更多</span>
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="isEditModalOpen" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal">
          <h2>编辑笔记</h2>
          <form @submit.prevent="submitEditNote" class="form">
            <label>
              标题:
              <input type="text" v-model="currentNote.title" required />
            </label>
            <label>
              内容:
              <textarea v-model="currentNote.content" required></textarea>
            </label>
            <label>
              上传图片:
              <input type="file" multiple @change="handleEditImageUpload" accept="image/*" />
            </label>
            <div class="image-previews">
              <div v-for="(img, index) in currentNote.imgUris" :key="index" class="image-preview">
                <img :src="img" alt="预览图片" />
                <button type="button" @click="removeImage(currentNote.imgUris, index)">×</button>
              </div>
            </div>
            <div class="form-buttons">
              <button type="submit" class="btn save-btn" :disabled="loading">保存修改</button>
              <button type="button" class="btn cancel-btn" @click="closeEditModal">取消</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="isPublishModalOpen" class="modal-overlay" @click.self="closePublishModal">
        <div class="modal">
          <h2>发布笔记</h2>
          <form @submit.prevent="submitPublishNote" class="form">
            <label>
              标题:
              <input type="text" v-model="newNote.title" required />
            </label>
            <label>
              内容:
              <textarea v-model="newNote.content" required></textarea>
            </label>
            <label>
              上传图片:
              <input type="file" multiple @change="handlePublishImageUpload" accept="image/*" />
            </label>
            <div class="image-previews">
              <div v-for="(img, index) in newNote.imgUris" :key="index" class="image-preview">
                <img :src="img" alt="预览图片" />
                <button type="button" @click="removeImage(newNote.imgUris, index)">×</button>
              </div>
            </div>
            <div class="form-buttons">
              <button type="submit" class="btn save-btn" :disabled="loading">发布</button>
              <button type="button" class="btn cancel-btn" @click="closePublishModal">取消</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from 'axios';
import { getToken } from '@/composables/cookie';
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';

export default {
  setup() {
    const router = useRouter();
    const myNotes = ref([]);
    const userId = ref(null);
    const size = ref(10);
    const page = ref(1);
    const loading = ref(false);
    const error = ref(null);
    const noMoreNotes = ref(false);

    const isEditModalOpen = ref(false);
    const isPublishModalOpen = ref(false);
    const currentNote = reactive({
      id: null,
      title: "",
      content: "",
      updateTime: "",
      isTop: false,
      visible: 1,
      imgUris: [] // 初始化为数组
    });
    const newNote = reactive({
      type: 0,
      imgUris: [], // 初始化为数组
      title: "",
      content: "",
      topicId: 1
    });

    const status = ref(1); // 1: 正常展示, 2: 查看被删除的笔记

    // 计算属性：格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    // 获取笔记详情
    const fetchNoteDetails = async (note, token) => {
      try {
        const response = await axios.post(
          '/api/note/note/detail',
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
          note.imgUris = response.data.data.imgUris || [];
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

    // 获取当前用户信息
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error('未找到认证信息，请重新登录。');
        }
        const response = await axios.get('/api/user/user/current', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.data.success) {
          userId.value = response.data.data.id;
          fetchMyNotes();
        } else {
          throw new Error(response.data.message || '获取用户信息失败。');
        }
      } catch (err) {
        console.error('获取用户信息时出错:', err);
        error.value = err.message || '获取用户信息时出错。';
      }
    };

    // 获取用户的笔记
    const fetchMyNotes = async () => {
      if (!userId.value) {
        error.value = '无法获取用户 ID，无法获取笔记列表。';
        return;
      }
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/UserNoteList',
          {
            userId: userId.value,
            size: size.value,
            page: page.value,
            status: status.value // 添加 status 参数
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          const fetchedNotes = response.data.data.map(note => ({
            ...note,
            imgUris: note.imgUris || [], // 确保imgUris为数组
            isTop: !!note.isTop // 确保isTop为布尔类型
          }));
          if (fetchedNotes.length < size.value) {
            noMoreNotes.value = true;
          }

          // 并行获取所有笔记的详情
          const detailPromises = fetchedNotes.map(note => fetchNoteDetails(note, token));
          await Promise.all(detailPromises);

          // 将带有详情的笔记添加到myNotes中
          myNotes.value = [...myNotes.value, ...fetchedNotes];
        } else {
          throw new Error(response.data.message || '获取笔记列表失败。');
        }
      } catch (err) {
        console.error('获取笔记列表时出错:', err);
        error.value = err.message || '获取笔记列表时出错。';
      } finally {
        loading.value = false;
      }
    };

    // 计算属性：排序后的笔记
    const sortedNotes = computed(() => {
      return myNotes.value.slice().sort((a, b) => {
        if (a.isTop === b.isTop) {
          return new Date(b.updateTime) - new Date(a.updateTime);
        }
        return b.isTop - a.isTop;
      });
    });

    // 切换笔记状态
    const changeStatus = (newStatus) => {
      if (status.value !== newStatus) {
        status.value = newStatus;
        // 重置笔记列表和分页信息
        myNotes.value = [];
        page.value = 1;
        noMoreNotes.value = false;
        // 重新获取笔记
        fetchMyNotes();
      }
    };

    // 加载更多笔记
    const loadMoreNotes = () => {
      if (!noMoreNotes.value && !loading.value) {
        page.value++;
        fetchMyNotes();
      }
    };

    // 编辑笔记
    const editNote = (note) => {
      Object.assign(currentNote, note);
      // 确保imgUris是数组
      currentNote.imgUris = note.imgUris ? [...note.imgUris] : [];
      isEditModalOpen.value = true;
    };

    // 提交编辑笔记
    const submitEditNote = async () => {
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/update',
          {
            id: currentNote.id,
            title: currentNote.title,
            content: currentNote.content,
            imgUris: currentNote.imgUris // 发送图片URL数组（Base64数据）
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          // 更新笔记列表
          const index = myNotes.value.findIndex(note => note.id === currentNote.id);
          if (index !== -1) {
            myNotes.value[index] = {
              ...myNotes.value[index],
              title: currentNote.title,
              content: currentNote.content,
              imgUris: [...currentNote.imgUris], // 更新图片URL
              updateTime: new Date().toISOString(),
              isTop: currentNote.isTop
            };
          }
          alert('笔记已更新。');
          closeEditModal();
        } else {
          throw new Error(response.data.message || '更新笔记失败。');
        }
      } catch (err) {
        console.error('更新笔记时出错:', err);
        alert(err.message || '更新笔记时出错。');
      } finally {
        loading.value = false;
      }
    };

    // 关闭编辑模态窗口
    const closeEditModal = () => {
      isEditModalOpen.value = false;
      // 重置当前笔记
      Object.assign(currentNote, {
        id: null,
        title: "",
        content: "",
        updateTime: "",
        isTop: false,
        visible: 1,
        imgUris: []
      });
    };

    // 发布笔记
    const openPublishModal = () => {
      isPublishModalOpen.value = true;
    };

    const closePublishModal = () => {
      isPublishModalOpen.value = false;
      // 重置新笔记
      Object.assign(newNote, {
        type: 0,
        imgUris: [],
        title: "",
        content: "",
        topicId: 1
      });
    };

    const submitPublishNote = async () => {
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/publish',
          {
            type: newNote.type,
            imgUris: newNote.imgUris,  // 发送图片URL数组（MinIO生成的访问链接）
            title: newNote.title,
            content: newNote.content,
            topicId: newNote.topicId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          alert('笔记已发布。');
          console.log(newNote.imgUris);
          // 重新加载笔记列表
          myNotes.value = [];
          page.value = 1;
          noMoreNotes.value = false;
          fetchMyNotes();
          closePublishModal();
        } else {
          throw new Error(response.data.message || '发布笔记失败。');
        }
      } catch (err) {
        console.error('发布笔记时出错:', err);
        alert(err.message || '发布笔记时出错。');
      } finally {
        loading.value = false;
      }
    };



    // // 处理图片上传（发布笔记）
    // const handlePublishImageUpload = (event) => {
    //   const files = event.target.files;
    //   if (!files.length) return;

    //   Array.from(files).forEach(file => {
    //     const reader = new FileReader();
    //     reader.onload = (e) => {
    //       newNote.imgUris.push(e.target.result); // 添加 Base64 数据 URL
    //     };
    //     reader.onerror = (err) => {
    //       console.error('图片读取出错:', err);
    //       alert('图片读取出错。');
    //     };
    //     reader.readAsDataURL(file);
    //   });

    //   // 清空文件输入
    //   event.target.value = '';
    // };

    // // 处理图片上传（编辑笔记）
    // const handleEditImageUpload = (event) => {
    //   const files = event.target.files;
    //   if (!files.length) return;

    //   Array.from(files).forEach(file => {
    //     const reader = new FileReader();
    //     reader.onload = (e) => {
    //       currentNote.imgUris.push(e.target.result); // 添加 Base64 数据 URL
    //     };
    //     reader.onerror = (err) => {
    //       console.error('图片读取出错:', err);
    //       alert('图片读取出错。');
    //     };
    //     reader.readAsDataURL(file);
    //   });

    //   // 清空文件输入
    //   event.target.value = '';
    // };

    // 处理图片上传（发布笔记）
    const handlePublishImageUpload = async (event) => {
      const files = event.target.files;
      if (!files.length) return;

      const uploadedImageUrls = [];

      for (let file of files) {
        const formData = new FormData();
        formData.append('file', file); // 根据后端接口文档，字段名为 'file'

        try {
          // 上传文件到后端
          const response = await axios.post('/file/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              // 如果需要认证，可以添加 Authorization 头
              'Authorization': `Bearer ${getToken()}`,
            },
          });

          if (response.data.success) {
            // 获取图片URL并添加到数组中
            uploadedImageUrls.push(response.data.data);
          } else {
            throw new Error(response.data.message || '图片上传失败');
          }
        } catch (err) {
          console.error('上传图片失败:', err);
          alert('上传图片失败: ' + (err.response?.data?.message || err.message));
          return; // 如果有一个文件上传失败，可以选择停止后续上传
        }
      }

      // 将所有上传的图片URL添加到 newNote.imgUris 中
      newNote.imgUris = [...newNote.imgUris, ...uploadedImageUrls];

      // 清空文件输入
      event.target.value = '';
    };

    // 处理图片上传（编辑笔记）
    const handleEditImageUpload = async (event) => {
      const files = event.target.files;
      if (!files.length) return;

      const uploadedImageUrls = [];

      for (let file of files) {
        const formData = new FormData();
        formData.append('file', file); // 根据后端接口文档，字段名为 'file'

        try {
          // 上传文件到后端
          const response = await axios.post('/file/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              // 如果需要认证，可以添加 Authorization 头
              'Authorization': `Bearer ${getToken()}`,
            },
          });

          if (response.data.success) {
            // 获取图片URL并添加到数组中
            uploadedImageUrls.push(response.data.data);
          } else {
            throw new Error(response.data.message || '图片上传失败');
          }
        } catch (err) {
          console.error('上传图片失败:', err);
          alert('上传图片失败: ' + (err.response?.data?.message || err.message));
          return; // 如果有一个文件上传失败，可以选择停止后续上传
        }
      }

      // 将所有上传的图片URL添加到 currentNote.imgUris 中
      currentNote.imgUris = [...currentNote.imgUris, ...uploadedImageUrls];

      // 清空文件输入
      event.target.value = '';
    };



    // 移除图片
    const removeImage = (imgUrisArray, index) => {
      imgUrisArray.splice(index, 1);
    };

    // 删除笔记
    const deleteNote = async (note) => {
      if (!confirm('确定要删除这篇笔记吗？')) return;
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/delete',
          {
            type: note.type,
            videoUri: note.videoUri || null,
            title: note.title,
            content: note.content,
            topicId: note.topicId,
            id: note.id
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          alert('笔记已删除。');
          // 从列表中移除
          myNotes.value = myNotes.value.filter(n => n.id !== note.id);
        } else {
          throw new Error(response.data.message || '删除笔记失败。');
        }
      } catch (err) {
        console.error('删除笔记时出错:', err);
        alert(err.message || '删除笔记时出错。');
      } finally {
        loading.value = false;
      }
    };

    // 恢复已删除的笔记
    const restoreNote = async (note) => {
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/restore', // 确保后端有此 API
          {
            id: note.id
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          alert('笔记已恢复。');
          // 从已删除的列表中移除
          myNotes.value = myNotes.value.filter(n => n.id !== note.id);
        } else {
          throw new Error(response.data.message || '恢复笔记失败。');
        }
      } catch (err) {
        console.error('恢复笔记时出错:', err);
        alert(err.message || '恢复笔记时出错。');
      } finally {
        loading.value = false;
      }
    };

    // 置顶或取消置顶笔记
    const toggleTop = async (note) => {
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/top',
          {
            id: note.id,
            isTop: !note.isTop
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          note.isTop = !note.isTop;
          alert(note.isTop ? '笔记已置顶。' : '笔记已取消置顶。');
          // 无需手动排序，因为 sortedNotes 会自动响应变化
        } else {
          throw new Error(response.data.message || '操作失败。');
        }
      } catch (err) {
        console.error('置顶笔记时出错:', err);
        alert(err.message || '操作时出错。');
      } finally {
        loading.value = false;
      }
    };

    // 切换笔记可见性
    const toggleVisibility = async (note) => {
      try {
        loading.value = true;
        const token = getToken();
        const response = await axios.post(
          '/api/note/note/visible/onlyme',
          {
            id: note.id,
            visible: note.visible === 1 ? 0 : 1 // 修正字段名和逻辑
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.success) {
          note.visible = note.visible === 1 ? 0 : 1;
          alert(note.visible === 1 ? '笔记现在公开可见。' : '笔记现在仅自己可见。');
        } else {
          throw new Error(response.data.message || '操作失败。');
        }
      } catch (err) {
        console.error('切换可见性时出错:', err);
        alert(err.message || '操作时出错。');
      } finally {
        loading.value = false;
      }
    };

    // 组件挂载时获取用户信息和初始笔记
    fetchCurrentUser();

    // 修改跳转函数
    const goToNoteDetail = (id) => {
      router.push({
        name: 'NoteDetail',
        params: {
          id,
          userId: userId.value // 使用已有的 userId
        }
      });
    };

    return {
      myNotes,
      sortedNotes, // 添加计算属性到返回对象
      status, // 添加 status 变量
      loading,
      error,
      noMoreNotes,
      loadMoreNotes,
      changeStatus, // 添加过滤方法到返回对象
      editNote,
      isEditModalOpen,
      currentNote,
      submitEditNote,
      closeEditModal,
      formatDate,
      isPublishModalOpen,
      openPublishModal,
      closePublishModal,
      newNote,
      submitPublishNote,
      deleteNote,
      restoreNote, // 添加恢复方法到返回对象
      toggleTop,
      toggleVisibility,
      handlePublishImageUpload,
      handleEditImageUpload,
      removeImage,
      goToNoteDetail,
    };
  },

  data() {
    return {
      tooltipVisible: false,
      tooltipText: '',
      tooltipPosition: {
        top: '0px',
        left: '0px'
      }
      // 其他数据属性...
    };
  },
  methods: {
    showTooltip(text) {
      this.tooltipText = text;
      this.tooltipVisible = true;
      this.$nextTick(() => {
        const tooltip = this.$el.querySelector('.tooltip');
        if (tooltip) {
          this.tooltipPosition.top = `${tooltip.offsetTop - tooltip.offsetHeight - 10}px`;
          this.tooltipPosition.left = `${tooltip.offsetLeft}px`;
        }
      });
    },
    hideTooltip() {
      this.tooltipVisible = false;
    }
    // 其他方法...
  }
};
</script>


<style scoped>
.my-notes-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #f8f9fa;
  box-sizing: border-box;
  background-image: linear-gradient(to bottom right, #e6f2ff, #ffffff);
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #343a40;
}

.filter-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  gap: 10px;
}

.filter-btn {
  padding: 8px 16px;
  font-size: 1em;
  color: #fff;
  background-color: #6c757d;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.filter-btn.active {
  background-color: #007bff;
}

.filter-btn:hover:not(.active) {
  background-color: #5a6268;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.publish-btn {
  padding: 10px 20px;
  font-size: 1em;
  color: #fff;
  background-color: #17a2b8;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.publish-btn:hover {
  background-color: #138496;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.my-note-card {
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.my-note-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.my-note-card.is-top {
  border-left: 5px solid #28a745;
}

.my-note-card h3 {
  font-size: 1.5em;
  margin: 15px 0 10px 0;
  color: #007bff;
}

.my-note-card p {
  font-size: 1em;
  color: #555;
  margin-bottom: 15px;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.my-note-card small {
  font-size: 0.8em;
  color: #999;
}

.note-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.note-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  border-radius: 5px;
}

.note-images img {
  width: calc(50% - 10px);
}

.my-note-card.is-top .note-images img {
  width: calc(50% - 10px);
}

.note-actions {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn,
.delete-btn,
.top-btn,
.visibility-btn,
.restore-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease, width 0.3s ease, height 0.3s ease;
  overflow: hidden;
  position: relative;
  background-color: #005f73;
  color: #fff;
}

.edit-btn::before,
.delete-btn::before,
.top-btn::before,
.visibility-btn::before,
.restore-btn::before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.8em;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease, bottom 0.3s ease;
}

.edit-btn:hover::before,
.delete-btn:hover::before,
.top-btn:hover::before,
.visibility-btn:hover::before,
.restore-btn:hover::before {
  opacity: 1;
  bottom: 40px;
}

.edit-btn:hover {
  background-color: #004f5e;
}

.delete-btn:hover {
  background-color: #004f5e;
  box-shadow: 0 4px 15px rgba(0, 95, 115, 0.3);
}

.restore-btn:hover {
  background-color: #004f5e;
}

.top-btn.active {
  background-color: #004f5e;
}

.top-btn:hover:not(.active) {
  background-color: #004f5e;
}

.visibility-btn.active {
  background-color: #004f5e;
}

.visibility-btn:hover:not(.active) {
  background-color: #004f5e;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.load-more {
  padding: 10px 20px;
  font-size: 1em;
  color: #fff;
  background-color: #28a745;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.load-more:disabled {
  background-image: none;
  background-color: #6c757d;
  cursor: not-allowed;
  box-shadow: none;
}

.load-more:hover:not(:disabled) {
  background-color: #218838;
}

.error-message {
  color: red;
  text-align: center;
  margin-top: 20px;
  font-weight: bold;
}

.loading-spinner {
  text-align: center;
  font-size: 1.2em;
  color: #007bff;
}

/* 模态窗口样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: #ffffff;
  padding: 30px;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  /* 增加宽度以容纳图片预览 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  position: relative;
}

.modal h2 {
  margin-bottom: 20px;
  color: #343a40;
}

.form {
  display: flex;
  flex-direction: column;
}

.form label {
  margin-bottom: 15px;
  color: #333;
  font-weight: bold;
}

.form input,
.form textarea {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
}

.form textarea {
  resize: vertical;
  height: 100px;
}

.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.image-preview {
  position: relative;
  width: 100px;
  height: 100px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 5px;
}

.image-preview button {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(220, 53, 69, 0.8);
  border: none;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 0.8em;
  line-height: 20px;
  text-align: center;
  padding: 0;
}

.image-preview button:hover {
  background-color: rgba(220, 53, 69, 1);
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.save-btn {
  background-color: #28a745;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.save-btn:hover {
  background-color: #218838;
}

.cancel-btn {
  background-color: #6c757d;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

/* 过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notes-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  .my-note-card p {
    height: 60px;
    -webkit-line-clamp: 2;
  }
}

@media (max-width: 480px) {
  .notes-grid {
    grid-template-columns: 1fr;
  }

  .my-note-card p {
    height: 80px;
    -webkit-line-clamp: 3;
  }

  .modal {
    padding: 20px;
  }

  .form-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
  }

  .image-preview {
    width: 80px;
    height: 80px;
  }

  .note-image {
    max-height: 150px;
  }

  .note-images img {
    width: 100%;
  }
}

/* 新增样式：置顶标识 */
/* .my-note-card::before {
  content: '置顶';
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: #28a745;
  color: #fff;
  padding: 2px 6px;
  font-size: 0.8em;
  border-radius: 3px;
  display: none;
}

.my-note-card.is-top::before {
  display: block;
} */
/*
.tooltip {
  position: fixed;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  z-index: 99999;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  opacity: 0;
  transform: translateY(-100px);
}
*/
.tooltip.visible {
  opacity: 1;
  transform: translateY(0);
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  margin-left: -10px;
  border-width: 10px;
  border-style: solid;
}

.my-note-card.is-top::before {
  content: '置顶';
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: #28a745;
  color: #fff;
  padding: 2px 6px;
  font-size: 0.8em;
  border-radius: 3px;
  display: block;
}
</style>

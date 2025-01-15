<template>
  <div class="user-profile-container">
    <div class="user-profile">
      <!-- 用户信息展示界面 -->
      <h1>用户信息</h1>
      <div class="user-info">
        <img :src="userInfo.avatar" alt="用户头像" class="user-info__avatar" />
        <div class="user-info__details">
          <p><strong>用户名:</strong> {{ userInfo.nickname }}</p>
          <p><strong>邮箱:</strong> {{ userInfo.email }}</p>
          <p><strong>生日:</strong> {{ formattedBirthday }}</p>
          <p><strong>性别:</strong> {{ gender }}</p>
          <p><strong>简介:</strong> {{ userInfo.introduction }}</p>
          <p><strong>粉丝数:</strong> {{ userStats.fansTotal }}</p>
          <p><strong>关注数:</strong> {{ userStats.followingTotal }}</p>
          <p><strong>笔记总数:</strong> {{ userStats.noteTotal }}</p>
          <p><strong>点赞总数:</strong> {{ userStats.likeTotal }}</p>
          <p><strong>收藏总数:</strong> {{ userStats.collectTotal }}</p>
        </div>
      </div>
      <div class="user-info__actions">
        <button class="btn btn--edit" @click="openEditModal">编辑信息</button>
        <button class="btn btn--change-password" @click="openChangePasswordModal">修改密码</button>
      </div>
    </div>

    <!-- 编辑信息模态窗口 -->
    <transition name="fade">
      <div v-if="isEditModalOpen" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal">
          <h2>修改用户信息</h2>
          <form @submit.prevent="updateUserInfo" class="form">
            <div class="form__group">
              <label for="nickname">用户名:</label>
              <input id="nickname" type="text" v-model="userInfo.nickname" required />
            </div>
            <div class="form__group">
              <label for="birthday">生日:</label>
              <input id="birthday" type="date" v-model="userInfo.birthday" required />
            </div>
            <div class="form__group">
              <label for="sex">性别:</label>
              <select id="sex" v-model="userInfo.sex" required>
                <option value="1">女</option>
                <option value="0">男</option>
              </select>
            </div>
            <div class="form__group">
              <label for="introduction">简介:</label>
              <textarea id="introduction" v-model="userInfo.introduction" rows="4"></textarea>
            </div>
            <div class="form__group">
              <label for="avatar">头像:</label>
              <input id="avatar" type="file" @change="onFileChange($event, 'avatar')" accept="image/*" />
              <img v-if="userInfo.avatar && isFile(userInfo.avatar)" :src="previewAvatar" alt="预览头像" class="form__preview" />
            </div>
            <div class="form__group">
              <label for="backgrounding">背景图片:</label>
              <input id="backgrounding" type="file" @change="onFileChange($event, 'backgrounding')" accept="image/*" />
              <img v-if="userInfo.backgrounding && isFile(userInfo.backgrounding)" :src="previewBackground" alt="预览背景" class="form__preview" />
            </div>
            <div class="form__actions">
              <button type="submit" class="btn btn--save" :disabled="loading">保存修改</button>
              <button type="button" class="btn btn--cancel" @click="closeEditModal">取消</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- 修改密码模态窗口 -->
    <transition name="fade">
      <div v-if="isChangePasswordModalOpen" class="modal-overlay" @click.self="closeChangePasswordModal">
        <div class="modal">
          <h2>修改密码</h2>
          <form @submit.prevent="onSubmit" ref="formRef" class="form">
            <div class="form__group">
              <label for="email">邮箱:</label>
              <input id="email" type="email" v-model="passwordData.email" required />
            </div>
            <div v-if="!isCodeSent" class="form__group">
              <button type="button" class="btn btn--send-code" @click="handleSendCode" :disabled="loading">发送验证码</button>
            </div>
            <div v-else class="form__group">
              <p>验证码已发送，{{ countdown }} 秒后可重新发送</p>
              <label for="code">验证码:</label>
              <input id="code" type="text" v-model="passwordData.code" required />
            </div>
            <div class="form__group">
              <label for="newPassword">新密码:</label>
              <input id="newPassword" type="password" v-model="passwordData.newPassword" required />
            </div>
            <div class="form__group">
              <label for="confirmNewPassword">确认新密码:</label>
              <input id="confirmNewPassword" type="password" v-model="passwordData.confirmNewPassword" required />
            </div>
            <div class="form__actions">
              <button type="submit" class="btn btn--update-password" :disabled="loading">修改密码</button>
              <button type="button" class="btn btn--cancel" @click="closeChangePasswordModal">取消</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import axios from "axios";
import { getToken } from "@/composables/cookie";
import { sendVerificationCode, login } from '@/api/admin/user'; // 引入 login 方法
import { ref, reactive, computed, onMounted } from 'vue';

export default {
  setup() {
    const userInfo = reactive({
      id: null,
      nickname: "",
      avatar: "",
      email: "",
      birthday: "",
      momentoId: "",
      sex: "", 
      backgrounding: "",
      introduction: ""
    });

    const userStats = reactive({
        fansTotal: "0",
        followingTotal: "0",
        noteTotal: "0",
        likeTotal: "0",
        collectTotal: "0"
    });

    const passwordData = reactive({
      email: "",
      code: "",
      newPassword: "",
      confirmNewPassword: "",
    });

    const isEditing = ref(false);
    const isChangePassword = ref(false);
    const isEditModalOpen = ref(false);
    const isChangePasswordModalOpen = ref(false);
    const isCodeSent = ref(false);
    const loading = ref(false);
    const countdown = ref(0);
    const formRef = ref(null);

    // 计算属性：格式化生日
    const formattedBirthday = computed(() => {
      if (!userInfo.birthday) return '';
      const date = new Date(userInfo.birthday);
      return date.toLocaleDateString();
    });
    // 计算属性：性别显示
    const gender = computed(() => {
        return userInfo.sex === 1 ? '女' : '男';
    });

    // 预览头像
    const previewAvatar = computed(() => {
      return isFile(userInfo.avatar) ? URL.createObjectURL(userInfo.avatar) : userInfo.avatar;
    });

    // 预览背景图片
    const previewBackground = computed(() => {
      return isFile(userInfo.backgrounding) ? URL.createObjectURL(userInfo.backgrounding) : userInfo.backgrounding;
    });

    // 判断是否为文件
    const isFile = (file) => {
      return file instanceof File;
    };

    // 获取用户信息
    const fetchUserInfo = async () => {
      try {
        const token = getToken();
        const response = await axios.get("/api/user/user/current", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.data.success) {
          Object.assign(userInfo, response.data.data);
          // 在成功获取用户信息后，立即获取用户统计信息
          if (userInfo.id) {
            await fetchUserStats(userInfo.id);
          }
        } else {
          console.error("获取用户信息失败:", response.data.message);
          alert("获取用户信息失败: " + response.data.message);
        }
      } catch (error) {
        console.error("获取用户信息出错:", error);
        alert("获取用户信息出错，请稍后重试。");
      }
    };

    const fetchUserStats = async (id) => {
        try {
            const token = getToken();          
            console.log("正在获取用户统计信息，用户ID:", id);
            const response = await axios.post(`/api/count/count/user`, 
            { userId: id }, 
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                Object.assign(userStats, response.data.data);
                console.log("用户统计信息:", userStats);
            } else {
                console.error("获取用户统计信息失败:", response.data.message);
            }
        } catch (error) {
            console.error("完整的错误对象:", error);
            if (error.response) {
                console.error("错误响应:", {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
        }
    };

    // 发送验证码
    const handleSendCode = async () => {
      if (!passwordData.email) {
        alert("请先输入邮箱");
        return;
      }
      try {
        loading.value = true;
        await sendVerificationCode(passwordData.email);
        alert("验证码已发送，请查收邮箱");
        isCodeSent.value = true;
        countdown.value = 60;
        const interval = setInterval(() => {
          countdown.value--;
          if (countdown.value === 0) {
            clearInterval(interval);
            isCodeSent.value = false;
          }
        }, 1000);
      } catch (error) {
        console.error("发送验证码出错:", error);
        alert(error.response?.data?.message || "发送验证码失败");
      } finally {
        loading.value = false;
      }
    };

    // 密码验证函数
    const validatePassword = (password) => {
      const lengthValid = password.length >= 6 && password.length <= 20;
      const pattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
      return lengthValid && pattern.test(password);
    };

    // 提交修改密码表单
    const onSubmit = async () => {
      if (!passwordData.email) {
        alert("邮箱不能为空");
        return;
      }
      if (!isCodeSent.value) {
        alert("请先发送验证码");
        return;
      }
      if (!passwordData.code) {
        alert("验证码不能为空");
        return;
      }
      if (!passwordData.newPassword || !passwordData.confirmNewPassword) {
        alert("密码不能为空");
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        alert("新密码与确认密码不一致");
        return;
      }
      if (!validatePassword(passwordData.newPassword)) {
        alert("密码应为6到20个字符，且包含至少一个字母和一个数字");
        return;
      }

      try {
        loading.value = true;
        const { email, code, newPassword } = passwordData;

        // 验证验证码
        const loginResponse = await login(email, '', code, 1); // 1 表示验证码登录

        if (loginResponse.success) {
          const token = getToken();

          await axios.post(
            "/api/auth/password/update",
            { newPassword },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          alert("密码已修改");
          resetPasswordForm();
          closeChangePasswordModal();
        } else {
          alert(loginResponse.message || "验证码验证失败");
        }
      } catch (error) {
        console.error("修改密码出错:", error);
        alert(error.response?.data?.message || "密码修改失败");
      } finally {
        loading.value = false;
      }
    };

    // 重置密码表单
    const resetPasswordForm = () => {
      passwordData.email = "";
      passwordData.code = "";
      passwordData.newPassword = "";
      passwordData.confirmNewPassword = "";
      isCodeSent.value = false;
    };

    // 更新用户信息
    const updateUserInfo = async () => {
      try {
        loading.value = true;
        const token = getToken();
        const formData = new FormData();
        formData.append("nickname", userInfo.nickname);
        formData.append("birthday", userInfo.birthday);
        formData.append("sex", userInfo.sex);
        formData.append("introduction", userInfo.introduction);
        formData.append("momentoId", userInfo.momentoId);
        if (isFile(userInfo.avatar)) {
          formData.append("avatar", userInfo.avatar);
        }

        if (isFile(userInfo.backgrounding)) {
          formData.append("backgrounding", userInfo.backgrounding);
        }

        const response = await axios.post(
          "/api/user/user/update",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            },
          }
        );

        if (response.data.success) {
          alert("用户信息已更新");
          closeEditModal();
          fetchUserInfo(); // 重新获取更新后的用户信息
          fetchUserStats(userInfo.id); 
        } else {
          console.error("更新用户信息失败:", response.data.message);
          alert("更新用户信息失败: " + response.data.message);
        }
      } catch (error) {
        console.error("更新用户信息出错:", error);
        alert(error.response?.data?.message || "用户信息更新失败");
      } finally {
        loading.value = false;
      }
    };

    // 处理文件选择
    const onFileChange = (event, field) => {
      const file = event.target.files[0];
      if (file) {
        userInfo[field] = file;
      }
    };

    // 打开编辑信息模态窗口
    const openEditModal = () => {
      isEditModalOpen.value = true;
    };

    // 关闭编辑信息模态窗口
    const closeEditModal = () => {
      isEditModalOpen.value = false;
      fetchUserInfo(); // 重新获取用户信息，重置表单
      fetchUserStats(userInfo.id); 
    };

    // 打开修改密码模态窗口
    const openChangePasswordModal = () => {
      isChangePasswordModalOpen.value = true;
    };

    // 关闭修改密码模态窗口
    const closeChangePasswordModal = () => {
      isChangePasswordModalOpen.value = false;
      resetPasswordForm(); // 重置密码表单
    };

    // 组件挂载时获取用户信息
    onMounted(() => {
      fetchUserInfo();
    });

    return {
      userInfo,
      passwordData,
      isEditing,
      isChangePassword,
      isEditModalOpen,
      isChangePasswordModalOpen,
      isCodeSent,
      loading,
      countdown,
      formRef,
      fetchUserInfo,
      updateUserInfo,
      onFileChange,
      handleSendCode,
      onSubmit,
      openEditModal,
      closeEditModal,
      openChangePasswordModal,
      closeChangePasswordModal,
      formattedBirthday,
      gender,
      previewAvatar,
      previewBackground,
      isFile,
      userStats,
      fetchUserStats
    };
  },
};
</script>

<style scoped>
.user-profile-container {
  display: flex;
  justify-content: center;
  /* align-items: center; */
  padding: 20px;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: #f0f2f5;
  background-image: linear-gradient(to bottom right, #e0f7fa, #b2ebf2); /* 淡蓝色渐变 */
}

.user-profile {
  width: 100%;
  max-width: 800px;
  background: #ffffff;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
@media (max-width: 600px) {
  .user-profile {
    max-width: 90%; /* 在小屏幕上使用更大的宽度 */
    padding: 20px; /* 减少内边距 */
  }
}

.user-info {
  display: flex;
  align-items: flex-start;
  background: #f4f4f4;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.user-info__avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 20px;
}

.user-info__details {
  flex: 1;
}

.user-info__details p {
  margin: 8px 0;
  font-size: 1em;
  color: #333;
}

.user-info__actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  padding: 10px 20px;
  font-size: 1em;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn--edit {
  background-color: #007bff;
  color: #fff;
}

.btn--edit:hover {
  background-color: #0056b3;
}

.btn--change-password {
  background-color: #6c757d;
  color: #fff;
}

.btn--change-password:hover {
  background-color: #5a6268;
}

.form {
  max-width: 100%;
  margin: 0 auto;
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
}

.form__group {
  margin-bottom: 15px;
}

.form__group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form__group input,
.form__group select,
.form__group textarea {
  width: 100%;
  padding: 10px;
  font-size: 1em;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
}

.form__preview {
  margin-top: 10px;
  max-width: 100px;
  border-radius: 5px;
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn--save {
  background-color: #28a745;
  color: #fff;
}

.btn--save:hover {
  background-color: #218838;
}

.btn--update-password {
  background-color: #ffc107;
  color: #212529;
}

.btn--update-password:hover {
  background-color: #e0a800;
}

.btn--cancel {
  background-color: #6c757d;
  color: #fff;
}

.btn--cancel:hover {
  background-color: #5a6268;
}

.btn--send-code {
  background-color: #17a2b8;
  color: #fff;
}

.btn--send-code:hover {
  background-color: #138496;
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
  max-width: 500px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 防止页面滚动时模态窗口下的内容滚动 */
.modal-overlay {
  overflow: auto;
}

/* 适应不同屏幕尺寸 */
@media (max-width: 600px) {
  .user-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .user-info__avatar {
    margin-right: 0;
    margin-bottom: 15px;
  }

  .user-info__actions {
    flex-direction: column;
    width: 100%;
  }

  .form__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

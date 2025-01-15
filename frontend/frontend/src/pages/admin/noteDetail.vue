<template>
   <div>
    <!-- 笔记详情抽屉 -->
    <el-drawer v-model="visibleDrawer" title="笔记详情" direction="rtl" size="50%">
        <!-- 抽屉内容容器 -->
        <div style="display: flex; flex-direction: column; height: 100%;">
            <div class="scroll-drawercontent" @scroll="handleScroll"><!-- 无限滚动 -->
                <!-- 图片展示区域 -->
                <div style="flex: 0 0 auto;">
                    <img :src="article.imgUris" alt="笔记图片"
                        style="width: 100%; height: 400px; object-fit: cover; border-radius: 5px;" />
                </div>
                <!-- 标题和内容区域 -->
                <div style="flex: 1 1 auto; padding: 20px;">
                    <!-- 标题 -->
                    <h2 style="margin: 0 0 16px 0;font-size: 24px;">{{ article.title }}</h2>
                    <!-- 内容 -->
                    <p style="font-size: 16px; line-height: 1.6;">{{ article.content }}</p>
                    <div style="font-size: 10px; font-family: Arial, sans-serif; color: #333;">
                        ------------------------------------------------------------------------------------------------------------------<br>
                        共{{ commentTotal }}条评论<br>
                        ------------------------------------------------------------------------------------------------------------------<br>
                    </div>


                    <!-- 动态生成评论 -->
                    <div v-for="(comment, index) in comments" :key="index" style="margin-top: 10px;">
                        <!-- 父评论作为按钮 -->
                        <button @click="handleParentCommentClick(comment)"
                            style="display: block; width: 100%; text-align: left; padding: 10px; background: none; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; cursor: pointer;">
                            <!-- 用户头像 -->
                            <img :src="comment.userAvatar" alt="User Avatar"
                                style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; vertical-align: middle;">
                            <!-- 评论内容 -->
                            <div style="display: inline-block; vertical-align: top;">
                                <div style="font-weight: bold;">{{ comment.userName }}</div>
                                <div style="max-width: 500px; word-wrap: break-word; white-space: pre-wrap;">{{
                                    comment.content }}</div>
                            </div>
                            <!-- 如果是自己的评论，显示删除按钮 -->
                            <div v-if="comment.userId === userId"
                                @click="handleDeleteComment(comment.commentId, comment.noteId)"
                                style="cursor: pointer; margin-left: 10px;">
                                <button
                                    style="border: none; background: none; color: red; font-size: 14px; cursor: pointer;">删除</button>
                            </div>
                            <div>
                                <el-button @click="toggleFirstComment(comment)" icon="el-icon-thumb"
                                    style="width: 50px;">
                                    {{ '评论' }}
                                </el-button>
                            </div>
                            <!-- 当 toggleFirstComment 为 true 时显示输入框 -->
                            <div v-if="comment.isSecondCommenting">
                                <el-input v-model="comment.commentSubText" placeholder="请输入评论"
                                    @keyup.enter="submitSubComment(comment)"></el-input>
                            </div>

                        </button>

                        <!-- 子评论部分 -->
                        <div v-if="comment.subComments && comment.subComments.length > 0" style="margin-left: 50px;">
                            <div v-for="subComment in comment.subComments" :key="subComment.commentId"
                                style="margin-bottom: 10px;">
                                <!-- 用户头像 -->
                                <img :src="subComment.userAvatar" alt="User Avatar"
                                    style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; vertical-align: middle;">

                                <!-- 子评论文本内容 -->
                                <div style="display: inline-block; vertical-align: top; max-width: 450px;">
                                    <div style="font-weight: bold; font-size: 14px;">{{ subComment.userName }}</div>
                                    <div style="font-size: 14px; word-wrap: break-word; white-space: pre-wrap;">{{
                                        subComment.content }}
                                    </div>
                                </div>

                                <!-- 如果是自己的子评论，显示删除按钮 -->
                                <div v-if="subComment.userId === userId"
                                    @click="handleDeleteComment(subComment.id, subComment.noteId)"
                                    style="cursor: pointer; margin-left: 10px;">
                                    <button
                                        style="border: none; background: none; color: red; font-size: 14px; cursor: pointer;">删除</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>


            </div>


            <div
                style="display: flex; justify-content: space-between; padding: 20px; border-top: 1px solid #eaeaea; position: absolute; bottom: 0; left: 0; right: 0; background-color: white;">
                <!-- 用户信息 -->
                <div style="display: flex; align-items: center;">
                    <img :src="article.avatar" alt="用户头像"
                        style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;" />
                    <span>{{ article.creatorName }}</span>
                </div>
                <!-- 关注按钮 -->
                <el-button :type="article.isFollowed ? 'success' : 'primary'" @click="toggleFollow(article)">
                    {{ article.isFollowed ? '已关注' : '未关注' }}
                </el-button>


                <!-- 操作按钮 -->
                <div>
                    <!-- 评论按钮 -->
                    <el-button @click="toggleComment(article)" icon="el-icon-thumb" style="width: 50px;">
                        {{ '评论' }}
                    </el-button>

                    <!-- 点赞按钮 -->
                    <el-button :type="article.isLiked ? 'success' : 'primary'" @click="toggleLike(article)"
                        icon="el-icon-thumb" style="width: 80px;">
                        {{ article.isLiked ? '已点赞' : '点赞' }}{{ likeTotal }}
                    </el-button>

                    <!-- 收藏按钮 -->
                    <el-button :type="article.isCollect ? 'success' : 'primary'" @click="toggleCollect(article)"
                        icon="el-icon-star-on" style="width: 80px;">
                        {{ article.isCollect ? '已收藏' : '收藏' }}{{ collectTotal }}
                    </el-button>

                    <!-- 当 toggleComment 为 true 时显示输入框 -->
                    <div v-if="isFirstCommenting">
                        <el-input v-model="commentText" placeholder="请输入评论"
                            @keyup.enter="submitComment(article)"></el-input>
                    </div>

                </div>
            </div>
        </div>
    </el-drawer>
   </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { addCommentService, subCommentService, deleteCommentService, noteCommentCountService, noteFirstCommentService, collectListService, collectListDetailService, doCollectService, unCollectService, dolikeNoteService, nolikeNoteService, likeListService, noteCountService } from '@/api/collect.js'
import { noFollowService, doFollowService, followService, currentUserService } from '@/api/follow.js'
import { useRoute } from 'vue-router';
import {getToken} from "@/composables/cookie";

const route = useRoute();

// 解构获取路由参数
const { id, userId } = route.params;

// 在组件挂载时调试路由信息
console.log('当前路由信息:', route);
console.log('路由参数:', route.params);
console.log('笔记 ID:', id);
console.log('用户 ID:', userId);


//控制抽屉是否显示
const visibleDrawer = ref(false)

// Category and articles data
const articles = ref([
    /* {
      "id": 4,
      title: "陕西旅游攻略",
      categoryId: 3,
    } */
])
const article = ref({
    title: '文章标题',
    content: '文章的详细内容...',
    creatorName: '用户名',
    avatar: "http://127.0.0.1:9000/momento/7e8a005b04524f429402216d235aac7c.jpg",
    imgUris: 'https://img.quanxiaoha.com/quanxiaoha/f97361c0429d4bb1bc276ab835843065.jpg',
    createid: 6101
})
const comments = ref([])/* 评论列表 */
const commentscomments = ref([])//评论的子评论列表
const follow = ref([
    {
        userId: 6101,
        avatar: "头像",
        nickname: "zidu",
        introduction: "deng"
    }
])
const like = ref([
    {
        id: "1856303133941039128",
        title: "今天又在开会",
        creatorId: "6101"
    }
])

const categoryId = ref('')
const PageNo = ref(1);


// Infinite scroll
const displayedItems = ref(10)
const handleScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.target
    if (scrollTop + clientHeight >= scrollHeight - 50) {
        displayedItems.value += 10
    }
}

const toggleFollow = async (row) => {// 切换关注状态
    if (row.isFollowed) {//取关
        let params = { unfollowUserId: row.creatorId };
        let result = await noFollowService(params); // 调用取关接口
        if (result.success) {//必须得成功才能操作
            row.isFollowed = !row.isFollowed // 切换关注状态
        }
    } else {//关注
        let params = { followUserId: row.creatorId };
        let result = await doFollowService(params); // 调用关注接口
        if (result.success) {//必须得成功才能操作
            row.isFollowed = !row.isFollowed // 切换关注状态
        }
    }
    await noteCount(row.id);
}
const toggleLike = async (row) => {// 切换点赞状态
    if (row.isLiked) {//取消点赞
        let params = { id: row.id };
        let result = await nolikeNoteService(params);
        if (result.success) {//必须得成功才能操作
            row.isLiked = !row.isLiked;
            likeTotal.value--;
        }

    } else {
        let params = { id: row.id };
        let result = await dolikeNoteService(params);
        if (result.success) {//必须得成功才能操作
            row.isLiked = !row.isLiked;
            likeTotal.value++;
        }
    }
}
const toggleCollect = async (article) => { // 切换收藏状态
    if (article.isCollect) {
        // 如果已经收藏，取消收藏
        let params = {
            id: article.id
        };
        await unCollectService(params); // 取消收藏的 API 请求
        article.isCollect = !article.isCollect;
        collectTotal.value--;
    } else {
        // 如果未收藏，添加收藏
        let params = {
            id: article.id
        };
        await doCollectService(params); // 添加收藏的 API 请求
        article.isCollect = !article.isCollect;
        collectTotal.value++;
    }
};

const size = ref(1000)//收藏列表请求参数
const page = ref(1)//收藏列表请求参数

const collectListDetail = async (id) => {
    try {
        const token = getToken(); // 确保已导入 getToken 函数
        if (!token) {
            throw new Error('未登录，请先登录');
        }

        let params = {
            id: id
        }
        const result = await collectListDetailService(params, token);
        if (result.success) {
            await noteCount(id);
            article.value = {
                ...result.data,
                isFollowed: false,
                isLiked: false,
                isCollect: false,
            };
            await followList();
            await collectList();
            await likeList();
        } else {
            console.error("获取笔记详情失败:", result.message);
        }
    } catch (error) {
        console.error("获取笔记详情出错:", error);
        if (error.response && error.response.status === 401) {
            alert('登录已过期，请重新登录');
            // 假设您有一个路由实例
            router.push('/login');
        } else {
            alert('获取笔记详情失败：' + (error.message || '未知错误'));
        }
    }
};

const followList = async () => {//获取关注列表
    let params = {
        userId: userId,
        PageNo: PageNo.value
    };
    let result = await followService(params);
    follow.value = result.data;
    console.log(follow);
};
const collectList = async () => {//获取点赞列表
    let params = {
        size: size.value,
        userId: userId,
        page: page.value
    };
    let result = await collectListService(params);
    like.value = result.data;
};
const likeList = async () => {//获取点赞列表
    let params = {
        size: size.value,
        userId: userId,
        page: page.value
    };
    let result = await likeListService(params);
    like.value = result.data;
};
const openDrawer = async (id, selectedArticle) => {
    await collectListDetail(id/* .toString() */); // 等待数据加载完成
    await noteCommentCount(id);
    //获取笔记一级评论
    await noteFirstComment(id);
    //获取笔记评论的评论
    //console.log(id);
    visibleDrawer.value = true;  // 然后打开抽屉
};
openDrawer(id);

const likeTotal = ref()//点赞数
const collectTotal = ref()//收藏数
const commentTotal = ref()//评论数

//获取笔记计数信息
const noteCount = async (id) => {
    //console.log("确认");
    let params = {
        noteId: id
    }
    let result = await noteCountService(params);
    likeTotal.value = result.data.likeTotal;
    collectTotal.value = result.data.collectTotal;
}
//获取笔记评论数
const noteCommentCount = async (id) => {
    let params = {
        noteId: id,
    }
    let result = await noteCommentCountService(params);
    commentTotal.value = result.data;
}
//获取笔记一级评论
const noteFirstComment = async (id) => {
    let params = {
        noteId: id,
        page: page.value,
        size: size.value
    }
    let result = await noteFirstCommentService(params);
    comments.value = result.data;
    comments.value.forEach(item => {
        item.isSecondCommenting = false; // 新增是否被评论
        item.commentSubText = "";
    });
    // 获取每个评论的子评论
    for (let comment of comments.value) {
        // 如果该评论没有子评论或子评论已加载，则跳过
        if (!comment.subCommentsLoaded) {
            await subComment(comment); // 加载子评论
        }
    }
}
//点击删除评论按钮事件
const handleDeleteComment = async (id, noteId) => {
    await deleteComment(id);
    //刷新评论区域
    await noteCommentCount(noteId);
    await noteFirstComment(noteId);
}

//删除评论
const deleteComment = async (id) => {
    let params = {
        commentId: id,
    }
    let result = await deleteCommentService(params);
    //console.log(result);
}
//获取评论的评论
const subComment = async (comment) => {
    console.log(comment);
    let params = {
        commentId: comment.commentId,
    }
    let result = await subCommentService(params);
    // 将返回的子评论数据附加到该评论的 subComments 数组中
    comment.subComments = result.data || [];
    comment.subCommentsLoaded = true; // 标记子评论已加载
    //console.log(result);
}

const handleParentCommentClick = async (comment) => {

}
const isFirstCommenting = ref(false);
const commentText = ref(""); // 存储评论内容
//点击评论按钮生成一级评论
const toggleComment = async () => {
    isFirstCommenting.value = !isFirstCommenting.value;
}
//增加一级评论
const submitComment = async (article) => {
    if (commentText.value.trim() !== "") {
        let params = {
            "noteId": article.id,
            "content": commentText.value.trim()
        }
        let result = await addCommentService(params);

        //console.log(result);
        // 清空输入框
        commentText.value = "";
        //刷新评论区域
        await noteCommentCount(article.id);
        await noteFirstComment(article.id);
        // 提交后隐藏评论框
        isFirstCommenting.value = false;
    }
    //console.log(result);
}

//点击一级评论去评论
const toggleFirstComment = async (comment) => {
    comment.isSecondCommenting = !comment.isSecondCommenting;
}
//增加子评论
const submitSubComment = async (comment) => {
    //console.log(comment.noteId);
    if (comment.commentSubText.trim() !== "") {
        let params = {
            "noteId": comment.noteId,
            "parentId": comment.commentId,
            "content": comment.commentSubText.trim()
        }
        let result = await addCommentService(params);
        console.log(result);
        //console.log(result);
        // 清空输入框
        comment.commentSubText = "";
        //刷新评论区域
        await noteCommentCount(comment.noteId);
        await noteFirstComment(comment.noteId);
        // 提交后隐藏评论框
        comment.isSecondCommenting = false;
    }
    //console.log(result);
}

</script>

<style scoped>
.page-container {
    min-height: 93%;
    box-sizing: border-box;
}

/* 搜索表单固定在顶部 */
.fixed-form {
    position: sticky;
    top: 0;
    background-color: #fff;
    padding: 10px;
    z-index: 10;
}

/* 无限滚动内容 */
.scroll-content {
    max-height: 70vh;
    overflow-y: auto;
}

/* 无限滚动内容 */
.scroll-drawercontent {
    max-height: 80vh;
    overflow-y: auto;
}


.avatar-uploader {
    :deep() {
        .avatar {
            width: 178px;
            height: 178px;
            display: block;
        }

        .el-upload {
            border: 1px dashed var(--el-border-color);
            border-radius: 6px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: var(--el-transition-duration-fast);
        }

        .el-upload:hover {
            border-color: var(--el-color-primary);
        }

        .el-icon.avatar-uploader-icon {
            font-size: 28px;
            color: #8c939d;
            width: 178px;
            height: 178px;
            text-align: center;
        }
    }
}

.editor {
    width: 100%;

    :deep(.ql-editor) {
        min-height: 200px;
    }
}
</style>
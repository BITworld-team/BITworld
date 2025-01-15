import axios from "@/axios";

// 登录接口
export function login(email,
    password,
    code,
    type,) {
    return axios.post("/auth/login",
        {
            email,
            password,
            code,
            type,
        })
}

// 验证码发送接口
export function sendVerificationCode(email) {
    return axios.post('/auth/verification/code/send', {
        email
    });
}

// 登出接口
export function logout() {
    return axios.post('/auth/logout');
}


// 获取登录用户信息
export function getUserInfo() {
    return axios.get("/user/user/current")
}

// 修改用户密码
export function updateAdminPassword(data) {
    return axios.post("/auth/password/update", data)
}
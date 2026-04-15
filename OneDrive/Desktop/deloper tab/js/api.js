const BASE_URL = '';

const api = {
    async fetch(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }
        return data;
    },

    async login(email, password) {
        const data = await this.fetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },

    async signup(email, password, role) {
        const data = await this.fetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, role })
        });
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },

    async subscribe() {
        const data = await this.fetch('/sub/subscribe', {
            method: 'POST'
        });
        if (data.user) {
            const user = JSON.parse(localStorage.getItem('user'));
            user.isSubscribed = true;
            localStorage.setItem('user', JSON.stringify(user));
        }
        return data;
    },

    async getVideos() {
        return await this.fetch('/video/all');
    },

    async uploadVideo(videoData) {
        return this.fetch('/video/upload', {
            method: 'POST',
            body: JSON.stringify(videoData)
        });
    },

    // Admin Settings
    async getSettings() {
        return this.fetch('/settings');
    },

    async updatePrice(price) {
        return this.fetch('/admin/settings', {
            method: 'POST',
            body: JSON.stringify({ price })
        });
    },

    async addMember(memberData) {
        return this.fetch('/admin/add-member', {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
};

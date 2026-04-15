const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- DATABASE PERSISTENCE ---
const DB_FILE = path.join(__dirname, 'db.json');

let platformSettings = { price: 500, currency: '₹' };
let users = [];
let videos = [];

const loadData = () => {
  if (fs.existsSync(DB_FILE)) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    users = data.users || [];
    videos = data.videos || [];
    platformSettings = data.platformSettings || { price: 500, currency: '₹' };
  } else {
    // Initial Seed Data
    users = [{
      id: 'admin-001',
      email: 'admin@streampremium.com',
      password: bcrypt.hashSync('admin123', 10), 
      role: 'admin',
      isSubscribed: true
    }];
    videos = [
      { id: '1', title: 'Full-Stack Web Development: Introduction', description: 'Learn the basics of HTML, CSS, and JavaScript.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80', duration: '12:45' },
      { id: '2', title: 'Node.js & Express: Backend Mastery', description: 'Build powerful APIs and server-side applications.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80', duration: '18:20' },
      { id: '3', title: 'React.js: UI Components & State', description: 'Create dynamic, high-performance user interfaces.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80', duration: '15:10' },
      { id: '4', title: 'Artificial Intelligence: Machine Learning 101', description: 'Introduction to neural networks and basics.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80', duration: '22:30' },
      { id: '5', title: 'Python for Data Science: Getting Started', description: 'Master Pandas, NumPy, and Matplotlib.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', duration: '09:45' },
      { id: '6', title: 'Cloud Computing: AWS Essentials', description: 'Deploy your applications to the cloud.', videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1631234567/sample.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', duration: '14:20' }
    ];
    saveData();
  }
};

const saveData = () => {
  const data = { users, videos, platformSettings };
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

loadData();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Helper to find and update
const findUser = (email) => users.find(u => u.email.toLowerCase() === email.toLowerCase());
const findUserById = (id) => users.find(u => u.id === id);

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = findUserById(decoded.userId);
    if (!req.user) return res.status(401).json({ message: 'Session expired.' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const checkSubscription = (req, res, next) => {
  if (req.user.isSubscribed || req.user.role === 'admin') next();
  else res.status(403).json({ message: 'Subscription required' });
};

const isAdmin = (req, res, next) => {
  if (req.user.role === 'admin') next();
  else res.status(403).json({ message: 'Admin access required' });
};

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => res.json({ 
  status: 'ok', 
  usersCount: users.length, 
  currentPrice: platformSettings.price 
}));

// Auth
app.post('/auth/signup', async (req, res) => {
  const { email, password, role } = req.body;
  if (findUser(email)) return res.status(400).json({ message: 'User exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  let assignedRole = role || 'user';
  if (email.toLowerCase() === 'admin@streampremium.com') assignedRole = 'admin';

  const newUser = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    role: assignedRole,
    isSubscribed: assignedRole === 'admin'
  };
  users.push(newUser);
  saveData();

  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '1d' });
  res.status(201).json({ token, user: { id: newUser.id, email, role: newUser.role, isSubscribed: newUser.isSubscribed } });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = findUser(email);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, email, role: user.role, isSubscribed: user.isSubscribed } });
});

// Subscription
app.post('/sub/subscribe', verifyToken, (req, res) => {
  req.user.isSubscribed = true;
  saveData();
  res.json({ message: 'Subscribed!', user: req.user });
});

// Videos
app.get('/video/all', verifyToken, (req, res) => {
  const hasAccess = req.user.isSubscribed || req.user.role === 'admin';
  const accessibleVideos = videos.map(v => {
    if (hasAccess) return v;
    const { videoUrl, ...publicData } = v;
    return { ...publicData, isPremium: true };
  });
  res.json(accessibleVideos);
});

app.post('/video/upload', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { title, description, videoUrl, thumbnailUrl, duration } = req.body;
  const newVideo = { id: Date.now().toString(), title, description, videoUrl, thumbnailUrl, duration };
  videos.push(newVideo);
  saveData();
  res.status(201).json(newVideo);
});

// Platform Settings
app.get('/settings', (req, res) => res.json(platformSettings));

app.post('/admin/settings', verifyToken, isAdmin, (req, res) => {
  const { price } = req.body;
  if (!price) return res.status(400).json({ message: "Price is required" });
  platformSettings.price = price;
  saveData();
  res.json({ message: "Price updated", settings: platformSettings });
});

// Admin: Member Management
app.post('/admin/add-member', verifyToken, isAdmin, async (req, res) => {
  const { email, password, role, isSubscribed } = req.body;
  if (findUser(email)) return res.status(400).json({ message: "Member already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    role: role || 'user',
    isSubscribed: isSubscribed !== undefined ? isSubscribed : true
  };
  users.push(newUser);
  saveData();
  res.status(201).json({ message: "Member added", user: { email: newUser.email, role: newUser.role } });
});

// --- STATIC FILES ---
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`📡 Server running on http://localhost:${PORT}`);
});

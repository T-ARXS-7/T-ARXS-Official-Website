require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ─── 1. MIDDLEWARE ───
// Allow your frontend to talk to this backend
app.use(cors({ origin: "*" })); 
// Increase limits to handle image data strings if needed
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── 2. CONFIGURATION ───
const MONGO_URI = process.env.MONGO_URI; 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET
      });

      // ─── 3. DATABASE SETUP ───
      mongoose.connect(MONGO_URI)
        .then(() => console.log("✅ T-ARXS™ Core: Database Connected"))
          .catch(err => console.error("❌ DB Connection Error:", err));

          const PostSchema = new mongoose.Schema({
            text: { type: String, required: false },
              imageUrl: { type: String, required: false },
                createdAt: { type: Date, default: Date.now }
                });
                const Post = mongoose.model('Post', PostSchema);

                // ─── 4. IMAGE UPLOAD STORAGE (CLOUDINARY) ───
                const storage = new CloudinaryStorage({
                  cloudinary: cloudinary,
                    params: {
                        folder: 'tarxs_uploads',
                            allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
                                transformation: [{ width: 1000, crop: "limit" }] // Resizes huge images automatically
                                  },
                                  });
                                  const upload = multer({ 
                                      storage: storage,
                                          limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
                                          });

                                          // ─── 5. SOCKET.IO SETUP ───
                                          const io = new Server(server, {
                                            cors: {
                                                origin: "*",
                                                    methods: ["GET", "POST"]
                                                      }
                                                      });

                                                      io.on('connection', (socket) => {
                                                        console.log('📡 System: New User Linked -', socket.id);
                                                          
                                                            socket.on('disconnect', () => {
                                                                console.log('📡 System: User Unlinked');
                                                                  });
                                                                  });

                                                                  // ─── 6. API ROUTES ───

                                                                  // Root Route (For Render health checks)
                                                                  app.get('/', (req, res) => {
                                                                    res.status(200).send({
                                                                        status: "Online",
                                                                            system: "T-ARXS™ Backend",
                                                                                database: mongoose.connection.readyState === 1 ? "Connected" : "Reconnecting"
                                                                                  });
                                                                                  });

                                                                                  // Get all posts for the feed
                                                                                  app.get('/api/posts', async (req, res) => {
                                                                                    try {
                                                                                        const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
                                                                                            res.json(posts);
                                                                                              } catch (err) {
                                                                                                  res.status(500).json({ error: "Could not fetch feed" });
                                                                                                    }
                                                                                                    });

                                                                                                    // Create a new post with optional image
                                                                                                    app.post('/api/posts', upload.single('image'), async (req, res) => {
                                                                                                      try {
                                                                                                          // Check if at least text or an image exists
                                                                                                              if (!req.body.text && !req.file) {
                                                                                                                    return res.status(400).json({ error: "Post cannot be empty" });
                                                                                                                        }

                                                                                                                            const newPost = new Post({
                                                                                                                                  text: req.body.text || "",
                                                                                                                                        imageUrl: req.file ? req.file.path : null 
                                                                                                                                            });

                                                                                                                                                await newPost.save();
                                                                                                                                                    
                                                                                                                                                        // 🔥 REAL-TIME BROADCAST
                                                                                                                                                            io.emit('new_post', newPost);
                                                                                                                                                                
                                                                                                                                                                    res.status(201).json(newPost);
                                                                                                                                                                      } catch (err) {
                                                                                                                                                                          console.error("Upload Error:", err);
                                                                                                                                                                              res.status(500).json({ error: "System failed to process post" });
                                                                                                                                                                                }
                                                                                                                                                                                });

                                                                                                                                                                                // ─── 7. SERVER START ───
                                                                                                                                                                                const PORT = process.env.PORT || 3000;
                                                                                                                                                                                server.listen(PORT, () => {
                                                                                                                                                                                  console.log(`🚀 T-ARXS™ Backend LIVE on port ${PORT}`);
                                                                                                                                                                                  });
                                                                                                                                                                                  
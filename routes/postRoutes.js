import express from 'express';
import * as dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

import Post from '../mongodb/models/post.js';

dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
}); 

router.route('/').get(async (req, res) => {
  try {
    const posts = await Post.find({});
    res.status(200).json({ success: true, data: posts })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fetching posts failed, please try again' })
  }
});

router.route('/').post(async (req, res) => {
  console.log('Post Request is submitted')
  try {
    console.log('Post is been Creating')
    const { name, prompt, photo } = req.body;
    console.log('name,prompt,photo is requested to body')
    const photoUrl = await cloudinary.uploader.upload(photo);

    console.log('Photo url is been made')

    const newPost = await Post.create({
      name,
      prompt,    
      photo: photoUrl.url,
    });
    console.log('The Post has been created!')

    res.status(200).json({ success : true,data: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to create a post, please try again' });
    console.log('Post cannot be created because of some issues.')
  }
});




export default router;
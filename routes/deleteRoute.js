import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';


import Post from '../mongodb/models/post.js';

dotenv.config();


const router = express.Router();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  }); 

router.route('/:_id').delete(async (req, res) => {
    console.log('Delete request is received');
    try {
      const postId = req.params._id;
      console.log('Post ID is taken:', postId);

      const deletedPost = await Post.findByIdAndDelete(postId);
    console.log('Post is deleted from the database');
      res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Unable to delete the post, please try again' });
    }
  });
  

  export default router;
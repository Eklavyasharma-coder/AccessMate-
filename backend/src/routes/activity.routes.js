const router=require('express').Router();const {requireAuth}=require('../middleware/auth.middleware');const activity=require('../services/activity.service');
router.get('/',requireAuth,async(req,res,next)=>{try{res.json({activities:await activity.list(req.user.id)});}catch(e){next(e);}});module.exports=router;
